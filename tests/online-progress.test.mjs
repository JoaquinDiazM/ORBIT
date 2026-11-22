import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ProgressionModel } from "../src/core/progression.js";
import { ProgressStorage } from "../src/core/storage.js";
import { materializeCourseEdition } from "../src/core/course-edition.js";
import { reconcileCompletedLocations } from "../src/core/course-progress-compatibility.js";
import { OnlineProgressSync } from "../src/online/progress-sync.js";
import { prepareOnlineRuntime } from "../src/online/runtime-course.js";
import { acquireOnlineRuntimeLock } from "../src/online/runtime-lock.js";
import {
  forgetOfflineAccess, loadOfflineContext, offlineCourseKey, onlineProgressKey,
  onlineScope, readOfflineCourse, saveOfflineCourse,
} from "../src/online/offline-store.js";

const edition = JSON.parse(await readFile(new URL("../public/data/courses/electromagnetism-applied.edition.json", import.meta.url), "utf8"));
const materialized = await materializeCourseEdition(edition);

function memory() {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  return { values, storageFactory: (key) => new ProgressStorage(key, storage) };
}

function setup({ userId = "student-a", generation = "epoch-a", completedLocations = [], store = memory() } = {}) {
  const course = { id: "course-a", title: "Curso A", revision: edition.revision, maintenance: false };
  const session = {
    serverId: "server-a", csrfToken: "never-persist-this-csrf-token",
    user: { id: userId, alias: userId, role: "student", courseIds: [course.id] }, courses: [course],
  };
  const state = { progress: { serverId: session.serverId, userId, courseId: course.id, generation, revision: edition.revision, completedLocations }, session, compatibility: [] };
  const calls = [];
  const statuses = [];
  const api = {
    session,
    setSession(next) { this.session = next; },
    async request(path, options = {}) {
      calls.push({ path, ...structuredClone(options) });
      if (path === "/session") return structuredClone(state.session);
      if (path.endsWith("/edition")) return { serverId: session.serverId, userId, course, edition, compatibility: state.compatibility };
      if (path.endsWith("/progress")) {
        if (options.method === "PUT") {
          const reconciled = reconcileCompletedLocations({
            completedLocations: options.body.completedLocations,
            fromRevision: options.body.revision,
            toRevision: state.progress.revision,
            compatibility: state.compatibility,
            locations: materialized.locations,
          });
          state.progress.completedLocations = [...new Set([...state.progress.completedLocations, ...reconciled])];
        }
        return structuredClone(state.progress);
      }
      throw new Error(`Ruta inesperada: ${path}`);
    },
  };
  const context = {
    api, session, course, profile: "student", offline: false,
    scope: onlineScope(session.serverId, userId, course.id),
    setSyncStatus: (status) => statuses.push(status),
  };
  return { ...store, state, calls, statuses, context };
}

function storedModel(env, { revision = edition.revision, generation = env.state.progress.generation } = {}) {
  return new ProgressionModel({
    profile: "student", storage: env.storageFactory(onlineProgressKey(env.context.scope, generation)),
    courseId: env.context.course.id, courseRevision: revision,
    areas: materialized.areas, locations: materialized.locations,
  });
}

test("online reconcilia antes del constructor y deriva concesiones solo de completados conservados", async () => {
  const env = setup();
  const previous = storedModel(env, { revision: "revision-anterior" });
  previous.completeLocation("vector-workshop");
  previous.completeLocation("coulomb-observatory");
  previous.completeLocation("field-lens-cache");
  previous.grantConcept("wave-propagation");
  previous.unlockAllAreasForDebug();
  env.state.compatibility = [{ fromRevision: "revision-anterior", toRevision: edition.revision, invalidatedLocationIds: ["vector-workshop"] }];
  const runtime = await prepareOnlineRuntime(env.context, env);
  const state = runtime.progression.getSnapshot().state;
  assert.deepEqual(state.completedLocations, ["field-lens-cache"]);
  assert.deepEqual(state.concepts, []);
  assert.deepEqual(state.debugUnlockedAreas, []);
  assert.ok(state.rewards.includes("gadgets:field-lens"));
  assert.equal(state.courseRevision, edition.revision);
  assert.equal(state.courseId, "course-a");
  const upload = env.calls.find((entry) => entry.method === "PUT");
  assert.equal(upload.body.revision, "revision-anterior");
  assert.ok(upload.body.completedLocations.includes("vector-workshop"));
  assert.deepEqual(env.state.progress.completedLocations, ["field-lens-cache"]);
});

