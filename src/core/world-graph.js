import {
  AXIAL_DIRECTIONS,
  axialKey,
  axialNeighbor,
  axialToPixel,
  pixelToHex,
} from "./hex.js";
import { meetsRequirements } from "./requirements.js";

export function createWorldIndex(areas) {
  const byId = new Map();
  const byCoordinate = new Map();

  for (const area of areas) {
    byId.set(area.id, area);
    byCoordinate.set(axialKey(area.q, area.r), area);
  }

  return { byId, byCoordinate };
}

export function getAreaCenter(area, hexSize) {
  return axialToPixel(area.q, area.r, hexSize);
}

export function getNeighborArea(area, directionIndex, worldIndex) {
  const coordinate = axialNeighbor(area.q, area.r, directionIndex);
  return worldIndex.byCoordinate.get(axialKey(coordinate.q, coordinate.r)) ?? null;
}

export function getAreaNeighbors(area, worldIndex) {
  return AXIAL_DIRECTIONS.map((_, directionIndex) =>
    getNeighborArea(area, directionIndex, worldIndex),
  ).filter(Boolean);
}

export function areAreasAdjacent(first, second) {
  return AXIAL_DIRECTIONS.some(
    (direction) => first.q + direction.q === second.q && first.r + direction.r === second.r,
  );
}

export function getAreaAtWorldPosition(x, y, hexSize, worldIndex) {
  const coordinate = pixelToHex(x, y, hexSize);
  return worldIndex.byCoordinate.get(axialKey(coordinate.q, coordinate.r)) ?? null;
}

export function getLocationWorldPosition(location, worldIndex, hexSize) {
  const area = worldIndex.byId.get(location.areaId);
  if (!area) return null;
  const center = getAreaCenter(area, hexSize);
  return {
    x: center.x + location.offset.x,
    y: center.y + location.offset.y,
  };
}

export function deriveUnlockedAreaIds({
  areas,
  worldIndex,
  concepts,
  completedLocations,
  rewards,
  debugUnlockedAreas = new Set(),
}) {
  const unlockedAreas = new Set(
    areas.filter((area) => area.initial).map((area) => area.id),
  );

  for (const areaId of debugUnlockedAreas) {
    if (worldIndex.byId.has(areaId)) unlockedAreas.add(areaId);
  }

  let changed = true;
  while (changed) {
    changed = false;
    const orderedAreas = [...areas].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    for (const area of orderedAreas) {
      if (unlockedAreas.has(area.id)) continue;

      const context = { concepts, completedLocations, rewards, unlockedAreas };
      if (!meetsRequirements(area.requirements, context)) continue;

      const hasOpenNeighbor = getAreaNeighbors(area, worldIndex).some((neighbor) =>
        unlockedAreas.has(neighbor.id),
      );
      if (!hasOpenNeighbor) continue;

      unlockedAreas.add(area.id);
      changed = true;
    }
  }

  return unlockedAreas;
}

export function getAreaEdgeStates(areas, worldIndex, unlockedAreaIds) {
  const states = [];

  for (const area of areas) {
    const areaUnlocked = unlockedAreaIds.has(area.id);
    for (let directionIndex = 0; directionIndex < 6; directionIndex += 1) {
      const neighbor = getNeighborArea(area, directionIndex, worldIndex);
      const neighborUnlocked = neighbor ? unlockedAreaIds.has(neighbor.id) : false;

      states.push({
        area,
        directionIndex,
        neighbor,
        areaUnlocked,
        neighborUnlocked,
        open: Boolean(areaUnlocked && neighborUnlocked),
        barrier: Boolean(areaUnlocked && !neighborUnlocked),
      });
    }
  }

  return states;
}

export function uniqueSharedEdges(areas, worldIndex) {
  const edges = [];
  const seen = new Set();

  for (const area of areas) {
    for (let directionIndex = 0; directionIndex < 6; directionIndex += 1) {
      const neighbor = getNeighborArea(area, directionIndex, worldIndex);
      if (!neighbor) continue;
      const key = [area.id, neighbor.id].sort().join("::");
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ area, neighbor, directionIndex });
    }
  }

  return edges;
}
