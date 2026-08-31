import {
  LEARNING_LOCATION_KINDS,
  deriveKnowledgeGraphEdges,
  isLearningLocation,
} from "../core/knowledge-graph.js";
import { axialDistance, axialKey, pointInHex } from "../core/hex.js";
import { normalizeRequirements } from "../core/requirements.js";
import { validateProjectData } from "../core/validator.js";
import {
  AREA_APPEARANCE_CATALOG_VERSION,
  DEFAULT_AREA_APPEARANCE,
  sanitizeAreaAppearance,
} from "../core/area-appearance.js";
import { LOCATIONS } from "../data/locations.js";
import { AREAS, WORLD_CONFIG } from "../data/world.js";

export const EDITOR_DOCUMENT_KIND = "orbit-editor-project";
export const EDITOR_DOCUMENT_SCHEMA_VERSION = 3;
export const EDITOR_COURSE_ID = "electromagnetism-applied";
export const EDITOR_BASE_DATA_VERSION = "0.6.0";
export const EDITOR_LOCATION_SAFE_MARGIN = 28;
export const EDITOR_LEARNING_NETWORK_ROOT_ID = "vector-workshop";
export const EDITOR_LEARNING_LOCATION_KINDS = LEARNING_LOCATION_KINDS;

const LEGACY_ACADEMIC_DERIVED_CONNECTIONS = Object.freeze([
  ["antenna-range", "atacama-array"],
  ["spectrum-workshop", "atacama-array"],
  ["wireless-link-station", "lunar-relay"],
  ["power-network-station", "lunar-relay"],
  ["field-solver-lab", "lunar-relay"],
  ["optics-bench", "lunar-relay"],
  ["superconductivity-transition-lab", "lunar-relay"],
]);

export function isEditorLearningLocation(location) {
  return isLearningLocation(location);
}

function issue(code, message, path = null) {
  return { code, message, path };
}

function normalizeZero(value) {
  return Object.is(value, -0) ? 0 : value;
}

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function dateString(value, fallback) {
  if (typeof value !== "string" || !value.trim() || Number.isNaN(Date.parse(value))) {
    return fallback;
  }
  return value;
}

function canonicalContext(options = {}) {
  const baseAreas = Array.isArray(options.baseAreas) ? options.baseAreas : AREAS;
  const baseLocations = Array.isArray(options.baseLocations)
    ? options.baseLocations
    : LOCATIONS;
  const worldConfig = isRecord(options.worldConfig) ? options.worldConfig : WORLD_CONFIG;
  const courseId = options.courseId ?? EDITOR_COURSE_ID;
  const baseDataVersion = options.baseDataVersion ?? EDITOR_BASE_DATA_VERSION;
  const areaById = new Map(baseAreas.map((area) => [area.id, area]));
  const locationById = new Map(baseLocations.map((location) => [location.id, location]));

  return {
    baseAreas,
    baseLocations,
    worldConfig,
    courseId,
    baseDataVersion,
    areaById,
    locationById,
  };
}

function compareConnections(first, second) {
  return (
    first.sourceId.localeCompare(second.sourceId) ||
    first.targetId.localeCompare(second.targetId) ||
    String(first.kind ?? "").localeCompare(String(second.kind ?? ""))
  );
}

function canonicalAreaAppearance(area) {
  const result = sanitizeAreaAppearance(area?.appearance ?? DEFAULT_AREA_APPEARANCE);
  return structuredClone(result.ok ? result.appearance : DEFAULT_AREA_APPEARANCE);
}

function canonicalConnections(baseLocations) {
  return baseLocations
    .flatMap((location) =>
      normalizeRequirements(location.requirements).completedLocations.map((sourceId) => ({
        sourceId,
        targetId: location.id,
        kind: "completedLocation",
      })),
    )
    .sort(compareConnections);
}

function academicLocationIds(locations) {
  return locations.filter(isEditorLearningLocation).map((location) => location.id);
}

function academicConnections(locations) {
  const ids = new Set(academicLocationIds(locations));
  return canonicalConnections(locations)
    .filter(({ sourceId, targetId }) => ids.has(sourceId) && ids.has(targetId))
    .map(({ sourceId, targetId }) => ({ sourceId, targetId }))
    .sort(compareConnections);
}