test("fallo al confirmar revisión anterior conserva el envelope original para reintentar", async () => {
  const env = setup();
  storedModel(env, { revision: "revision-anterior" }).completeLocation("vector-workshop");
  env.state.compatibility = [{ fromRevision: "revision-anterior", toRevision: edition.revision, invalidatedLocationIds: [] }];
  const before = [...env.values];
  const request = env.context.api.request.bind(env.context.api);
  env.context.api.request = async (path, options) => {
    if (options?.method === "PUT") throw Object.assign(new Error("Sin conexión"), { status: 0, code: "network-unavailable" });
    return request(path, options);
  };
  await assert.rejects(prepareOnlineRuntime(env.context, env), { code: "network-unavailable" });
  assert.deepEqual([...env.values], before);
});

test("revisión desconocida no borra ni sobrescribe el avance antes de construir el modelo", async () => {
  const env = setup();
  storedModel(env, { revision: "desconocida" }).completeLocation("vector-workshop");
  const before = [...env.values];
  await assert.rejects(prepareOnlineRuntime(env.context, env), { code: "unknown-course-revision" });
  assert.deepEqual([...env.values], before);
});

test("reconciliar conserva preferencias personales válidas sin inventar recompensas", async () => {
  const env = setup();
  const previous = storedModel(env);
  const transport = materialized.locations.find((location) => location.grants?.rewards?.includes("transports:electric-cart"));
  previous.completeLocation(transport.id, { force: true });
  previous.cycleTransport();
  previous.setEffectsVolume(0.3);
  const runtime = await prepareOnlineRuntime(env.context, env);
  const state = runtime.progression.getSnapshot().state;
  assert.equal(state.activeTransport, "electric-cart");
  assert.equal(state.settings.effectsVolume, 0.3);
  assert.ok(state.rewards.includes("transports:electric-cart"));
});

test("terminar sesión durante la carga cancela antes de crear o persistir el modelo", async () => {
  const env = setup();
  await assert.rejects(prepareOnlineRuntime(env.context, { ...env, isActive: () => false }), { code: "online-session-ended" });
  assert.equal(env.values.size, 0);
});

test("cambiar de cuenta o servidor durante la carga no mezcla edición ni progreso en la copia original", async () => {
  for (const route of ["edition", "progress"]) {
    for (const field of ["userId", "serverId"]) {
      const env = setup();
      const first = await prepareOnlineRuntime(env.context, env);
      first.progression.completeLocation("vector-workshop");
      const before = [...env.values];
      const request = env.context.api.request.bind(env.context.api);
      env.context.api.request = async (path, options) => {
        const result = await request(path, options);
        return path.endsWith(`/${route}`) ? { ...result, [field]: "different-identity" } : result;
      };
      await assert.rejects(prepareOnlineRuntime(env.context, env), { code: "online-account-changed" });
      assert.deepEqual([...env.values], before);
      assert.equal(env.calls.some((call) => call.method === "PUT"), false);
    }
  }
});

test("edición online ignora overrides estáticos y autentica el artefacto recibido", async () => {
  const env = setup();
  env.values.set(`orbit-course-edition:v1:${edition.courseId}`, JSON.stringify({ invalid: true }));
  const runtime = await prepareOnlineRuntime(env.context, env);
  assert.equal(runtime.course.source, "online-server");
  assert.equal(runtime.course.courseRevision, edition.revision);
  const request = env.context.api.request.bind(env.context.api);
  env.context.api.request = async (path, options) => {
    const response = await request(path, options);
    if (path.endsWith("/edition")) return { ...response, edition: { ...edition, digest: "0".repeat(64) } };
    return response;
  };
  await assert.rejects(prepareOnlineRuntime(env.context, env));
});

