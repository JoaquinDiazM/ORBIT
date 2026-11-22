import { isLearningLocation, learningPrerequisiteIds } from "./knowledge-graph.js";

function failure(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function sanitizeCompletedLocations(completedLocations, locations) {
  const allowed = new Set(locations.filter((location) =>
    !["base", "debug"].includes(location.kind)
    && (location.lifecycle === undefined || location.lifecycle === "active"),
  ).map(({ id }) => id));
  return [...new Set((Array.isArray(completedLocations) ? completedLocations : [])
    .filter((id) => typeof id === "string" && allowed.has(id)))].sort();
}

function pruneDependents(completedLocations, locations) {
  const completed = new Set(sanitizeCompletedLocations(completedLocations, locations));
  let changed;
  do {
    changed = false;
    for (const location of locations) {
      if (completed.has(location.id) && isLearningLocation(location)
        && !learningPrerequisiteIds(location).every((id) => completed.has(id))) {
        completed.delete(location.id);
        changed = true;
      }
    }
  } while (changed);
  return [...completed].sort();
}

export function reconcileCompletedLocations({
  completedLocations, fromRevision, toRevision, compatibility = [], locations,
}) {
  if (!Array.isArray(locations) || !Array.isArray(compatibility)
    || typeof fromRevision !== "string" || typeof toRevision !== "string") {
    throw failure("invalid-compatibility", "La reconciliación necesita revisiones y un curso válidos.");
  }
  let revision = fromRevision;
  let completed = [...new Set(Array.isArray(completedLocations) ? completedLocations : [])];
  const visited = new Set();
  while (revision !== toRevision) {
    if (visited.has(revision)) throw failure("invalid-compatibility", "El historial contiene un ciclo.");
    visited.add(revision);
    const steps = compatibility.filter((step) => step?.fromRevision === revision);
    if (steps.length !== 1 || typeof steps[0].toRevision !== "string"
      || !Array.isArray(steps[0].invalidatedLocationIds)) {
      throw failure("unknown-course-revision", "La revisión guardada no tiene una ruta de compatibilidad conocida.");
    }
    const invalidated = new Set(steps[0].invalidatedLocationIds);
    completed = completed.filter((id) => !invalidated.has(id));
    revision = steps[0].toRevision;
  }
  return pruneDependents(completed, locations);
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function academicContract(location) {
  // Names, appearance and map coordinates do not revoke a demonstrated completion.
  const fields = ["kind", "objective", "prerequisites", "model", "application", "pedagogy",
    "grants", "requirements", "sections", "steps", "exercise", "repeatable"];
  return JSON.stringify(stableValue(Object.fromEntries(fields.map((key) => [key, location[key]]))));
}

export function findIncompatibleLocationIds(previousLocations, nextLocations) {
  const next = new Map(nextLocations.map((location) => [location.id, location]));
  const invalidated = new Set(previousLocations.filter((location) =>
    !["base", "debug"].includes(location.kind)
    && (!next.has(location.id) || academicContract(location) !== academicContract(next.get(location.id))),
  ).map(({ id }) => id));
  let changed;
  do {
    changed = false;
    for (const location of [...previousLocations, ...nextLocations]) {
      if (!invalidated.has(location.id)
        && learningPrerequisiteIds(location).some((id) => invalidated.has(id))) {
        invalidated.add(location.id);
        changed = true;
      }
    }
  } while (changed);
  return [...invalidated].sort();
}
