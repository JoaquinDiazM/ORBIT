import assert from "node:assert/strict";
import test from "node:test";
import { OrbitApiClient, OrbitApiError, createOnlineScope } from "../src/online/api-client.js";
import { endOnlineSession, mountOnlineSession, readOnlineMarkers, resolveOnlineContext, validateOnlineSession } from "../src/online/access.js";
import { mountAdminPanel } from "../src/online/admin-panel.js";
import { installContentDOM } from "./helpers/content-dom.mjs";

const course = { id: "course-a", title: "Curso A", revision: "rev-a", maintenance: false };
function session(role = "student") {
  return { serverId: "server-a", csrfToken: "csrf-only-in-memory", user: { id: `${role}-a`, alias: "Alicia", role, courseIds: [course.id] }, courses: [structuredClone(course)] };
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

function dom(t, { online = true, search = "" } = {}) {
  const env = installContentDOM();
  t.after(env.restore);
  const doc = env.document;
  const create = doc.createElement;
  doc.createElement = (tag) => {
    const element = create(tag);
    if (tag === "dialog") {
      element.showModal = () => { element.open = true; };
      element.close = () => { element.open = false; element.dispatch("close"); };
    }
    return element;
  };
  doc.querySelector = (selector) => doc.body.querySelector(selector);
  doc.querySelectorAll = (selector) => doc.body.querySelectorAll(selector);
  const element = (tag, attrs = {}) => {
    const result = doc.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) result.setAttribute(key, value);
    doc.body.append(result);
    return result;
  };
  if (online) {
    element("meta", { name: "orbit-mode", content: "online" });
    element("meta", { name: "orbit-server-id", content: "server-a" });
  }
  const app = element("main", { id: "app" });
  const brand = doc.createElement("div");
  brand.className = "hud-brand";
  app.append(brand);
  const loading = element("div", { id: "loading-screen" });
  const events = [];
  const win = doc.defaultView;
  win.Event = Event;
  win.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init.detail; } };
  win.dispatchEvent = (event) => events.push(event);
  win.location = { href: `https://orbit.example/index.html${search}`, reload() { events.push("reload"); }, assign(url) { events.push(url); } };
  win.history = { replaceState(_state, _unused, url) { win.location.href = url; } };
  win.OrbitStartup = { waitForInput() { events.push("wait-for-input"); } };
  return { doc, win, app, loading, events, element };
}

function fakeApi(response = session()) {
  return {
    calls: [], session: null,
    setSession(value) { this.session = value; },
    async request(path, options = {}) {
      this.calls.push({ path, ...structuredClone(options) });
      if (response instanceof Error && path === "/session") throw response;
      return structuredClone(response instanceof Error ? session() : response);
    },
  };
}

test("API usa cookies del mismo origen, no-cache y CSRF para mutaciones, sin exigirlo al login", async () => {
  const calls = [];
  const api = new OrbitApiClient({ fetchImpl: async (path, options) => {
    calls.push({ path, options });
    return { ok: true, status: 200, json: async () => session() };
  } });
  await assert.rejects(api.request("/courses/course-a/maintenance", { method: "PUT", body: { enabled: true } }), { code: "authentication-required" });
  assert.equal(calls.length, 0);
  const result = await api.request("/login", { method: "POST", body: { alias: "Alicia", password: "temporary-test-value" } });
  assert.equal(calls[0].options.headers["X-Orbit-CSRF"], undefined);
  api.setSession(result);
  await api.request("/courses/course-a/maintenance", { method: "PUT", body: { enabled: true } });
  assert.equal(calls[1].options.headers["X-Orbit-CSRF"], result.csrfToken);
  assert.equal(calls[1].options.credentials, "same-origin");
  assert.equal(calls[1].options.cache, "no-store");
  assert.deepEqual(JSON.parse(calls[1].options.body), { enabled: true });
  await api.request("/logout", { method: "POST" });
  assert.equal(api.session, null);
  await assert.rejects(api.request("https://elsewhere.test/session"), TypeError);
  await assert.rejects(api.request("/../session"), TypeError);
  assert.throws(() => new OrbitApiClient({ baseUrl: "https://elsewhere.test" }), TypeError);
});

