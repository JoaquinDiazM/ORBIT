import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm, access } from "node:fs/promises";
import { tmpdir, hostname } from "node:os";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { createOrbitServer } from "../scripts/online/server.mjs";
import { ServerStore, createInitialServerState, encodeBackup, decodeBackup, atomicWrite,
  diagnoseDataLock, recoverDataLock, restoreServerBackup } from "../scripts/online/store.mjs";
import { hashPassword, verifyPassword, validPasswordRecord, PASSWORD_POLICY, AttemptLimiter } from "../scripts/online/auth.mjs";
import { materializeCourseEdition } from "../src/core/course-edition.js";
import { parseServerArguments, runServerCli } from "../scripts/orbit-server.mjs";
import { reconcileCompletedLocations } from "../src/core/course-progress-compatibility.js";

const PASSWORD = "temporary-test-password-027";
const TEMPLATE = JSON.parse(await readFile(new URL("../public/data/courses/electromagnetism-applied.edition.json", import.meta.url), "utf8"));
let adminPassword;
async function fixture(t) {
  const parent = resolve(tmpdir());
  const root = await mkdtemp(join(parent, "orbit-online-test-"));
  assert.equal(dirname(root), parent);
  const data = join(root, "data"); const dist = join(root, "dist");
  let runtime;
  t.after(async () => {
    await runtime?.close();
    assert.equal(dirname(resolve(root)), parent);
    assert.ok(root.startsWith(join(parent, "orbit-online-test-")));
    await rm(root, { recursive: true, force: true });
  });
  await mkdir(dist);
  await writeFile(join(dist, "index.html"), "<!doctype html><html><head><title>ORBIT</title></head><body>Shell</body></html>");
  await writeFile(join(dist, "editor.html"), "<!doctype html><html><head></head><body>Editor</body></html>");
  adminPassword ??= await hashPassword(PASSWORD);
  const initialized = await ServerStore.open(data, { initialState: createInitialServerState({ alias: "admin-test", password: adminPassword }) });
  await initialized.close();
  return { root, data, dist, async start(options = {}) {
    runtime = await createOrbitServer({ dataDirectory: data, distDirectory: dist, templateEdition: TEMPLATE, ...options });
    return runtime;
  } };
}
function client(runtime) {
  let cookie = ""; let csrf = "";
  return {
    async request(path, { method = "GET", body, headers = {} } = {}) {
      const response = await fetch(`${runtime.origin}/api/orbit${path}`, { method,
        headers: { ...(cookie ? { Cookie: cookie } : {}),
          ...(method !== "GET" ? { Origin: runtime.origin, "Content-Type": "application/json", "X-Orbit-CSRF": csrf } : {}), ...headers },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
      const result = await response.json();
      if (response.headers.get("set-cookie")) cookie = response.headers.get("set-cookie").split(";")[0];
      if (result.csrfToken) csrf = result.csrfToken;
      assert.equal(response.headers.get("cache-control"), "no-store");
      return { status: response.status, result, headers: response.headers };
    },
    async login(alias) {
      const response = await this.request("/login", { method: "POST", body: { alias, password: PASSWORD } });
      assert.equal(response.status, 200, JSON.stringify(response.result)); return response.result;
    },
  };
}
async function provision(runtime) {
  const admin = client(runtime); await admin.login("admin-test");
  const created = await admin.request("/admin/teachers", { method: "POST", body: { alias: "teacher-one", password: PASSWORD } });
  assert.equal(created.status, 201);
  const teacher = client(runtime); await teacher.login("teacher-one");
  const result = await admin.request("/admin/courses", { method: "POST", body: { title: "Curso de ensayo", teacherIds: [created.result.user.id] } });
  assert.equal(result.status, 201, JSON.stringify(result.result));
  const course = result.result.course;
  const createdStudent = await teacher.request(`/courses/${course.id}/students`, { method: "POST", body: { alias: "student-one", password: PASSWORD } });
  assert.equal(createdStudent.status, 201);
  const student = client(runtime); await student.login("student-one");
  return { admin, teacher, student, course, teacherId: created.result.user.id, studentId: createdStudent.result.student.id };
}

test("scrypt fija parámetros, verifica sin plaintext y limita intentos", async () => {
  const hashed = await hashPassword(PASSWORD);
  assert.equal(hashed.p, 3);
  assert.equal(PASSWORD_POLICY.N, 32768);
  assert.equal(validPasswordRecord(hashed), true);
  assert.equal(validPasswordRecord({ ...hashed, p: 1 }), false);
  assert.equal(await verifyPassword(PASSWORD, hashed), true);
  assert.equal(await verifyPassword("wrong-password", hashed), false);
  assert.ok(!JSON.stringify(hashed).includes(PASSWORD));
  let now = 0; const limiter = new AttemptLimiter({ limit: 2, windowMs: 100, clock: () => now });
  limiter.take("account"); limiter.take("account");
  assert.throws(() => limiter.take("account"), { code: "rate-limited" });
  now = 101; assert.doesNotThrow(() => limiter.take("account"));
});

test("store exclusivo, transacciones atómicas, backup/restauración y digest", async (t) => {
  const f = await fixture(t); let store = await ServerStore.open(f.data);
  try {
    await assert.rejects(ServerStore.open(f.data), { code: "store-locked" });
    const before = await readFile(join(f.data, "state.json"), "utf8");
    await assert.rejects(store.transact((draft) => { draft.users = []; }), { code: "invalid-store" });
    assert.equal(await readFile(join(f.data, "state.json"), "utf8"), before);
    await assert.rejects(store.transact(() => { throw new Error("interrupted"); }), /interrupted/);
    const backup = join(f.root, "export.json"); await store.backup(backup);
    await assert.rejects(store.backup(backup), { code: "EEXIST" });
    const oldEpoch = store.snapshot().epoch;
    await assert.rejects(restoreServerBackup(f.data, backup), { code: "store-locked" });
    await store.close();
    await restoreServerBackup(f.data, backup);
    store = await ServerStore.open(f.data);
    assert.notEqual(store.snapshot().epoch, oldEpoch);
    assert.equal((await decodeBackup(await readFile(join(f.data, "previous.json"), "utf8"))).epoch, oldEpoch);
    const corrupted = JSON.parse(encodeBackup(store.snapshot())); corrupted.state.epoch = oldEpoch;
    await assert.rejects(decodeBackup(JSON.stringify(corrupted)), { code: "invalid-store" });
    await Promise.all([store.transact((draft) => { draft.users[0].sessionVersion += 1; }),
      store.transact((draft) => { draft.users[0].sessionVersion += 1; })]);
    assert.equal(store.snapshot().users[0].sessionVersion, 3);
  } finally { await store.close(); }
  await assert.rejects(access(join(f.data, "server.lock")), { code: "ENOENT" });
});

test("store rechaza 64 MiB antes de escribir y bloquea lecturas tras fallo posterior al rename", async (t) => {
  const f = await fixture(t);
  let writes = 0;
  let store = await ServerStore.open(f.data, { write: async (path, bytes) => {
    writes += 1; await atomicWrite(path, bytes);
    if (path.endsWith("state.json")) throw new Error("Simulated failure after committed rename");
  } });
  try {
    const before = await readFile(join(f.data, "state.json"), "utf8");
    await assert.rejects(store.transact((draft) => { draft.fixturePadding = "x".repeat(64 * 1024 * 1024); }), /64 MiB/);
    assert.equal(writes, 0);
    assert.equal(await readFile(join(f.data, "state.json"), "utf8"), before);
    assert.equal(store.snapshot().users[0].sessionVersion, 1);
    await assert.rejects(store.transact((draft) => { draft.users[0].sessionVersion += 1; }), { code: "store-unavailable" });
    assert.equal(writes, 2);
    assert.throws(() => store.snapshot(), { code: "store-unavailable" });
    await assert.rejects(store.transact(() => {}), { code: "store-unavailable" });
    await assert.rejects(store.backup(join(f.root, "unverified.json")), { code: "store-unavailable" });
    assert.equal((await decodeBackup(await readFile(join(f.data, "state.json"), "utf8"))).users[0].sessionVersion, 2);
  } finally { await store.close(); }
  store = await ServerStore.open(f.data);
  try { assert.equal(store.snapshot().users[0].sessionVersion, 2); }
  finally { await store.close(); }
  await assert.rejects(decodeBackup('{"kind":"orbit-server-backup","schemaVersion":1}'), { code: "invalid-store" });
});

test("recuperación tras proceso interrumpido exige equipo, PID ausente y token exacto", async (t) => {
  const f = await fixture(t);
  assert.equal((await diagnoseDataLock(f.data)).status, "absent");
  const store = await ServerStore.open(f.data);
  try {
    const live = await diagnoseDataLock(f.data);
    assert.equal(live.status, "live");
    await assert.rejects(recoverDataLock(f.data, live.owner.token), { code: "lock-not-stale" });
  } finally { await store.close(); }
  const script = `import { ServerStore } from ${JSON.stringify(new URL("../scripts/online/store.mjs", import.meta.url).href)};
    await ServerStore.open(process.argv[1]); process.exit(23);`;
  const child = spawn(process.execPath, ["--input-type=module", "--eval", script, f.data], { stdio: "ignore", windowsHide: true });
  const exitCode = await new Promise((accept, reject) => { child.once("error", reject); child.once("exit", accept); });
  assert.equal(exitCode, 23);
  const stale = await diagnoseDataLock(f.data);
  assert.equal(stale.status, "stale"); assert.equal(stale.owner.pid, child.pid);
  await assert.rejects(ServerStore.open(f.data), { code: "store-locked" });
  await assert.rejects(recoverDataLock(f.data, randomUUID()), { code: "lock-token-mismatch" });
  await runServerCli(["recover-lock", "--data", f.data, "--token", stale.owner.token], { stdout: { write() {} } });
  assert.equal((await diagnoseDataLock(f.data)).status, "absent");
  const reopened = await ServerStore.open(f.data); await reopened.close();
  const path = join(f.data, "server.lock");
  await writeFile(path, JSON.stringify({ ...stale.owner, hostname: `${hostname()}-different-host` }));
  await assert.rejects(recoverDataLock(f.data, stale.owner.token), { code: "lock-not-stale" });
  assert.equal((await diagnoseDataLock(f.data)).status, "foreign-host");
  await writeFile(path, "partial interrupted lock");
  await assert.rejects(recoverDataLock(f.data, stale.owner.token), { code: "ambiguous-lock" });
  assert.equal(await readFile(path, "utf8"), "partial interrupted lock");
});

test("HTTP aislado: sesión, CSRF, permisos, mantenimiento, progreso y baja conjunta", async (t) => {
  const f = await fixture(t); const runtime = await f.start();
  const anonymous = client(runtime);
  assert.equal((await anonymous.request("/session")).status, 401);
  const shell = await fetch(`${runtime.origin}/?profile=teacher`);
  const html = await shell.text();
  assert.ok(html.includes(`<meta name="orbit-mode" content="online"><meta name="orbit-server-id" content="${runtime.store.state.serverId}"></head>`));
  assert.ok(!html.includes("admin-test"));
  const { admin, teacher, student, course, teacherId, studentId } = await provision(runtime);
  const session = await student.request("/session");
  assert.equal(session.result.user.role, "student");
  assert.equal((await student.request("/admin/overview")).status, 403);
  assert.equal((await student.request(`/courses/${course.id}/edition`)).status, 423);
  assert.equal((await teacher.request(`/courses/${course.id}/maintenance`, { method: "PUT", body: { enabled: false }, headers: { "X-Orbit-CSRF": "wrong" } })).status, 403);
  assert.equal((await teacher.request(`/courses/${course.id}/maintenance`, { method: "PUT", body: { enabled: false }, headers: { Origin: "https://attacker.invalid" } })).status, 403);
  assert.equal((await teacher.request(`/courses/${course.id}/maintenance`, { method: "PUT", body: { enabled: false } })).status, 200);
  const initial = (await student.request(`/courses/${course.id}/progress`)).result;
  assert.equal(initial.serverId, session.result.serverId);
  assert.equal(initial.userId, studentId);
  const selectedEdition = (await student.request(`/courses/${course.id}/edition`)).result;
  assert.equal(selectedEdition.serverId, initial.serverId);
  assert.equal(selectedEdition.userId, studentId);
  const update = (ids, extras = {}) => student.request(`/courses/${course.id}/progress`, { method: "PUT",
    body: { generation: initial.generation, revision: initial.revision, completedLocations: ids, ...extras } });
  assert.equal((await update(["lunar-relay"])).status, 400);
  assert.equal((await update(["vector-workshop"], { answers: ["private"] })).status, 400);
  assert.equal((await update(["vector-workshop"], { generation: "stale" })).result.error.code, "progress-generation-mismatch");
  assert.equal((await update(["vector-workshop"])).status, 200);
  assert.deepEqual((await update(["vector-workshop"])).result.completedLocations, ["vector-workshop"]);
  const monitor = (await teacher.request(`/courses/${course.id}/students`)).result;
  assert.equal(monitor.students[0].completedCount, 1);
  assert.ok(!JSON.stringify(monitor).includes("password"));
  const other = await admin.request("/admin/courses", { method: "POST", body: { title: "Otro curso", teacherIds: [teacherId] } });
  assert.equal((await student.request(`/courses/${other.result.course.id}/edition`)).status, 403);
  const reset = await teacher.request(`/courses/${course.id}/students/${studentId}/password`, { method: "POST", body: { password: PASSWORD } });
  assert.equal(reset.status, 200);
  assert.equal((await student.request("/session")).status, 401);
  await student.login("student-one");
  assert.deepEqual((await student.request(`/courses/${course.id}/progress`)).result.completedLocations, ["vector-workshop"]);
  assert.equal((await teacher.request(`/courses/${course.id}/students/${studentId}`, { method: "DELETE", body: { confirmAlias: "wrong" } })).status, 400);
  assert.equal((await teacher.request(`/courses/${course.id}/students/${studentId}`, { method: "DELETE", body: { confirmAlias: "student-one" } })).status, 200);
  assert.equal((await update(["vector-workshop"])).status, 401);
  assert.equal(runtime.store.snapshot().users.some((entry) => entry.id === studentId), false);
  assert.equal(runtime.store.snapshot().progress.some((entry) => entry.userId === studentId), false);
  await assert.rejects(access(join(f.data, "previous.json")), { code: "ENOENT" });
  assert.ok(!(await readFile(join(f.data, "state.json"), "utf8")).includes("student-one"));
  const privateFile = await fetch(`${runtime.origin}/state.json`); assert.equal(privateFile.status, 404);
  const created = await admin.request("/admin/teachers", { method: "POST", body: { alias: "teacher-two", password: PASSWORD } });
  const reassigned = await admin.request(`/admin/courses/${course.id}/teachers`, { method: "PUT", body: { teacherIds: [created.result.user.id] } });
  assert.equal(reassigned.status, 200);
  assert.equal((await teacher.request(`/courses/${course.id}/students`)).status, 403);
  assert.equal((await teacher.request(`/courses/${course.id}/maintenance`, { method: "PUT", body: { enabled: true } })).status, 403);
  const nextTeacher = client(runtime); await nextTeacher.login("teacher-two");
  assert.equal((await nextTeacher.request(`/courses/${course.id}/students`)).status, 200);
});

test("dos servidores del mismo host admiten sesiones simultáneas sin confundir cookies", async (t) => {
  const first = await (await fixture(t)).start();
  const second = await (await fixture(t)).start();
  const loginCookie = async (runtime) => {
    const login = await client(runtime).request("/login", { method: "POST", body: { alias: "admin-test", password: PASSWORD } });
    assert.equal(login.status, 200);
    const header = login.headers.get("set-cookie");
    assert.match(header, /; HttpOnly; SameSite=Strict;/);
    return header.split(";")[0];
  };
  const firstCookie = await loginCookie(first);
  const secondCookie = await loginCookie(second);
  assert.notEqual(firstCookie.split("=")[0], secondCookie.split("=")[0]);
  assert.equal((await client(second).request("/session", { headers: { Cookie: firstCookie } })).status, 401);
  const headers = { Cookie: `${secondCookie}; ${firstCookie}` };
  for (const runtime of [first, second]) {
    const session = await client(runtime).request("/session", { headers });
    assert.equal(session.status, 200);
    assert.equal(session.result.serverId, runtime.store.snapshot().serverId);
  }
});

test("publicar conserva avance compatible y requiere decisión para invalidación offline", async (t) => {
  const f = await fixture(t); const runtime = await f.start();
  const { teacher, student, course } = await provision(runtime);
  await teacher.request(`/courses/${course.id}/maintenance`, { method: "PUT", body: { enabled: false } });
  const progress = (await student.request(`/courses/${course.id}/progress`)).result;
  const earned = ["gauss-guide-post", "vector-workshop"];
  const saved = await student.request(`/courses/${course.id}/progress`, { method: "PUT", body: {
    generation: progress.generation, revision: progress.revision, completedLocations: earned,
  } });
  assert.equal(saved.status, 200, JSON.stringify(saved.result));
  await teacher.request(`/courses/${course.id}/students`, { method: "POST", body: { alias: "student-offline", password: PASSWORD } });
  const offline = client(runtime); await offline.login("student-offline");
  const offlineProgress = (await offline.request(`/courses/${course.id}/progress`)).result;
  const document = (await materializeCourseEdition(TEMPLATE)).editorDocument;
  document.locations.find(({ id }) => id === "vector-workshop").title = "Nombre de fixture compatible";
  const candidate = { baseRevision: course.revision, document };
  const checked = await teacher.request(`/courses/${course.id}/validate`, { method: "POST", body: candidate });
  assert.equal(checked.status, 200, JSON.stringify(checked.result));
  assert.equal(checked.result.requiresDecision, false);
  const publish = () => teacher.request(`/courses/${course.id}/publish`, { method: "POST", body: { ...candidate, planDigest: checked.result.planDigest, decision: "preserve" } });
  assert.equal((await publish()).result.error.code, "maintenance-required");
  await teacher.request(`/courses/${course.id}/maintenance`, { method: "PUT", body: { enabled: true } });
  const published = await publish(); assert.equal(published.status, 200, JSON.stringify(published.result));
  assert.deepEqual(runtime.store.snapshot().progress[0].completedLocations, earned);
  await teacher.request(`/courses/${course.id}/maintenance`, { method: "PUT", body: { enabled: false } });
  const oldUpload = await student.request(`/courses/${course.id}/progress`, { method: "PUT", body: { generation: progress.generation, revision: progress.revision, completedLocations: ["vector-workshop"] } });
  assert.equal(oldUpload.status, 200);
  const incompatibleDocument = (await materializeCourseEdition(published.result.edition)).editorDocument;
  incompatibleDocument.locations.find(({ id }) => id === "vector-workshop").contentSource += "\n\n## Compatibilidad de fixture\n\nTexto exclusivo de fixture para revisar compatibilidad.\n";
  const incompatible = { baseRevision: published.result.edition.revision, document: incompatibleDocument };
  const plan = (await teacher.request(`/courses/${course.id}/validate`, { method: "POST", body: incompatible })).result;
  assert.equal(plan.requiresDecision, true, JSON.stringify(plan));
  assert.equal(plan.affectedStudentCount, 1);
  await teacher.request(`/courses/${course.id}/maintenance`, { method: "PUT", body: { enabled: true } });
  const request = { ...incompatible, planDigest: plan.planDigest, decision: "preserve" };
  assert.equal((await teacher.request(`/courses/${course.id}/publish`, { method: "POST", body: request })).status, 409);
  request.decision = "reset-affected";
  const final = await teacher.request(`/courses/${course.id}/publish`, { method: "POST", body: request });
  assert.equal(final.status, 200, JSON.stringify(final.result));
  assert.deepEqual(runtime.store.snapshot().progress[0].completedLocations, ["gauss-guide-post"]);
  assert.deepEqual(reconcileCompletedLocations({ completedLocations: ["vector-workshop"], fromRevision: course.revision,
    toRevision: final.result.edition.revision, compatibility: final.result.compatibility,
    locations: (await materializeCourseEdition(final.result.edition)).locations }), []);
  assert.equal((await publish()).result.error.code, "revision-conflict");
  await teacher.request(`/courses/${course.id}/maintenance`, { method: "PUT", body: { enabled: false } });
  const current = (await student.request(`/courses/${course.id}/progress`)).result;
  const acknowledged = await student.request(`/courses/${course.id}/progress`, { method: "PUT", body: {
    generation: current.generation, revision: current.revision, completedLocations: ["gauss-guide-post"],
  } });
  assert.equal(acknowledged.status, 200, JSON.stringify(acknowledged.result));
  const oldOffline = await offline.request(`/courses/${course.id}/progress`, { method: "PUT", body: {
    generation: offlineProgress.generation, revision: offlineProgress.revision, completedLocations: earned,
  } });
  assert.equal(oldOffline.status, 200, JSON.stringify(oldOffline.result));
  assert.deepEqual(oldOffline.result.completedLocations, ["gauss-guide-post"]);
  const newOffline = await offline.request(`/courses/${course.id}/progress`, { method: "PUT", body: {
    generation: oldOffline.result.generation, revision: oldOffline.result.revision, completedLocations: ["gauss-guide-post"],
  } });
  assert.equal(newOffline.status, 200, JSON.stringify(newOffline.result));
});

test("CLI exige configuración explícita y secretos fuera de argumentos", async (t) => {
  assert.equal(parseServerArguments(["--help"]).command, "help");
  assert.throws(() => parseServerArguments(["init", "--data", "x", "--password", "secret"]), /Argumento/);
  assert.throws(() => parseServerArguments(["serve"]), /--data/);
  const f = await fixture(t);
  const output = [];
  await runServerCli(["backup", "--data", f.data, "--output", join(f.root, "cli-backup.json")], { stdout: { write: (value) => output.push(value) } });
  assert.ok(output.join("").includes("Copia privada"));
  await runServerCli(["restore", "--data", f.data, "--input", join(f.root, "cli-backup.json")], { stdout: { write() {} } });
  assert.ok((await decodeBackup(await readFile(join(f.data, "state.json"), "utf8"))).epoch);
  const damaged = join(f.root, "damaged"); await mkdir(damaged);
  await writeFile(join(damaged, "state.json"), "interrupted export");
  const backup = join(f.root, "cli-backup.json");
  await assert.rejects(restoreServerBackup(damaged, backup), { code: "invalid-restore-target" });
  assert.equal(await readFile(join(damaged, "state.json"), "utf8"), "interrupted export");
  const recovered = join(f.root, "recovered");
  await runServerCli(["restore", "--data", recovered, "--input", backup], { stdout: { write() {} } });
  const recoveredState = await decodeBackup(await readFile(join(recovered, "state.json"), "utf8"));
  const backupState = await decodeBackup(await readFile(backup, "utf8"));
  assert.equal(recoveredState.serverId, backupState.serverId);
  assert.notEqual(recoveredState.epoch, backupState.epoch);
  await assert.rejects(runServerCli(["serve", "--data", f.data, "--host", "127.0.0.1", "--port", "4173", "--origin", "http://127.0.0.1:4173"]), /4173/);
  await assert.rejects(f.start({ host: "0.0.0.0", publicOrigin: "http://example.com" }), { code: "https-required" });
});
