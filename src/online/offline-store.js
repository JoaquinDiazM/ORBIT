import { ProgressStorage } from "../core/storage.js";
import { assertOnlineResponseIdentity } from "./api-client.js";

const defaultStorageFactory = (key) => new ProgressStorage(key);
const CACHE_KIND = "orbit-offline-course";
const CACHE_VERSION = 1;
const ROLES = ["student", "teacher", "admin"];

export function onlineScope(serverId, userId, courseId) {
  return [serverId, userId, courseId].map((part) => encodeURIComponent(part)).join(":");
}

export function offlineCourseKey(scope) {
  return `orbit-offline-course:v${CACHE_VERSION}:${scope}`;
}

export function onlineProgressKey(scope, generation) {
  return `orbit-online-progress:v1:${scope}:${encodeURIComponent(generation)}`;
}

function accessKey(serverId) {
  return `orbit-offline-access:v1:${encodeURIComponent(serverId)}`;
}

function savedCoursesKey(serverId, userId) {
  return `orbit-offline-courses:v1:${encodeURIComponent(serverId)}:${encodeURIComponent(userId)}`;
}

function safeIdentity(context) {
  const { serverId, user } = context.session;
  return {
    serverId,
    user: { id: user.id, alias: user.alias, role: user.role, courseIds: [context.course.id] },
  };
}

export function readOfflineCourse(scope, { storageFactory = defaultStorageFactory } = {}) {
  const result = storageFactory(offlineCourseKey(scope)).loadResult();
  if (result.error) throw result.error;
  const value = result.value;
  if (value === null || value === undefined) return null;
  if (
    value.kind !== CACHE_KIND || value.schemaVersion !== CACHE_VERSION
    || value.scope !== scope || !ROLES.includes(value.session?.user?.role)
    || value.session?.csrfToken !== undefined
    || value.scope !== onlineScope(value.session?.serverId, value.session?.user?.id, value.course?.id)
    || (value.session.user.role === "student" ? (
      value.progress?.courseId !== value.course?.id
      || value.progress?.serverId !== value.session.serverId
      || value.progress?.userId !== value.session.user.id
      || typeof value.progress?.generation !== "string"
      || value.progress?.revision !== value.course?.revision
    ) : value.progress !== null)
  ) {
    const error = new Error("La copia sin conexión no es compatible; se conservó sin reemplazarla.");
    error.code = "invalid-offline-course";
    throw error;
  }
  return structuredClone(value);
}

function readAccess(serverId, storageFactory) {
  const storage = storageFactory(accessKey(serverId));
  const { value, error } = storage.loadResult();
  if (error) throw error;
  if (Array.isArray(value?.scopes) && typeof value.userId === "string") {
    const prefix = `${encodeURIComponent(serverId)}:${encodeURIComponent(value.userId)}:`;
    return { storage, userId: value.userId, scopes: value.scopes.filter((scope) => typeof scope === "string" && scope.startsWith(prefix)) };
  }
  if (typeof value?.scope === "string") {
    const cached = readOfflineCourse(value.scope, { storageFactory });
    if (cached?.session.serverId === serverId) return { storage, userId: cached.session.user.id, scopes: [value.scope] };
  }
  return { storage, userId: null, scopes: [] };
}

export function activateOfflineAccount(session, { storageFactory = defaultStorageFactory } = {}) {
  const { storage, userId, scopes } = readAccess(session.serverId, storageFactory);
  const allowed = new Set(session.courses.map(({ id }) => onlineScope(session.serverId, session.user.id, id)));
  const catalog = storageFactory(savedCoursesKey(session.serverId, session.user.id)).load();
  const known = [...(userId === session.user.id ? scopes : []), ...(Array.isArray(catalog) ? catalog : [])];
  storage.save({ userId: session.user.id, scopes: [...new Set(known)].filter((scope) => allowed.has(scope)) });
}

export function saveOfflineCourse(context, { edition, compatibility = [], progress, retainedGenerations = [] }, {
  storageFactory = defaultStorageFactory,
} = {}) {
  const session = safeIdentity(context);
  const student = session.user.role === "student";
  if (!ROLES.includes(session.user.role) || context.offline) return null;
  if (student) assertOnlineResponseIdentity(progress, { serverId: session.serverId, userId: session.user.id });
  const scope = onlineScope(session.serverId, session.user.id, context.course.id);
  if (scope !== context.scope) throw new Error("El alcance de la cuenta no coincide con el curso.");
  const access = readAccess(session.serverId, storageFactory);
  if (context.offlineAccountActive && access.userId !== session.user.id) return null;
  const value = {
    kind: CACHE_KIND,
    schemaVersion: CACHE_VERSION,
    scope,
    session,
    course: {
      id: context.course.id,
      title: context.course.title,
      revision: context.course.revision,
      maintenance: false,
    },
    edition: structuredClone(edition),
    compatibility: structuredClone(compatibility),
    progress: student ? {
      serverId: progress.serverId,
      userId: progress.userId,
      courseId: progress.courseId,
      generation: progress.generation,
      revision: progress.revision,
      completedLocations: [...progress.completedLocations],
    } : null,
    retainedGenerations: retainedGenerations.map(({ generation, revision }) => ({ generation, revision })),
    cachedAt: new Date().toISOString(),
  };
  storageFactory(offlineCourseKey(scope)).save(value);
  // Activate only after the whole course is durably stored. No session cookie or CSRF token is persisted.
  const scopes = access.userId === session.user.id ? access.scopes.filter((entry) => entry !== scope) : [];
  const updatedScopes = [scope, ...scopes];
  storageFactory(savedCoursesKey(session.serverId, session.user.id)).save(updatedScopes);
  access.storage.save({ userId: session.user.id, scopes: updatedScopes });
  return value;
}

export async function loadOfflineContext({ serverId, courseId, target = "orbit", api }, {
  storageFactory = defaultStorageFactory,
} = {}) {
  if (target !== "orbit") return null;
  const access = readAccess(serverId, storageFactory);
  const copies = access.scopes.map((scope) => readOfflineCourse(scope, { storageFactory }))
    .filter((course) => course?.session.serverId === serverId && course.session.user.id === access.userId);
  const cached = courseId ? copies.find((entry) => entry.course.id === courseId) : copies[0];
  if (!cached) return null;
  const courses = copies.map((copy) => copy.course);
  const entry = (copy) => ({
    api,
    session: { ...copy.session, user: { ...copy.session.user, courseIds: courses.map(({ id }) => id) }, courses },
    course: copy.course,
    profile: "student",
    scope: copy.scope,
    offline: true,
    cached: copy,
  });
  return { ...entry(cached), choices: copies.map(entry) };
}

export function forgetOfflineAccess(serverId, { storageFactory = defaultStorageFactory } = {}) {
  // A verified null write revokes access without deleting completions waiting for this account.
  storageFactory(accessKey(serverId)).save(null);
}
