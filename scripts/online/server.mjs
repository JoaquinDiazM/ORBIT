import http from "node:http";
import https from "node:https";
import { randomUUID, createHash, timingSafeEqual } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import { resolve, relative, isAbsolute, extname } from "node:path";
import { createCourseEdition, materializeCourseEdition } from "../../src/core/course-edition.js";
import { findIncompatibleLocationIds, reconcileCompletedLocations, sanitizeCompletedLocations }
  from "../../src/core/course-progress-compatibility.js";
import { isLearningLocation, learningPrerequisiteIds } from "../../src/core/knowledge-graph.js";
import { createWorldIndex, deriveUnlockedAreaIds } from "../../src/core/world-graph.js";
import { ServerStore } from "./store.mjs";
import { apiError, normalizeAlias, validatePassword, hashPassword, verifyPassword,
  newToken, tokenDigest, AttemptLimiter } from "./auth.mjs";

const PREFIX = "/api/orbit";
const SESSION_MS = 8 * 60 * 60_000;
const MAX_BODY = 1024 * 1024;
const TYPES = new Map(Object.entries({ ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ogg": "audio/ogg",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".txt": "text/plain; charset=utf-8" }));

function exactFields(body, allowed) {
  if (!body || typeof body !== "object" || Array.isArray(body)
    || Object.keys(body).some((key) => !allowed.includes(key))) {
    throw apiError(400, "invalid-input", "La solicitud contiene campos no admitidos.");
  }
}
function title(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 160) {
    throw apiError(400, "invalid-input", "El título debe tener entre 1 y 160 caracteres.");
  }
  return value.trim();
}
function sameText(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const first = Buffer.from(a); const second = Buffer.from(b);
  return first.length === second.length && timingSafeEqual(first, second);
}
function within(root, path) { const rel = relative(root, path); return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel)); }
function viewUser(user, state) {
  return { id: user.id, alias: user.alias, role: user.role,
    courseIds: user.role === "student" ? [user.courseId]
      : state.courses.filter((course) => user.role === "admin" || course.teacherIds.includes(user.id)).map(({ id }) => id) };
}
function viewCourse(course, user) {
  return { id: course.id, title: course.title, revision: course.edition.revision, maintenance: course.maintenance,
    ...(user.role === "student" ? {} : { teacherIds: [...course.teacherIds] }) };
}
function progressOf(state, user, course) {
  const progress = state.progress.find((entry) => entry.userId === user.id);
  return { serverId: state.serverId, userId: user.id, courseId: course.id, generation: `${state.epoch}:${user.generation}`,
    revision: course.edition.revision, completedLocations: [...progress.completedLocations] };
}
function authorizeCourse(state, user, id, { teacher = false, student = false } = {}) {
  const course = state.courses.find((entry) => entry.id === id);
  const permitted = course && (user.role === "teacher" ? course.teacherIds.includes(user.id)
    : user.role === "student" ? user.courseId === course.id : false);
  if (!permitted || (teacher && user.role !== "teacher") || (student && user.role !== "student")) {
    throw apiError(403, "access-denied", "No tienes acceso a ese curso o a esa operación.");
  }
  if (user.role === "student" && course.maintenance) {
    throw apiError(423, "course-maintenance", "El curso está en mantenimiento. Tu avance local se conserva.");
  }
  return course;
}
function requireAdmin(user) {
  if (user.role !== "admin") throw apiError(403, "access-denied", "La operación requiere administración del servidor.");
}
function ensureAliasAvailable(state, alias) {
  if (state.users.some((user) => user.alias === alias)) throw apiError(409, "alias-unavailable", "Ese alias ya está en uso.");
}
function teacherIds(state, ids) {
  if (!Array.isArray(ids) || !ids.length || ids.length > 50 || new Set(ids).size !== ids.length
    || ids.some((id) => !state.users.some((user) => user.id === id && user.role === "teacher"))) {
    throw apiError(400, "invalid-input", "Selecciona al menos un docente válido, sin duplicados.");
  }
  return [...ids];
}
function assertCompleted(completed, materialized, preserved = []) {
  if (!Array.isArray(completed) || completed.length > 10000
    || completed.some((id) => typeof id !== "string" || id.length > 160)
    || new Set(completed).size !== completed.length) throw apiError(400, "invalid-input", "Finalizaciones inválidas.");
  const sanitized = sanitizeCompletedLocations(completed, materialized.locations);
  if (sanitized.length !== completed.length) throw apiError(400, "invalid-progress", "El avance incluye lugares desconocidos o no progresivos.");
  const ids = new Set(completed);
  const established = new Set(preserved);
  const unlocked = deriveUnlockedAreaIds({ areas: materialized.areas, locations: materialized.locations,
    worldIndex: createWorldIndex(materialized.areas), completedLocations: ids });
  for (const location of materialized.locations) {
    if (ids.has(location.id) && ((!established.has(location.id) && !unlocked.has(location.areaId))
      || (isLearningLocation(location) && !learningPrerequisiteIds(location).every((id) => ids.has(id))))) {
      throw apiError(400, "invalid-progress", "El avance no respeta los prerrequisitos o la apertura de zonas.");
    }
  }
  return sanitized;
}

