import { AXIAL_DIRECTIONS, axialToPixel } from "./hex.js";
import { isLearningLocation, learningPrerequisiteIds } from "./knowledge-graph.js";
import { createWorldIndex, getAreaAtWorldPosition } from "./world-graph.js";

export const MAX_DIRECT_NEIGHBORS = 6;

function compareIds(first, second) {
  return first < second ? -1 : first > second ? 1 : 0;
}

function isActiveLearningLocation(location) {
  return isLearningLocation(location)
    && (location.lifecycle === undefined || location.lifecycle === "active");
}

/** Build academic area relations once per course, independently of progress and visibility. */
export function createDirectNavigationIndex({ areas, locations, connections } = {}) {
  if (!Array.isArray(areas) || !Array.isArray(locations)) {
    throw new TypeError("La navegación directa requiere zonas y lugares del curso.");
  }
  if (connections !== undefined && !Array.isArray(connections)) {
    throw new TypeError("Las conexiones académicas deben ser una lista.");
  }
  const orderedAreas = [...areas].sort((first, second) => compareIds(first.id, second.id));
  const worldIndex = createWorldIndex(orderedAreas);
  const areasById = worldIndex.byId;
  const relatedAreaIds = new Map(orderedAreas.map(({ id }) => [id, new Set()]));
  const learningLocations = locations.filter((location) =>
    isActiveLearningLocation(location) && areasById.has(location.areaId));
  const locationById = new Map(learningLocations.map((location) => [location.id, location]));
  const academicConnections = connections ?? learningLocations.flatMap((location) =>
    learningPrerequisiteIds(location).map((sourceId) => ({ sourceId, targetId: location.id })));

  for (const connection of academicConnections) {
    const source = locationById.get(connection?.sourceId);
    const target = locationById.get(connection?.targetId);
    if (!source || !target || source.areaId === target.areaId) continue;
    relatedAreaIds.get(source.areaId).add(target.areaId);
    relatedAreaIds.get(target.areaId).add(source.areaId);
  }
  for (const [areaId, neighbors] of relatedAreaIds) {
    relatedAreaIds.set(areaId, new Set([...neighbors].sort(compareIds)));
  }
  return { areas: orderedAreas, areasById, worldIndex, relatedAreaIds };
}

export function getAreaRelationViolations(index) {
  return [...index.relatedAreaIds]
    .filter(([, neighbors]) => neighbors.size > MAX_DIRECT_NEIGHBORS)
    .map(([areaId, neighbors]) => ({
      areaId,
      relatedAreaIds: [...neighbors].sort(compareIds),
      count: neighbors.size,
      max: MAX_DIRECT_NEIGHBORS,
    }))
    .sort((first, second) => compareIds(first.areaId, second.areaId));
}

// FNV-1a supplies a repeatable ordering, not a security or publication digest.
function stableHash(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 0x01000193) >>> 0;
  }
  return hash;
}

/**
 * Project one center and up to six neighbors. Entry direction describes the edge crossed
 * in the previous view; when selected, the previous area occupies its opposite edge.
 */
export function createDirectLayout({
  index,
  centerAreaId,
  courseRevision = "",
  hexSize,
  entry = null,
} = {}) {
  if (!index?.areasById?.has(centerAreaId)) {
    throw new RangeError(`No existe la zona central ${String(centerAreaId)}.`);
  }
  if (!Number.isFinite(hexSize) || hexSize <= 0) {
    throw new RangeError("La navegación directa requiere un tamaño de hexágono positivo.");
  }
  if (entry !== null && (
    typeof entry !== "object"
    || typeof entry.fromAreaId !== "string"
    || !Number.isInteger(entry.direction)
    || entry.direction < 0
    || entry.direction >= MAX_DIRECT_NEIGHBORS
  )) {
    throw new RangeError("La dirección de entrada debe identificar una de las seis aristas.");
  }
  const violations = getAreaRelationViolations(index);
  if (violations.length > 0) {
    const first = violations[0];
    throw new RangeError(
      `La zona ${first.areaId} se relaciona con ${first.count} zonas; el máximo es ${first.max}.`,
    );
  }

  const neighbors = [...index.relatedAreaIds.get(centerAreaId)].sort(compareIds);
  if (neighbors.length < MAX_DIRECT_NEIGHBORS
    && centerAreaId !== "origin"
    && index.areasById.has("origin")
    && !neighbors.includes("origin")) {
    neighbors.push("origin");
  }
  const selected = new Set([centerAreaId, ...neighbors]);
  const filler = index.areas
    .filter(({ id }) => !selected.has(id))
    .map(({ id }) => ({
      id,
      rank: stableHash(JSON.stringify([courseRevision, centerAreaId, id])),
    }))
    .sort((first, second) => first.rank - second.rank || compareIds(first.id, second.id));
  for (const { id } of filler) {
    if (neighbors.length === MAX_DIRECT_NEIGHBORS) break;
    neighbors.push(id);
  }

  const slots = new Array(MAX_DIRECT_NEIGHBORS).fill(null);
  const canWalkBack = Boolean(entry && neighbors.includes(entry.fromAreaId));
  if (canWalkBack) slots[(entry.direction + 3) % MAX_DIRECT_NEIGHBORS] = entry.fromAreaId;
  for (const areaId of neighbors) {
    if (canWalkBack && areaId === entry.fromAreaId) continue;
    slots[slots.indexOf(null)] = areaId;
  }
  const areas = [{ ...index.areasById.get(centerAreaId), q: 0, r: 0 }];
  slots.forEach((areaId, direction) => {
    if (areaId === null) return;
    const { q, r } = AXIAL_DIRECTIONS[direction];
    areas.push({ ...index.areasById.get(areaId), q, r });
  });

  return {
    areas,
    worldIndex: createWorldIndex(areas),
    visibleAreaIds: new Set(areas.map(({ id }) => id)),
    centerAreaId,
    canWalkBack,
    index,
    hexSize,
  };
}

export function canonicalToDisplay(layout, { areaId, x, y } = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const canonicalArea = layout?.index?.areasById.get(areaId);
  const displayArea = layout?.worldIndex?.byId.get(areaId);
  if (!canonicalArea || !displayArea) return null;
  const canonicalCenter = axialToPixel(canonicalArea.q, canonicalArea.r, layout.hexSize);
  const displayCenter = axialToPixel(displayArea.q, displayArea.r, layout.hexSize);
  return {
    x: x - canonicalCenter.x + displayCenter.x,
    y: y - canonicalCenter.y + displayCenter.y,
  };
}

export function displayToCanonical(layout, { x, y } = {}) {
  if (!layout || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  const displayArea = getAreaAtWorldPosition(x, y, layout.hexSize, layout.worldIndex);
  if (!displayArea) return null;
  const canonicalArea = layout.index.areasById.get(displayArea.id);
  const canonicalCenter = axialToPixel(canonicalArea.q, canonicalArea.r, layout.hexSize);
  const displayCenter = axialToPixel(displayArea.q, displayArea.r, layout.hexSize);
  return {
    areaId: displayArea.id,
    x: x - displayCenter.x + canonicalCenter.x,
    y: y - displayCenter.y + canonicalCenter.y,
  };
}
