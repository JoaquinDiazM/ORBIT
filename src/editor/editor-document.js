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
export const EDITOR_DOCUMENT_SCHEMA_VERSION = 5;
export const EDITOR_COURSE_ID = "electromagnetism-applied";
export const EDITOR_BASE_DATA_VERSION = "0.7.0";
export const EDITOR_LOCATION_SAFE_MARGIN = 28;
export const EDITOR_LEARNING_NETWORK_ROOT_ID = "vector-workshop";
export const EDITOR_LEARNING_LOCATION_KINDS = LEARNING_LOCATION_KINDS;
export const EDITOR_LOCATION_LIFECYCLES = Object.freeze(["active", "inventory", "deleted"]);
export const EDITOR_LOCATION_PROVENANCES = Object.freeze(["canonical", "editor-created"]);
export const EDITOR_EDITABLE_LOCATION_KINDS = Object.freeze(["lesson", "mission", "npc"]);
export const EDITOR_PROTECTED_LOCATION_IDS = Object.freeze([
  EDITOR_LEARNING_NETWORK_ROOT_ID,
  "coulomb-observatory",
]);
export const EDITOR_CREATED_LOCATION_ID_PREFIX = "new-node-";
export const DEFAULT_EDITOR_TIER_LABELS = Object.freeze([
  Object.freeze({ tier: 1, text: "ANILLO 1 · TEORÍA", offset: Object.freeze({ x: 0, y: 0 }) }),
  Object.freeze({ tier: 2, text: "ANILLO 2 · APLICACIONES", offset: Object.freeze({ x: 0, y: 0 }) }),
]);

const CREATED_LOCATION_ID_PATTERN = /^new-node-(\d{4,})$/;
export const EDITOR_TITLE_MAX_LENGTH = 96;
export const EDITOR_SHORT_TITLE_MAX_LENGTH = 48;
export const EDITOR_TIER_LABEL_MAX_LENGTH = 72;
// Leaves ample room for the application envelope under the helper's 1 MiB
// request boundary, so every structurally accepted draft is actually sendable.
export const EDITOR_DOCUMENT_MAX_SERIALIZED_BYTES = 900_000;
export const EDITOR_MAX_EXTERNAL_LOCATION_SEQUENCE_ADVANCE = 10_000;
const TIER_LABEL_MAX_OFFSET = 640;
const EDITABLE_LOCATION_KIND_SET = new Set(EDITOR_EDITABLE_LOCATION_KINDS);
const LIFECYCLE_SET = new Set(EDITOR_LOCATION_LIFECYCLES);
const PROTECTED_LOCATION_ID_SET = new Set(EDITOR_PROTECTED_LOCATION_IDS);

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

export function isEditorEditableLocation(location) {
  return EDITABLE_LOCATION_KIND_SET.has(location?.kind);
}

