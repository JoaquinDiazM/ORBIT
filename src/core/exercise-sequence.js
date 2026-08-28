function sequenceItems(exercise) {
  return Array.isArray(exercise?.items) ? exercise.items : [];
}

export function createExerciseSequenceState(exercise, { completed = false } = {}) {
  const items = sequenceItems(exercise);
  return {
    activeItemIndex: completed ? Math.max(0, items.length - 1) : 0,
    completedItemIds: new Set(completed ? items.map((item) => item.id) : []),
  };
}

export function normalizeExerciseSequenceState(
  exercise,
  state,
  { completed = false } = {},
) {
  const items = sequenceItems(exercise);
  if (items.length === 0) return createExerciseSequenceState(exercise, { completed });
  if (completed) return createExerciseSequenceState(exercise, { completed: true });

  const candidateIds = state?.completedItemIds instanceof Set
    ? state.completedItemIds
    : new Set();
  const completedItemIds = new Set();
  for (const item of items) {
    if (!candidateIds.has(item.id)) break;
    completedItemIds.add(item.id);
  }

  return {
    activeItemIndex: Math.min(completedItemIds.size, items.length - 1),
    completedItemIds,
  };
}

export function markExerciseSequenceItemPassed(exercise, state, itemId) {
  const items = sequenceItems(exercise);
  const normalized = normalizeExerciseSequenceState(exercise, state);
  const activeItem = items[normalized.activeItemIndex];
  if (!activeItem || activeItem.id !== itemId) return normalized;

  const completedItemIds = new Set(normalized.completedItemIds);
  completedItemIds.add(itemId);
  return normalizeExerciseSequenceState(exercise, {
    ...normalized,
    completedItemIds,
  });
}

export function isExerciseSequenceComplete(exercise, state) {
  const items = sequenceItems(exercise);
  if (items.length === 0) return false;
  const normalized = normalizeExerciseSequenceState(exercise, state);
  return normalized.completedItemIds.size === items.length;
}
