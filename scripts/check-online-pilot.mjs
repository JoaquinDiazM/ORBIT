// Reproducible, disposable API/runtime probe. This does not replace a human/browser pilot.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { hashPassword } from "./online/auth.mjs";
import { createInitialServerState, ServerStore } from "./online/store.mjs";
import { createOrbitServer } from "./online/server.mjs";
import { OrbitApiClient } from "../src/online/api-client.js";
import { ProgressStorage } from "../src/core/storage.js";
import { prepareOnlineRuntime } from "../src/online/runtime-course.js";
import { OnlineProgressSync } from "../src/online/progress-sync.js";
import { loadOfflineContext, onlineScope } from "../src/online/offline-store.js";
import { createOfflineWorker } from "../src/online/service-worker.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function memoryStore() {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  return { values, storageFactory: (key) => new ProgressStorage(key, storage) };
}

function probeClient(origin) {
  let cookie = "";
  let connected = true;
  const api = new OrbitApiClient({ async fetchImpl(path, options = {}) {
    if (!connected) throw new Error("Deliberate offline fixture");
    const response = await fetch(new URL(path, origin), {
      ...options, headers: { ...options.headers, Origin: origin, ...(cookie ? { Cookie: cookie } : {}) },
      signal: AbortSignal.timeout(15_000),
    });
    const nextCookie = response.headers.get("set-cookie");
    if (nextCookie) cookie = nextCookie.split(";")[0];
    assert.equal(response.headers.get("cache-control"), "no-store");
    return response;
  } });
  return { api, setConnected(value) { connected = value; }, async login(alias, password) {
    const session = await api.request("/login", { method: "POST", body: { alias, password } });
    api.setSession(session);
    return session;
  } };
}

