import { deriveKnowledgeGraphEdges } from "../core/knowledge-graph.js";
import { axialDistance, axialKey, pointInHex } from "../core/hex.js";
import { normalizeRequirements } from "../core/requirements.js";
import { validateProjectData } from "../core/validator.js";
import { LOCATIONS } from "../data/locations.js";
import { AREAS, WORLD_CONFIG } from "../data/world.js";

export const EDITOR_DOCUMENT_KIND = "orbit-editor-project";
export const EDITOR_DOCUMENT_SCHEMA_VERSION = 1;
export const EDITOR_COURSE_ID = "electromagnetism-applied";
export const EDITOR_BASE_DATA_VERSION = "0.4.0";
export const EDITOR_LOCATION_SAFE_MARGIN = 28;

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
    first.kind.localeCompare(second.kind)
  );
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

export function createEditorDocument(options = {}) {
  const context = canonicalContext(options);
  const updatedAt = dateString(options.updatedAt, new Date().toISOString());

  return {
    kind: EDITOR_DOCUMENT_KIND,
    schemaVersion: EDITOR_DOCUMENT_SCHEMA_VERSION,
    courseId: context.courseId,
    baseDataVersion: context.baseDataVersion,
    areas: context.baseAreas.map((area) => ({
      id: area.id,
      q: normalizeZero(area.q),
      r: normalizeZero(area.r),
    })),
    locations: context.baseLocations.map((location) => ({
      id: location.id,
      areaId: location.areaId,
      offset: {
        x: normalizeZero(location.offset.x),
        y: normalizeZero(location.offset.y),
      },
    })),
    treeTwoConnections: canonicalConnections(context.baseLocations),
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

function rebaseAreas(candidateAreas, context, errors, warnings) {
  const canonical = new Map(
    context.baseAreas.map((area) => [
      area.id,
      { id: area.id, q: normalizeZero(area.q), r: normalizeZero(area.r) },
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
    canonical.set(entry.id, {
      id: entry.id,
      q: normalizeZero(entry.q),
      r: normalizeZero(entry.r),
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

function rebaseConnections(candidateConnections, context, errors, warnings) {
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
  return connections.sort(compareConnections);
}

function materializeEditorDocument(document, context) {
  const areaPlacement = new Map(document.areas.map((area) => [area.id, area]));
  const locationPlacement = new Map(
    document.locations.map((location) => [location.id, location]),
  );
  const completedByTarget = new Map();
  for (const connection of document.treeTwoConnections) {
    const sources = completedByTarget.get(connection.targetId) ?? [];
    sources.push(connection.sourceId);
    completedByTarget.set(connection.targetId, sources);
  }

  const areas = structuredClone(context.baseAreas).map((area) => {
    const placement = areaPlacement.get(area.id);
    return placement ? { ...area, q: placement.q, r: placement.r } : area;
  });
  const locations = structuredClone(context.baseLocations).map((location) => {
    const placement = locationPlacement.get(location.id);
    const requirements = normalizeRequirements(location.requirements);
    return {
      ...location,
      areaId: placement?.areaId ?? location.areaId,
      offset: placement ? { ...placement.offset } : { ...location.offset },
      requirements: {
        ...(isRecord(location.requirements) ? location.requirements : {}),
        concepts: [...requirements.concepts],
        completedLocations: [...(completedByTarget.get(location.id) ?? [])],
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

function validateNormalizedDocument(document, context) {
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
        "tree-two-cycle",
        `La edición crea un ciclo en el Árbol II: ${cycle.join(" → ")}.`,
        "treeTwoConnections",
      ),
    );
    return { errors, warnings };
  }

  const projectValidation = validateProjectData(course);
  for (const message of projectValidation.errors) {
    errors.push(issue("project-data-invalid", message));
  }
  for (const message of projectValidation.warnings) {
    warnings.push(issue("project-data-warning", message));
  }
  return { errors, warnings };
}

export function sanitizeEditorDocument(candidate, options = {}) {
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
  if (source.schemaVersion !== EDITOR_DOCUMENT_SCHEMA_VERSION) {
    errors.push(
      issue(
        "unsupported-editor-schema",
        `Se esperaba schemaVersion ${EDITOR_DOCUMENT_SCHEMA_VERSION}.`,
        "schemaVersion",
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

  const fallbackTimestamp = new Date().toISOString();
  const document = {
    kind: EDITOR_DOCUMENT_KIND,
    schemaVersion: EDITOR_DOCUMENT_SCHEMA_VERSION,
    courseId: context.courseId,
    baseDataVersion: context.baseDataVersion,
    areas: rebaseAreas(source.areas, context, errors, warnings),
    locations: rebaseLocations(source.locations, context, errors, warnings),
    treeTwoConnections: rebaseConnections(
      source.treeTwoConnections,
      context,
      errors,
      warnings,
    ),
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

  const validation = validateNormalizedDocument(document, context);
  return {
    ok: validation.errors.length === 0,
    document: validation.errors.length === 0 ? document : null,
    errors: validation.errors,
    warnings: [...warnings, ...validation.warnings],
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
  return sanitizeEditorDocument(candidate, options);
}

export class EditorDocumentError extends Error {
  constructor(message, issues = []) {
    super(message);
    this.name = "EditorDocumentError";
    this.issues = structuredClone(issues);
  }
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
