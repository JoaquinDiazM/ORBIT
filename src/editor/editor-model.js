import { axialDistance, pointInHex } from "../core/hex.js";
import { ProgressStorage } from "../core/storage.js";
import { LOCATIONS } from "../data/locations.js";
import { AREAS, WORLD_CONFIG } from "../data/world.js";
import {
  EDITOR_LOCATION_SAFE_MARGIN,
  applyEditorDocument,
  createEditorDocument,
  deriveEditorTreeTwoTopology,
  importEditorDocument,
  sanitizeEditorDocument,
  serializeEditorDocument,
} from "./editor-document.js";

const DEFAULT_HISTORY_LIMIT = 60;

function localIssue(code, message, path = null) {
  return { code, message, path };
}

function normalizeTimestamp(value) {
  if (value instanceof Date) return value.toISOString();
  const candidate = String(value ?? "");
  return Number.isNaN(Date.parse(candidate)) ? new Date().toISOString() : candidate;
}

function semanticDocument(document) {
  const clone = structuredClone(document);
  clone.updatedAt = "";
  return JSON.stringify(clone);
}

function samePosition(first, second) {
  return first?.areaId === second?.areaId
    && first?.offset?.x === second?.offset?.x
    && first?.offset?.y === second?.offset?.y;
}

function mergeIssues(...groups) {
  const unique = new Map();
  for (const issue of groups.flat()) {
    const key = `${issue?.code ?? "unknown"}\u0000${issue?.path ?? ""}\u0000${issue?.message ?? ""}`;
    if (!unique.has(key)) unique.set(key, structuredClone(issue));
  }
  return [...unique.values()];
}

function mutationFailure(model, reason, errors = [], warnings = []) {
  return {
    ok: false,
    changed: false,
    reason,
    errors: structuredClone(errors),
    warnings: structuredClone(warnings),
    snapshot: model.getSnapshot(),
  };
}

export class EditorModel {
  constructor({
    storage,
    storageKey,
    baseAreas = AREAS,
    baseLocations = LOCATIONS,
    worldConfig = WORLD_CONFIG,
    courseId,
    baseDataVersion,
    clock = () => new Date(),
    historyLimit = DEFAULT_HISTORY_LIMIT,
  } = {}) {
    const resolvedStorageKey = storageKey ?? storage?.key;
    if (
      typeof resolvedStorageKey === "string"
      && !resolvedStorageKey.startsWith("orbit-editor:")
    ) {
      throw new TypeError("EditorModel solo admite claves aisladas con prefijo orbit-editor:.");
    }
    if (!storage) {
      if (typeof storageKey !== "string" || !storageKey.trim()) {
        throw new TypeError("EditorModel requiere storage o una storageKey explícita.");
      }
      storage = new ProgressStorage(storageKey);
    }

    this.storage = storage;
    this.clock = clock;
    this.historyLimit = Math.max(1, Math.trunc(Number(historyLimit)) || DEFAULT_HISTORY_LIMIT);
    this.documentOptions = {
      baseAreas,
      baseLocations,
      worldConfig,
      ...(courseId === undefined ? {} : { courseId }),
      ...(baseDataVersion === undefined ? {} : { baseDataVersion }),
    };
    this.baseAreaById = new Map(baseAreas.map((area) => [area.id, area]));
    this.baseLocationById = new Map(baseLocations.map((location) => [location.id, location]));
    this.listeners = new Set();
    this.history = [];
    this.future = [];
    this.warnings = [];

    const loadResult = typeof this.storage.loadResult === "function"
      ? this.storage.loadResult()
      : null;
    const loaded = loadResult ? loadResult.value : this.storage.load();
    if (loadResult?.error || (loadResult?.found && loaded === null)) {
      this.document = createEditorDocument({
        ...this.documentOptions,
        updatedAt: this.#timestamp(),
      });
      this.warnings = [
        localIssue(
          "stored-document-unreadable",
          "El borrador persistido no pudo interpretarse; se abrió una copia canónica sin sobrescribir el valor local.",
        ),
      ];
      this.#refreshCourse();
      return;
    }
    if (loaded === null || loaded === undefined) {
      this.document = createEditorDocument({
        ...this.documentOptions,
        updatedAt: this.#timestamp(),
      });
      this.#refreshCourse();
      this.storage.save(this.document);
      return;
    }

    const imported = importEditorDocument(loaded, this.documentOptions);
    if (imported.ok) {
      this.document = imported.document;
      this.warnings = imported.warnings;
      this.#refreshCourse();
      return;
    }

    this.document = createEditorDocument({
      ...this.documentOptions,
      updatedAt: this.#timestamp(),
    });
    this.warnings = [
      localIssue(
        "stored-document-rejected",
        "El borrador persistido era inválido; se abrió una copia canónica sin sobrescribirlo.",
      ),
      ...imported.errors,
      ...imported.warnings,
    ];
    this.#refreshCourse();
  }