export async function runPilotProbe(connection) {
  const { origin, password, serverId } = connection;
  assert.match(serverId, /^[a-f0-9-]{36}$/);
  assert.equal(new URL(origin).hostname, "127.0.0.1", "The probe must use its isolated loopback/tunnel.");
  const admin = probeClient(origin);
  const adminSession = await admin.login("pilot-admin", password);
  assert.equal(adminSession.serverId, serverId, "Refuse to mutate a different server.");
  const initial = await admin.api.request("/admin/overview");
  assert.equal(initial.users.length, 1, "The probe requires a fresh disposable fixture.");
  assert.equal(initial.courses.length, 0);
  // Exercise the complete, generated precache against the actual server's MIME/routing rules.
  const sw = await (await fetch(new URL("/sw.js", origin))).text();
  const config = JSON.parse(sw.match(/installOrbitWorker\(self, (.+)\);/)[1]);
  const publicCaches = new Map();
  const cacheStorage = {
    keys: async () => [...publicCaches.keys()], delete: async (key) => publicCaches.delete(key),
    async open(key) {
      if (!publicCaches.has(key)) publicCaches.set(key, new Map());
      const map = publicCaches.get(key);
      return { put: async (url, response) => map.set(url, response.clone()), match: async (url) => map.get(url)?.clone() };
    },
  };
  let assetsOnline = true;
  const worker = createOfflineWorker({ ...config, scope: `${origin}/`, caches: cacheStorage, cryptoImpl: globalThis.crypto,
    fetchImpl: (url, options) => assetsOnline ? fetch(url, { ...options, signal: AbortSignal.timeout(15_000) }) : Promise.reject(new Error("Fixture offline")) });
  await worker.install();
  assetsOnline = false;
  for (const page of ["/", "/editor.html"]) {
    const saved = await worker.respond({ url: new URL(page, origin).href, method: "GET", mode: "navigate" });
    assert.ok((await saved.text()).includes(`<meta name="orbit-server-id" content="${serverId}">`));
  }
  const teachers = [];
  const students = [];
  const courses = [];
  for (let index = 0; index < 2; index++) {
    const alias = `pilot-teacher-${index}`;
    const { user } = await admin.api.request("/admin/teachers", { method: "POST", body: { alias, password } });
    const { course } = await admin.api.request("/admin/courses", { method: "POST", body: { title: `Plantilla de ensayo ${index + 1}`, teacherIds: [user.id] } });
    const teacher = probeClient(origin);
    await teacher.login(alias, password);
    await teacher.api.request(`/courses/${course.id}/maintenance`, { method: "PUT", body: { enabled: false } });
    teachers.push(teacher);
    courses.push(course);
    for (let number = 0; number < 5; number++) {
      const studentAlias = `pilot-student-${index}-${number}`;
      const { student } = await teacher.api.request(`/courses/${course.id}/students`, { method: "POST", body: { alias: studentAlias, password } });
      const client = probeClient(origin);
      const session = await client.login(studentAlias, password);
      const context = { api: client.api, session, course: session.courses[0], profile: "student", offline: false,
        scope: onlineScope(serverId, session.user.id, course.id) };
      const storage = memoryStore();
      const runtime = await prepareOnlineRuntime(context, storage);
      const first = runtime.course.locations.find((location) => ["lesson", "mission"].includes(location.kind)
        && runtime.progression.isLocationAccessible(location));
      assert.ok(first);
      assert.equal(runtime.progression.completeLocation(first.id).ok, true);
      const sync = new OnlineProgressSync({ context, ...runtime, windowRef: null });
      await sync.flush();
      assert.equal(sync.pendingCount(), 0);
      assert.equal(sync.blocked, false);
      students.push({ client, context, storage, runtime, sync, student, first });
    }
  }
  await assert.rejects(teachers[0].api.request(`/courses/${courses[1].id}/students`), { status: 403 });
  await assert.rejects(students[0].client.api.request(`/courses/${courses[1].id}/edition`), { status: 403 });
  await assert.rejects(students[0].client.api.request("/admin/overview"), { status: 403 });

  const first = students[0];
  first.client.setConnected(false);
  const offline = await loadOfflineContext({ serverId, courseId: courses[0].id, api: first.client.api }, first.storage);
  assert.ok(offline?.offline);
  const resumed = await prepareOnlineRuntime(offline, first.storage);
  let changed;
  do {
    changed = false;
    for (const location of resumed.course.locations) {
      if (["lesson", "mission"].includes(location.kind) && !resumed.progression.isLocationCompleted(location.id)
        && resumed.progression.isLocationAccessible(location)) {
        assert.equal(resumed.progression.completeLocation(location.id).ok, true);
        changed = true;
      }
    }
  } while (changed);
  const academic = resumed.course.locations.filter((location) => ["lesson", "mission"].includes(location.kind));
  assert.ok(academic.every((location) => resumed.progression.isLocationCompleted(location.id)));
  const offlineSync = new OnlineProgressSync({ context: offline, ...resumed, windowRef: null });
  await offlineSync.flush();
  assert.ok(offlineSync.pendingCount() > 0);
  assert.equal(offlineSync.blocked, false);
  first.client.setConnected(true);
  await offlineSync.flush();
  assert.equal(offlineSync.pendingCount(), 0);
  assert.equal(offlineSync.blocked, false);
  const monitor = await teachers[0].api.request(`/courses/${courses[0].id}/students`);
  assert.equal(monitor.students.length, 5);
  assert.equal(monitor.students.find((student) => student.id === first.student.id).finished, true);
  assert.ok(!JSON.stringify(monitor).match(/password|answers|attempts|csrf/i));
  for (const teacher of teachers) {
    const index = teachers.indexOf(teacher);
    assert.equal((await teacher.api.request(`/courses/${courses[index].id}/students`)).students.length, 5);
  }
  const second = students[1];
  const newPassword = `${password}-reset`;
  await teachers[0].api.request(`/courses/${courses[0].id}/students/${second.student.id}/password`, { method: "POST", body: { password: newPassword } });
  await assert.rejects(second.client.api.request("/session"), { status: 401 });
  await second.client.login(second.student.alias, newPassword);
  assert.ok((await second.client.api.request(`/courses/${courses[0].id}/progress`)).completedLocations.includes(second.first.id));
  const removed = students[2];
  await teachers[0].api.request(`/courses/${courses[0].id}/students/${removed.student.id}`, { method: "DELETE", body: { confirmAlias: removed.student.alias } });
  await assert.rejects(removed.client.api.request(`/courses/${courses[0].id}/progress`), { status: 401 });
  await teachers[1].api.request(`/courses/${courses[1].id}/maintenance`, { method: "PUT", body: { enabled: true } });
  await assert.rejects(students[5].client.api.request(`/courses/${courses[1].id}/progress`), { status: 423 });
  await teachers[1].api.request(`/courses/${courses[1].id}/maintenance`, { method: "PUT", body: { enabled: false } });
  offlineSync.stop();
  students.forEach(({ sync }) => sync.stop());
  return { ok: true, teachers: 2, courses: 2, studentsCreated: 10, academicLocationsReachedOffline: academic.length,
    publicResourcesVerified: config.resources.length, buildId: config.buildId,
    verified: ["login", "course-permissions", "progress-isolation", "offline-resume", "reconnection", "owl", "password-reset", "account-deletion", "maintenance"],
    browserReview: "pending" };
}