export function createEditorDocument(options = {}) {
  const context = canonicalContext(options);
  const updatedAt = dateString(options.updatedAt, new Date().toISOString());

  return {
    kind: EDITOR_DOCUMENT_KIND,
    schemaVersion: EDITOR_DOCUMENT_SCHEMA_VERSION,
    appearanceCatalogVersion: AREA_APPEARANCE_CATALOG_VERSION,
    courseId: context.courseId,
    baseDataVersion: context.baseDataVersion,
    areas: context.baseAreas.map((area) => ({
      id: area.id,
      q: normalizeZero(area.q),
      r: normalizeZero(area.r),
      appearance: canonicalAreaAppearance(area),
    })),
    locations: context.baseLocations.map((location) => ({
      id: location.id,
      areaId: location.areaId,
      offset: {
        x: normalizeZero(location.offset.x),
        y: normalizeZero(location.offset.y),
      },
    })),
    learningNetwork: {
      nodeIds: academicLocationIds(context.baseLocations),
      connections: academicConnections(context.baseLocations),
    },
    updatedAt,
  };
}

function parseCandidate(candidate) {
  if (typeof candidate !== "string") return { value: candidate, errors: [] };
  try {
    return { value: JSON.parse(candidate), errors: [] };
  } catch (error) {
    return {
      value: null,
      errors: [
        issue(
          "invalid-json",
          `El archivo no contiene JSON válido: ${error instanceof Error ? error.message : String(error)}.`,
        ),
      ],
    };
  }
}

function rebaseAreas(
  candidateAreas,
  context,
  errors,
  warnings,
  { sourceSchemaVersion = EDITOR_DOCUMENT_SCHEMA_VERSION } = {},
) {
  const canonical = new Map(
    context.baseAreas.map((area) => [
      area.id,
      {
        id: area.id,
        q: normalizeZero(area.q),
        r: normalizeZero(area.r),
        appearance: canonicalAreaAppearance(area),
      },
    ]),
  );
  if (!Array.isArray(candidateAreas)) {
    warnings.push(
      issue(
        "areas-rebased",
        "El documento no declara areas; se restauró la cartografía canónica.",
        "areas",
      ),
    );
    return context.baseAreas.map((area) => canonical.get(area.id));
  }

  const seen = new Set();
  for (const [index, entry] of candidateAreas.entries()) {
    const path = `areas[${index}]`;
    if (!isRecord(entry) || typeof entry.id !== "string") {
      errors.push(issue("invalid-area-entry", "Cada zona debe declarar un ID.", path));
      continue;
    }
    if (seen.has(entry.id)) {
      errors.push(issue("duplicate-area-id", `La zona ${entry.id} aparece más de una vez.`, path));
      continue;
    }
    seen.add(entry.id);
    if (!context.areaById.has(entry.id)) {
      warnings.push(
        issue("unknown-area-ignored", `Se ignoró la zona desconocida ${entry.id}.`, path),
      );
      continue;
    }
    if (!Number.isInteger(entry.q) || !Number.isInteger(entry.r)) {
      errors.push(
        issue(
          "invalid-axial-coordinate",
          `La zona ${entry.id} debe usar coordenadas axiales enteras.`,
          path,
        ),
      );
      continue;
    }
    const appearance = sourceSchemaVersion === 1
      ? { ok: true, appearance: canonicalAreaAppearance(context.areaById.get(entry.id)), errors: [] }
      : sanitizeAreaAppearance(entry.appearance, { path: `${path}.appearance` });
    errors.push(...appearance.errors);
    if (!appearance.ok) continue;
    canonical.set(entry.id, {
      id: entry.id,
      q: normalizeZero(entry.q),
      r: normalizeZero(entry.r),
      appearance: appearance.appearance,
    });
  }

  const missing = context.baseAreas
    .map((area) => area.id)
    .filter((areaId) => !seen.has(areaId));
  if (missing.length > 0) {
    warnings.push(
      issue(
        "areas-rebased",
        `Se restauraron ${missing.length} zonas ausentes desde la cartografía canónica.`,
        "areas",
      ),
    );
  }

  return context.baseAreas.map((area) => canonical.get(area.id));
}

