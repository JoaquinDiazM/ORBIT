export function normalizeRequirements(requirements = {}) {
  return {
    concepts: Array.isArray(requirements.concepts) ? requirements.concepts : [],
    completedLocations: Array.isArray(requirements.completedLocations)
      ? requirements.completedLocations
      : [],
    rewards: Array.isArray(requirements.rewards) ? requirements.rewards : [],
    areas: Array.isArray(requirements.areas) ? requirements.areas : [],
  };
}

export function meetsRequirements(requirements, context) {
  const normalized = normalizeRequirements(requirements);
  return (
    normalized.concepts.every((id) => context.concepts.has(id)) &&
    normalized.completedLocations.every((id) => context.completedLocations.has(id)) &&
    normalized.rewards.every((id) => context.rewards.has(id)) &&
    normalized.areas.every((id) => context.unlockedAreas.has(id))
  );
}

export function describeMissingRequirements(requirements, context) {
  const normalized = normalizeRequirements(requirements);
  return {
    concepts: normalized.concepts.filter((id) => !context.concepts.has(id)),
    completedLocations: normalized.completedLocations.filter(
      (id) => !context.completedLocations.has(id),
    ),
    rewards: normalized.rewards.filter((id) => !context.rewards.has(id)),
    areas: normalized.areas.filter((id) => !context.unlockedAreas.has(id)),
  };
}