export async function servePilotFixture(directory, { dist = resolve(root, "dist"), lifetimeMs = 180_000, port = 0, tlsDirectory = null } = {}) {
  const workspace = resolve(directory);
  if (!Number.isInteger(port) || port < 0 || port > 65535 || port === 4173 || (tlsDirectory && !port)) {
    throw new Error("La prueba requiere un puerto propio distinto de 4173; HTTPS necesita un puerto explícito.");
  }
  await mkdir(workspace, { mode: 0o700 }); // Refuse an existing directory: no real accounts can be adopted.
  const password = randomBytes(24).toString("base64url");
  const dataDirectory = resolve(workspace, "private-data");
  const store = await ServerStore.open(dataDirectory, { initialState: createInitialServerState({ alias: "pilot-admin", password: await hashPassword(password) }) });
  const serverId = store.snapshot().serverId;
  await store.close();
  const tls = tlsDirectory ? {
    cert: await readFile(resolve(tlsDirectory, "cert.pem")), key: await readFile(resolve(tlsDirectory, "key.pem")),
  } : null;
  const runtime = await createOrbitServer({ dataDirectory, distDirectory: dist, port, tls,
    publicOrigin: port ? `${tls ? "https" : "http"}://127.0.0.1:${port}` : null });
  await writeFile(resolve(workspace, "connection.json"), JSON.stringify({ origin: runtime.origin, password, serverId, pid: process.pid }), { mode: 0o600 });
  let stopped = false;
  const stop = async () => {
    if (stopped) return;
    stopped = true;
    clearTimeout(timer);
    await runtime.close();
    await writeFile(resolve(workspace, "closed.json"), JSON.stringify({ serverId, closed: true }));
    process.off("SIGINT", stop); process.off("SIGTERM", stop);
  };
  const timer = setTimeout(() => { void stop(); }, lifetimeMs);
  process.on("SIGINT", stop); process.on("SIGTERM", stop);
  console.log(JSON.stringify({ origin: runtime.origin, pid: process.pid, serverId, lifetimeMs }));
  return { ...runtime, stop };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [command, path, port, tlsDirectory] = process.argv.slice(2);
  if (!path || !["serve", "probe"].includes(command)) throw new Error("Use serve NEW_PRIVATE_DIRECTORY or probe CONNECTION_FILE.");
  if (command === "serve") await servePilotFixture(path, { port: Number(port ?? 0), tlsDirectory });
  else console.log(JSON.stringify(await runPilotProbe(JSON.parse(await readFile(resolve(path), "utf8"))), null, 2));
}
