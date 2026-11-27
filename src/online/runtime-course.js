import { APP_CONFIG } from "../config.js";
import { materializeCourseEdition } from "../core/course-edition.js";
import { reconcileCompletedLocations, sanitizeCompletedLocations } from "../core/course-progress-compatibility.js";
import { ProgressionModel } from "../core/progression.js";
import { ProgressStorage } from "../core/storage.js";
import { onlineProgressKey, readOfflineCourse, saveOfflineCourse } from "./offline-store.js";
import { assertOnlineResponseIdentity } from "./api-client.js";

export function onlineProgressError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function assertServerProgress(progress, { serverId, userId, courseId, revision, generation } = {}) {
  assertOnlineResponseIdentity(progress, { serverId, userId });
  if (
    progress?.courseId !== courseId || typeof progress?.generation !== "string"
    || !progress.generation || typeof progress?.revision !== "string"
    || !Array.isArray(progress.completedLocations)
    || progress.completedLocations.some((id) => typeof id !== "string")
  ) throw onlineProgressError("invalid-server-progress", "El servidor devolvió un progreso no válido.");
  if (generation !== undefined && generation !== progress.generation) {
    throw onlineProgressError("progress-generation-mismatch", "La cuenta o el respaldo del servidor cambió. Tu copia anterior se conserva; vuelve a ingresar antes de sincronizar.");
  }
  if (revision !== undefined && revision !== progress.revision) {
    throw onlineProgressError("course-revision-changed", "El curso tiene una edición nueva. Recarga para reconciliar tu avance guardado antes de continuar.");
  }
}

export async function prepareOnlineRuntime(context, {
  storageFactory = (key) => new ProgressStorage(key),
  isActive = () => true,
} = {}) {
  const student = context.session.user.role === "student";
  const route = `/courses/${encodeURIComponent(context.course.id)}`;
  const previous = readOfflineCourse(context.scope, { storageFactory });
  let [response, progress] = context.offline
    ? [context.cached ?? previous, (context.cached ?? previous)?.progress]
    : await Promise.all([
        context.api.request(`${route}/edition`),
        student ? context.api.request(`${route}/progress`) : null,
      ]);
  if (!response || response.course?.id !== context.course.id) {
    throw onlineProgressError("wrong-online-course", "La edición recibida no pertenece al curso de esta cuenta.");
  }
  const identity = { serverId: context.session.serverId, userId: context.session.user.id };
  assertOnlineResponseIdentity(context.offline
    ? { serverId: response.session?.serverId, userId: response.session?.user?.id }
    : response, identity);
  // Do not consult the static browser edition override in authenticated mode.
  const materialized = await materializeCourseEdition(response.edition);
  if (!isActive()) throw onlineProgressError("online-session-ended", "La sesión terminó antes de cargar el curso.");
  if (response.course.revision !== materialized.edition.revision) {
    throw onlineProgressError("course-revision-changed", "El curso cambió durante la carga. Recarga antes de continuar; tu progreso se conserva.");
  }
  context.course = { ...response.course };
  const course = {
    ...materialized,
    courseId: context.course.id,
    courseRevision: materialized.edition.revision,
    acceptsUnversionedProgress: false,
    source: context.offline ? "offline-account-cache" : "online-server",
  };
  if (student) assertServerProgress(progress, { ...identity, courseId: course.courseId, revision: course.courseRevision });
  const generation = student ? progress.generation : context.offline ? "offline-study" : "teacher-preview";
  const storage = storageFactory(onlineProgressKey(context.scope, generation));
  const storedResult = storage.loadResult();
  if (storedResult.error) throw storedResult.error;
  const stored = storedResult.value;
  if (stored && (stored.schemaVersion !== APP_CONFIG.progressSchemaVersion || stored.courseId !== course.courseId)) {
    throw onlineProgressError("incompatible-local-progress", "El avance local usa otro contrato; se conservó sin sobrescribirlo.");
  }
  const compatibility = response.compatibility ?? [];
  const localCompleted = stored ? reconcileCompletedLocations({
    completedLocations: stored.completedLocations,
    fromRevision: stored.courseRevision,
    toRevision: course.courseRevision,
    compatibility,
    locations: course.locations,
  }) : [];
  if (student && !context.offline && stored && stored.courseRevision !== course.courseRevision) {
    // Retain the old local envelope until the server acknowledges its original revision.
    // Otherwise an offline lateral completion could lose its historical eligibility when a
    // publication invalidates a prerequisite and closes that zone in the current map.
    const acknowledged = await context.api.request(`${route}/progress`, { method: "PUT", body: {
      generation,
      revision: stored.courseRevision,
      completedLocations: sanitizeCompletedLocations(stored.completedLocations, course.locations),
    } });
    if (!isActive()) throw onlineProgressError("online-session-ended", "La sesión terminó antes de cargar el curso.");
    assertServerProgress(acknowledged, { ...identity, courseId: course.courseId, revision: course.courseRevision, generation });
    if (localCompleted.some((id) => !acknowledged.completedLocations.includes(id))) {
      throw onlineProgressError("incomplete-progress-acknowledgement", "El servidor no confirmó el avance compatible de la revisión anterior. Se conservó la copia original.");
    }
    progress = acknowledged;
  }
  const completed = sanitizeCompletedLocations([
    ...localCompleted, ...(progress?.completedLocations ?? []),
  ], course.locations);
  const initialState = stored ? {
    schemaVersion: APP_CONFIG.progressSchemaVersion,
    profile: context.profile,
    courseId: course.courseId,
    courseRevision: course.courseRevision,
    settings: stored.settings,
    activeTransport: stored.activeTransport,
    passedLessonSteps: stored.courseRevision === course.courseRevision ? stored.passedLessonSteps : undefined,
    // A changed map cannot safely reuse a previous Cartesian position.
    player: stored.courseRevision === course.courseRevision ? stored.player : undefined,
  } : null;
  const progression = new ProgressionModel({
    profile: context.profile,
    storage,
    areas: course.areas,
    locations: course.locations,
    courseId: course.courseId,
    courseRevision: course.courseRevision,
    acceptsUnversionedProgress: false,
    initialState,
    syncedCompletedLocations: completed,
  });
  const retainedGenerations = [...(previous?.retainedGenerations ?? [])];
  if (student && previous && previous.progress.generation !== generation
    && !retainedGenerations.some((entry) => entry.generation === previous.progress.generation)) {
    retainedGenerations.push({ generation: previous.progress.generation, revision: previous.progress.revision });
  }
  const cache = !context.offline ? saveOfflineCourse(context, {
    edition: materialized.edition,
    compatibility,
    progress,
    retainedGenerations,
  }, { storageFactory }) : previous;
  const recoveries = retainedGenerations.map((entry) => ({
    ...entry,
    progress: storageFactory(onlineProgressKey(context.scope, entry.generation)).load(),
  })).filter((entry) => entry.progress);
  return { course, progression, cache, recoveries, storageFactory };
}
