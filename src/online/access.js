import { OrbitApiClient, OrbitApiError, createOnlineScope } from "./api-client.js";
import { forgetOfflineAccess } from "./offline-store.js";
import { mountAdminPanel } from "./admin-panel.js";
import { action, announce, field, node, setFormBusy, status } from "./ui.js";

export function readOnlineMarkers(documentRef) {
  const mode = documentRef?.querySelector('meta[name="orbit-mode"]')?.getAttribute("content");
  if (mode !== "online") return null;
  const serverId = documentRef.querySelector('meta[name="orbit-server-id"]')?.getAttribute("content");
  if (typeof serverId !== "string" || !serverId.trim() || serverId.length > 200) {
    throw new OrbitApiError("invalid-server-identity", "No se pudo identificar el servidor de este acceso.");
  }
  return { serverId };
}

export function validateOnlineSession(candidate, serverId, { offline = false } = {}) {
  if (!candidate || candidate.serverId !== serverId
    || !candidate.user || typeof candidate.user.id !== "string" || !candidate.user.id
    || typeof candidate.user.alias !== "string" || !candidate.user.alias
    || !["student", "teacher", "admin"].includes(candidate.user.role)
    || !Array.isArray(candidate.user.courseIds) || !Array.isArray(candidate.courses)
    || (!offline && (typeof candidate.csrfToken !== "string" || !candidate.csrfToken))) {
    throw new OrbitApiError("invalid-session", "La sesión no coincide con este servidor o no es válida.", { status: 502 });
  }
  const user = candidate.user;
  if (user.courseIds.some((id) => typeof id !== "string" || !id)
    || (user.role === "student" && user.courseIds.length !== 1)
    || (offline && user.role !== "student")) {
    throw new OrbitApiError("invalid-session", "La sesión no contiene una matrícula válida.", { status: 502 });
  }
  const seen = new Set();
  for (const course of candidate.courses) {
    if (!course || typeof course.id !== "string" || !course.id || seen.has(course.id)
      || typeof course.title !== "string" || typeof course.revision !== "string"
      || typeof course.maintenance !== "boolean"
      || (user.role !== "admin" && !user.courseIds.includes(course.id))) {
      throw new OrbitApiError("invalid-session", "La lista de cursos autorizados no es válida.", { status: 502 });
    }
    seen.add(course.id);
  }
  return structuredClone(candidate);
}

function prepareAccessShell(documentRef, windowRef) {
  const app = documentRef.querySelector("#app");
  if (app) app.inert = true;
  const loading = documentRef.querySelector("#loading-screen");
  if (loading) loading.hidden = true;
  if (typeof windowRef.OrbitStartup?.waitForInput === "function") windowRef.OrbitStartup.waitForInput();
  else windowRef.OrbitStartup?.ready();
  let shell = documentRef.querySelector("#orbit-online-access");
  if (!shell) {
    shell = node(documentRef, "section", { id: "orbit-online-access", className: "online-access", "aria-label": "Acceso a ORBIT" });
    documentRef.body.append(shell);
  }
  return shell;
}

function releaseAccessShell(shell, documentRef) {
  shell?.remove();
  const app = documentRef.querySelector("#app");
  if (app) app.inert = false;
}

function sessionEnded(windowRef, scope) {
  const EventClass = windowRef.CustomEvent ?? globalThis.CustomEvent;
  if (EventClass) windowRef.dispatchEvent(new EventClass("orbit-online-session-ended", { detail: { scope } }));
}

export async function endOnlineSession(context, { windowRef = window, forget = forgetOfflineAccess } = {}) {
  sessionEnded(windowRef, context.scope ?? null);
  let localError = null;
  let remoteError = null;
  try { await forget(context.session.serverId); }
  catch (error) { localError = error; }
  if (!context.offline) {
    try { await context.api.request("/logout", { method: "POST" }); }
    catch (error) { if (error.status !== 401) remoteError = error; }
  }
  if (localError) {
    throw new Error("No se pudo cerrar de forma verificable el acceso offline de este dispositivo. Reintenta antes de compartirlo.", { cause: localError });
  }
  if (remoteError) {
    throw new OrbitApiError("logout-incomplete", "El acceso offline de este dispositivo quedó cerrado. No se pudo confirmar el cierre de la sesión del servidor. Reintenta con conexión o cierra esta ventana.", { status: remoteError.status, cause: remoteError });
  }
  context.api.setSession(null);
  windowRef.location.reload();
}