export function isEditorProtectedLocationId(locationId) {
  return PROTECTED_LOCATION_ID_SET.has(locationId);
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

function normalizedName(value, maxLength = EDITOR_TITLE_MAX_LENGTH) {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result && !/[\r\n]/.test(result) && result.length <= maxLength ? result : null;
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
  const baselineCandidate = options.baseDocument ?? options.editorDocument;
  const editorBaseline = isRecord(baselineCandidate)
    && baselineCandidate.kind === EDITOR_DOCUMENT_KIND
    && baselineCandidate.schemaVersion === EDITOR_DOCUMENT_SCHEMA_VERSION
    ? baselineCandidate
    : null;

  return {
    baseAreas,
    baseLocations,
    worldConfig,
    courseId,
    baseDataVersion,
    areaById,
    locationById,
    editorBaseline,
    editorBaselineAreaById: new Map(
      (Array.isArray(editorBaseline?.areas) ? editorBaseline.areas : [])
        .map((area) => [area.id, area]),
    ),
    editorBaselineLocationById: new Map(
      (Array.isArray(editorBaseline?.locations) ? editorBaseline.locations : [])
        .map((location) => [location.id, location]),
    ),
    editorBaselineTierLabelByTier: new Map(
      (Array.isArray(editorBaseline?.tierLabels) ? editorBaseline.tierLabels : [])
        .map((label) => [label.tier, label]),
    ),
    trustedNextLocationSequence:
      Number.isSafeInteger(options.trustedNextLocationSequence)
      && options.trustedNextLocationSequence >= 1
        ? options.trustedNextLocationSequence
        : null,
  };
}

function compareConnections(first, second) {
  return (
    first.sourceId.localeCompare(second.sourceId) ||
    first.targetId.localeCompare(second.targetId) ||
    String(first.kind ?? "").localeCompare(String(second.kind ?? ""))
  );
}

function createdLocationSequence(locationId) {
  const match = typeof locationId === "string" ? CREATED_LOCATION_ID_PATTERN.exec(locationId) : null;
  if (!match) return null;
  const sequence = Number(match[1]);
  if (
    !Number.isSafeInteger(sequence)
    || sequence < 1
    || sequence >= Number.MAX_SAFE_INTEGER
    || formatEditorCreatedLocationId(sequence) !== locationId
  ) {
    return null;
  }
  return sequence;
}

function compareLocationRecords(first, second, context) {
  const firstIndex = context.baseLocations.findIndex(({ id }) => id === first.id);
  const secondIndex = context.baseLocations.findIndex(({ id }) => id === second.id);
  if (firstIndex >= 0 || secondIndex >= 0) {
    if (firstIndex < 0) return 1;
    if (secondIndex < 0) return -1;
    return firstIndex - secondIndex;
  }
  return (createdLocationSequence(first.id) ?? Number.MAX_SAFE_INTEGER)
    - (createdLocationSequence(second.id) ?? Number.MAX_SAFE_INTEGER)
    || first.id.localeCompare(second.id);
}

function canonicalAreaAppearance(area) {
  const result = sanitizeAreaAppearance(area?.appearance ?? DEFAULT_AREA_APPEARANCE);
  return structuredClone(result.ok ? result.appearance : DEFAULT_AREA_APPEARANCE);
}

function defaultTierLabels() {
  return DEFAULT_EDITOR_TIER_LABELS.map((label) => ({
    tier: label.tier,
    text: label.text,
    offset: { ...label.offset },
  }));
}

function baselineTierLabels(context) {
  const defaults = defaultTierLabels();
  return defaults.map((fallback) => {
    const baseline = context.editorBaselineTierLabelByTier.get(fallback.tier);
    return baseline ? structuredClone(baseline) : fallback;
  });
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

function activeAcademicRecordIds(records) {
  return records
    .filter((record) => record.lifecycle === "active" && isEditorLearningLocation(record))
    .map(({ id }) => id);
}

function academicConnections(locations) {
  const ids = new Set(academicLocationIds(locations));
  return canonicalConnections(locations)
    .filter(({ sourceId, targetId }) => ids.has(sourceId) && ids.has(targetId))
    .map(({ sourceId, targetId }) => ({ sourceId, targetId }))
    .sort(compareConnections);
}

export function formatEditorCreatedLocationId(sequence) {
  const value = Math.max(1, Math.trunc(Number(sequence)) || 1);
  return `${EDITOR_CREATED_LOCATION_ID_PREFIX}${String(value).padStart(4, "0")}`;
}

export function createGenericLocationContent(kind, title = "Nuevo nodo") {
  if (!EDITABLE_LOCATION_KIND_SET.has(kind)) {
    throw new TypeError(`No existe una plantilla editorial para ${String(kind)}.`);
  }
  const safeTitle = normalizedName(title, EDITOR_TITLE_MAX_LENGTH) ?? "Nuevo nodo";
  const content = {
    marker: kind === "lesson" ? "L" : kind === "mission" ? "M" : "N",
    interactionRadius: kind === "npc" ? 70 : 78,
    visibility: "visibleWhenAreaUnlocked",
    grants: {},
    objective: kind === "npc"
      ? `Contenido provisional: presentar el contexto de ${safeTitle} sin evaluación.`
      : `Contenido provisional: definir y comprobar el objetivo de aprendizaje de ${safeTitle}.`,
    sections: [{
      title: "Contenido provisional",
      paragraphs: [kind === "npc"
        ? "Este personaje editorial contiene contexto demostrativo. Sustituye este texto por una explicación revisada antes de publicar contenido definitivo."
        : "Este nodo editorial contiene material demostrativo. Sustituye este texto por contenido disciplinar revisado antes de una publicación definitiva."],
    }],
    sources: [],
  };
  if (kind === "npc") {
    return {
      ...content,
      exercise: {
        type: "acknowledge",
        prompt: "Confirma que leíste este contexto provisional.",
        buttonLabel: "Continuar",
        explanation: "Contexto provisional registrado.",
      },
    };
  }
  return {
    ...content,
    exercise: {
      type: "choice",
      prompt: "¿Qué describe mejor el estado actual de este nodo?",
      choices: [
        { id: "content-provisional", label: "Es contenido provisional pendiente de revisión disciplinar" },
        { id: "content-final", label: "Es contenido definitivo listo para una publicación académica" },
      ],
      answerId: "content-provisional",
      explanation: "El nodo fue creado desde una plantilla genérica y permanece marcado como provisional.",
    },
  };
}

function canonicalAreaRecord(area) {
  return {
    id: area.id,
    q: normalizeZero(area.q),
    r: normalizeZero(area.r),
    title: normalizedName(area.title, EDITOR_TITLE_MAX_LENGTH) ?? area.id,
    shortTitle: normalizedName(area.shortTitle, EDITOR_SHORT_TITLE_MAX_LENGTH)
      ?? normalizedName(area.title, EDITOR_SHORT_TITLE_MAX_LENGTH)
      ?? area.id,
    appearance: canonicalAreaAppearance(area),
  };
}

function baselineAreaRecord(area, context) {
  const baseline = context.editorBaselineAreaById.get(area.id);
  if (!baseline) return canonicalAreaRecord(area);
  const appearance = sanitizeAreaAppearance(baseline.appearance);
  const title = normalizedName(baseline.title, EDITOR_TITLE_MAX_LENGTH);
  const shortTitle = normalizedName(
    baseline.shortTitle,
    EDITOR_SHORT_TITLE_MAX_LENGTH,
  );
  if (
    !Number.isInteger(baseline.q)
    || !Number.isInteger(baseline.r)
    || !title
    || !shortTitle
    || !appearance.ok
  ) {
    return canonicalAreaRecord(area);
  }
  return {
    id: area.id,
    q: normalizeZero(baseline.q),
    r: normalizeZero(baseline.r),
    title,
    shortTitle,
    appearance: structuredClone(appearance.appearance),
  };
}

function canonicalLocationRecord(location, placement = location) {
  return {
    id: location.id,
    kind: location.kind,
    title: normalizedName(location.title, EDITOR_TITLE_MAX_LENGTH) ?? location.id,
    shortTitle: normalizedName(location.shortTitle, EDITOR_SHORT_TITLE_MAX_LENGTH)
      ?? normalizedName(location.title, EDITOR_SHORT_TITLE_MAX_LENGTH)
      ?? location.id,
    areaId: placement.areaId ?? location.areaId,
    offset: {
      x: normalizeZero(placement.offset?.x ?? location.offset.x),
      y: normalizeZero(placement.offset?.y ?? location.offset.y),
    },
    lifecycle: "active",
    provenance: "canonical",
  };
}

function baselineLocationRecord(location, context) {
  const baseline = context.editorBaselineLocationById.get(location.id);
  return baseline ? structuredClone(baseline) : canonicalLocationRecord(location);
}

export function createEditorDocument(options = {}) {
  const context = canonicalContext(options);
  const updatedAt = dateString(options.updatedAt, new Date().toISOString());

  const baseDocument = options.baseDocument ?? options.editorDocument;
  if (baseDocument !== undefined && baseDocument !== null) {
    const sanitizeOptions = { ...options };
    delete sanitizeOptions.baseDocument;
    delete sanitizeOptions.editorDocument;
    const result = sanitizeEditorDraft(baseDocument, sanitizeOptions);
    if (result.ok) {
      const document = structuredClone(result.document);
      document.updatedAt = updatedAt;
      return document;
    }
  }

  return {
    kind: EDITOR_DOCUMENT_KIND,
    schemaVersion: EDITOR_DOCUMENT_SCHEMA_VERSION,
    appearanceCatalogVersion: AREA_APPEARANCE_CATALOG_VERSION,
    courseId: context.courseId,
    baseDataVersion: context.baseDataVersion,
    areas: context.baseAreas.map(canonicalAreaRecord),
    tierLabels: defaultTierLabels(),
    locations: context.baseLocations.map((location) => canonicalLocationRecord(location)),
    nextLocationSequence: 1,
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

export function migrateEditorDocumentV3ToV4(candidate, options = {}) {
  if (!isRecord(candidate) || candidate.schemaVersion !== 3) {
    throw new TypeError("La migración v3→v4 requiere un documento editorial v3.");
  }
  const context = canonicalContext(options);
  const result = structuredClone(candidate);
  result.schemaVersion = 4;
  result.areas = (Array.isArray(result.areas) ? result.areas : []).map((area) => {
    const canonical = context.areaById.get(area?.id);
    const baseline = canonical ? baselineAreaRecord(canonical, context) : null;
    return {
      ...area,
      title: normalizedName(area?.title, EDITOR_TITLE_MAX_LENGTH)
        ?? normalizedName(baseline?.title, EDITOR_TITLE_MAX_LENGTH)
        ?? normalizedName(canonical?.title, EDITOR_TITLE_MAX_LENGTH)
        ?? String(area?.id ?? "Zona"),
      shortTitle: normalizedName(area?.shortTitle, EDITOR_SHORT_TITLE_MAX_LENGTH)
        ?? normalizedName(baseline?.shortTitle, EDITOR_SHORT_TITLE_MAX_LENGTH)
        ?? normalizedName(canonical?.shortTitle, EDITOR_SHORT_TITLE_MAX_LENGTH)
        ?? normalizedName(canonical?.title, EDITOR_SHORT_TITLE_MAX_LENGTH)
        ?? String(area?.id ?? "Zona"),
    };
  });
  result.tierLabels = baselineTierLabels(context);
  return result;
}

export function migrateEditorDocumentV4ToV5(candidate, options = {}) {
  if (!isRecord(candidate) || candidate.schemaVersion !== 4) {
    throw new TypeError("La migración v4→v5 requiere un documento editorial v4.");
  }
  const context = canonicalContext(options);
  const result = structuredClone(candidate);
  result.schemaVersion = 5;
  result.locations = (Array.isArray(result.locations) ? result.locations : [])
    .map((placement) => {
      const canonical = context.locationById.get(placement?.id);
      if (!canonical) return null;
      const baseline = baselineLocationRecord(canonical, context);
      return {
        ...baseline,
        areaId: placement.areaId ?? baseline.areaId,
        offset: structuredClone(placement.offset ?? baseline.offset),
      };
    })
    .filter(Boolean);
  result.nextLocationSequence = 1;
  return result;
}

function rebaseAreas(
  candidateAreas,
  context,
  errors,
  warnings,
  { rejectUnknown = false } = {},
) {
  const canonical = new Map(
    context.baseAreas.map((area) => [
      area.id,
        baselineAreaRecord(area, context),
    ]),
  );
  if (!Array.isArray(candidateAreas)) {
    warnings.push(
      issue(
        "areas-rebased",
        "El documento no declara areas; se restauró la cartografía de la edición base.",
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
      const target = rejectUnknown ? errors : warnings;
      target.push(
        issue(
          rejectUnknown ? "unknown-area" : "unknown-area-ignored",
          rejectUnknown
            ? `El documento v5 declara una zona desconocida: ${entry.id}.`
            : `Se ignoró la zona desconocida ${entry.id}.`,
          path,
        ),
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
    const title = normalizedName(entry.title, EDITOR_TITLE_MAX_LENGTH);
    const shortTitle = normalizedName(entry.shortTitle, EDITOR_SHORT_TITLE_MAX_LENGTH);
    if (!title) {
      errors.push(
        issue("invalid-area-title", `La zona ${entry.id} requiere un título.`, `${path}.title`),
      );
    }
    if (!shortTitle) {
      errors.push(
        issue(
          "invalid-area-short-title",
          `La zona ${entry.id} requiere un título corto.`,
          `${path}.shortTitle`,
        ),
      );
    }
    const appearance = sanitizeAreaAppearance(entry.appearance, {
      path: `${path}.appearance`,
    });
    errors.push(...appearance.errors);
    if (!title || !shortTitle || !appearance.ok) continue;
    canonical.set(entry.id, {
      id: entry.id,
      q: normalizeZero(entry.q),
      r: normalizeZero(entry.r),
      title,
      shortTitle,
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
        `Se restauraron ${missing.length} zonas ausentes desde la edición base.`,
        "areas",
      ),
    );
  }

  return context.baseAreas.map((area) => canonical.get(area.id));
}

function sanitizeTierLabels(candidate, context, errors, warnings) {
  const labels = new Map(baselineTierLabels(context).map((label) => [label.tier, label]));
  if (!Array.isArray(candidate)) {
    warnings.push(
      issue(
        "tier-labels-rebased",
        "Se restauraron los rótulos de anillo de la edición base.",
        "tierLabels",
      ),
    );
    return baselineTierLabels(context);
  }

  const seen = new Set();
  for (const [index, entry] of candidate.entries()) {
    const path = `tierLabels[${index}]`;
    if (!isRecord(entry) || !labels.has(entry.tier)) {
      errors.push(
        issue("invalid-tier-label", "Cada rótulo debe pertenecer al anillo 1 o 2.", path),
      );
      continue;
    }
    if (seen.has(entry.tier)) {
      errors.push(
        issue("duplicate-tier-label", `El anillo ${entry.tier} repite su rótulo.`, path),
      );
      continue;
    }
    seen.add(entry.tier);
    const text = normalizedName(entry.text, EDITOR_TIER_LABEL_MAX_LENGTH);
    if (!text) {
      errors.push(
        issue(
          "invalid-tier-label-text",
          `El anillo ${entry.tier} requiere texto.`,
          `${path}.text`,
        ),
      );
      continue;
    }
    if (
      !isRecord(entry.offset)
      || !Number.isFinite(entry.offset.x)
      || !Number.isFinite(entry.offset.y)
      || Math.abs(entry.offset.x) > TIER_LABEL_MAX_OFFSET
      || Math.abs(entry.offset.y) > TIER_LABEL_MAX_OFFSET
    ) {
      errors.push(
        issue(
          "invalid-tier-label-offset",
          `El rótulo del anillo ${entry.tier} requiere un offset finito.`,
          `${path}.offset`,
        ),
      );
      continue;
    }
    labels.set(entry.tier, {
      tier: entry.tier,
      text,
      offset: {
        x: normalizeZero(entry.offset.x),
        y: normalizeZero(entry.offset.y),
      },
    });
  }
  const missing = [1, 2].filter((tier) => !seen.has(tier));
  if (missing.length > 0) {
    warnings.push(
      issue(
        "tier-labels-rebased",
        `Se restauraron ${missing.length} rótulos de anillo ausentes.`,
        "tierLabels",
      ),
    );
  }
  return [labels.get(1), labels.get(2)];
}

function sanitizeLocationRecords(
  candidateLocations,
  context,
  errors,
  warnings,
  { rejectUnknown = false } = {},
) {
  const records = new Map();
  const baselineNextLocationSequence = Number.isSafeInteger(
    context.editorBaseline?.nextLocationSequence,
  )
    && context.editorBaseline.nextLocationSequence >= 1
    && context.editorBaseline.nextLocationSequence < Number.MAX_SAFE_INTEGER
    ? context.editorBaseline.nextLocationSequence
    : 1;
  if (!Array.isArray(candidateLocations)) {
    warnings.push(
      issue(
        "locations-rebased",
        "El documento no declara locations; se restauraron los lugares de la edición base.",
        "locations",
      ),
    );
  }

  const entries = (Array.isArray(candidateLocations) ? candidateLocations : []).map(
    (entry, index) => {
      const baseline = context.editorBaselineLocationById.get(entry?.id);
      if (
        baseline?.lifecycle === "deleted"
        && entry?.lifecycle !== "deleted"
        && entry?.kind === baseline.kind
      ) {
        warnings.push(
          issue(
            "baseline-tombstone-restored",
            `El ID eliminado ${entry.id} no puede reactivarse sobre la edición aplicada.`,
            `locations[${index}]`,
          ),
        );
        return structuredClone(baseline);
      }
      return entry;
    },
  );

  for (const [index, entry] of entries.entries()) {
    const path = `locations[${index}]`;
    if (!isRecord(entry) || typeof entry.id !== "string" || !entry.id.trim()) {
      errors.push(issue("invalid-location-entry", "Cada nodo debe declarar un ID.", path));
      continue;
    }
    if (records.has(entry.id)) {
      errors.push(
        issue("duplicate-location-id", `El nodo ${entry.id} aparece más de una vez.`, path),
      );
      continue;
    }

    const canonical = context.locationById.get(entry.id);
    const baseline = context.editorBaselineLocationById.get(entry.id);
    const sequence = createdLocationSequence(entry.id);
    if (!canonical && sequence === null) {
      if (entry.id.startsWith(EDITOR_CREATED_LOCATION_ID_PREFIX)) {
        errors.push(
          issue(
            "invalid-created-location-id",
            `El ID creado ${entry.id} no usa una secuencia canónica segura.`,
            `${path}.id`,
          ),
        );
      } else {
        const target = rejectUnknown ? errors : warnings;
        target.push(
          issue(
            rejectUnknown ? "unknown-location" : "unknown-location-ignored",
            rejectUnknown
              ? `El documento v5 declara un nodo desconocido: ${entry.id}.`
              : `Se ignoró el nodo desconocido ${entry.id}.`,
            path,
          ),
        );
      }
      continue;
    }
    if (
      !canonical
      && !baseline
      && sequence !== null
      && sequence < baselineNextLocationSequence
    ) {
      errors.push(
        issue(
          "reused-created-location-id",
          `El ID ${entry.id} pertenece a una secuencia ya reservada por la edición publicada.`,
          `${path}.id`,
        ),
      );
      continue;
    }
    const expectedProvenance = canonical ? "canonical" : "editor-created";
    const authority = baseline ?? canonical;
    const kind = authority?.kind ?? entry.kind;
    if (entry.provenance !== expectedProvenance) {
      errors.push(
        issue(
          "invalid-location-provenance",
          `${entry.id} debe declarar provenance ${expectedProvenance}.`,
          `${path}.provenance`,
        ),
      );
    }
    if (typeof kind !== "string" || (authority && entry.kind !== authority.kind)) {
      errors.push(
        issue(
          "invalid-location-kind",
          `El tipo de ${entry.id} no coincide con su autoridad editorial.`,
          `${path}.kind`,
        ),
      );
    }
    if (!canonical && !EDITABLE_LOCATION_KIND_SET.has(kind)) {
      errors.push(
        issue(
          "non-editable-location-kind",
          `Spider no puede crear lugares de tipo ${String(kind)}.`,
          `${path}.kind`,
        ),
      );
    }

    const lifecycle = LIFECYCLE_SET.has(entry.lifecycle) ? entry.lifecycle : null;
    if (!lifecycle) {
      errors.push(
        issue(
          "invalid-location-lifecycle",
          `${entry.id} requiere lifecycle active, inventory o deleted.`,
          `${path}.lifecycle`,
        ),
      );
    }
    if (canonical && !EDITABLE_LOCATION_KIND_SET.has(canonical.kind) && lifecycle !== "active") {
      errors.push(
        issue(
          "non-editable-location-lifecycle",
          `${entry.id} no admite inventario ni eliminación.`,
          `${path}.lifecycle`,
        ),
      );
    }
    if (lifecycle === "deleted" && PROTECTED_LOCATION_ID_SET.has(entry.id)) {
      errors.push(
        issue(
          "protected-location-delete",
          `${entry.id} es un nodo académico protegido y no puede eliminarse.`,
          `${path}.lifecycle`,
        ),
      );
    }

    const title = normalizedName(entry.title, EDITOR_TITLE_MAX_LENGTH);
    const shortTitle = normalizedName(entry.shortTitle, EDITOR_SHORT_TITLE_MAX_LENGTH);
    if (!title) {
      errors.push(issue("invalid-location-title", `${entry.id} requiere un título.`, `${path}.title`));
    }
    if (!shortTitle) {
      errors.push(
        issue(
          "invalid-location-short-title",
          `${entry.id} requiere un título corto.`,
          `${path}.shortTitle`,
        ),
      );
    }
    if (typeof entry.areaId !== "string" || !context.areaById.has(entry.areaId)) {
      errors.push(
        issue(
          "unknown-location-area",
          `El nodo ${entry.id} referencia una zona inexistente: ${String(entry.areaId)}.`,
          `${path}.areaId`,
        ),
      );
    }
    const validOffset = isRecord(entry.offset)
      && Number.isFinite(entry.offset.x)
      && Number.isFinite(entry.offset.y);
    if (!validOffset) {
      errors.push(
        issue(
          "invalid-location-offset",
          `El nodo ${entry.id} debe declarar un offset finito.`,
          `${path}.offset`,
        ),
      );
    }
    if (
      !kind
      || !lifecycle
      || !title
      || !shortTitle
      || !context.areaById.has(entry.areaId)
      || !validOffset
    ) {
      continue;
    }

    const record = {
      id: entry.id,
      kind,
      title,
      shortTitle,
      areaId: entry.areaId,
      offset: {
        x: normalizeZero(entry.offset.x),
        y: normalizeZero(entry.offset.y),
      },
      lifecycle,
      provenance: expectedProvenance,
    };
    if (!canonical) {
      const content = createGenericLocationContent(kind, title);
      if (entry.content !== undefined && JSON.stringify(entry.content) !== JSON.stringify(content)) {
        warnings.push(
          issue(
            "created-location-content-rebased",
            `Se restauró la plantilla provisional de ${entry.id}.`,
            `${path}.content`,
          ),
        );
      }
      record.content = content;
    }
    records.set(entry.id, record);
  }

  const missing = [];
  for (const location of context.baseLocations) {
    if (records.has(location.id)) continue;
    missing.push(location.id);
    records.set(location.id, baselineLocationRecord(location, context));
  }
  for (const baseline of context.editorBaselineLocationById.values()) {
    if (records.has(baseline.id)) continue;
    missing.push(baseline.id);
    records.set(baseline.id, structuredClone(baseline));
  }
  if (missing.length > 0) {
    warnings.push(
      issue(
        "locations-rebased",
        `Se restauraron ${missing.length} nodos ausentes desde la edición base.`,
        "locations",
      ),
    );
  }

  return [...records.values()].sort(
    (first, second) => compareLocationRecords(first, second, context),
  );
}

function sanitizeNextLocationSequence(candidate, records, context, errors, warnings) {
  const inferredFromRecords = records.reduce(
    (next, record) => Math.max(next, (createdLocationSequence(record.id) ?? 0) + 1),
    1,
  );
  const baselineSequence = Number.isSafeInteger(context.editorBaseline?.nextLocationSequence)
    && context.editorBaseline.nextLocationSequence >= 1
    && context.editorBaseline.nextLocationSequence < Number.MAX_SAFE_INTEGER
    ? context.editorBaseline.nextLocationSequence
    : 1;
  const inferred = Math.max(inferredFromRecords, baselineSequence);
  if (
    !Number.isSafeInteger(candidate)
    || candidate < 1
    || candidate >= Number.MAX_SAFE_INTEGER
  ) {
    errors.push(
      issue(
        "invalid-next-location-sequence",
        "nextLocationSequence debe ser un entero seguro positivo con espacio para el siguiente ID.",
        "nextLocationSequence",
      ),
    );
    return inferred;
  }
  if (candidate < inferred) {
    warnings.push(
      issue(
        "location-sequence-rebased",
        `nextLocationSequence se elevó a ${inferred} para no reutilizar IDs.`,
        "nextLocationSequence",
      ),
    );
  }
  const normalized = Math.max(candidate, inferred);
  const hasTrustedFloor = Boolean(context.editorBaseline)
    || context.trustedNextLocationSequence !== null;
  const trustedFloor = Math.max(
    baselineSequence,
    context.trustedNextLocationSequence ?? 1,
  );
  if (
    hasTrustedFloor
    && normalized - trustedFloor > EDITOR_MAX_EXTERNAL_LOCATION_SEQUENCE_ADVANCE
  ) {
    errors.push(
      issue(
        "location-sequence-advance-too-large",
        `El documento intenta reservar más de ${EDITOR_MAX_EXTERNAL_LOCATION_SEQUENCE_ADVANCE.toLocaleString("es-CL")} IDs nuevos sin materializarlos respecto de la edición confiable.`,
        "nextLocationSequence",
      ),
    );
  }
  return normalized;
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
        "El documento no declara treeTwoConnections; se restauraron las dependencias de la edición base.",
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
          "Spider solo admite conexiones completedLocation.",
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
        `Se restauraron ${restoredCount} dependencias de la edición base asociadas a nodos restaurados.`,
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

function migrateLegacySourceToV3(source, context, errors, warnings) {
  const declaredLocationIds = new Set(
    (Array.isArray(source.locations) ? source.locations : [])
      .filter((entry) => isRecord(entry) && typeof entry.id === "string")
      .map(({ id }) => id),
  );
  const restoredLocationIds = new Set(
    context.baseLocations
      .map(({ id }) => id)
      .filter((id) => !declaredLocationIds.has(id)),
  );
  const candidatePlacementById = new Map(
    (Array.isArray(source.locations) ? source.locations : [])
      .filter((entry) => isRecord(entry) && typeof entry.id === "string")
      .map((entry) => [entry.id, entry]),
  );
  for (const id of candidatePlacementById.keys()) {
    if (!context.locationById.has(id)) {
      warnings.push(
        issue("unknown-location-ignored", `Se ignoró el nodo legacy desconocido ${id}.`, "locations"),
      );
    }
  }
  const locations = context.baseLocations.map((location) => {
    const placement = candidatePlacementById.get(location.id);
    return {
      id: location.id,
      areaId: placement?.areaId ?? location.areaId,
      offset: structuredClone(placement?.offset ?? location.offset),
    };
  });
  if (restoredLocationIds.size > 0) {
    warnings.push(
      issue(
        "locations-rebased",
        `Se restauraron ${restoredLocationIds.size} nodos ausentes desde la edición base.`,
        "locations",
      ),
    );
  }
  return {
    ...structuredClone(source),
    schemaVersion: 3,
    appearanceCatalogVersion: AREA_APPEARANCE_CATALOG_VERSION,
    areas: (Array.isArray(source.areas) ? source.areas : []).map((area) => ({
      ...area,
      appearance: source.schemaVersion === 1
        ? canonicalAreaAppearance(context.areaById.get(area?.id))
        : area?.appearance,
    })),
    locations,
    learningNetwork: migrateLegacyLearningNetwork(
      rebaseConnections(
        source.treeTwoConnections,
        context,
        errors,
        warnings,
        { restoredLocationIds },
      ),
      context,
    ),
  };
}

function sanitizeLearningNetwork(candidate, records, errors) {
  if (!isRecord(candidate)) {
    errors.push(issue("missing-learning-network", "El documento debe declarar learningNetwork.", "learningNetwork"));
    return { nodeIds: [], connections: [] };
  }
  if (!Array.isArray(candidate.nodeIds)) {
    errors.push(issue("invalid-learning-network-nodes", "nodeIds debe ser una lista.", "learningNetwork.nodeIds"));
  }
  if (!Array.isArray(candidate.connections)) {
    errors.push(issue("invalid-connections", "connections debe ser una lista.", "learningNetwork.connections"));
  }
  if (!Array.isArray(candidate.nodeIds) || !Array.isArray(candidate.connections)) {
    return { nodeIds: [], connections: [] };
  }

  const recordById = new Map(records.map((record) => [record.id, record]));
  const academicIdsInCatalogOrder = activeAcademicRecordIds(records);
  const academicIds = new Set(academicIdsInCatalogOrder);
  const nodeSet = new Set();
  for (const [index, nodeId] of candidate.nodeIds.entries()) {
    const path = "learningNetwork.nodeIds[" + index + "]";
    const record = recordById.get(nodeId);
    if (!record) {
      errors.push(issue("unknown-learning-network-node", "Nodo desconocido: " + String(nodeId) + ".", path));
    } else if (record.lifecycle !== "active") {
      errors.push(issue("inactive-learning-network-node", nodeId + " está fuera del curso activo.", path));
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
      errors.push(issue("inactive-learning-network-connection", "La red solo conecta lesson o mission activos.", path));
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

function rebaseLearningNetworkFromBaseline(
  candidate,
  records,
  declaredLocationIds,
  context,
  warnings,
) {
  if (
    !isRecord(candidate)
    || !Array.isArray(candidate.nodeIds)
    || !Array.isArray(candidate.connections)
    || !isRecord(context.editorBaseline?.learningNetwork)
  ) {
    return candidate;
  }
  const network = structuredClone(candidate);
  const recordById = new Map(records.map((record) => [record.id, record]));
  const restoredIds = new Set(
    [...context.editorBaselineLocationById.keys()].filter(
      (locationId) => !declaredLocationIds.has(locationId),
    ),
  );
  const immutableTombstoneIds = new Set(
    [...context.editorBaselineLocationById.values()]
      .filter(({ lifecycle }) => lifecycle === "deleted")
      .map(({ id }) => id),
  );
  network.nodeIds = network.nodeIds.filter((id) => !immutableTombstoneIds.has(id));
  network.connections = network.connections.filter(
    ({ sourceId, targetId }) =>
      !immutableTombstoneIds.has(sourceId) && !immutableTombstoneIds.has(targetId),
  );

  let restoredNetworkEntryCount = 0;
  const nodeIds = new Set(network.nodeIds);
  for (const locationId of restoredIds) {
    const record = recordById.get(locationId);
    if (
      record?.lifecycle === "active"
      && isEditorLearningLocation(record)
      && !nodeIds.has(locationId)
    ) {
      nodeIds.add(locationId);
      network.nodeIds.push(locationId);
      restoredNetworkEntryCount += 1;
    }
  }

  const pairs = new Set(
    network.connections.map(({ sourceId, targetId }) => `${sourceId}->${targetId}`),
  );
  for (const connection of context.editorBaseline.learningNetwork.connections ?? []) {
    if (!restoredIds.has(connection.sourceId) && !restoredIds.has(connection.targetId)) continue;
    const source = recordById.get(connection.sourceId);
    const target = recordById.get(connection.targetId);
    if (
      source?.lifecycle !== "active"
      || target?.lifecycle !== "active"
      || !isEditorLearningLocation(source)
      || !isEditorLearningLocation(target)
      || !nodeIds.has(connection.sourceId)
      || !nodeIds.has(connection.targetId)
    ) {
      continue;
    }
    const key = `${connection.sourceId}->${connection.targetId}`;
    if (pairs.has(key)) continue;
    pairs.add(key);
    network.connections.push(structuredClone(connection));
    restoredNetworkEntryCount += 1;
  }
  if (restoredNetworkEntryCount > 0) {
    warnings.push(
      issue(
        "learning-network-rebased",
        `Se restauraron ${restoredNetworkEntryCount} entradas de Red desde la edición aplicada.`,
        "learningNetwork",
      ),
    );
  }
  return network;
}

function materializeEditorDocument(document, context) {
  const areaPlacement = new Map(document.areas.map((area) => [area.id, area]));
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
          title: placement.title,
          shortTitle: placement.shortTitle,
          appearance: structuredClone(placement.appearance),
        }
      : { ...area, appearance: canonicalAreaAppearance(area) };
  });
  const locations = [];
  for (const record of document.locations) {
    if (record.lifecycle !== "active") continue;
    const canonical = context.locationById.get(record.id);
    const source = canonical
      ? structuredClone(canonical)
      : {
          id: record.id,
          kind: record.kind,
          title: record.title,
          shortTitle: record.shortTitle,
          ...structuredClone(record.content),
        };
    const requirements = normalizeRequirements(source.requirements);
    const completedLocations = isEditorLearningLocation(record)
      ? learningNodeIds.has(record.id)
        ? [...(completedByTarget.get(record.id) ?? [])]
        : []
      : [];
    locations.push({
      ...source,
      id: record.id,
      kind: record.kind,
      title: record.title,
      shortTitle: record.shortTitle,
      areaId: record.areaId,
      offset: { ...record.offset },
      requirements: {
        ...(isRecord(source.requirements) ? source.requirements : {}),
        concepts: isEditorLearningLocation(record) ? [] : [...requirements.concepts],
        completedLocations,
        rewards: isEditorLearningLocation(record) ? [] : [...requirements.rewards],
        areas: isEditorLearningLocation(record) ? [] : [...requirements.areas],
      },
    });
  }

  return {
    areas,
    locations,
    tierLabels: structuredClone(document.tierLabels),
  };
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
  const academicIds = activeAcademicRecordIds(document.locations);
  const academicIdSet = new Set(academicIds);
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
          "El nodo académico activo " + id + " fue retirado de la Red de aprendizaje.",
          "learningNetwork.nodeIds",
        ),
      );
    }
  }
  const rootRecord = document.locations.find(
    ({ id }) => id === EDITOR_LEARNING_NETWORK_ROOT_ID,
  );
  if (
    rootRecord?.lifecycle !== "active"
    || !nodeIds.has(EDITOR_LEARNING_NETWORK_ROOT_ID)
  ) {
    errors.push(
      issue(
        "missing-learning-network-root",
        "La raíz " + EDITOR_LEARNING_NETWORK_ROOT_ID + " debe estar activa y pertenecer a la red.",
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
  if ([...nodeIds].some((id) => !academicIdSet.has(id))) {
    errors.push(
      issue(
        "inactive-learning-network-node",
        "La red contiene un nodo académico que no está activo.",
        "learningNetwork.nodeIds",
      ),
    );
  }
  if (errors.length > 0) return { errors, warnings };

  const course = materializeEditorDocument(document, context);
  const projectValidation = validateProjectData({ ...course, allowContentSubset: true });
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
  if (![1, 2, 3, 4, EDITOR_DOCUMENT_SCHEMA_VERSION].includes(sourceSchemaVersion)) {
    errors.push(
      issue(
        "unsupported-editor-schema",
        `Se esperaba schemaVersion entre 1 y ${EDITOR_DOCUMENT_SCHEMA_VERSION}.`,
        "schemaVersion",
      ),
    );
  }
  if (
    [2, 3, 4, EDITOR_DOCUMENT_SCHEMA_VERSION].includes(sourceSchemaVersion)
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

  let working = structuredClone(source);
  if (sourceSchemaVersion <= 2) {
    working = migrateLegacySourceToV3(source, context, errors, warnings);
  }
  if (working.schemaVersion === 3) {
    working = migrateEditorDocumentV3ToV4(working, options);
    warnings.push(
      issue(
        "editor-schema-v3-v4-migrated",
        "Se añadieron nombres editables de zonas y rótulos de anillo.",
        "schemaVersion",
      ),
    );
  }
  if (working.schemaVersion === 4) {
    const legacyUnknown = (Array.isArray(working.locations) ? working.locations : [])
      .filter((entry) => typeof entry?.id === "string" && !context.locationById.has(entry.id));
    for (const entry of legacyUnknown) {
      warnings.push(
        issue(
          "unknown-location-ignored",
          `Se ignoró el nodo legacy desconocido ${entry.id}.`,
          "locations",
        ),
      );
    }
    working = migrateEditorDocumentV4ToV5(working, options);
    warnings.push(
      issue(
        "editor-schema-v4-v5-migrated",
        "Se añadió autoridad, ciclo de vida e inventario editorial de lugares.",
        "schemaVersion",
      ),
    );
  }
  if (sourceSchemaVersion < EDITOR_DOCUMENT_SCHEMA_VERSION) {
    warnings.push(
      issue(
        "editor-schema-migrated",
        `El documento editorial v${sourceSchemaVersion} se migró a v${EDITOR_DOCUMENT_SCHEMA_VERSION}.`,
        "schemaVersion",
      ),
    );
  }

  const fallbackTimestamp = new Date().toISOString();
  const rejectUnknown = sourceSchemaVersion === EDITOR_DOCUMENT_SCHEMA_VERSION;
  const areas = rebaseAreas(
    working.areas,
    context,
    errors,
    warnings,
    { rejectUnknown },
  );
  const tierLabels = sanitizeTierLabels(working.tierLabels, context, errors, warnings);
  const locations = sanitizeLocationRecords(
    working.locations,
    context,
    errors,
    warnings,
    { rejectUnknown },
  );
  const nextLocationSequence = sanitizeNextLocationSequence(
    working.nextLocationSequence,
    locations,
    context,
    errors,
    warnings,
  );
  const declaredLocationIds = new Set(
    (Array.isArray(working.locations) ? working.locations : [])
      .filter((entry) => typeof entry?.id === "string")
      .map(({ id }) => id),
  );
  const learningNetworkCandidate = rebaseLearningNetworkFromBaseline(
    working.learningNetwork,
    locations,
    declaredLocationIds,
    context,
    warnings,
  );
  const learningNetwork = sanitizeLearningNetwork(
    learningNetworkCandidate,
    locations,
    errors,
  );
  const document = {
    kind: EDITOR_DOCUMENT_KIND,
    schemaVersion: EDITOR_DOCUMENT_SCHEMA_VERSION,
    appearanceCatalogVersion: AREA_APPEARANCE_CATALOG_VERSION,
    courseId: context.courseId,
    baseDataVersion: context.baseDataVersion,
    areas,
    tierLabels,
    locations,
    nextLocationSequence,
    learningNetwork,
    updatedAt: dateString(working.updatedAt, fallbackTimestamp),
  };
  const serializedBytes = new TextEncoder().encode(JSON.stringify(document)).byteLength;
  if (serializedBytes > EDITOR_DOCUMENT_MAX_SERIALIZED_BYTES) {
    errors.push(
      issue(
        "editor-document-too-large",
        `El documento editorial ocupa ${serializedBytes} bytes y supera el máximo aplicable de ${EDITOR_DOCUMENT_MAX_SERIALIZED_BYTES}.`,
        null,
      ),
    );
  }
  if (working.updatedAt !== document.updatedAt) {
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