test("errores de red, autorización y respuestas inválidas quedan separados", async () => {
  const network = new OrbitApiClient({ fetchImpl: async () => { throw new Error("offline"); } });
  await assert.rejects(network.request("/session"), { code: "network-unavailable", status: 0 });
  const rejected = new OrbitApiClient({ fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ error: { code: "authentication-required", message: "Ingresa de nuevo" } }) }) });
  rejected.setSession(session());
  await assert.rejects(rejected.request("/session"), { code: "authentication-required", status: 401 });
  assert.equal(rejected.session, null);
  const malformed = new OrbitApiClient({ fetchImpl: async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError(); } }) });
  await assert.rejects(malformed.request("/session"), { code: "invalid-response" });
});

test("validación de identidad limita estudiante a un curso y separa el scope sin colisiones", () => {
  const valid = session();
  const cloned = validateOnlineSession(valid, "server-a");
  cloned.user.alias = "Otra";
  assert.equal(valid.user.alias, "Alicia");
  assert.throws(() => validateOnlineSession(valid, "server-b"), /servidor/);
  assert.throws(() => validateOnlineSession({ ...valid, user: { ...valid.user, courseIds: ["course-a", "course-b"] } }, "server-a"), /matrícula/);
  assert.throws(() => validateOnlineSession({ ...valid, courses: [{ ...course, id: "foreign" }] }, "server-a"), /autorizados/);
  assert.throws(() => validateOnlineSession(session("teacher"), "server-a", { offline: true }), /matrícula/);
  assert.notEqual(createOnlineScope("a:b", "c", "d"), createOnlineScope("a", "b:c", "d"));
  assert.throws(() => createOnlineScope("a", "", "d"), TypeError);
});

test("página estática no inicia autenticación y marcador incompleto no degrada a modo local", async (t) => {
  const { doc, win } = dom(t, { online: false });
  const api = fakeApi();
  assert.equal(await resolveOnlineContext({ documentRef: doc, windowRef: win, api }), null);
  assert.equal(api.calls.length, 0);
  const meta = doc.createElement("meta"); meta.setAttribute("name", "orbit-mode"); meta.setAttribute("content", "online"); doc.body.append(meta);
  assert.throws(() => readOnlineMarkers(doc), /servidor/);
});

test("cuenta autenticada ignora permisos query y elige solo su curso", async (t) => {
  const { doc, win, app, events } = dom(t, { search: "?profile=teacher&debug=1" });
  const api = fakeApi();
  const context = await resolveOnlineContext({ documentRef: doc, windowRef: win, api });
  assert.equal(context.profile, "student");
  assert.equal(context.scope, "server-a:student-a:course-a");
  assert.equal(app.inert, false);
  assert.match(win.location.href, /course=course-a/);
  assert.doesNotMatch(win.location.href, /profile|debug/);
  assert.ok(events.includes("wait-for-input"));
  assert.match(doc.body.textContent, /no se guardan contraseñas/);
});

test("curso ajeno en URL obliga a seleccionar uno autorizado", async (t) => {
  const { doc, win, app } = dom(t, { search: "?course=foreign" });
  const pending = resolveOnlineContext({ documentRef: doc, windowRef: win, api: fakeApi() });
  await tick();
  assert.equal(app.inert, true);
  assert.match(doc.body.textContent, /no está disponible para esta cuenta/);
  doc.querySelectorAll("button").find((button) => button.textContent === course.title).dispatch("click");
  const context = await pending;
  assert.equal(context.course.id, course.id);
});

test("login limpia contraseña y mantiene la interfaz cerrada hasta autorización", async (t) => {
  const { doc, win, app } = dom(t);
  const api = fakeApi(new OrbitApiError("authentication-required", "Ingresa", { status: 401 }));
  const pending = resolveOnlineContext({ documentRef: doc, windowRef: win, api });
  await tick();
  assert.equal(app.inert, true);
  const password = doc.querySelector('input[type="password"]');
  doc.querySelector('input[type="text"]').value = " Alicia ";
  password.value = "temporary-test-value";
  doc.querySelector("form").dispatch("submit");
  const context = await pending;
  assert.equal(context.profile, "student");
  assert.deepEqual(api.calls[1].body, { alias: "Alicia", password: "temporary-test-value" });
  assert.equal(password.value, "");
  assert.equal(app.inert, false);
});