  static create(options) {
    return new EditorModel(options);
  }

  #timestamp() {
    return normalizeTimestamp(this.clock());
  }

  #refreshCourse() {
    const applied = applyEditorDocument(this.document, this.documentOptions);
    this.areas = applied.areas;
    this.locations = applied.locations;
    this.treeTwoTopology = deriveEditorTreeTwoTopology({
      areas: this.areas,
      locations: this.locations,
    });
    this.warnings = mergeIssues(this.warnings, applied.warnings);
  }

  #emit(type, detail = {}) {
    const event = {
      type,
      detail: structuredClone(detail),
      snapshot: this.getSnapshot(),
    };
    for (const listener of this.listeners) listener(event);
  }

  #success(changed, detail = {}) {
    return {
      ok: true,
      changed,
      detail: structuredClone(detail),
      snapshot: this.getSnapshot(),
    };
  }

  #pushHistory(document) {
    this.history.push(structuredClone(document));
    if (this.history.length > this.historyLimit) this.history.shift();
  }

  #commit(candidate, type, detail = {}) {
    candidate.updatedAt = this.#timestamp();
    const result = sanitizeEditorDocument(candidate, this.documentOptions);
    if (!result.ok) {
      return mutationFailure(
        this,
        result.errors[0]?.code ?? "invalid-editor-document",
        result.errors,
        result.warnings,
      );
    }
    if (semanticDocument(result.document) === semanticDocument(this.document)) {
      return this.#success(false, detail);
    }

    this.#pushHistory(this.document);
    this.future = [];
    this.document = result.document;
    this.warnings = result.warnings;
    this.#refreshCourse();
    this.storage.save(this.document);
    this.#emit(type, detail);
    return this.#success(true, detail);
  }

  subscribe(listener) {
    if (typeof listener !== "function") {
      throw new TypeError("El listener del editor debe ser una función.");
    }
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot() {
    return {
      document: structuredClone(this.document),
      areas: structuredClone(this.areas),
      locations: structuredClone(this.locations),
      treeTwoTopology: structuredClone(this.treeTwoTopology),
      warnings: structuredClone(this.warnings),
      canUndo: this.history.length > 0,
      canRedo: this.future.length > 0,
    };
  }

  moveArea(areaId, positionOrQ, optionalR) {
    const position =
      typeof positionOrQ === "object" && positionOrQ !== null
        ? positionOrQ
        : { q: positionOrQ, r: optionalR };
    const current = this.document.areas.find((area) => area.id === areaId);
    const canonical = this.baseAreaById.get(areaId);
    if (!current || !canonical) {
      return mutationFailure(
        this,
        "unknown-area",
        [localIssue("unknown-area", `No existe la zona ${String(areaId)}.`)],
      );
    }
    if (areaId === this.documentOptions.worldConfig.spawnAreaId || canonical.tier === 0) {
      return mutationFailure(
        this,
        "origin-fixed",
        [localIssue("origin-fixed", "La zona central no se puede mover.")],
      );
    }
    if (!Number.isInteger(position.q) || !Number.isInteger(position.r)) {
      return mutationFailure(
        this,
        "invalid-axial-coordinate",
        [localIssue("invalid-axial-coordinate", "Bee requiere coordenadas axiales enteras.")],
      );
    }
    const tier = axialDistance(position, { q: 0, r: 0 });
    if (tier !== canonical.tier) {
      return mutationFailure(
        this,
        "ring-mismatch",
        [
          localIssue(
            "ring-mismatch",
            `La zona ${areaId} pertenece al anillo ${canonical.tier}, no al ${tier}.`,
          ),
        ],
      );
    }
    if (current.q === position.q && current.r === position.r) {
      return this.#success(false, { areaId, q: current.q, r: current.r, swappedAreaId: null });
    }

    const candidate = structuredClone(this.document);
    const moving = candidate.areas.find((area) => area.id === areaId);
    const occupant = candidate.areas.find(
      (area) => area.q === position.q && area.r === position.r,
    );
    const previous = { q: moving.q, r: moving.r };
    moving.q = position.q;
    moving.r = position.r;
    if (occupant && occupant.id !== areaId) {
      occupant.q = previous.q;
      occupant.r = previous.r;
    }
    const detail = {
      areaId,
      q: position.q,
      r: position.r,
      swappedAreaId: occupant?.id === areaId ? null : occupant?.id ?? null,
    };
    return this.#commit(candidate, "area-moved", detail);
  }

  swapArea(firstAreaId, secondAreaId) {
    if (firstAreaId === secondAreaId) {
      return this.#success(false, { firstAreaId, secondAreaId });
    }
    const first = this.document.areas.find((area) => area.id === firstAreaId);
    const second = this.document.areas.find((area) => area.id === secondAreaId);
    const firstCanonical = this.baseAreaById.get(firstAreaId);
    const secondCanonical = this.baseAreaById.get(secondAreaId);
    if (!first || !second || !firstCanonical || !secondCanonical) {
      return mutationFailure(
        this,
        "unknown-area",
        [localIssue("unknown-area", "No fue posible identificar ambas zonas.")],
      );
    }
    if (
      firstAreaId === this.documentOptions.worldConfig.spawnAreaId
      || secondAreaId === this.documentOptions.worldConfig.spawnAreaId
      || firstCanonical.tier === 0
      || secondCanonical.tier === 0
    ) {
      return mutationFailure(
        this,
        "origin-fixed",
        [localIssue("origin-fixed", "La zona central no participa en intercambios.")],
      );
    }
    if (firstCanonical.tier !== secondCanonical.tier) {
      return mutationFailure(
        this,
        "ring-mismatch",
        [localIssue("ring-mismatch", "Bee no mezcla zonas de anillos diferentes.")],
      );
    }

    const candidate = structuredClone(this.document);
    const candidateFirst = candidate.areas.find((area) => area.id === firstAreaId);
    const candidateSecond = candidate.areas.find((area) => area.id === secondAreaId);
    [candidateFirst.q, candidateSecond.q] = [candidateSecond.q, candidateFirst.q];
    [candidateFirst.r, candidateSecond.r] = [candidateSecond.r, candidateFirst.r];
    return this.#commit(candidate, "areas-swapped", { firstAreaId, secondAreaId });
  }

  moveLocation(locationId, placement) {
    const current = this.document.locations.find((location) => location.id === locationId);
    if (!current || !this.baseLocationById.has(locationId)) {
      return mutationFailure(
        this,
        "unknown-location",
        [localIssue("unknown-location", `No existe el nodo ${String(locationId)}.`)],
      );
    }
    const areaId = placement?.areaId ?? current.areaId;
    const offset = placement?.offset ?? {
      x: placement?.x,
      y: placement?.y,
    };
    if (!this.baseAreaById.has(areaId)) {
      return mutationFailure(
        this,
        "unknown-location-area",
        [localIssue("unknown-location-area", `No existe la zona ${String(areaId)}.`)],
      );
    }
    if (!Number.isFinite(offset?.x) || !Number.isFinite(offset?.y)) {
      return mutationFailure(
        this,
        "invalid-location-offset",
        [localIssue("invalid-location-offset", "Spider requiere un offset finito.")],
      );
    }
    const safeSize = this.documentOptions.worldConfig.hexSize - EDITOR_LOCATION_SAFE_MARGIN;
    if (!pointInHex(offset.x, offset.y, 0, 0, safeSize)) {
      return mutationFailure(
        this,
        "location-outside-safe-margin",
        [
          localIssue(
            "location-outside-safe-margin",
            "El nodo debe permanecer dentro del margen seguro del hexágono.",
          ),
        ],
      );
    }
    const next = { areaId, offset: { x: offset.x, y: offset.y } };
    if (samePosition(current, next)) {
      return this.#success(false, { locationId, ...next });
    }

    const candidate = structuredClone(this.document);
    const target = candidate.locations.find((location) => location.id === locationId);
    target.areaId = areaId;
    target.offset = { ...next.offset };
    return this.#commit(candidate, "location-moved", { locationId, ...next });
  }

  connectLocations(sourceId, targetId) {
    if (!this.baseLocationById.has(sourceId) || !this.baseLocationById.has(targetId)) {
      return mutationFailure(
        this,
        "unknown-location",
        [localIssue("unknown-location", "Spider solo conecta nodos conocidos.")],
      );
    }
    if (sourceId === targetId) {
      return mutationFailure(
        this,
        "self-connection",
        [localIssue("self-connection", "Un nodo no puede depender de sí mismo.")],
      );
    }
    if (
      this.document.treeTwoConnections.some(
        (connection) =>
          connection.sourceId === sourceId && connection.targetId === targetId,
      )
    ) {
      return mutationFailure(
        this,
        "duplicate-connection",
        [localIssue("duplicate-connection", `La conexión ${sourceId} → ${targetId} ya existe.`)],
      );
    }

    const candidate = structuredClone(this.document);
    candidate.treeTwoConnections.push({
      sourceId,
      targetId,
      kind: "completedLocation",
    });
    return this.#commit(candidate, "tree-two-connection-added", { sourceId, targetId });
  }

  disconnectLocations(sourceId, targetId) {
    const index = this.document.treeTwoConnections.findIndex(
      (connection) =>
        connection.sourceId === sourceId && connection.targetId === targetId,
    );
    if (index < 0) {
      return mutationFailure(
        this,
        "unknown-connection",
        [
          localIssue(
            "unknown-connection",
            `No existe una dependencia completedLocation ${sourceId} → ${targetId}.`,
          ),
        ],
      );
    }
    const candidate = structuredClone(this.document);
    candidate.treeTwoConnections.splice(index, 1);
    return this.#commit(candidate, "tree-two-connection-removed", { sourceId, targetId });
  }

  undo() {
    if (this.history.length === 0) {
      return mutationFailure(
        this,
        "nothing-to-undo",
        [localIssue("nothing-to-undo", "No hay cambios para deshacer.")],
      );
    }
    const previous = this.history.at(-1);
    const candidate = structuredClone(previous);
    candidate.updatedAt = this.#timestamp();
    const result = sanitizeEditorDocument(candidate, this.documentOptions);
    if (!result.ok) {
      return mutationFailure(
        this,
        result.errors[0]?.code ?? "invalid-history-entry",
        result.errors,
        result.warnings,
      );
    }

    this.history.pop();
    this.future.push(structuredClone(this.document));
    this.document = result.document;
    this.warnings = result.warnings;
    this.#refreshCourse();
    this.storage.save(this.document);
    this.#emit("editor-undo");
    return this.#success(true);
  }

  redo() {
    if (this.future.length === 0) {
      return mutationFailure(
        this,
        "nothing-to-redo",
        [localIssue("nothing-to-redo", "No hay cambios para rehacer.")],
      );
    }
    const next = this.future.at(-1);
    const candidate = structuredClone(next);
    candidate.updatedAt = this.#timestamp();
    const result = sanitizeEditorDocument(candidate, this.documentOptions);
    if (!result.ok) {
      return mutationFailure(
        this,
        result.errors[0]?.code ?? "invalid-history-entry",
        result.errors,
        result.warnings,
      );
    }

    this.future.pop();
    this.#pushHistory(this.document);
    this.document = result.document;
    this.warnings = result.warnings;
    this.#refreshCourse();
    this.storage.save(this.document);
    this.#emit("editor-redo");
    return this.#success(true);
  }

  resetDraft() {
    const canonical = createEditorDocument({
      ...this.documentOptions,
      updatedAt: this.#timestamp(),
    });
    const changed = semanticDocument(canonical) !== semanticDocument(this.document);
    this.document = canonical;
    this.history = [];
    this.future = [];
    this.warnings = [];
    this.#refreshCourse();
    this.storage.save(this.document);
    this.#emit("editor-reset", { changed });
    return this.#success(changed, { reset: true });
  }

  reset() {
    return this.resetDraft();
  }

  importDocument(candidate) {
    const result = importEditorDocument(candidate, this.documentOptions);
    if (!result.ok) {
      return mutationFailure(
        this,
        result.errors[0]?.code ?? "invalid-editor-document",
        result.errors,
        result.warnings,
      );
    }
    const imported = structuredClone(result.document);
    imported.updatedAt = this.#timestamp();
    const changed = semanticDocument(imported) !== semanticDocument(this.document);
    this.document = imported;
    this.history = [];
    this.future = [];
    this.warnings = result.warnings;
    this.#refreshCourse();
    this.storage.save(this.document);
    this.#emit("editor-document-imported", { changed });
    return this.#success(changed, { imported: true });
  }

  exportDocument() {
    return serializeEditorDocument(this.document, this.documentOptions);
  }

  validate() {
    const result = sanitizeEditorDocument(this.document, this.documentOptions);
    return {
      valid: result.ok,
      errors: structuredClone(result.errors),
      warnings: structuredClone(result.warnings),
    };
  }

  destroy() {
    this.listeners.clear();
  }
}
