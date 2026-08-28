const NO_EXERCISE = Object.freeze({ type: "none" });

function normalizeStep(location, step, index) {
  return {
    id: step.id ?? `${location.id}-step-${index + 1}`,
    title: step.title ?? `Etapa ${index + 1}`,
    sections: Array.isArray(step.sections) ? step.sections : [],
    exercise: step.exercise ?? NO_EXERCISE,
  };
}

export function getLocationSteps(location) {
  if (Array.isArray(location.steps) && location.steps.length > 0) {
    return location.steps.map((step, index) => normalizeStep(location, step, index));
  }

  return [
    normalizeStep(
      location,
      {
        id: `${location.id}-content`,
        title: "Contenido",
        sections: location.sections,
        exercise: location.exercise,
      },
      0,
    ),
  ];
}

export function createLocationStepState(location, { completed = false } = {}) {
  const lastIndex = getLocationSteps(location).length - 1;
  return {
    activeIndex: 0,
    maxUnlockedIndex: completed ? lastIndex : 0,
    passedStepIds: new Set(),
  };
}

export function normalizeLocationStepState(location, state, { completed = false } = {}) {
  const lastIndex = getLocationSteps(location).length - 1;
  const candidate = state ?? createLocationStepState(location, { completed });
  const maxUnlockedIndex = completed
    ? lastIndex
    : Math.min(lastIndex, Math.max(0, Number(candidate.maxUnlockedIndex) || 0));
  const activeIndex = Math.min(
    maxUnlockedIndex,
    Math.max(0, Number(candidate.activeIndex) || 0),
  );

  return {
    activeIndex,
    maxUnlockedIndex,
    passedStepIds:
      candidate.passedStepIds instanceof Set ? new Set(candidate.passedStepIds) : new Set(),
  };
}

export function unlockLocationStep(state, stepIndex, stepCount) {
  const lastIndex = Math.max(0, stepCount - 1);
  const unlockedIndex = Math.min(lastIndex, Math.max(0, stepIndex + 1));
  return {
    ...state,
    maxUnlockedIndex: Math.max(state.maxUnlockedIndex, unlockedIndex),
  };
}

export function selectLocationStep(state, stepIndex) {
  return {
    ...state,
    activeIndex: Math.min(state.maxUnlockedIndex, Math.max(0, Number(stepIndex) || 0)),
  };
}

export function markLocationStepPassed(state, stepId) {
  const passedStepIds = new Set(state.passedStepIds);
  passedStepIds.add(stepId);
  return { ...state, passedStepIds };
}