for (const status of [401, 403, 423]) test(`rechazo HTTP ${status} nunca abre la copia offline`, async (t) => {
  const { doc, win, app } = dom(t);
  let providerCalls = 0;
  void resolveOnlineContext({ documentRef: doc, windowRef: win, api: fakeApi(new OrbitApiError("denied", "Acceso rechazado", { status })), offlineProvider: async () => { providerCalls++; return {}; } });
  await tick();
  assert.equal(providerCalls, 0);
  assert.equal(app.inert, true);
  assert.match(doc.body.textContent, /Ingresar a ORBIT/);
});

test("estudio offline exige consentimiento con identidad visible; Editor no abre esa copia", async (t) => {
  const { doc, win, app } = dom(t);
  const api = fakeApi(new OrbitApiError("network-unavailable", "Sin red"));
  const cachedSession = session(); delete cachedSession.csrfToken;
  const provider = async () => ({ session: cachedSession, course, offline: true });
  const pending = resolveOnlineContext({ documentRef: doc, windowRef: win, api, offlineProvider: provider });
  await tick();
  assert.equal(app.inert, true);
  doc.querySelectorAll("button").find((button) => button.textContent === "Continuar sin conexión como Alicia").dispatch("click");
  const context = await pending;
  assert.equal(context.offline, true);
  assert.equal(context.profile, "student");
  assert.equal(context.session.csrfToken, undefined);
  let called = false;
  void resolveOnlineContext({ target: "editor", documentRef: doc, windowRef: win, api, offlineProvider: async () => { called = true; } });
  await tick();
  assert.equal(called, false);
  assert.match(doc.querySelector("#orbit-online-access").textContent, /Ingresar a ORBIT/);
});

test("la sesión usa la cabecera y conserva el cierre y los avisos al reconectar", (t) => {
  const { doc, win, app } = dom(t);
  const context = { session: session(), course, profile: "student", scope: "scope", offline: true, api: fakeApi() };
  const controls = mountOnlineSession(context, { documentRef: doc, windowRef: win });
  const trigger = app.querySelector(".online-session-trigger");
  const dialog = doc.querySelector("#orbit-online-session");
  assert.equal(trigger.textContent, "Sin conexión");
  assert.match(dialog.textContent, /Cerrar acceso offline/);
  assert.equal(trigger.getAttribute("aria-haspopup"), "dialog");
  assert.equal(trigger.getAttribute("aria-controls"), dialog.id);
  context.offline = false;
  context.setSyncStatus({ state: "connected", message: "Sincronizado", pendingCount: 2 });
  assert.equal(trigger.textContent, "Online · 2");
  assert.match(app.querySelector('[role="status"]').textContent, /2 pendientes/);
  trigger.dispatch("click");
  assert.equal(dialog.open, true);
  assert.match(dialog.textContent, /Alicia/);
  assert.match(dialog.textContent, /Datos de este dispositivo/);
  assert.match(dialog.textContent, /Cerrar sesión/);
  assert.doesNotMatch(dialog.textContent, /Curso A/);
  context.requireOnlineAccess(new Error("Mantenimiento"));
  context.requireOnlineAccess(new Error("Mantenimiento"));
  assert.equal(doc.querySelectorAll('[data-reload-access="true"]').length, 1);
  assert.equal(trigger.textContent, "Revisar sesión");
  dialog.close();
  assert.equal(doc.activeElement, trigger);
  controls.destroy();
  assert.equal(app.querySelector(".online-session-trigger"), null);
  assert.equal(doc.querySelector("#orbit-online-session"), null);
  assert.equal(doc.body.classList.contains("has-online-session"), false);
});