test("caché offline aísla cuentas, excluye secretos y logout conserva pendientes sin permitir acceso", async () => {
  const env = setup();
  const runtime = await prepareOnlineRuntime(env.context, env);
  runtime.progression.completeLocation("vector-workshop");
  const cached = await loadOfflineContext({ serverId: "server-a", target: "orbit", api: env.context.api }, env);
  assert.equal(cached.session.user.id, "student-a");
  assert.equal(cached.session.csrfToken, undefined);
  assert.equal(cached.offline, true);
  assert.equal(await loadOfflineContext({ serverId: "other-server", target: "orbit" }, env), null);
  assert.equal(await loadOfflineContext({ serverId: "server-a", target: "editor" }, env), null);
  assert.equal(await loadOfflineContext({ serverId: "server-a", courseId: "other-course" }, env), null);
  assert.equal([...env.values.values()].join("").includes("never-persist-this-csrf-token"), false);
  const second = setup({ userId: "student-b", store: env });
  const secondRuntime = await prepareOnlineRuntime(second.context, second);
  assert.deepEqual(secondRuntime.progression.getSnapshot().state.completedLocations, []);
  assert.equal((await loadOfflineContext({ serverId: "server-a", target: "orbit" }, env)).session.user.id, "student-b");
  forgetOfflineAccess("server-a", env);
  assert.equal(await loadOfflineContext({ serverId: "server-a", target: "orbit" }, env), null);
  assert.deepEqual(env.storageFactory(onlineProgressKey(env.context.scope, "epoch-a")).load().completedLocations, ["vector-workshop"]);
});

test("offline recupera curso y finalizaciones pendientes sin llamar a la API ni heredar Debug", async () => {
  const env = setup();
  const first = await prepareOnlineRuntime(env.context, env);
  first.progression.completeLocation("vector-workshop");
  const cached = await loadOfflineContext({ serverId: "server-a", target: "orbit", api: { request() { throw new Error("No debe acceder a red"); } } }, env);
  const runtime = await prepareOnlineRuntime(cached, env);
  assert.equal(runtime.progression.isLocationCompleted("vector-workshop"), true);
  assert.equal(runtime.course.source, "offline-account-cache");
  assert.equal(runtime.progression.profile, "student");
});

test("restauración cambia generación, no resucita avance y conserva copia exportable", async () => {
  const env = setup();
  const first = await prepareOnlineRuntime(env.context, env);
  first.progression.completeLocation("vector-workshop");
  const original = env.values.get(onlineProgressKey(env.context.scope, "epoch-a"));
  env.state.progress.generation = "epoch-restored";
  const restored = await prepareOnlineRuntime(env.context, env);
  assert.deepEqual(restored.progression.getSnapshot().state.completedLocations, []);
  assert.equal(env.values.get(onlineProgressKey(env.context.scope, "epoch-a")), original);
  assert.equal(restored.recoveries.length, 1);
  assert.deepEqual(restored.recoveries[0].progress.completedLocations, ["vector-workshop"]);
  assert.equal(readOfflineCourse(env.context.scope, env).progress.generation, "epoch-restored");
});

test("sync une dos dispositivos idempotentemente y transmite únicamente completados", async () => {
  const env = setup({ completedLocations: ["field-lens-cache"] });
  const runtime = await prepareOnlineRuntime(env.context, env);
  runtime.progression.completeLocation("vector-workshop");
  const sync = new OnlineProgressSync({ context: env.context, ...runtime });
  await sync.flush();
  assert.deepEqual(new Set(env.state.progress.completedLocations), new Set(["field-lens-cache", "vector-workshop"]));
  const puts = env.calls.filter((entry) => entry.method === "PUT");
  assert.equal(puts.length, 1);
  assert.deepEqual(Object.keys(puts[0].body).sort(), ["completedLocations", "generation", "revision"]);
  assert.equal(sync.pendingCount(), 0);
  await sync.flush();
  assert.equal(env.calls.filter((entry) => entry.method === "PUT").length, 1);
  sync.stop();
});