async function publicationPlan(state, course, body) {
  if (body.baseRevision !== course.edition.revision) throw apiError(409, "revision-conflict", "La edición cambió. Recarga y vuelve a validar.");
  const previous = await materializeCourseEdition(course.edition);
  let edition;
  try {
    edition = await createCourseEdition(body.document, { previousRevision: course.edition.revision,
      courseId: previous.editorDocument.courseId, baseDocument: previous.editorDocument,
      trustedNextLocationSequence: previous.editorDocument.nextLocationSequence });
  } catch (error) {
    throw apiError(400, "invalid-document", "El documento no supera la validación del curso.", { issues: error.issues ?? [] });
  }
  const next = await materializeCourseEdition(edition);
  const invalidated = findIncompatibleLocationIds(previous.locations, next.locations);
  const invalidSet = new Set(invalidated);
  const affectedStudentCount = state.progress.filter((progress) => progress.courseId === course.id
    && progress.completedLocations.some((id) => invalidSet.has(id))).length;
  const requiresDecision = invalidated.length > 0;
  const plan = { baseRevision: course.edition.revision, revision: edition.revision,
    incompatibleLocationIds: invalidated, affectedStudentCount, requiresDecision,
    summary: requiresDecision
      ? `${invalidated.length} actividades incompatibles; ${affectedStudentCount} estudiantes tienen finalizaciones afectadas. Se conservará el resto del avance.`
      : "La edición conserva las finalizaciones existentes." };
  const planDigest = createHash("sha256").update(JSON.stringify({ courseId: course.id, ...plan })).digest("hex");
  return { plan: { ...plan, planDigest }, edition, next };
}

async function readBody(request) {
  if (request.headers["content-type"]?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw apiError(415, "json-required", "La solicitud requiere JSON.");
  }
  if (Number(request.headers["content-length"]) > MAX_BODY) throw apiError(413, "body-too-large", "La solicitud supera 1 MiB.");
  let length = 0; const chunks = [];
  for await (const chunk of request) {
    length += chunk.length;
    if (length > MAX_BODY) throw apiError(413, "body-too-large", "La solicitud supera 1 MiB.");
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw apiError(400, "invalid-json", "El cuerpo no contiene JSON válido."); }
}

