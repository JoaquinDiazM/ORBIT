import { axialDistance } from "./hex.js";
import { normalizeRequirements } from "./requirements.js";

const REQUIREMENT_KINDS = Object.freeze([
  "completedLocations",
  "concepts",
  "rewards",
]);

export const TREE_TWO_VISUALIZATION_MODES = Object.freeze([
  "hidden",
  "direct",
  "total",
]);

function toSet(value) {
  if (value instanceof Set) return value;
  return Array.isArray(value) ? new Set(value) : new Set();
}

function appendGrant(index, grantId, locationId) {
  if (typeof grantId !== "string" || grantId.length === 0) return;
  const grantors = index.get(grantId) ?? [];
  if (!grantors.includes(locationId)) grantors.push(locationId);
  index.set(grantId, grantors);
}

function createGrantIndexes(locations) {
  const conceptGrantors = new Map();
  const rewardGrantors = new Map();

  for (const location of locations) {
    if (!location || typeof location.id !== "string") continue;
    for (const conceptId of location.grants?.concepts ?? []) {
      appendGrant(conceptGrantors, conceptId, location.id);
    }
    for (const rewardId of location.grants?.rewards ?? []) {
      appendGrant(rewardGrantors, rewardId, location.id);
    }
  }

  return { conceptGrantors, rewardGrantors };
}

function appendEdge(edgesByPair, sourceId, targetId, requirementKind) {
  const pairId = `${sourceId}->${targetId}`;
  const current = edgesByPair.get(pairId);
  if (current) {
    current.requirementKinds.add(requirementKind);
    return;
  }

  edgesByPair.set(pairId, {
    id: pairId,
    sourceId,
    targetId,
    requirementKinds: new Set([requirementKind]),
  });
}

function locationState(locationId, visibleIds, accessibleIds, completedIds) {
  if (!visibleIds.has(locationId)) return "hidden";
  if (completedIds.has(locationId)) return "completed";
  if (accessibleIds.has(locationId)) return "completable";
  return "blocked";
}

function connectionAppearance(sourceState, targetState) {
  if (
    sourceState === "completed" &&
    (targetState === "completed" || targetState === "completable")
  ) {
    return "bright";
  }
  if (sourceState === "completable" && targetState === "blocked") {
    return "muted";
  }
  return null;
}

function isDirectConnection(source, target, areaById) {
  if (source.areaId === target.areaId && typeof source.areaId === "string") return true;
  const sourceArea = areaById.get(source.areaId);
  const targetArea = areaById.get(target.areaId);
  if (!sourceArea || !targetArea) return false;
  return axialDistance(sourceArea, targetArea) === 1;
}

/**
 * Deriva las conexiones visibles del Árbol II sin almacenar aristas manuales.
 *
 * La apariencia expresa el estado pedagógico de los extremos y es independiente
 * de `isNew`, que marca exclusivamente el último desbloqueo causal de la sesión:
 * - completed -> completed/completable: bright
 * - completable -> blocked: muted
 * Cualquier otra combinación, incluidos los extremos ocultos, queda fuera.
 */
export function deriveKnowledgeGraphEdges({
  locations = [],
  areas = [],
  snapshot = {},
  visualizationMode = "hidden",
  newlyAccessibleLocationIds = [],
  unlockSourceLocationId = null,
} = {}) {
  if (!Array.isArray(locations)) return [];

  const mode = TREE_TWO_VISUALIZATION_MODES.includes(visualizationMode)
    ? visualizationMode
    : "hidden";
  const visibleLocationIds = toSet(snapshot.visibleLocationIds);
  const accessibleLocationIds = toSet(snapshot.accessibleLocationIds);
  const completedLocationIds = toSet(snapshot.completedLocationIds);
  const newlyAccessibleIds = toSet(newlyAccessibleLocationIds);
  const locationById = new Map(
    locations
      .filter((location) => location && typeof location.id === "string")
      .map((location) => [location.id, location]),
  );
  const areaById = new Map(
    (Array.isArray(areas) ? areas : [])
      .filter((area) => area && typeof area.id === "string")
      .map((area) => [area.id, area]),
  );
  const { conceptGrantors, rewardGrantors } = createGrantIndexes(locations);
  const edgesByPair = new Map();

  for (const target of locations) {
    if (!target || typeof target.id !== "string") continue;
    const requirements = normalizeRequirements(target.requirements);

    for (const sourceId of requirements.completedLocations) {
      if (!locationById.has(sourceId)) continue;
      appendEdge(edgesByPair, sourceId, target.id, "completedLocations");
    }

    for (const conceptId of requirements.concepts) {
      for (const sourceId of conceptGrantors.get(conceptId) ?? []) {
        appendEdge(edgesByPair, sourceId, target.id, "concepts");
      }
    }

    for (const rewardId of requirements.rewards) {
      for (const sourceId of rewardGrantors.get(rewardId) ?? []) {
        appendEdge(edgesByPair, sourceId, target.id, "rewards");
      }
    }
  }

  const edges = [];
  for (const edge of edgesByPair.values()) {
    const source = locationById.get(edge.sourceId);
    const target = locationById.get(edge.targetId);
    if (!source || !target) continue;

    const sourceState = locationState(
      edge.sourceId,
      visibleLocationIds,
      accessibleLocationIds,
      completedLocationIds,
    );
    const targetState = locationState(
      edge.targetId,
      visibleLocationIds,
      accessibleLocationIds,
      completedLocationIds,
    );
    const appearance = connectionAppearance(sourceState, targetState);
    if (!appearance) continue;

    const isNew =
      newlyAccessibleIds.has(edge.targetId) && edge.sourceId === unlockSourceLocationId;
    if (mode === "hidden" && !isNew) continue;
    if (mode === "direct" && !isDirectConnection(source, target, areaById)) continue;

    edges.push({
      ...edge,
      requirementKinds: REQUIREMENT_KINDS.filter((kind) =>
        edge.requirementKinds.has(kind),
      ),
      sourceState,
      targetState,
      appearance,
      isNew,
    });
  }

  return edges;
}