test("completar durante PUT no pierde avance y provoca una segunda unión", async () => {
  const env = setup();
  const runtime = await prepareOnlineRuntime(env.context, env);
  runtime.progression.completeLocation("vector-workshop");
  const request = env.context.api.request.bind(env.context.api);
  let first = true;
  env.context.api.request = async (path, options) => {
    if (options?.method === "PUT" && first) {
      first = false;
      runtime.progression.completeLocation("field-lens-cache");
    }
    return request(path, options);
  };
  const sync = new OnlineProgressSync({ context: env.context, ...runtime });
  await sync.flush();
  assert.equal(env.calls.filter((entry) => entry.method === "PUT").length, 2);
  assert.deepEqual(new Set(env.state.progress.completedLocations), new Set(["vector-workshop", "field-lens-cache"]));
  assert.equal(sync.pendingCount(), 0);
});

test("un acuse parcial del servidor no causa reintentos infinitos ni borra pendientes", async () => {
  const env = setup();
  const runtime = await prepareOnlineRuntime(env.context, env);
  runtime.progression.completeLocation("vector-workshop");
  const request = env.context.api.request.bind(env.context.api);
  let writes = 0;
  env.context.api.request = async (path, options) => {
    if (options?.method === "PUT") {
      writes += 1;
      return structuredClone(env.state.progress);
    }
    return request(path, options);
  };
  const sync = new OnlineProgressSync({ context: env.context, ...runtime });
  await sync.flush();
  assert.equal(writes, 1);
  assert.equal(sync.blocked, true);
  assert.equal(sync.pendingCount(), 1);
  assert.equal(runtime.progression.isLocationCompleted("vector-workshop"), true);
});

test("respuesta tardía después de salir no muta modelo ni caché", async () => {
  const env = setup();
  const runtime = await prepareOnlineRuntime(env.context, env);
  runtime.progression.completeLocation("vector-workshop");
  let resolvePut;
  let putStarted;
  const started = new Promise((resolve) => { putStarted = resolve; });
  const request = env.context.api.request.bind(env.context.api);
  env.context.api.request = async (path, options) => {
    if (options?.method === "PUT") {
      putStarted();
      return new Promise((resolve) => { resolvePut = resolve; });
    }
    return request(path, options);
  };
  const sync = new OnlineProgressSync({ context: env.context, ...runtime });
  const flushing = sync.flush();
  await started;
  sync.stop();
  const before = [...env.values];
  resolvePut({ ...env.state.progress, completedLocations: ["vector-workshop", "field-lens-cache"] });
  await flushing;
  assert.deepEqual([...env.values], before);
  assert.equal(runtime.progression.isLocationCompleted("field-lens-cache"), false);
});

test("red caída conserva pendientes; sesión expirada, baja, mantenimiento y otra cuenta bloquean sin PUT", async () => {
  for (const failure of [
    { code: "network-unavailable", status: 0 },
    { code: "authentication-required", status: 401 },
    { code: "forbidden", status: 403 },
    { code: "course-maintenance", status: 423 },
  ]) {
    const env = setup();
    const runtime = await prepareOnlineRuntime(env.context, env);
    runtime.progression.completeLocation("vector-workshop");
    let blocked = false;
    env.context.api.request = async () => { throw Object.assign(new Error(failure.code), failure); };
    const sync = new OnlineProgressSync({ context: env.context, ...runtime, onAccessRequired: () => { blocked = true; } });
    await sync.flush();
    assert.equal(blocked, failure.status !== 0);
    assert.equal(sync.pendingCount(), 1);
    assert.equal(runtime.progression.isLocationCompleted("vector-workshop"), true);
    assert.equal(env.calls.some((entry) => entry.method === "PUT"), false);
  }
  const env = setup();
  const runtime = await prepareOnlineRuntime(env.context, env);
  runtime.progression.completeLocation("vector-workshop");
  env.state.session = { ...env.state.session, user: { ...env.state.session.user, id: "other-user" } };
  const sync = new OnlineProgressSync({ context: env.context, ...runtime });
  await sync.flush();
  assert.equal(sync.blocked, true);
  assert.equal(sync.pendingCount(), 1);
  assert.equal(env.calls.some((entry) => entry.method === "PUT"), false);
});

