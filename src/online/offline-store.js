import { ProgressStorage } from "../core/storage.js";
import { assertOnlineResponseIdentity } from "./api-client.js";

const defaultStorageFactory = (key) => new ProgressStorage(key);
const CACHE_KIND = "orbit-offline-course";
const CACHE_VERSION = 1;

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
    || value.scope !== scope || value.session?.user?.role !== "student"
    || value.session?.csrfToken !== undefined
    || value.scope !== onlineScope(value.session?.serverId, value.session?.user?.id, value.course?.id)
    || value.progress?.courseId !== value.course?.id
    || value.progress?.serverId !== value.session.serverId
    || value.progress?.userId !== value.session.user.id
    || typeof value.progress?.generation !== "string"
    || value.progress?.revision !== value.course?.revision
  ) {
    const error = new Error("La copia sin conexión no es compatible; se conservó sin reemplazarla.");
    error.code = "invalid-offline-course";
    throw error;
  }
  return structuredClone(value);
}

export function saveOfflineCourse(context, { edition, compatibility = [], progress, retainedGenerations = [] }, {
  storageFactory = defaultStorageFactory,
} = {}) {
  if (context.profile !== "student") return null;
  const session = safeIdentity(context);
  assertOnlineResponseIdentity(progress, { serverId: session.serverId, userId: session.user.id });
  const scope = onlineScope(session.serverId, session.user.id, context.course.id);
  if (scope !== context.scope) throw new Error("El alcance de la cuenta no coincide con el curso.");
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
    progress: {
      serverId: progress.serverId,
      userId: progress.userId,
      courseId: progress.courseId,
      generation: progress.generation,
      revision: progress.revision,
      completedLocations: [...progress.completedLocations],
    },
    retainedGenerations: retainedGenerations.map(({ generation, revision }) => ({ generation, revision })),
    cachedAt: new Date().toISOString(),
  };
  storageFactory(offlineCourseKey(scope)).save(value);
  // Activate only after the whole course is durably stored. No session cookie or CSRF token is persisted.
  storageFactory(accessKey(session.serverId)).save({ scope });
  return value;
}

export async function loadOfflineContext({ serverId, courseId, target = "orbit", api }, {
  storageFactory = defaultStorageFactory,
} = {}) {
  if (target !== "orbit") return null;
  const pointer = storageFactory(accessKey(serverId)).loadResult();
  if (pointer.error) throw pointer.error;
  if (typeof pointer.value?.scope !== "string") return null;
  const cached = readOfflineCourse(pointer.value.scope, { storageFactory });
  if (!cached || cached.session.serverId !== serverId || (courseId && cached.course.id !== courseId)) return null;
  return {
    api,
    session: { ...cached.session, courses: [cached.course] },
    course: cached.course,
    profile: "student",
    scope: cached.scope,
    offline: true,
    cached,
  };
}

export function forgetOfflineAccess(serverId, { storageFactory = defaultStorageFactory } = {}) {
  // A verified null write revokes access without deleting completions waiting for this account.
  storageFactory(accessKey(serverId)).save(null);
}