function rebaseLocations(candidateLocations, context, errors, warnings) {
  const canonical = new Map(
    context.baseLocations.map((location) => [
      location.id,
      {
        id: location.id,
        areaId: location.areaId,
        offset: {
          x: normalizeZero(location.offset.x),
          y: normalizeZero(location.offset.y),
        },
      },
    ]),
  );
  if (!Array.isArray(candidateLocations)) {
    warnings.push(
      issue(
        "locations-rebased",
        "El documento no declara locations; se restauraron las ubicaciones canónicas.",
        "locations",
      ),
    );
    return context.baseLocations.map((location) => canonical.get(location.id));
  }

  const seen = new Set();
  for (const [index, entry] of candidateLocations.entries()) {
    const path = `locations[${index}]`;
    if (!isRecord(entry) || typeof entry.id !== "string") {
      errors.push(issue("invalid-location-entry", "Cada nodo debe declarar un ID.", path));
      continue;
    }
    if (seen.has(entry.id)) {
      errors.push(
        issue("duplicate-location-id", `El nodo ${entry.id} aparece más de una vez.`, path),
      );
      continue;
    }
    seen.add(entry.id);
    if (!context.locationById.has(entry.id)) {
      warnings.push(
        issue("unknown-location-ignored", `Se ignoró el nodo desconocido ${entry.id}.`, path),
      );
      continue;
    }
    if (typeof entry.areaId !== "string" || !context.areaById.has(entry.areaId)) {
      errors.push(
        issue(
          "unknown-location-area",
          `El nodo ${entry.id} referencia una zona inexistente: ${String(entry.areaId)}.`,
          `${path}.areaId`,
        ),
      );
      continue;
    }
    if (!isRecord(entry.offset) || !Number.isFinite(entry.offset.x) || !Number.isFinite(entry.offset.y)) {
      errors.push(
        issue(
          "invalid-location-offset",
          `El nodo ${entry.id} debe declarar un offset finito.`,
          `${path}.offset`,
        ),
      );
      continue;
    }
    canonical.set(entry.id, {
      id: entry.id,
      areaId: entry.areaId,
      offset: {
        x: normalizeZero(entry.offset.x),
        y: normalizeZero(entry.offset.y),
      },
    });
  }

  const missing = context.baseLocations
    .map((location) => location.id)
    .filter((locationId) => !seen.has(locationId));
  if (missing.length > 0) {
    warnings.push(
      issue(
        "locations-rebased",
        `Se restauraron ${missing.length} nodos ausentes desde los datos canónicos.`,
        "locations",
      ),
    );
  }

  return context.baseLocations.map((location) => canonical.get(location.id));
}