test("generación o revisión cambiada durante sync no reenvía progreso de la época anterior", async () => {
  for (const field of ["generation", "revision"]) {
    const env = setup();
    const runtime = await prepareOnlineRuntime(env.context, env);
    runtime.progression.completeLocation("vector-workshop");
    env.state.progress[field] = "new-value";
    const sync = new OnlineProgressSync({ context: env.context, ...runtime });
    await sync.flush();
    assert.equal(sync.blocked, true);
    assert.equal(sync.pendingCount(), 1);
    assert.equal(env.calls.some((entry) => entry.method === "PUT"), false);
  }
});

test("sync rechaza otra identidad recibida después de comprobar sesión sin incorporar ni confirmar progreso ajeno", async () => {
  for (const phase of ["GET", "PUT"]) {
    for (const field of ["userId", "serverId"]) {
      const env = setup();
      const runtime = await prepareOnlineRuntime(env.context, env);
      runtime.progression.completeLocation("vector-workshop");
      const cacheBefore = env.values.get(offlineCourseKey(env.context.scope));
      const request = env.context.api.request.bind(env.context.api);
      env.context.api.request = async (path, options = {}) => {
        const result = await request(path, options);
        return path.endsWith("/progress") && (options.method ?? "GET") === phase
          ? { ...result, [field]: "different-identity", completedLocations: ["vector-workshop", "field-lens-cache"] }
          : result;
      };
      const sync = new OnlineProgressSync({ context: env.context, ...runtime });
      await sync.flush();
      assert.equal(sync.blocked, true);
      assert.equal(sync.pendingCount(), 1);
      assert.equal(runtime.progression.isLocationCompleted("field-lens-cache"), false);
      assert.equal(env.values.get(offlineCourseKey(env.context.scope)), cacheBefore);
      assert.equal(env.calls.filter((call) => call.method === "PUT").length, phase === "PUT" ? 1 : 0);
    }
  }
});

test("caché con identidad de progreso cruzada no se puede guardar ni reabrir offline", async () => {
  const env = setup();
  const runtime = await prepareOnlineRuntime(env.context, env);
  const before = [...env.values];
  for (const field of ["userId", "serverId"]) {
    const progress = { ...env.state.progress, [field]: "different-identity" };
    assert.throws(() => saveOfflineCourse(env.context, { edition, progress }, env), { code: "online-account-changed" });
    assert.deepEqual([...env.values], before);
    const invalid = { ...runtime.cache, progress };
    env.values.set(offlineCourseKey(env.context.scope), JSON.stringify(invalid));
    await assert.rejects(loadOfflineContext({ serverId: "server-a", api: env.context.api }, env), { code: "invalid-offline-course" });
    env.values.set(offlineCourseKey(env.context.scope), before.find(([key]) => key === offlineCourseKey(env.context.scope))[1]);
  }
});

test("caché inválida y fallo de escritura no se presentan como acceso offline preparado", async () => {
  const env = setup();
  env.values.set(offlineCourseKey(env.context.scope), JSON.stringify({ schemaVersion: 99 }));
  await assert.rejects(prepareOnlineRuntime(env.context, env), { code: "invalid-offline-course" });
  assert.equal(env.values.size, 1);
  const denied = setup();
  const storageFactory = (key) => new ProgressStorage(key, { getItem() { return null; }, setItem() { throw new Error("cuota"); } });
  assert.throws(() => saveOfflineCourse(denied.context, { edition, progress: denied.state.progress }, { storageFactory }), { code: "storage-write-failed" });
});

test("solo una ventana escribe el avance de una cuenta y el bloqueo se libera", async () => {
  const held = new Set();
  const lockManager = { async request(name, _options, callback) {
    if (held.has(name)) return callback(null);
    held.add(name);
    try { return await callback({ name }); } finally { held.delete(name); }
  } };
  const first = await acquireOnlineRuntimeLock("account-a", { lockManager });
  await assert.rejects(acquireOnlineRuntimeLock("account-a", { lockManager }), { code: "online-account-in-use" });
  const other = await acquireOnlineRuntimeLock("account-b", { lockManager });
  other.release();
  await other.finished;
  first.release();
  await first.finished;
  const again = await acquireOnlineRuntimeLock("account-a", { lockManager });
  again.release();
  await again.finished;
  assert.equal(held.size, 0);
});