test("logout avisa al runtime antes de revocar y conserva pendientes al retirar solo acceso offline", async () => {
  const order = [];
  const win = { CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } }, dispatchEvent: (event) => order.push(event), location: { reload: () => order.push("reload") } };
  const api = { request: async () => order.push("logout"), setSession: (value) => order.push(value) };
  const context = { scope: "scope-a", session: session(), api, offline: false };
  const forget = async (id) => order.push(`forget:${id}`);
  await endOnlineSession(context, { windowRef: win, forget });
  assert.equal(order[0].type, "orbit-online-session-ended");
  assert.equal(order[0].detail.scope, "scope-a");
  assert.deepEqual(order.slice(1), ["forget:server-a", "logout", null, "reload"]);
  order.length = 0;
  await endOnlineSession({ ...context, offline: true }, { windowRef: win, forget });
  assert.ok(!order.includes("logout"));
});

test("logout retira acceso offline aunque la sesión remota haya caducado o la red falle", async () => {
  for (const failure of [
    new OrbitApiError("authentication-required", "Sesión caducada", { status: 401 }),
    new OrbitApiError("network-unavailable", "Sin conexión"),
  ]) {
    const events = [];
    const win = { CustomEvent: class { constructor(type) { this.type = type; } }, dispatchEvent: (event) => events.push(event.type), location: { reload: () => events.push("reload") } };
    const api = { request: async () => { events.push("logout"); throw failure; }, setSession: (value) => events.push(value) };
    const context = { scope: "scope-a", session: session(), api, offline: false };
    const closing = endOnlineSession(context, { windowRef: win, forget: async () => events.push("revoked-offline") });
    if (failure.status === 401) {
      await closing;
      assert.deepEqual(events, ["orbit-online-session-ended", "revoked-offline", "logout", null, "reload"]);
    } else {
      await assert.rejects(closing, { code: "logout-incomplete" });
      assert.deepEqual(events, ["orbit-online-session-ended", "revoked-offline", "logout"]);
    }
  }
});

test("logout intenta revocar la sesión remota pero no anuncia cierre local si el almacenamiento falla", async () => {
  const events = [];
  const api = { request: async () => events.push("logout"), setSession: (value) => events.push(value) };
  const win = { dispatchEvent() {}, location: { reload: () => events.push("reload") } };
  await assert.rejects(endOnlineSession({ session: session(), api, offline: false }, {
    windowRef: win, forget: () => { throw new Error("storage unavailable"); },
  }), /No se pudo cerrar de forma verificable/);
  assert.deepEqual(events, ["logout"]);
});

test("administración separada crea docentes y cursos con responsables sin retener contraseñas", async (t) => {
  const { doc, element } = dom(t);
  const root = element("section");
  const api = { calls: [], async request(path, options = {}) { this.calls.push({ path, ...structuredClone(options) }); return { users: [{ id: "teacher-a", alias: "Docente", role: "teacher" }], courses: [] }; } };
  assert.throws(() => mountAdminPanel({ api, root, session: session(), documentRef: doc }), /administradora/);
  const panel = mountAdminPanel({ api, root, session: session("admin"), documentRef: doc });
  await tick();
  const teacherForm = root.querySelectorAll("form")[0];
  teacherForm.querySelector('input[type="text"]').value = "Docente nuevo";
  const password = teacherForm.querySelector('input[type="password"]'); password.value = "temporary-test-value";
  teacherForm.dispatch("submit"); await tick();
  assert.equal(password.value, "");
  assert.ok(api.calls.some((call) => call.path === "/admin/teachers" && call.body.alias === "Docente nuevo"));
  const createCourse = root.querySelectorAll("form").find((form) => form.textContent.includes("Crear curso"));
  createCourse.querySelector('input[type="text"]').value = "Curso nuevo";
  createCourse.dispatch("submit"); await tick();
  assert.ok(!api.calls.some((call) => call.path === "/admin/courses"));
  createCourse.querySelector('input[type="checkbox"]').checked = true;
  createCourse.dispatch("submit"); await tick();
  assert.deepEqual(api.calls.find((call) => call.path === "/admin/courses").body, { title: "Curso nuevo", teacherIds: ["teacher-a"] });
  panel.destroy();
});