export function mountOnlineSessionBar(context, { documentRef = document, windowRef = window } = {}) {
  documentRef.querySelector("#orbit-online-session")?.remove();
  const bar = node(documentRef, "section", { id: "orbit-online-session", className: "online-session", "aria-label": "Sesión y conexión" });
  const state = status(documentRef);
  announce(state, context.offline ? "Sin conexión. El avance se sincronizará al reconectar." : "Conectado al servidor.");
  bar.append(node(documentRef, "strong", { text: `${context.session.user.alias} · ${context.course.title}` }), state);
  const actions = node(documentRef, "div", { className: "online-actions" });
  if (context.session.courses.length > 1 && !context.offline) {
    actions.append(action(documentRef, "Cambiar curso", () => {
      sessionEnded(windowRef, context.scope);
      const url = new URL(windowRef.location.href);
      url.searchParams.delete("course");
      url.searchParams.set("chooseCourse", "1");
      windowRef.location.assign(url.href);
    }));
  }
  const logout = action(documentRef, context.offline ? "Cerrar acceso offline" : "Cerrar sesión", async () => {
    logout.disabled = true;
    try { await endOnlineSession(context, { windowRef }); }
    catch (error) {
      announce(state, `${error.message} Recarga para continuar o vuelve a intentar cerrar la sesión.`, true);
      logout.disabled = false;
    }
  });
  actions.append(logout);
  const privacy = node(documentRef, "details", { className: "online-local-data" }, [
    node(documentRef, "summary", { text: "Datos de este dispositivo" }),
    node(documentRef, "p", { text: context.profile === "student"
      ? "El curso y tu avance se guardan en este dispositivo; no se guardan contraseñas. Cerrar acceso conserva avances pendientes para esta cuenta. La preparación de la aplicación sin conexión se comprueba en Aplicación."
      : "El borrador se guarda en este dispositivo, separado por servidor, cuenta y curso. No se guardan contraseñas. Exporta el borrador si necesitas trasladarlo a otro dispositivo." }),
  ]);
  const offlineNotice = node(documentRef, "small", { text: "Cerrar el acceso offline bloquea esta copia. La sesión del servidor solo puede revocarse con conexión." });
  offlineNotice.hidden = !context.offline;
  bar.append(offlineNotice);
  bar.append(actions, privacy);
  bar.addEventListener("keydown", (event) => event.stopPropagation());
  bar.addEventListener("keyup", (event) => event.stopPropagation());
  privacy.addEventListener("toggle", () => {
    if (windowRef.Event) windowRef.dispatchEvent(new windowRef.Event("resize"));
  });
  documentRef.body.classList.add("has-online-session");
  documentRef.body.append(bar);
  context.setSyncStatus = ({ state: syncState, message, pendingCount } = {}) => {
    logout.textContent = context.offline ? "Cerrar acceso offline" : "Cerrar sesión";
    offlineNotice.hidden = !context.offline;
    bar.dataset.sync = syncState ?? "connected";
    const pending = Number.isInteger(pendingCount) && pendingCount > 0 ? ` ${pendingCount} pendientes de sincronización.` : "";
    announce(state, `${message ?? ""}${pending}`, ["error", "blocked"].includes(syncState));
  };
  context.requireOnlineAccess = (error) => {
    announce(state, error?.message ?? "Vuelve a ingresar para continuar.", true);
    if (!actions.querySelector('[data-reload-access="true"]')) {
      actions.append(action(documentRef, "Recargar / ingresar", () => windowRef.location.reload(), { "data-reload-access": "true" }));
    }
  };
  return { destroy() { bar.remove(); documentRef.body.classList.remove("has-online-session"); } };
}

function loginForm({ api, shell, serverId, documentRef, initialError }) {
  return new Promise((resolve) => {
    const alias = field(documentRef, "Alias", { required: true, autocomplete: "username", maxlength: 80 });
    const password = field(documentRef, "Contraseña", { type: "password", required: true, autocomplete: "current-password", maxlength: 256 });
    const message = status(documentRef);
    const form = node(documentRef, "form", { className: "online-form" }, [
      alias.label, password.label, node(documentRef, "button", { type: "submit", text: "Ingresar" }), message,
    ]);
    shell.replaceChildren(node(documentRef, "h1", { text: "Ingresar a ORBIT" }),
      node(documentRef, "p", { text: "Usa el alias y la contraseña que te entregó tu docente o administrador. No necesitas registrarte." }), form);
    if (initialError) announce(message, initialError.message, true);
    alias.input.focus();
    let busy = false;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (busy) return;
      busy = true;
      setFormBusy(form, true);
      announce(message, "Comprobando acceso…");
      try {
        const result = await api.request("/login", { method: "POST", body: { alias: alias.input.value.trim(), password: password.input.value } });
        const session = validateOnlineSession(result, serverId);
        api.setSession(session);
        resolve(session);
      } catch (error) {
        announce(message, error.message, true);
      } finally {
        password.input.value = "";
        busy = false;
        setFormBusy(form, false);
      }
    });
  });
}