function rebaseConnections(
  candidateConnections,
  context,
  errors,
  warnings,
  { restoredLocationIds = new Set() } = {},
) {
  if (candidateConnections === undefined) {
    warnings.push(
      issue(
        "connections-rebased",
        "El documento no declara treeTwoConnections; se restauraron las dependencias canónicas.",
        "treeTwoConnections",
      ),
    );
    return canonicalConnections(context.baseLocations);
  }
  if (!Array.isArray(candidateConnections)) {
    errors.push(
      issue(
        "invalid-connections",
        "treeTwoConnections debe ser una lista.",
        "treeTwoConnections",
      ),
    );
    return [];
  }

  const connections = [];
  const seen = new Set();
  for (const [index, entry] of candidateConnections.entries()) {
    const path = `treeTwoConnections[${index}]`;
    if (!isRecord(entry)) {
      errors.push(issue("invalid-connection", "Cada conexión debe ser un objeto.", path));
      continue;
    }
    if (entry.kind !== "completedLocation") {
      errors.push(
        issue(
          "unsupported-connection-kind",
          "Spider 0.4.0 solo admite conexiones completedLocation.",
          `${path}.kind`,
        ),
      );
      continue;
    }
    if (
      typeof entry.sourceId !== "string" ||
      typeof entry.targetId !== "string"
    ) {
      errors.push(
        issue("invalid-connection", "La conexión debe declarar sourceId y targetId.", path),
      );
      continue;
    }
    if (!context.locationById.has(entry.sourceId) || !context.locationById.has(entry.targetId)) {
      warnings.push(
        issue(
          "unknown-connection-ignored",
          `Se ignoró la conexión ${entry.sourceId} → ${entry.targetId} porque uno de sus nodos no existe.`,
          path,
        ),
      );
      continue;
    }
    if (entry.sourceId === entry.targetId) {
      errors.push(
        issue(
          "self-connection",
          `El nodo ${entry.sourceId} no puede depender de sí mismo.`,
          path,
        ),
      );
      continue;
    }
    const key = `${entry.sourceId}->${entry.targetId}`;
    if (seen.has(key)) {
      errors.push(
        issue("duplicate-connection", `La conexión ${key} está repetida.`, path),
      );
      continue;
    }
    seen.add(key);
    connections.push({
      sourceId: entry.sourceId,
      targetId: entry.targetId,
      kind: "completedLocation",
    });
  }
  const restoredConnections = canonicalConnections(context.baseLocations).filter(
    (connection) =>
      restoredLocationIds.has(connection.sourceId)
      || restoredLocationIds.has(connection.targetId),
  );
  let restoredCount = 0;
  for (const connection of restoredConnections) {
    const key = `${connection.sourceId}->${connection.targetId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    connections.push(connection);
    restoredCount += 1;
  }
  if (restoredCount > 0) {
    warnings.push(
      issue(
        "connections-rebased",
        `Se restauraron ${restoredCount} dependencias canónicas asociadas a nodos nuevos.`,
        "treeTwoConnections",
      ),
    );
  }
  return connections.sort(compareConnections);
}

function migrateLegacyLearningNetwork(connections, context) {
  const academicIds = new Set(academicLocationIds(context.baseLocations));
  const byPair = new Map();
  for (const connection of connections) {
    if (!academicIds.has(connection.sourceId) || !academicIds.has(connection.targetId)) continue;
    byPair.set(connection.sourceId + "->" + connection.targetId, {
      sourceId: connection.sourceId,
      targetId: connection.targetId,
    });
  }
  for (const [sourceId, targetId] of LEGACY_ACADEMIC_DERIVED_CONNECTIONS) {
    if (!academicIds.has(sourceId) || !academicIds.has(targetId)) continue;
    byPair.set(sourceId + "->" + targetId, { sourceId, targetId });
  }
  return {
    nodeIds: [...academicIds],
    connections: [...byPair.values()].sort(compareConnections),
  };
}

function sanitizeLearningNetwork(candidate, context, errors) {
  if (!isRecord(candidate)) {
    errors.push(issue("missing-learning-network", "El documento v3 debe declarar learningNetwork.", "learningNetwork"));
    return { nodeIds: [], connections: [] };
  }
  if (!Array.isArray(candidate.nodeIds)) {
    errors.push(issue("invalid-learning-network-nodes", "nodeIds debe ser una lista.", "learningNetwork.nodeIds"));
  }
  if (!Array.isArray(candidate.connections)) {
    errors.push(issue("invalid-connections", "connections debe ser una lista.", "learningNetwork.connections"));
  }
  if (errors.length > 0) return { nodeIds: [], connections: [] };

  const academicIdsInCatalogOrder = academicLocationIds(context.baseLocations);
  const academicIds = new Set(academicIdsInCatalogOrder);
  const nodeSet = new Set();
  for (const [index, nodeId] of candidate.nodeIds.entries()) {
    const path = "learningNetwork.nodeIds[" + index + "]";
    if (!context.locationById.has(nodeId)) {
      errors.push(issue("unknown-learning-network-node", "Nodo desconocido: " + String(nodeId) + ".", path));
    } else if (!academicIds.has(nodeId)) {
      errors.push(issue("lateral-learning-network-node", nodeId + " no es lesson ni mission.", path));
    } else if (nodeSet.has(nodeId)) {
      errors.push(issue("duplicate-learning-network-node", "Nodo repetido: " + nodeId + ".", path));
    } else {
      nodeSet.add(nodeId);
    }
  }

  const connections = [];
  const pairs = new Set();
  for (const [index, entry] of candidate.connections.entries()) {
    const path = "learningNetwork.connections[" + index + "]";
    if (!isRecord(entry) || typeof entry.sourceId !== "string" || typeof entry.targetId !== "string") {
      errors.push(issue("invalid-connection", "Cada conexión requiere sourceId y targetId.", path));
      continue;
    }
    if (!academicIds.has(entry.sourceId) || !academicIds.has(entry.targetId)) {
      errors.push(issue("lateral-learning-network-connection", "La red solo conecta lesson o mission.", path));
      continue;
    }
    if (!nodeSet.has(entry.sourceId) || !nodeSet.has(entry.targetId)) {
      errors.push(issue("connection-endpoint-outside-network", "Una conexión usa un nodo retirado.", path));
      continue;
    }
    if (entry.sourceId === entry.targetId) {
      errors.push(issue("self-connection", "Un nodo no puede depender de sí mismo.", path));
      continue;
    }
    const key = entry.sourceId + "->" + entry.targetId;
    if (pairs.has(key)) errors.push(issue("duplicate-connection", "Conexión repetida: " + key + ".", path));
    else {
      pairs.add(key);
      connections.push({ sourceId: entry.sourceId, targetId: entry.targetId });
    }
  }
  const canonicalNodeIds = academicIdsInCatalogOrder.filter((nodeId) => nodeSet.has(nodeId));
  return { nodeIds: canonicalNodeIds, connections: connections.sort(compareConnections) };
}

function materializeEditorDocument(document, context) {
  const areaPlacement = new Map(document.areas.map((area) => [area.id, area]));
  const locationPlacement = new Map(
    document.locations.map((location) => [location.id, location]),
  );
  const completedByTarget = new Map();
  for (const connection of document.learningNetwork.connections) {
    const sources = completedByTarget.get(connection.targetId) ?? [];
    sources.push(connection.sourceId);
    completedByTarget.set(connection.targetId, sources);
  }
  const learningNodeIds = new Set(document.learningNetwork.nodeIds);

  const areas = structuredClone(context.baseAreas).map((area) => {
    const placement = areaPlacement.get(area.id);
    return placement
      ? {
          ...area,
          q: placement.q,
          r: placement.r,
          appearance: structuredClone(placement.appearance),
        }
      : { ...area, appearance: canonicalAreaAppearance(area) };
  });
  const locations = structuredClone(context.baseLocations).map((location) => {
    const placement = locationPlacement.get(location.id);
    const requirements = normalizeRequirements(location.requirements);
    const completedLocations = isEditorLearningLocation(location)
      ? learningNodeIds.has(location.id)
        ? [...(completedByTarget.get(location.id) ?? [])]
        : []
      : [...requirements.completedLocations];
    return {
      ...location,
      areaId: placement?.areaId ?? location.areaId,
      offset: placement ? { ...placement.offset } : { ...location.offset },
      requirements: {
        ...(isRecord(location.requirements) ? location.requirements : {}),
        concepts: [...requirements.concepts],
        completedLocations,
        rewards: [...requirements.rewards],
        areas: [...requirements.areas],
      },
    };
  });

  return { areas, locations };
}

export function deriveEditorTreeTwoTopology({ areas = AREAS, locations = LOCATIONS } = {}) {
  const ids = locations.map((location) => location.id);
  const allIds = new Set(ids);
  const snapshot = {
    visibleLocationIds: allIds,
    accessibleLocationIds: allIds,
    completedLocationIds: allIds,
  };
  return deriveKnowledgeGraphEdges({
    locations,
    areas,
    snapshot,
    visualizationMode: "total",
  }).map(({ id, sourceId, targetId, requirementKinds }) => ({
    id,
    sourceId,
    targetId,
    requirementKinds: [...requirementKinds],
  }));
}

function findTopologyCycle(locations, areas) {
  const ids = locations.map((location) => location.id);
  const edges = deriveEditorTreeTwoTopology({ locations, areas });
  const adjacency = new Map(ids.map((id) => [id, []]));
  for (const edge of edges) adjacency.get(edge.sourceId)?.push(edge.targetId);

  const state = new Map();
  const path = [];
  const visit = (id) => {
    state.set(id, 1);
    path.push(id);
    for (const targetId of adjacency.get(id) ?? []) {
      if (state.get(targetId) === 1) {
        const start = path.indexOf(targetId);
        return [...path.slice(start), targetId];
      }
      if (state.get(targetId) !== 2) {
        const cycle = visit(targetId);
        if (cycle) return cycle;
      }
    }
    path.pop();
    state.set(id, 2);
    return null;
  };

  for (const id of ids) {
    if (state.has(id)) continue;
    const cycle = visit(id);
    if (cycle) return cycle;
  }
  return null;
}

function validateDraftStructure(document, context) {
  const errors = [];
  const warnings = [];
  const coordinateOwners = new Map();

  for (const area of document.areas) {
    const key = axialKey(area.q, area.r);
    const owner = coordinateOwners.get(key);
    if (owner) {
      errors.push(
        issue(
          "duplicate-axial-coordinate",
          `Las zonas ${owner} y ${area.id} ocupan la coordenada axial ${key}.`,
          "areas",
        ),
      );
    } else {
      coordinateOwners.set(key, area.id);
    }

    const canonicalArea = context.areaById.get(area.id);
    const expectedTier = canonicalArea?.tier ?? axialDistance(canonicalArea, { q: 0, r: 0 });
    const actualTier = axialDistance(area, { q: 0, r: 0 });
    if (actualTier !== expectedTier) {
      errors.push(
        issue(
          "ring-mismatch",
          `La zona ${area.id} pertenece al anillo ${expectedTier} y no puede situarse en el anillo ${actualTier}.`,
          "areas",
        ),
      );
    }
    if (area.id === context.worldConfig.spawnAreaId && (area.q !== 0 || area.r !== 0)) {
      errors.push(
        issue(
          "origin-fixed",
          `La zona central ${area.id} debe permanecer en (0,0).`,
          "areas",
        ),
      );
    }
  }

  const safeSize = context.worldConfig.hexSize - EDITOR_LOCATION_SAFE_MARGIN;
  for (const location of document.locations) {
    if (
      !pointInHex(location.offset.x, location.offset.y, 0, 0, safeSize)
    ) {
      errors.push(
        issue(
          "location-outside-safe-margin",
          `El nodo ${location.id} debe permanecer dentro del margen seguro de su hexágono.`,
          "locations",
        ),
      );
    }
  }

  if (errors.length > 0) return { errors, warnings };

  const course = materializeEditorDocument(document, context);
  const cycle = findTopologyCycle(course.locations, course.areas);
  if (cycle) {
    errors.push(
      issue(
        "learning-network-cycle",
        `La edición crea un ciclo en la Red de aprendizaje: ${cycle.join(" → ")}.`,
        "learningNetwork.connections",
      ),
    );
    return { errors, warnings };
  }

  return { errors, warnings };
}

function validatePublishableDocument(document, context) {
  const errors = [];
  const warnings = [];
  const academicIds = academicLocationIds(context.baseLocations);
  const nodeIds = new Set(document.learningNetwork.nodeIds);
  const incoming = new Map(academicIds.map((id) => [id, 0]));
  const adjacency = new Map(academicIds.map((id) => [id, []]));
  for (const connection of document.learningNetwork.connections) {
    incoming.set(
      connection.targetId,
      (incoming.get(connection.targetId) ?? 0) + 1,
    );
    adjacency.get(connection.sourceId)?.push(connection.targetId);
  }

  for (const id of academicIds) {
    if (!nodeIds.has(id)) {
      errors.push(
        issue(
          "missing-learning-network-node",
          "El nodo académico " + id + " fue retirado de la Red de aprendizaje.",
          "learningNetwork.nodeIds",
        ),
      );
    }
  }
  if (!nodeIds.has(EDITOR_LEARNING_NETWORK_ROOT_ID)) {
    errors.push(
      issue(
        "missing-learning-network-root",
        "La raíz " + EDITOR_LEARNING_NETWORK_ROOT_ID + " debe pertenecer a la red.",
        "learningNetwork.nodeIds",
      ),
    );
  }
  for (const id of academicIds) {
    if (!nodeIds.has(id)) continue;
    const predecessorCount = incoming.get(id) ?? 0;
    if (id === EDITOR_LEARNING_NETWORK_ROOT_ID && predecessorCount !== 0) {
      errors.push(
        issue(
          "invalid-learning-network-root",
          "La raíz " + id + " no puede tener predecesores.",
          "learningNetwork.connections",
        ),
      );
    } else if (id !== EDITOR_LEARNING_NETWORK_ROOT_ID && predecessorCount === 0) {
      errors.push(
        issue(
          "missing-learning-predecessor",
          "El nodo académico " + id + " debe tener al menos un predecesor.",
          "learningNetwork.connections",
        ),
      );
    }
  }

  const reachable = new Set();
  const pending = nodeIds.has(EDITOR_LEARNING_NETWORK_ROOT_ID)
    ? [EDITOR_LEARNING_NETWORK_ROOT_ID]
    : [];
  while (pending.length > 0) {
    const id = pending.shift();
    if (reachable.has(id)) continue;
    reachable.add(id);
    pending.push(...(adjacency.get(id) ?? []));
  }
  for (const id of academicIds) {
    if (nodeIds.has(id) && !reachable.has(id)) {
      errors.push(
        issue(
          "unreachable-learning-network-node",
          "El nodo académico " + id + " no es alcanzable desde la raíz.",
          "learningNetwork.connections",
        ),
      );
    }
  }
  if (errors.length > 0) return { errors, warnings };

  const course = materializeEditorDocument(document, context);
  const projectValidation = validateProjectData(course);
  for (const message of projectValidation.errors) {
    errors.push(issue("project-data-invalid", message));
  }
  for (const message of projectValidation.warnings) {
    warnings.push(issue("project-data-warning", message));
  }
  return { errors, warnings };
}

export function sanitizeEditorDraft(candidate, options = {}) {
  const context = canonicalContext(options);
  const parsed = parseCandidate(candidate);
  if (parsed.errors.length > 0) {
    return { ok: false, document: null, errors: parsed.errors, warnings: [] };
  }
  if (!isRecord(parsed.value)) {
    return {
      ok: false,
      document: null,
      errors: [issue("invalid-document", "El proyecto del editor debe ser un objeto JSON.")],
      warnings: [],
    };
  }

  const source = parsed.value;
  const errors = [];
  const warnings = [];
  if (source.kind !== EDITOR_DOCUMENT_KIND) {
    errors.push(
      issue(
        "wrong-document-kind",
        `Se esperaba kind ${EDITOR_DOCUMENT_KIND}.`,
        "kind",
      ),
    );
  }
  const sourceSchemaVersion = source.schemaVersion;
  if (![1, 2, EDITOR_DOCUMENT_SCHEMA_VERSION].includes(sourceSchemaVersion)) {
    errors.push(
      issue(
        "unsupported-editor-schema",
        `Se esperaba schemaVersion 1, 2 o ${EDITOR_DOCUMENT_SCHEMA_VERSION}.`,
        "schemaVersion",
      ),
    );
  }
  if (
    [2, EDITOR_DOCUMENT_SCHEMA_VERSION].includes(sourceSchemaVersion)
    && source.appearanceCatalogVersion !== AREA_APPEARANCE_CATALOG_VERSION
  ) {
    errors.push(
      issue(
        "unsupported-appearance-catalog",
        `Se esperaba appearanceCatalogVersion ${AREA_APPEARANCE_CATALOG_VERSION}.`,
        "appearanceCatalogVersion",
      ),
    );
  }
  if (source.courseId !== context.courseId) {
    errors.push(
      issue(
        "wrong-course",
        `El documento pertenece a ${String(source.courseId)} y no a ${context.courseId}.`,
        "courseId",
      ),
    );
  }
  if (source.baseDataVersion !== context.baseDataVersion) {
    warnings.push(
      issue(
        "base-version-rebased",
        `El documento de ${String(source.baseDataVersion)} se rebasó sobre ${context.baseDataVersion}.`,
        "baseDataVersion",
      ),
    );
  }
  if (errors.length > 0) {
    return { ok: false, document: null, errors, warnings };
  }
  if (sourceSchemaVersion < EDITOR_DOCUMENT_SCHEMA_VERSION) {
    warnings.push(
      issue(
        "editor-schema-migrated",
        `El documento editorial v${sourceSchemaVersion} se migró a v${EDITOR_DOCUMENT_SCHEMA_VERSION} con la topología académica efectiva explícita.`,
        "schemaVersion",
      ),
    );
  }

  const fallbackTimestamp = new Date().toISOString();
  const declaredLocationIds = new Set(
    (Array.isArray(source.locations) ? source.locations : [])
      .filter((entry) => isRecord(entry) && typeof entry.id === "string")
      .map((entry) => entry.id),
  );
  const restoredLocationIds = new Set(
    context.baseLocations
      .map((location) => location.id)
      .filter((locationId) => !declaredLocationIds.has(locationId)),
  );
  const areas = rebaseAreas(
    source.areas,
    context,
    errors,
    warnings,
    { sourceSchemaVersion },
  );
  const locations = rebaseLocations(
    source.locations,
    context,
    errors,
    warnings,
  );
  const learningNetwork = sourceSchemaVersion < EDITOR_DOCUMENT_SCHEMA_VERSION
    ? migrateLegacyLearningNetwork(
        rebaseConnections(
          source.treeTwoConnections,
          context,
          errors,
          warnings,
          { restoredLocationIds },
        ),
        context,
      )
    : sanitizeLearningNetwork(source.learningNetwork, context, errors);
  const document = {
    kind: EDITOR_DOCUMENT_KIND,
    schemaVersion: EDITOR_DOCUMENT_SCHEMA_VERSION,
    appearanceCatalogVersion: AREA_APPEARANCE_CATALOG_VERSION,
    courseId: context.courseId,
    baseDataVersion: context.baseDataVersion,
    areas,
    locations,
    learningNetwork,
    updatedAt: dateString(source.updatedAt, fallbackTimestamp),
  };
  if (source.updatedAt !== document.updatedAt) {
    warnings.push(
      issue("updated-at-rebased", "Se restauró una fecha de actualización válida.", "updatedAt"),
    );
  }
  if (errors.length > 0) {
    return { ok: false, document: null, errors, warnings };
  }

  const validation = validateDraftStructure(document, context);
  return {
    ok: validation.errors.length === 0,
    document: validation.errors.length === 0 ? document : null,
    errors: validation.errors,
    warnings: [...warnings, ...validation.warnings],
  };
}

export function sanitizeEditorDocument(candidate, options = {}) {
  const context = canonicalContext(options);
  const draft = sanitizeEditorDraft(candidate, options);
  if (!draft.ok) return draft;
  const validation = validatePublishableDocument(draft.document, context);
  return {
    ok: validation.errors.length === 0,
    document: validation.errors.length === 0 ? draft.document : null,
    errors: validation.errors,
    warnings: [...draft.warnings, ...validation.warnings],
  };
}

export function validateEditorDocument(candidate, options = {}) {
  const result = sanitizeEditorDocument(candidate, options);
  return {
    valid: result.ok,
    errors: result.errors,
    warnings: result.warnings,
  };
}

export function importEditorDocument(candidate, options = {}) {
  return sanitizeEditorDraft(candidate, options);
}

export class EditorDocumentError extends Error {
  constructor(message, issues = []) {
    super(message);
    this.name = "EditorDocumentError";
    this.issues = structuredClone(issues);
  }
}

export function materializeEditorDraft(candidate, options = {}) {
  const context = canonicalContext(options);
  const result = sanitizeEditorDraft(candidate, options);
  if (!result.ok) {
    throw new EditorDocumentError(
      "El borrador del editor no superó el saneamiento estructural.",
      result.errors,
    );
  }
  return {
    document: structuredClone(result.document),
    ...materializeEditorDocument(result.document, context),
    warnings: structuredClone(result.warnings),
  };
}

export function applyEditorDocument(candidate, options = {}) {
  const context = canonicalContext(options);
  const result = sanitizeEditorDocument(candidate, options);
  if (!result.ok) {
    throw new EditorDocumentError(
      "El proyecto del editor no superó la validación.",
      result.errors,
    );
  }
  return {
    document: structuredClone(result.document),
    ...materializeEditorDocument(result.document, context),
    warnings: structuredClone(result.warnings),
  };
}

export function serializeEditorDraft(candidate, options = {}) {
  const result = sanitizeEditorDraft(candidate, options);
  if (!result.ok) {
    throw new EditorDocumentError(
      "El borrador del editor no puede exportarse porque su estructura es inválida.",
      result.errors,
    );
  }
  return JSON.stringify(result.document, null, 2) + "\n";
}

export function serializeEditorDocument(candidate, options = {}) {
  const result = sanitizeEditorDocument(candidate, options);
  if (!result.ok) {
    throw new EditorDocumentError(
      "El proyecto del editor no puede exportarse porque es inválido.",
      result.errors,
    );
  }
  return `${JSON.stringify(result.document, null, 2)}\n`;
}
