import { ProgressStorage } from "./storage.js";
import {
  AREA_APPEARANCE_CATALOG_VERSION,
  DEFAULT_AREA_APPEARANCE,
  sameAreaAppearance,
  sanitizeAreaAppearance,
} from "./area-appearance.js";
import { AREAS } from "../data/world.js";

export const BOWERBIRD_PREFERENCES_KIND = "orbit-bowerbird-preferences";
export const BOWERBIRD_PREFERENCES_SCHEMA_VERSION = 1;
export const BOWERBIRD_DEFAULT_COURSE_ID = "electromagnetism-applied";

function issue(code, message, path = null) {
  return { code, message, path };
}

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function validDate(value, fallback) {
  return typeof value === "string" && value.trim() && !Number.isNaN(Date.parse(value))
    ? value
    : fallback;
}

function normalizeTimestamp(value) {
  if (value instanceof Date) return value.toISOString();
  const candidate = String(value ?? "");
  return Number.isNaN(Date.parse(candidate)) ? new Date().toISOString() : candidate;
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
          `Las preferencias Bowerbird no contienen JSON válido: ${error instanceof Error ? error.message : String(error)}.`,
        ),
      ],
    };
  }
}

function context(options = {}) {
  const baseAreas = Array.isArray(options.baseAreas) ? options.baseAreas : AREAS;
  const courseId = options.courseId ?? BOWERBIRD_DEFAULT_COURSE_ID;
  return {
    baseAreas,
    courseId,
    areaById: new Map(baseAreas.map((area) => [area.id, area])),
    areaOrder: new Map(baseAreas.map((area, index) => [area.id, index])),
  };
}

export function createBowerbirdPreferences(options = {}) {
  const course = context(options);
  return {
    kind: BOWERBIRD_PREFERENCES_KIND,
    schemaVersion: BOWERBIRD_PREFERENCES_SCHEMA_VERSION,
    appearanceCatalogVersion: AREA_APPEARANCE_CATALOG_VERSION,
    courseId: course.courseId,
    areas: [],
    updatedAt: validDate(options.updatedAt, new Date().toISOString()),
  };
}

export function createBowerbirdStorageKey({
  courseId = BOWERBIRD_DEFAULT_COURSE_ID,
  profile = "student",
} = {}) {
  const safeCourse = String(courseId).trim();
  const safeProfile = String(profile).trim().toLowerCase();
  if (!safeCourse || !/^[a-z0-9-]+$/.test(safeCourse)) {
    throw new TypeError("Bowerbird requiere un courseId estable en kebab-case.");
  }
  if (!safeProfile || !/^[a-z0-9-]+$/.test(safeProfile)) {
    throw new TypeError("Bowerbird requiere un perfil estable en kebab-case.");
  }
  return `orbit-bowerbird:v${BOWERBIRD_PREFERENCES_SCHEMA_VERSION}:${safeCourse}:${safeProfile}`;
}

