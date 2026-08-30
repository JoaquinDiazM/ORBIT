export const ORBIT_PROFILE_IDS = Object.freeze(["student", "teacher", "debug"]);

const PROFILE_ALIASES = Object.freeze({
  normal: "student",
});

const PROFILE_CAPABILITIES = Object.freeze({
  student: Object.freeze({
    canUseDebugger: false,
    autoCompletesEvaluatedLocations: false,
    editorAccess: "read-only",
  }),
  teacher: Object.freeze({
    canUseDebugger: false,
    autoCompletesEvaluatedLocations: true,
    editorAccess: "full",
  }),
  debug: Object.freeze({
    canUseDebugger: true,
    autoCompletesEvaluatedLocations: false,
    editorAccess: "blocked",
  }),
});

const PROFILE_LABELS = Object.freeze({
  student: "estudiante",
  teacher: "docente",
  debug: "debug",
});

function normalizeProfileToken(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function resolveOrbitProfile({ requestedProfile, debugRequested = false } = {}) {
  const normalized = normalizeProfileToken(requestedProfile);
  if (normalized) {
    const aliased = PROFILE_ALIASES[normalized] ?? normalized;
    return ORBIT_PROFILE_IDS.includes(aliased) ? aliased : "student";
  }
  return debugRequested ? "debug" : "student";
}

export function resolveEditorProfile({ requestedProfile } = {}) {
  if (!normalizeProfileToken(requestedProfile)) return "teacher";
  return resolveOrbitProfile({ requestedProfile });
}

export function getProfileCapabilities(profile) {
  return PROFILE_CAPABILITIES[resolveOrbitProfile({ requestedProfile: profile })];
}

export function getProfileLabel(profile) {
  const resolved = resolveOrbitProfile({ requestedProfile: profile });
  return PROFILE_LABELS[resolved];
}

export function isLocationAllowedForProfile(profile, location) {
  if (!location) return false;
  return location.kind !== "debug" || getProfileCapabilities(profile).canUseDebugger;
}

function exerciseRequiresResponse(exercise) {
  return ["choice", "numeric", "expression", "sequence"].includes(exercise?.type);
}

export function shouldAutoCompleteLocationOnInteraction(profile, location) {
  if (!getProfileCapabilities(profile).autoCompletesEvaluatedLocations) return false;
  if (!location || !["lesson", "mission"].includes(location.kind)) return false;
  const exercises = Array.isArray(location.steps) && location.steps.length > 0
    ? location.steps.map((step) => step?.exercise)
    : [location.exercise];
  return exercises.some(exerciseRequiresResponse);
}