function selectCourse({ session, shell, documentRef, windowRef, requestedCourseId, forceChoice, onLogout }) {
  const requested = session.courses.find((course) => course.id === requestedCourseId);
  const allowedNow = (course) => session.user.role !== "student" || !course.maintenance;
  if (!forceChoice && requested && allowedNow(requested)) return Promise.resolve(requested);
  if (!forceChoice && !requestedCourseId && session.courses.length === 1 && allowedNow(session.courses[0])) {
    return Promise.resolve(session.courses[0]);
  }
  return new Promise((resolve) => {
    const list = node(documentRef, "div", { className: "online-course-list" });
    shell.replaceChildren(node(documentRef, "h1", { text: "Elige un curso" }),
      node(documentRef, "p", { text: `Sesión de ${session.user.alias}.` }), list);
    if (requestedCourseId && !requested) shell.append(node(documentRef, "p", { role: "alert", text: "Ese curso no está disponible para esta cuenta. Elige uno de tus cursos." }));
    if (!session.courses.length) list.append(node(documentRef, "p", { text: "Todavía no tienes cursos asignados. Solicita la asignación al administrador." }));
    for (const course of session.courses) {
      const button = action(documentRef, course.title, () => resolve(course));
      button.disabled = !allowedNow(course);
      list.append(node(documentRef, "div", { className: "online-course-card" }, [button,
        node(documentRef, "span", { text: course.maintenance ? "En mantenimiento" : "Disponible" }),
      ]));
    }
    shell.append(node(documentRef, "div", { className: "online-actions" }, [
      action(documentRef, "Volver a comprobar", () => windowRef.location.reload()),
      action(documentRef, "Cerrar sesión", onLogout),
    ]));
  });
}

export async function resolveOnlineContext({
  target = "orbit", documentRef = globalThis.document, windowRef = globalThis.window,
  offlineProvider = null, api = new OrbitApiClient(),
} = {}) {
  const markers = readOnlineMarkers(documentRef);
  if (!markers) return null;
  const shell = prepareAccessShell(documentRef, windowRef);
  shell.replaceChildren(node(documentRef, "h1", { text: "Conectando con ORBIT…" }));
  const url = new URL(windowRef.location.href);
  const requestedCourseId = url.searchParams.get("course");
  let session;
  try {
    session = validateOnlineSession(await api.request("/session"), markers.serverId);
    api.setSession(session);
  } catch (error) {
    if (error.status === 0 && error.code === "network-unavailable" && target === "orbit" && offlineProvider) {
      const cached = await offlineProvider({ serverId: markers.serverId, courseId: requestedCourseId, target, api, error });
      if (cached) {
        const cachedSession = validateOnlineSession(cached.session, markers.serverId, { offline: true });
        const course = cachedSession.courses.find((entry) => entry.id === cached.course?.id);
        if (!course || (requestedCourseId && course.id !== requestedCourseId)) throw new Error("La copia offline pertenece a otro curso.");
        const useOffline = await new Promise((resolve) => {
          shell.replaceChildren(node(documentRef, "h1", { text: "Sin conexión" }),
            node(documentRef, "p", { text: "Puedes continuar únicamente con la cuenta y el curso descargados en este dispositivo." }),
            action(documentRef, `Continuar sin conexión como ${cachedSession.user.alias}`, () => resolve(true)),
            action(documentRef, "Intentar ingresar online", () => resolve(false)));
        });
        if (useOffline) {
          const context = { ...cached, api, session: cachedSession, course, profile: "student", scope: createOnlineScope(markers.serverId, cachedSession.user.id, course.id), offline: true };
          releaseAccessShell(shell, documentRef);
          mountOnlineSessionBar(context, { documentRef, windowRef });
          return context;
        }
      }
    }
    session = await loginForm({ api, shell, serverId: markers.serverId, documentRef, initialError: error.status === 401 ? null : error });
  }
  const onLogout = async () => {
    try { await endOnlineSession({ api, session, offline: false }, { windowRef }); }
    catch (error) {
      const message = node(documentRef, "p", { role: "alert", text: error.message });
      shell.append(message);
    }
  };
  if (session.user.role === "admin") {
    mountAdminPanel({ api, session, root: shell, documentRef, onLogout });
    return new Promise(() => {});
  }
  const course = await selectCourse({ session, shell, documentRef, windowRef, requestedCourseId, forceChoice: url.searchParams.get("chooseCourse") === "1", onLogout });
  url.searchParams.set("course", course.id);
  url.searchParams.delete("chooseCourse");
  url.searchParams.delete("profile");
  url.searchParams.delete("debug");
  windowRef.history.replaceState(null, "", url.href);
  const context = { api, session, course, profile: session.user.role, scope: createOnlineScope(markers.serverId, session.user.id, course.id), offline: false };
  releaseAccessShell(shell, documentRef);
  mountOnlineSessionBar(context, { documentRef, windowRef });
  return context;
}