export function sanitizeBowerbirdPreferences(candidate, options = {}) {
  const course = context(options);
  const parsed = parseCandidate(candidate);
  if (parsed.errors.length > 0) {
    return { ok: false, preferences: null, errors: parsed.errors, warnings: [] };
  }
  if (!isRecord(parsed.value)) {
    return {
      ok: false,
      preferences: null,
      errors: [issue("invalid-bowerbird-preferences", "Las preferencias Bowerbird deben ser un objeto JSON.")],
      warnings: [],
    };
  }

  const source = parsed.value;
  const errors = [];
  const warnings = [];
  if (source.kind !== BOWERBIRD_PREFERENCES_KIND) {
    errors.push(issue("wrong-bowerbird-kind", `Se esperaba kind ${BOWERBIRD_PREFERENCES_KIND}.`, "kind"));
  }
  if (source.schemaVersion !== BOWERBIRD_PREFERENCES_SCHEMA_VERSION) {
    errors.push(
      issue(
        "unsupported-bowerbird-schema",
        `Se esperaba schemaVersion ${BOWERBIRD_PREFERENCES_SCHEMA_VERSION}.`,
        "schemaVersion",
      ),
    );
  }
  if (source.appearanceCatalogVersion !== AREA_APPEARANCE_CATALOG_VERSION) {
    errors.push(
      issue(
        "unsupported-appearance-catalog",
        `Se esperaba appearanceCatalogVersion ${AREA_APPEARANCE_CATALOG_VERSION}.`,
        "appearanceCatalogVersion",
      ),
    );
  }
  if (source.courseId !== course.courseId) {
    errors.push(
      issue(
        "wrong-course",
        `Las preferencias pertenecen a ${String(source.courseId)} y no a ${course.courseId}.`,
        "courseId",
      ),
    );
  }
  if (!Array.isArray(source.areas)) {
    errors.push(issue("invalid-bowerbird-areas", "areas debe ser una lista de overrides visuales.", "areas"));
  }
  if (errors.length > 0) {
    return { ok: false, preferences: null, errors, warnings };
  }

  const seen = new Set();
  const areas = [];
  for (const [index, entry] of source.areas.entries()) {
    const path = `areas[${index}]`;
    if (!isRecord(entry) || typeof entry.id !== "string") {
      errors.push(issue("invalid-bowerbird-area", "Cada override debe declarar un ID de zona.", path));
      continue;
    }
    if (seen.has(entry.id)) {
      errors.push(issue("duplicate-bowerbird-area", `La zona ${entry.id} aparece más de una vez.`, path));
      continue;
    }
    seen.add(entry.id);
    if (!course.areaById.has(entry.id)) {
      warnings.push(issue("unknown-bowerbird-area-ignored", `Se ignoró la zona desconocida ${entry.id}.`, path));
      continue;
    }
    const appearance = sanitizeAreaAppearance(entry.appearance, { path: `${path}.appearance` });
    errors.push(...appearance.errors);
    if (appearance.ok && !sameAreaAppearance(appearance.appearance, DEFAULT_AREA_APPEARANCE)) {
      areas.push({ id: entry.id, appearance: appearance.appearance });
    }
  }
  if (errors.length > 0) {
    return { ok: false, preferences: null, errors, warnings };
  }

  areas.sort(
    (first, second) =>
      (course.areaOrder.get(first.id) ?? Number.MAX_SAFE_INTEGER)
      - (course.areaOrder.get(second.id) ?? Number.MAX_SAFE_INTEGER),
  );
  const fallbackTimestamp = new Date().toISOString();
  const updatedAt = validDate(source.updatedAt, fallbackTimestamp);
  if (source.updatedAt !== updatedAt) {
    warnings.push(issue("updated-at-rebased", "Se restauró una fecha de actualización válida.", "updatedAt"));
  }

  return {
    ok: true,
    preferences: {
      kind: BOWERBIRD_PREFERENCES_KIND,
      schemaVersion: BOWERBIRD_PREFERENCES_SCHEMA_VERSION,
      appearanceCatalogVersion: AREA_APPEARANCE_CATALOG_VERSION,
      courseId: course.courseId,
      areas,
      updatedAt,
    },
    errors: [],
    warnings,
  };
}

export function serializeBowerbirdPreferences(candidate, options = {}) {
  const result = sanitizeBowerbirdPreferences(candidate, options);
  if (!result.ok) {
    const error = new TypeError("Las preferencias Bowerbird no pueden serializarse.");
    error.issues = structuredClone(result.errors);
    throw error;
  }
  return `${JSON.stringify(result.preferences, null, 2)}\n`;
}

function failure(model, reason, errors = [], warnings = []) {
  return {
    ok: false,
    changed: false,
    reason,
    errors: structuredClone(errors),
    warnings: structuredClone(warnings),
    snapshot: model.getSnapshot(),
  };
}