export async function createOrbitServer({
  dataDirectory, distDirectory, host = "127.0.0.1", port = 0, publicOrigin = null,
  tls = null, templateEdition = null, clock = Date.now, sessionMs = SESSION_MS,
} = {}) {
  const dist = await realpath(resolve(distDirectory));
  const store = await ServerStore.open(dataDirectory);
  let server;
  try {
    if (within(dist, store.lock.root) || within(store.lock.root, dist)) {
      throw apiError(400, "unsafe-data-directory", "El directorio privado y dist deben estar separados.");
    }
    const template = await materializeCourseEdition(templateEdition ?? JSON.parse(await readFile(
      resolve(dist, "public/data/courses/electromagnetism-applied.edition.json"), "utf8")));
    const sessions = new Map();
    const limiter = new AttemptLimiter({ clock });
    const ipLimiter = new AttemptLimiter({ limit: 50, clock });
    const dummy = await hashPassword(newToken());
    let origin;
    let cookieName;
    if (publicOrigin) {
      const parsed = new URL(publicOrigin);
      if (parsed.origin !== publicOrigin || !["http:", "https:"].includes(parsed.protocol)
        || parsed.username || parsed.password || (parsed.protocol === "https:") !== Boolean(tls)) {
        throw apiError(400, "invalid-origin", "El origen público exacto debe coincidir con HTTP/TLS.");
      }
      origin = parsed.origin;
    }
    if (!tls && (!(["127.0.0.1", "::1"].includes(host))
      || (origin && !["127.0.0.1", "[::1]"].includes(new URL(origin).hostname)))) {
      throw apiError(400, "https-required", "HTTP solo está permitido en loopback. Configura TLS para red o Internet.");
    }
    if (!origin && (tls || !["127.0.0.1", "::1"].includes(host))) throw apiError(400, "invalid-origin", "La red requiere un origen público explícito.");
    const security = (response) => {
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("X-Content-Type-Options", "nosniff");
      response.setHeader("Referrer-Policy", "no-referrer");
      response.setHeader("X-Frame-Options", "DENY");
      response.setHeader("Content-Security-Policy", "frame-ancestors 'none'; base-uri 'self'; object-src 'none'");
      if (tls) response.setHeader("Strict-Transport-Security", "max-age=31536000");
    };
    const json = (response, status, value) => {
      response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify(value));
    };
    const cookie = (token, expire = false) => `${cookieName}=${token}; Path=/api/orbit/; HttpOnly; SameSite=Strict; Max-Age=${expire ? 0 : Math.floor(sessionMs / 1000)}${tls ? "; Secure" : ""}`;
    const pruneSessions = () => {
      for (const [key, session] of sessions) if (session.expires <= clock()) sessions.delete(key);
    };
    const authenticate = (request, state) => {
      pruneSessions();
      const cookies = String(request.headers.cookie ?? "").split(";").map((entry) => entry.trim());
      const matches = cookies.filter((entry) => entry.startsWith(`${cookieName}=`));
      const token = matches.length === 1 ? matches[0].slice(cookieName.length + 1) : "";
      const key = tokenDigest(token); const session = sessions.get(key);
      const user = session && state.users.find((entry) => entry.id === session.userId
        && entry.sessionVersion === session.version && state.epoch === session.epoch);
      if (!user) throw apiError(401, "authentication-required", "Ingresa con tu cuenta para continuar.");
      return { user, session, key };
    };
    const sessionView = (state, user, session) => ({ serverId: state.serverId,
      user: viewUser(user, state), csrfToken: session.csrf,
      courses: state.courses.filter((course) => user.role === "admin"
        || (user.role === "teacher" ? course.teacherIds.includes(user.id) : user.courseId === course.id))
        .map((course) => viewCourse(course, user)) });
    const revokeUser = (id) => { for (const [key, session] of sessions) if (session.userId === id) sessions.delete(key); };

    const handleApi = async (request, response, path) => {
      const method = request.method;
      const mutation = !["GET", "HEAD"].includes(method);
      if (mutation && request.headers.origin !== origin) throw apiError(403, "origin-rejected", "Origen de solicitud no permitido.");
      if (method === "OPTIONS" || method === "HEAD") throw apiError(405, "method-not-allowed", "Método no admitido.");
      const state = store.snapshot();
      if (path === "/login" && method === "POST") {
        ipLimiter.take(request.socket.remoteAddress ?? "unknown");
        const body = await readBody(request); exactFields(body, ["alias", "password"]);
        const alias = normalizeAlias(body.alias);
        limiter.take(alias);
        if (typeof body.password !== "string" || body.password.length > 256) throw apiError(401, "invalid-credentials", "Alias o contraseña incorrectos.");
        const user = state.users.find((entry) => entry.alias === alias);
        const valid = await verifyPassword(body.password, user?.password ?? dummy);
        const current = store.snapshot();
        if (!user || !valid || !current.users.some((entry) => entry.id === user.id && entry.sessionVersion === user.sessionVersion)
          || current.epoch !== state.epoch) throw apiError(401, "invalid-credentials", "Alias o contraseña incorrectos.");
        pruneSessions();
        if (sessions.size >= 2000) throw apiError(503, "session-capacity", "No se pueden abrir más sesiones en este momento.");
        const token = newToken(); const session = { userId: user.id, version: user.sessionVersion,
          epoch: state.epoch, csrf: newToken(), expires: clock() + sessionMs };
        sessions.set(tokenDigest(token), session);
        response.setHeader("Set-Cookie", cookie(token));
        return json(response, 200, sessionView(current, user, session));
      }
      const auth = authenticate(request, state);
      if (mutation && !sameText(request.headers["x-orbit-csrf"], auth.session.csrf)) {
        throw apiError(403, "csrf-rejected", "La sesión de la solicitud no coincide. Vuelve a ingresar.");
      }
      const body = mutation ? await readBody(request) : null;
      if (path === "/session" && method === "GET") return json(response, 200, sessionView(state, auth.user, auth.session));
      if (path === "/logout" && method === "POST") {
        exactFields(body, []); sessions.delete(auth.key); response.setHeader("Set-Cookie", cookie("", true));
        return json(response, 200, { ok: true });
      }
      if (path === "/admin/overview" && method === "GET") {
        requireAdmin(auth.user);
        return json(response, 200, { users: state.users.map((user) => viewUser(user, state)),
          courses: state.courses.map((course) => viewCourse(course, auth.user)) });
      }
      // Every mutation checks the live identity/authorization again inside the serialized transaction.
      const mutate = (operation, options) => store.transact(async (draft) => {
        const current = authenticate(request, draft);
        return operation(draft, current.user);
      }, options);
      if (path === "/admin/teachers" && method === "POST") {
        requireAdmin(auth.user); exactFields(body, ["alias", "password"]);
        const alias = normalizeAlias(body.alias); const password = await hashPassword(body.password);
        const user = await mutate((draft, actor) => {
          requireAdmin(actor); ensureAliasAvailable(draft, alias);
          const created = { id: randomUUID(), alias, password, role: "teacher", courseId: null,
            generation: randomUUID(), sessionVersion: 1 };
          draft.users.push(created); return viewUser(created, draft);
        });
        return json(response, 201, { user });
      }
      const teacherPassword = /^\/admin\/teachers\/([a-f0-9-]+)\/password$/.exec(path);
      if (teacherPassword && method === "POST") {
        requireAdmin(auth.user); exactFields(body, ["password"]); const password = await hashPassword(body.password);
        await mutate((draft, actor) => {
          requireAdmin(actor); const user = draft.users.find((entry) => entry.id === teacherPassword[1] && entry.role === "teacher");
          if (!user) throw apiError(404, "not-found", "No existe ese docente.");
          user.password = password; user.sessionVersion += 1;
        });
        revokeUser(teacherPassword[1]); return json(response, 200, { ok: true });
      }
      if (path === "/admin/courses" && method === "POST") {
        requireAdmin(auth.user); exactFields(body, ["title", "teacherIds", "document"]);
        const courseTitle = title(body.title);
        let edition = structuredClone(template.edition);
        if (body.document !== undefined) {
          try { edition = await createCourseEdition(body.document, { courseId: template.editorDocument.courseId,
            baseDocument: template.editorDocument, trustedNextLocationSequence: template.editorDocument.nextLocationSequence }); }
          catch (error) { throw apiError(400, "invalid-document", "El curso importado no es válido.", { issues: error.issues ?? [] }); }
        }
        const course = await mutate((draft, actor) => {
          requireAdmin(actor);
          const created = { id: randomUUID(), title: courseTitle, teacherIds: teacherIds(draft, body.teacherIds),
            maintenance: true, edition, compatibility: [] };
          draft.courses.push(created); return viewCourse(created, actor);
        });
        return json(response, 201, { course });
      }
      const assignments = /^\/admin\/courses\/([a-f0-9-]+)\/teachers$/.exec(path);
      if (assignments && method === "PUT") {
        requireAdmin(auth.user); exactFields(body, ["teacherIds"]);
        const course = await mutate((draft, actor) => {
          requireAdmin(actor); const found = draft.courses.find((entry) => entry.id === assignments[1]);
          if (!found) throw apiError(404, "not-found", "No existe ese curso.");
          found.teacherIds = teacherIds(draft, body.teacherIds); return viewCourse(found, actor);
        });
        return json(response, 200, { course });
      }
      const match = /^\/courses\/([a-f0-9-]+)\/(edition|progress|students|maintenance|validate|publish)(?:\/([a-f0-9-]+)(\/password)?)?$/.exec(path);
      if (!match) throw apiError(404, "not-found", "No existe esa operación.");
      const [, courseId, action, targetId, passwordSuffix] = match;
      const course = authorizeCourse(state, auth.user, courseId);
      if (action === "edition" && method === "GET" && !targetId) {
        return json(response, 200, { serverId: state.serverId, userId: auth.user.id,
          course: viewCourse(course, auth.user), edition: course.edition, compatibility: course.compatibility });
      }
      if (action === "progress" && !targetId) {
        authorizeCourse(state, auth.user, courseId, { student: true });
        if (method === "GET") return json(response, 200, progressOf(state, auth.user, course));
        if (method === "PUT") {
          exactFields(body, ["generation", "revision", "completedLocations"]);
          const progress = await mutate(async (draft, user) => {
            const currentCourse = authorizeCourse(draft, user, courseId, { student: true });
            const current = progressOf(draft, user, currentCourse);
            if (body.generation !== current.generation) throw apiError(409, "progress-generation-mismatch", "La cuenta o su restauración cambió. No se incorporó el avance anterior.", { progress: current });
            if (typeof body.revision !== "string" || !Array.isArray(body.completedLocations)
              || body.completedLocations.length > 10000 || new Set(body.completedLocations).size !== body.completedLocations.length
              || body.completedLocations.some((id) => typeof id !== "string" || id.length > 160)) {
              throw apiError(400, "invalid-input", "El avance enviado no es válido.");
            }
            const loaded = await materializeCourseEdition(currentCourse.edition);
            const saved = draft.progress.find((entry) => entry.userId === user.id);
            let incoming;
            if (body.revision === currentCourse.edition.revision) incoming = assertCompleted(body.completedLocations, loaded, saved.completedLocations);
            else {
              const historicalIds = new Set([...loaded.locations.map(({ id }) => id),
                ...currentCourse.compatibility.flatMap((step) => step.invalidatedLocationIds)]);
              if (body.completedLocations.some((id) => !historicalIds.has(id))) throw apiError(400, "invalid-progress", "El avance incluye lugares desconocidos.");
              try { incoming = reconcileCompletedLocations({ completedLocations: body.completedLocations,
                fromRevision: body.revision, toRevision: currentCourse.edition.revision,
                compatibility: currentCourse.compatibility, locations: loaded.locations }); }
              catch (error) { throw apiError(409, error.code ?? "unknown-course-revision", error.message); }
            }
            // Publication can close a formerly open zone without invalidating its completed
            // lateral activities. Known historical completions keep that demonstrated state.
            const preserved = body.revision === currentCourse.edition.revision ? saved.completedLocations
              : [...saved.completedLocations, ...incoming];
            saved.completedLocations = assertCompleted([...new Set([...saved.completedLocations, ...incoming])], loaded, preserved);
            saved.revision = currentCourse.edition.revision;
            return progressOf(draft, user, currentCourse);
          });
          return json(response, 200, progress);
        }
      }
      authorizeCourse(state, auth.user, courseId, { teacher: true });
      if (action === "students" && method === "GET" && !targetId) {
        const loaded = await materializeCourseEdition(course.edition);
        const academic = new Set(loaded.locations.filter(isLearningLocation).map(({ id }) => id));
        return json(response, 200, { students: state.users.filter((user) => user.role === "student" && user.courseId === courseId).map((user) => {
          const progress = progressOf(state, user, course);
          const completedCount = progress.completedLocations.filter((id) => academic.has(id)).length;
          return { id: user.id, alias: user.alias, courseId, completedLocations: progress.completedLocations,
            completedCount, totalCount: academic.size, finished: completedCount === academic.size };
        }) });
      }
      if (action === "students" && method === "POST" && !targetId) {
        exactFields(body, ["alias", "password"]); const alias = normalizeAlias(body.alias);
        const password = await hashPassword(body.password);
        const student = await mutate((draft, actor) => {
          const currentCourse = authorizeCourse(draft, actor, courseId, { teacher: true }); ensureAliasAvailable(draft, alias);
          const user = { id: randomUUID(), alias, password, role: "student", courseId, generation: randomUUID(), sessionVersion: 1 };
          draft.users.push(user); draft.progress.push({ userId: user.id, courseId, revision: currentCourse.edition.revision, completedLocations: [] });
          return { id: user.id, alias, courseId, completedLocations: [], completedCount: 0,
            totalCount: currentCourse.edition.document.learningNetwork.nodeIds.length, finished: false };
        });
        return json(response, 201, { student });
      }
      if (action === "students" && targetId && method === "POST" && passwordSuffix) {
        exactFields(body, ["password"]); const password = await hashPassword(body.password);
        await mutate((draft, actor) => {
          authorizeCourse(draft, actor, courseId, { teacher: true });
          const student = draft.users.find((entry) => entry.id === targetId && entry.role === "student" && entry.courseId === courseId);
          if (!student) throw apiError(404, "not-found", "No existe ese estudiante en el curso.");
          student.password = password; student.sessionVersion += 1;
        });
        revokeUser(targetId); return json(response, 200, { ok: true });
      }
      if (action === "students" && targetId && method === "DELETE" && !passwordSuffix) {
        exactFields(body, ["confirmAlias"]);
        await mutate((draft, actor) => {
          authorizeCourse(draft, actor, courseId, { teacher: true });
          const student = draft.users.find((entry) => entry.id === targetId && entry.role === "student" && entry.courseId === courseId);
          if (!student) throw apiError(404, "not-found", "No existe ese estudiante en el curso.");
          if (body.confirmAlias !== student.alias) throw apiError(400, "confirmation-required", "Escribe el alias exacto para confirmar la baja de cuenta y avance.");
          draft.users = draft.users.filter((entry) => entry.id !== targetId);
          draft.progress = draft.progress.filter((entry) => entry.userId !== targetId);
        }, { purgeHistory: true });
        revokeUser(targetId); return json(response, 200, { ok: true });
      }
      if (action === "maintenance" && method === "PUT" && !targetId) {
        exactFields(body, ["enabled"]);
        if (typeof body.enabled !== "boolean") throw apiError(400, "invalid-input", "enabled debe ser booleano.");
        const changed = await mutate((draft, actor) => {
          const found = authorizeCourse(draft, actor, courseId, { teacher: true }); found.maintenance = body.enabled;
          return viewCourse(found, actor);
        });
        return json(response, 200, { course: changed });
      }
      if (action === "validate" && method === "POST" && !targetId) {
        exactFields(body, ["baseRevision", "document"]);
        return json(response, 200, (await publicationPlan(state, course, body)).plan);
      }
      if (action === "publish" && method === "POST" && !targetId) {
        exactFields(body, ["baseRevision", "document", "planDigest", "decision"]);
        const result = await mutate(async (draft, actor) => {
          const found = authorizeCourse(draft, actor, courseId, { teacher: true });
          if (!found.maintenance) throw apiError(409, "maintenance-required", "Activa mantenimiento antes de publicar.");
          const { plan, edition, next } = await publicationPlan(draft, found, body);
          if (plan.planDigest !== body.planDigest) throw apiError(409, "plan-stale", "El plan cambió; vuelve a validar el impacto.");
          const decision = plan.requiresDecision ? "reset-affected" : "preserve";
          if (body.decision !== decision) throw apiError(409, "incompatible-progress", "Confirma explícitamente la decisión del plan de publicación.", { plan });
          if (edition.revision !== found.edition.revision) {
            if (found.compatibility.length >= 1000 || found.compatibility.some((step) => step.fromRevision === edition.revision)) {
              throw apiError(409, "revision-reuse", "Esta revisión ya pertenece al historial. Prepara una edición distinta.");
            }
            found.compatibility.push({ fromRevision: found.edition.revision, toRevision: edition.revision,
              invalidatedLocationIds: plan.incompatibleLocationIds });
            for (const saved of draft.progress.filter((entry) => entry.courseId === courseId)) {
              saved.completedLocations = reconcileCompletedLocations({ completedLocations: saved.completedLocations,
                fromRevision: saved.revision, toRevision: edition.revision,
                compatibility: found.compatibility, locations: next.locations });
              saved.revision = edition.revision;
            }
            found.edition = edition;
          }
          return { course: viewCourse(found, actor), edition: found.edition, compatibility: found.compatibility };
        });
        return json(response, 200, result);
      }
      throw apiError(405, "method-not-allowed", "Método u operación no admitidos.");
    };

    const handler = async (request, response) => {
      security(response);
      try {
        if (request.headers.host !== new URL(origin).host
          || !request.url?.startsWith("/") || request.url.startsWith("//")
          || request.headers["x-forwarded-host"] || request.headers["x-forwarded-proto"]) {
          throw apiError(421, "authority-rejected", "La autoridad HTTP no coincide con el servidor.");
        }
        if (request.headers["sec-fetch-site"] === "cross-site") throw apiError(403, "origin-rejected", "Solicitud entre sitios no permitida.");
        const url = new URL(request.url, origin);
        if (url.pathname.startsWith(PREFIX + "/")) return await handleApi(request, response, url.pathname.slice(PREFIX.length));
        if (!["GET", "HEAD"].includes(request.method)) throw apiError(405, "method-not-allowed", "Método no admitido.");
        let pathname;
        try { pathname = decodeURIComponent(url.pathname); } catch { throw apiError(400, "invalid-path", "Ruta inválida."); }
        if (pathname.includes("\u0000") || pathname.includes("\\") || pathname.split("/").some((part) => part.startsWith("."))) {
          throw apiError(404, "not-found", "No existe ese recurso.");
        }
        if (pathname === "/") pathname = "/index.html";
        const candidate = resolve(dist, `.${pathname}`);
        if (!within(dist, candidate) || !TYPES.has(extname(candidate))) throw apiError(404, "not-found", "No existe ese recurso.");
        let target;
        try { target = await realpath(candidate); } catch { throw apiError(404, "not-found", "No existe ese recurso."); }
        if (!within(dist, target) || !(await stat(target)).isFile()) throw apiError(404, "not-found", "No existe ese recurso.");
        let bytes = await readFile(target);
        if (extname(target) === ".html") {
          const html = bytes.toString("utf8");
          if (!html.includes("</head>")) throw new Error("El HTML de distribución no tiene cabecera.");
          bytes = Buffer.from(html.replace("</head>", `<meta name="orbit-mode" content="online"><meta name="orbit-server-id" content="${store.state.serverId}"></head>`));
        }
        response.writeHead(200, { "Content-Type": TYPES.get(extname(target)), "Content-Length": bytes.length });
        response.end(request.method === "HEAD" ? undefined : bytes);
      } catch (error) {
        if (response.headersSent || response.destroyed) return;
        const status = Number.isInteger(error.status) ? error.status : 500;
        json(response, status, { error: { code: error.code && status !== 500 ? error.code : "internal-error",
          message: status === 500 ? "No se pudo completar la operación. El estado anterior se conserva." : error.message,
          ...(error.details && status !== 500 ? { details: error.details } : {}) } });
      }
    };
    server = tls ? https.createServer(tls, handler) : http.createServer(handler);
    server.requestTimeout = 30_000; server.headersTimeout = 10_000; server.keepAliveTimeout = 3000;
    server.maxHeadersCount = 60;
    await new Promise((accept, reject) => {
      server.once("error", reject);
      server.listen(port, host, () => { server.off("error", reject); accept(); });
    });
    if (!origin) origin = `http://${host === "::1" ? "[::1]" : host}:${server.address().port}`;
    // Cookies share a hostname across ports. Include the origin even for restored clones.
    cookieName = `orbit_session_${store.state.serverId}_${tokenDigest(origin).slice(0, 16)}`;
    let closed = false;
    return { server, store, origin, async close() {
      if (closed) return; closed = true;
      const closing = new Promise((accept) => server.close(accept));
      server.closeIdleConnections(); await closing; sessions.clear(); await store.close();
    } };
  } catch (error) {
    if (server?.listening) await new Promise((accept) => server.close(accept));
    await store.close(); throw error;
  }
}