export class BowerbirdPreferencesModel {
  constructor({
    storage,
    storageKey,
    baseAreas = AREAS,
    courseId = BOWERBIRD_DEFAULT_COURSE_ID,
    clock = () => new Date(),
  } = {}) {
    const resolvedStorageKey = storageKey ?? storage?.key;
    if (typeof resolvedStorageKey === "string" && !resolvedStorageKey.startsWith("orbit-bowerbird:")) {
      throw new TypeError("BowerbirdPreferencesModel solo admite claves orbit-bowerbird:.");
    }
    if (!storage) {
      const key = storageKey ?? createBowerbirdStorageKey({ courseId });
      storage = new ProgressStorage(key);
    }
    this.storage = storage;
    this.options = { baseAreas, courseId };
    this.clock = clock;
    this.listeners = new Set();
    this.warnings = [];
    this.persistenceBlocked = false;

    const loadResult = typeof storage.loadResult === "function" ? storage.loadResult() : null;
    const loaded = loadResult ? loadResult.value : storage.load();
    if (loadResult?.error || (loadResult?.found && loaded === null)) {
      this.persistenceBlocked = true;
      this.preferences = createBowerbirdPreferences({ ...this.options, updatedAt: this.#timestamp() });
      this.warnings = [
        issue(
          "stored-bowerbird-unreadable",
          "Las preferencias Bowerbird guardadas no pudieron interpretarse; se usará la apariencia publicada sin sobrescribir el valor local.",
        ),
      ];
      return;
    }
    if (loaded === null || loaded === undefined) {
      this.preferences = createBowerbirdPreferences({ ...this.options, updatedAt: this.#timestamp() });
      return;
    }
    const result = sanitizeBowerbirdPreferences(loaded, this.options);
    if (result.ok) {
      this.preferences = result.preferences;
      this.warnings = result.warnings;
      return;
    }
    this.persistenceBlocked = true;
    this.preferences = createBowerbirdPreferences({ ...this.options, updatedAt: this.#timestamp() });
    this.warnings = [
      issue(
        "stored-bowerbird-rejected",
        "Las preferencias Bowerbird guardadas eran incompatibles; se usará la apariencia publicada sin sobrescribirlas.",
      ),
      ...result.errors,
      ...result.warnings,
    ];
  }

  #timestamp() {
    return normalizeTimestamp(this.clock());
  }

  #emit(type, detail = {}) {
    const event = { type, detail: structuredClone(detail), snapshot: this.getSnapshot() };
    for (const listener of this.listeners) listener(event);
  }

  #save(candidate, type, detail = {}) {
    if (this.persistenceBlocked) {
      return failure(
        this,
        "stored-bowerbird-incompatible",
        [
          issue(
            "stored-bowerbird-incompatible",
            "Las preferencias Bowerbird persistidas pertenecen a un formato incompatible. ORBIT conservará el valor local sin sobrescribirlo; elimina explícitamente ese registro con una versión compatible antes de guardar preferencias nuevas.",
          ),
        ],
      );
    }
    candidate.updatedAt = this.#timestamp();
    const result = sanitizeBowerbirdPreferences(candidate, this.options);
    if (!result.ok) {
      return failure(
        this,
        result.errors[0]?.code ?? "invalid-bowerbird-preferences",
        result.errors,
        result.warnings,
      );
    }
    if (JSON.stringify(result.preferences.areas) === JSON.stringify(this.preferences.areas)) {
      return { ok: true, changed: false, detail, snapshot: this.getSnapshot() };
    }
    try {
      this.storage.save(result.preferences);
    } catch (error) {
      return failure(
        this,
        "storage-write-failed",
        [
          issue(
            "storage-write-failed",
            "No fue posible guardar las preferencias Bowerbird en este navegador. El cambio no se aplicó; revisa el espacio disponible y los permisos del almacenamiento local.",
          ),
        ],
        result.warnings,
      );
    }
    this.preferences = result.preferences;
    this.warnings = result.warnings;
    this.#emit(type, detail);
    return { ok: true, changed: true, detail, snapshot: this.getSnapshot() };
  }

  subscribe(listener) {
    if (typeof listener !== "function") throw new TypeError("El listener Bowerbird debe ser una función.");
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot() {
    return {
      preferences: structuredClone(this.preferences),
      appearances: new Map(
        this.preferences.areas.map((entry) => [entry.id, structuredClone(entry.appearance)]),
      ),
      warnings: structuredClone(this.warnings),
      persistenceBlocked: this.persistenceBlocked,
    };
  }

  getAppearance(areaId) {
    const entry = this.preferences.areas.find((candidate) => candidate.id === areaId);
    return entry ? structuredClone(entry.appearance) : null;
  }

  setAreaAppearance(areaId, candidate) {
    if (!this.options.baseAreas.some((area) => area.id === areaId)) {
      return failure(this, "unknown-area", [issue("unknown-area", `No existe la zona ${String(areaId)}.`)]);
    }
    const result = sanitizeAreaAppearance(candidate, { path: `areas.${areaId}.appearance` });
    if (!result.ok) return failure(this, result.errors[0]?.code, result.errors);
    const next = structuredClone(this.preferences);
    const index = next.areas.findIndex((entry) => entry.id === areaId);
    if (sameAreaAppearance(result.appearance, DEFAULT_AREA_APPEARANCE)) {
      if (index >= 0) next.areas.splice(index, 1);
    } else if (index >= 0) {
      next.areas[index].appearance = result.appearance;
    } else {
      next.areas.push({ id: areaId, appearance: result.appearance });
    }
    return this.#save(next, "bowerbird-appearance-updated", { areaId, appearance: result.appearance });
  }

  resetAreaAppearance(areaId) {
    return this.setAreaAppearance(areaId, DEFAULT_AREA_APPEARANCE);
  }

  resetAll() {
    const next = createBowerbirdPreferences({ ...this.options, updatedAt: this.#timestamp() });
    return this.#save(next, "bowerbird-preferences-reset", { reset: true });
  }

  importPreferences(candidate) {
    const result = sanitizeBowerbirdPreferences(candidate, this.options);
    if (!result.ok) {
      return failure(
        this,
        result.errors[0]?.code ?? "invalid-bowerbird-preferences",
        result.errors,
        result.warnings,
      );
    }
    const imported = structuredClone(result.preferences);
    imported.updatedAt = this.#timestamp();
    return this.#save(imported, "bowerbird-preferences-imported", { imported: true });
  }

  exportPreferences() {
    return serializeBowerbirdPreferences(this.preferences, this.options);
  }

  validate() {
    const result = sanitizeBowerbirdPreferences(this.preferences, this.options);
    return { valid: result.ok, errors: structuredClone(result.errors), warnings: structuredClone(result.warnings) };
  }

  destroy() {
    this.listeners.clear();
  }
}
