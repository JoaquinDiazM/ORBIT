import { axialDistance, pointInHex } from "../core/hex.js";
import { ProgressStorage } from "../core/storage.js";
import {
  DEFAULT_AREA_APPEARANCE,
  sameAreaAppearance,
  sanitizeAreaAppearance,
} from "../core/area-appearance.js";
import { LOCATIONS } from "../data/locations.js";
import { AREAS, WORLD_CONFIG } from "../data/world.js";
import {
  DEFAULT_EDITOR_TIER_LABELS,
  EDITOR_EDITABLE_LOCATION_KINDS,
  EDITOR_LOCATION_SAFE_MARGIN,
  EDITOR_DOCUMENT_SCHEMA_VERSION,
  createEditorDocument,
  createGenericLocationContent,
  deriveEditorTreeTwoTopology,
  formatEditorCreatedLocationId,
  importEditorDocument,
  isEditorEditableLocation,
  isEditorLearningLocation,
  isEditorProtectedLocationId,
  materializeEditorDraft,
  sanitizeEditorDraft,
  sanitizeEditorDocument,
  serializeEditorDraft,
} from "./editor-document.js";

const DEFAULT_HISTORY_LIMIT = 60;
const EDITABLE_LOCATION_KINDS = new Set(EDITOR_EDITABLE_LOCATION_KINDS);

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
    baseDocument,
    editorDocument,
    clock = () => new Date(),
    historyLimit = DEFAULT_HISTORY_LIMIT,
    readOnly = false,
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
    this.readOnly = Boolean(readOnly);
    this.clock = clock;
    this.historyLimit = Math.max(1, Math.trunc(Number(historyLimit)) || DEFAULT_HISTORY_LIMIT);
    this.documentOptions = {
      baseAreas,
      baseLocations,
      worldConfig,
      ...(courseId === undefined ? {} : { courseId }),
      ...(baseDataVersion === undefined ? {} : { baseDataVersion }),
      ...((baseDocument ?? editorDocument) == null
        ? {}
        : { baseDocument: structuredClone(baseDocument ?? editorDocument) }),
    };
    this.baseDocument = structuredClone(baseDocument ?? editorDocument ?? null);
    this.baseAreaById = new Map(baseAreas.map((area) => [area.id, area]));
    this.baseLocationById = new Map(baseLocations.map((location) => [location.id, location]));
    this.listeners = new Set();
    this.history = [];
    this.future = [];
    this.warnings = [];
    this.persistenceBlocked = false;
    this.locationSequenceHighWater = 1;
    this.locationTombstones = new Map();

    if (this.baseDocument) {
      const baseState = importEditorDocument(this.baseDocument, this.#validationOptions());
      if (baseState.ok) {
        this.#adoptHighWater(baseState.document);
        this.#adoptTombstones(baseState.document);
      }
    }

    const loadResult = typeof this.storage.loadResult === "function"
      ? this.storage.loadResult()
      : null;
    const loaded = loadResult ? loadResult.value : this.storage.load();
    if (loadResult?.error || (loadResult?.found && loaded === null)) {
      this.persistenceBlocked = true;
      this.document = this.#createBaselineDocument();
      this.#adoptHighWater(this.document);
      this.warnings = [
        localIssue(
          "stored-document-unreadable",
          "El borrador persistido no pudo interpretarse; se abrió una copia de la edición base sin sobrescribir el valor local.",
        ),
      ];
      this.#refreshCourse();
      return;
    }
    if (loaded === null || loaded === undefined) {
      this.document = this.#createBaselineDocument();
      this.#adoptHighWater(this.document);
      this.#refreshCourse();
      if (!this.readOnly) {
        const persistenceIssue = this.#persist(this.document);
        if (persistenceIssue) this.warnings = mergeIssues(this.warnings, [persistenceIssue]);
      }
      return;
    }

    const imported = importEditorDocument(loaded, this.#validationOptions());
    if (imported.ok) {
      const monotonicWarnings = this.#preserveMonotonicState(imported.document);
      const guarded = sanitizeEditorDraft(imported.document, this.#validationOptions());
      if (!guarded.ok) {
        this.document = this.#createBaselineDocument();
        this.#adoptHighWater(this.document);
        this.#adoptTombstones(this.document);
        this.warnings = [
          localIssue(
            "stored-document-rejected",
            "El borrador persistido era inválido tras preservar sus IDs eliminados; se abrió una copia base sin sobrescribirlo.",
          ),
          ...guarded.errors,
          ...imported.warnings,
          ...monotonicWarnings,
        ];
        this.persistenceBlocked = true;
        this.#refreshCourse();
        return;
      }
      this.document = guarded.document;
      this.#adoptHighWater(this.document);
      this.#adoptTombstones(this.document);
      this.warnings = mergeIssues(imported.warnings, guarded.warnings, monotonicWarnings);
      this.#refreshCourse();
      const loadedFromLegacyKey = Boolean(
        loadResult?.key
        && this.storage?.key
        && loadResult.key !== this.storage.key,
      );
      const migratedSchema = loaded?.schemaVersion !== EDITOR_DOCUMENT_SCHEMA_VERSION;
      if (
        !this.readOnly
        && (loadedFromLegacyKey || migratedSchema || monotonicWarnings.length > 0)
      ) {
        const persistenceIssue = this.#persist(this.document);
        if (persistenceIssue) this.warnings = mergeIssues(this.warnings, [persistenceIssue]);
      }
      return;
    }

    this.document = this.#createBaselineDocument();
    this.#adoptHighWater(this.document);
    this.#adoptTombstones(this.document);
    this.warnings = [
      localIssue(
        "stored-document-rejected",
        "El borrador persistido era inválido; se abrió una copia de la edición base sin sobrescribirlo.",
      ),
      ...imported.errors,
      ...imported.warnings,
    ];
    this.persistenceBlocked = true;
    this.#refreshCourse();
  }

  static create(options) {
    return new EditorModel(options);
  }

  #createBaselineDocument() {
    const document = createEditorDocument({
      ...this.documentOptions,
      ...(this.baseDocument ? { baseDocument: this.baseDocument } : {}),
      updatedAt: this.#timestamp(),
    });
    this.#preserveMonotonicState(document);
    return document;
  }

  #adoptHighWater(document) {
    const next = Number.isSafeInteger(document?.nextLocationSequence)
      ? document.nextLocationSequence
      : 1;
    this.locationSequenceHighWater = Math.max(this.locationSequenceHighWater, next);
    document.nextLocationSequence = this.locationSequenceHighWater;
  }

  #preserveHighWater(document) {
    document.nextLocationSequence = Math.max(
      this.locationSequenceHighWater,
      Number.isSafeInteger(document.nextLocationSequence) ? document.nextLocationSequence : 1,
    );
  }

  #validationOptions() {
    return {
      ...this.documentOptions,
      trustedNextLocationSequence: this.locationSequenceHighWater,
    };
  }

  #adoptTombstones(document) {
    for (const record of document?.locations ?? []) {
      if (record.lifecycle !== "deleted") continue;
      if (!this.locationTombstones.has(record.id)) {
        this.locationTombstones.set(record.id, structuredClone(record));
      }
    }
  }

  #preserveTombstones(document) {
    const revivalIds = [];
    if (!Array.isArray(document?.locations)) return revivalIds;
    for (const [locationId, tombstone] of this.locationTombstones) {
      const index = document.locations.findIndex(({ id }) => id === locationId);
      if (index < 0) {
        document.locations.push(structuredClone(tombstone));
        revivalIds.push(locationId);
      } else {
        const current = document.locations[index];
        if (
          current.lifecycle !== "deleted"
          || semanticDocument({ record: current }) !== semanticDocument({ record: tombstone })
        ) {
          document.locations[index] = structuredClone(tombstone);
          revivalIds.push(locationId);
        }
      }
      if (document.learningNetwork) {
        document.learningNetwork.nodeIds = document.learningNetwork.nodeIds.filter(
          (id) => id !== locationId,
        );
        document.learningNetwork.connections = document.learningNetwork.connections.filter(
          ({ sourceId, targetId }) => sourceId !== locationId && targetId !== locationId,
        );
      }
    }
    return revivalIds;
  }

  #preserveMonotonicState(document) {
    this.#preserveHighWater(document);
    return this.#preserveTombstones(document).map((locationId) =>
      localIssue(
        "deleted-location-revival-blocked",
        `El ID eliminado ${locationId} permanece reservado y no puede reactivarse.`,
        "locations",
      ));
  }

  #timestamp() {
    return normalizeTimestamp(this.clock());
  }

  #refreshCourse() {
    const applied = materializeEditorDraft(this.document, this.#validationOptions());
    this.areas = applied.areas;
    this.locations = applied.locations;
    this.tierLabels = applied.tierLabels;
    this.locationRecordById = new Map(
      this.document.locations.map((location) => [location.id, location]),
    );
    this.treeTwoTopology = deriveEditorTreeTwoTopology({
      areas: this.areas,
      locations: this.locations,
    });
    const validation = sanitizeEditorDocument(this.document, this.#validationOptions());
    this.validation = {
      valid: validation.ok,
      errors: structuredClone(validation.errors),
      warnings: structuredClone(validation.warnings),
    };
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

  #persist(document, { allowRecovery = false } = {}) {
    if (this.persistenceBlocked && !allowRecovery) {
      return localIssue(
        "stored-document-incompatible",
        "El borrador persistido pertenece a un formato incompatible. Las mutaciones quedan bloqueadas para conservarlo; usa Restaurar o importa explícitamente un borrador válido para recuperarte.",
      );
    }
    try {
      this.storage.save(document);
      if (allowRecovery) this.persistenceBlocked = false;
      return null;
    } catch {
      return localIssue(
        "storage-write-failed",
        "No fue posible guardar el borrador en este navegador. El cambio no se aplicó; revisa el espacio disponible y los permisos del almacenamiento local.",
      );
    }
  }

  #persistenceFailure(persistenceIssue, warnings = []) {
    return mutationFailure(
      this,
      persistenceIssue.code,
      [persistenceIssue],
      warnings,
    );
  }

  #pushHistory(document) {
    this.history.push(structuredClone(document));
    if (this.history.length > this.historyLimit) this.history.shift();
  }

  #commit(candidate, type, detail = {}) {
    if (this.readOnly) {
      return mutationFailure(
        this,
        "profile-read-only",
        [localIssue("profile-read-only", "El perfil estudiante no puede modificar el borrador editorial.")],
      );
    }
    candidate.updatedAt = this.#timestamp();
    const monotonicWarnings = this.#preserveMonotonicState(candidate);
    const result = sanitizeEditorDraft(candidate, this.#validationOptions());
    if (!result.ok) {
      return mutationFailure(
        this,
        result.errors[0]?.code ?? "invalid-editor-document",
        result.errors,
        result.warnings,
      );
    }
    result.warnings = mergeIssues(result.warnings, monotonicWarnings);
    if (semanticDocument(result.document) === semanticDocument(this.document)) {
      return this.#success(false, detail);
    }

    const persistenceIssue = this.#persist(result.document);
    if (persistenceIssue) return this.#persistenceFailure(persistenceIssue, result.warnings);
    this.#adoptHighWater(result.document);
    this.#adoptTombstones(result.document);
    this.#pushHistory(this.document);
    this.future = [];
    this.document = result.document;
    this.warnings = result.warnings;
    this.#refreshCourse();
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
    const inventoryLocations = this.document.locations.filter(
      ({ lifecycle }) => lifecycle === "inventory",
    );
    return {
      document: structuredClone(this.document),
      areas: structuredClone(this.areas),
      locations: structuredClone(this.locations),
      tierLabels: structuredClone(this.tierLabels),
      inventoryLocations: structuredClone(inventoryLocations),
      activeLocationIds: this.document.locations
        .filter(({ lifecycle }) => lifecycle === "active")
        .map(({ id }) => id),
      deletedLocationIds: this.document.locations
        .filter(({ lifecycle }) => lifecycle === "deleted")
        .map(({ id }) => id),
      nextLocationSequence: this.document.nextLocationSequence,
      treeTwoTopology: structuredClone(this.treeTwoTopology),
      learningNetworkTopology: structuredClone(this.treeTwoTopology),
      learningNetworkLocationIds: [
        ...this.document.learningNetwork.nodeIds,
      ],
      validation: structuredClone(this.validation),
      warnings: structuredClone(this.warnings),
      canUndo: this.history.length > 0,
      canRedo: this.future.length > 0,
      readOnly: this.readOnly,
      persistenceBlocked: this.persistenceBlocked,
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

  renameArea(areaId, namesOrTitle, optionalShortTitle) {
    const current = this.document.areas.find((area) => area.id === areaId);
    if (!current || !this.baseAreaById.has(areaId)) {
      return mutationFailure(
        this,
        "unknown-area",
        [localIssue("unknown-area", `No existe la zona ${String(areaId)}.`)],
      );
    }
    const names = typeof namesOrTitle === "object" && namesOrTitle !== null
      ? namesOrTitle
      : { title: namesOrTitle, shortTitle: optionalShortTitle };
    const title = names.title ?? current.title;
    const shortTitle = names.shortTitle ?? current.shortTitle;
    if (title === current.title && shortTitle === current.shortTitle) {
      return this.#success(false, { areaId, title, shortTitle });
    }
    const candidate = structuredClone(this.document);
    const target = candidate.areas.find((area) => area.id === areaId);
    target.title = title;
    target.shortTitle = shortTitle;
    return this.#commit(candidate, "area-renamed", { areaId, title, shortTitle });
  }

  setTierLabel(tier, changes = {}) {
    const current = this.document.tierLabels.find((label) => label.tier === tier);
    if (!current) {
      return mutationFailure(
        this,
        "unknown-tier-label",
        [localIssue("unknown-tier-label", "Solo existen rótulos para los anillos 1 y 2.")],
      );
    }
    const text = changes.text ?? current.text;
    const offset = changes.offset ?? (
      changes.x === undefined && changes.y === undefined
        ? current.offset
        : {
            x: changes.x ?? current.offset.x,
            y: changes.y ?? current.offset.y,
          }
    );
    if (
      text === current.text
      && offset?.x === current.offset.x
      && offset?.y === current.offset.y
    ) {
      return this.#success(false, { tier, text, offset });
    }
    const candidate = structuredClone(this.document);
    const target = candidate.tierLabels.find((label) => label.tier === tier);
    target.text = text;
    target.offset = { x: offset?.x, y: offset?.y };
    return this.#commit(candidate, "tier-label-updated", {
      tier,
      text,
      offset: target.offset,
    });
  }

  setTierLabelText(tier, text) {
    return this.setTierLabel(tier, { text });
  }

  setTierLabelOffset(tier, offset) {
    return this.setTierLabel(tier, { offset });
  }

  resetTierLabel(tier) {
    const canonical = DEFAULT_EDITOR_TIER_LABELS.find((label) => label.tier === tier);
    if (!canonical) {
      return mutationFailure(
        this,
        "unknown-tier-label",
        [localIssue("unknown-tier-label", "Solo existen rótulos para los anillos 1 y 2.")],
      );
    }
    return this.setTierLabel(tier, {
      text: canonical.text,
      offset: { ...canonical.offset },
    });
  }

  setAreaAppearance(areaId, candidateAppearance) {
    if (this.readOnly) {
      return mutationFailure(
        this,
        "profile-read-only",
        [
          localIssue(
            "profile-read-only",
            "El perfil estudiante no puede modificar la apariencia del borrador Docente.",
          ),
        ],
      );
    }
    const current = this.document.areas.find((area) => area.id === areaId);
    if (!current || !this.baseAreaById.has(areaId)) {
      return mutationFailure(
        this,
        "unknown-area",
        [localIssue("unknown-area", `No existe la zona ${String(areaId)}.`)],
      );
    }
    const appearance = sanitizeAreaAppearance(candidateAppearance, {
      path: `areas.${areaId}.appearance`,
    });
    if (!appearance.ok) {
      return mutationFailure(
        this,
        appearance.errors[0]?.code ?? "invalid-area-appearance",
        appearance.errors,
      );
    }
    if (sameAreaAppearance(current.appearance, appearance.appearance)) {
      return this.#success(false, { areaId, appearance: appearance.appearance });
    }

    const candidate = structuredClone(this.document);
    const target = candidate.areas.find((area) => area.id === areaId);
    target.appearance = appearance.appearance;
    return this.#commit(candidate, "area-appearance-updated", {
      areaId,
      appearance: appearance.appearance,
    });
  }

  resetAreaAppearance(areaId) {
    return this.setAreaAppearance(areaId, DEFAULT_AREA_APPEARANCE);
  }

  getLocationRecord(locationId) {
    const record = this.document.locations.find(({ id }) => id === locationId);
    return record ? structuredClone(record) : null;
  }

  getInventoryLocations() {
    return this.document.locations
      .filter(({ lifecycle }) => lifecycle === "inventory")
      .map((record) => structuredClone(record));
  }

  getLocationLifecycleImpact(locationId) {
    const record = this.document.locations.find(({ id }) => id === locationId);
    if (!record) return null;
    const incidentConnections = this.document.learningNetwork.connections.filter(
      ({ sourceId, targetId }) => sourceId === locationId || targetId === locationId,
    );
    const canonical = this.baseLocationById.get(locationId);
    return {
      location: structuredClone(record),
      incidentConnections: structuredClone(incidentConnections),
      removedConnectionCount: incidentConnections.length,
      grantedConceptIds: [...(canonical?.grants?.concepts ?? record.content?.grants?.concepts ?? [])],
      grantedRewardIds: [...(canonical?.grants?.rewards ?? record.content?.grants?.rewards ?? [])],
      protected: isEditorProtectedLocationId(locationId),
    };
  }

  renameLocation(locationId, namesOrTitle, optionalShortTitle) {
    const current = this.document.locations.find(({ id }) => id === locationId);
    if (!current) {
      return mutationFailure(
        this,
        "unknown-location",
        [localIssue("unknown-location", `No existe el nodo ${String(locationId)}.`)],
      );
    }
    if (!isEditorEditableLocation(current) || current.lifecycle === "deleted") {
      return mutationFailure(
        this,
        "location-not-editable",
        [localIssue("location-not-editable", "Solo se renombran lecciones, misiones y personajes activos o inventariados.")],
      );
    }
    const names = typeof namesOrTitle === "object" && namesOrTitle !== null
      ? namesOrTitle
      : { title: namesOrTitle, shortTitle: optionalShortTitle };
    const title = names.title ?? current.title;
    const shortTitle = names.shortTitle ?? current.shortTitle;
    if (title === current.title && shortTitle === current.shortTitle) {
      return this.#success(false, { locationId, title, shortTitle });
    }
    const candidate = structuredClone(this.document);
    const target = candidate.locations.find(({ id }) => id === locationId);
    target.title = title;
    target.shortTitle = shortTitle;
    if (target.provenance === "editor-created") {
      target.content = createGenericLocationContent(target.kind, title);
    }
    return this.#commit(candidate, "location-renamed", { locationId, title, shortTitle });
  }

  createLocation({ kind, areaId, offset = { x: 0, y: 0 }, title, shortTitle } = {}) {
    if (!EDITABLE_LOCATION_KINDS.has(kind)) {
      return mutationFailure(
        this,
        "non-editable-location-kind",
        [localIssue("non-editable-location-kind", "Spider solo crea lesson, mission o npc.")],
      );
    }
    if (!this.baseAreaById.has(areaId)) {
      return mutationFailure(
        this,
        "unknown-location-area",
        [localIssue("unknown-location-area", `No existe la zona ${String(areaId)}.`)],
      );
    }
    let sequence = this.locationSequenceHighWater;
    if (sequence >= Number.MAX_SAFE_INTEGER - 1) {
      return mutationFailure(
        this,
        "location-sequence-exhausted",
        [localIssue(
          "location-sequence-exhausted",
          "La secuencia segura de IDs está agotada; no se creó ningún nodo.",
          "nextLocationSequence",
        )],
      );
    }
    let locationId = formatEditorCreatedLocationId(sequence);
    const knownIds = new Set([
      ...this.baseLocationById.keys(),
      ...this.document.locations.map(({ id }) => id),
    ]);
    while (knownIds.has(locationId)) {
      sequence += 1;
      locationId = formatEditorCreatedLocationId(sequence);
    }
    const kindLabel = kind === "lesson" ? "Nueva lección" : kind === "mission" ? "Nueva misión" : "Nuevo personaje";
    const resolvedTitle = title ?? `${kindLabel} ${String(sequence).padStart(4, "0")}`;
    const resolvedShortTitle = shortTitle ?? resolvedTitle;
    const record = {
      id: locationId,
      kind,
      title: resolvedTitle,
      shortTitle: resolvedShortTitle,
      areaId,
      offset: { x: offset?.x, y: offset?.y },
      lifecycle: "active",
      provenance: "editor-created",
      content: createGenericLocationContent(kind, resolvedTitle),
    };
    const candidate = structuredClone(this.document);
    candidate.locations.push(record);
    candidate.nextLocationSequence = sequence + 1;
    if (isEditorLearningLocation(record)) {
      candidate.learningNetwork.nodeIds.push(locationId);
    }
    return this.#commit(candidate, "location-created", {
      locationId,
      location: record,
    });
  }

  inventoryLocation(locationId) {
    const current = this.document.locations.find(({ id }) => id === locationId);
    if (!current) {
      return mutationFailure(
        this,
        "unknown-location",
        [localIssue("unknown-location", `No existe el nodo ${String(locationId)}.`)],
      );
    }
    if (!isEditorEditableLocation(current)) {
      return mutationFailure(
        this,
        "location-not-editable",
        [localIssue("location-not-editable", "Este tipo de lugar no participa en el inventario Spider.")],
      );
    }
    if (current.lifecycle === "deleted") {
      return mutationFailure(
        this,
        "location-deleted",
        [localIssue("location-deleted", "Un ID eliminado queda reservado y no se puede restaurar.")],
      );
    }
    if (current.lifecycle === "inventory") {
      return this.#success(false, {
        locationId,
        incidentConnections: [],
        removedConnectionCount: 0,
      });
    }
    const incidentConnections = this.document.learningNetwork.connections.filter(
      ({ sourceId, targetId }) => sourceId === locationId || targetId === locationId,
    );
    const candidate = structuredClone(this.document);
    candidate.locations.find(({ id }) => id === locationId).lifecycle = "inventory";
    candidate.learningNetwork.nodeIds = candidate.learningNetwork.nodeIds.filter(
      (id) => id !== locationId,
    );
    candidate.learningNetwork.connections = candidate.learningNetwork.connections.filter(
      ({ sourceId, targetId }) => sourceId !== locationId && targetId !== locationId,
    );
    return this.#commit(candidate, "location-inventoried", {
      locationId,
      incidentConnections,
      removedConnectionCount: incidentConnections.length,
    });
  }

  restoreLocation(locationOrId, placement = {}) {
    const request = typeof locationOrId === "object" && locationOrId !== null
      ? locationOrId
      : { id: locationOrId, ...placement };
    const locationId = request.id;
    const current = this.document.locations.find(({ id }) => id === locationId);
    if (!current) {
      return mutationFailure(
        this,
        "unknown-location",
        [localIssue("unknown-location", `No existe el nodo ${String(locationId)}.`)],
      );
    }
    if (current.lifecycle !== "inventory") {
      return mutationFailure(
        this,
        current.lifecycle === "deleted" ? "location-deleted" : "location-not-in-inventory",
        [localIssue("location-not-in-inventory", "Solo se restauran lugares actualmente inventariados.")],
      );
    }
    const areaId = request.areaId ?? current.areaId;
    const offset = request.offset ?? (
      request.x === undefined && request.y === undefined
        ? current.offset
        : { x: request.x ?? current.offset.x, y: request.y ?? current.offset.y }
    );
    const candidate = structuredClone(this.document);
    const target = candidate.locations.find(({ id }) => id === locationId);
    target.lifecycle = "active";
    target.areaId = areaId;
    target.offset = { x: offset?.x, y: offset?.y };
    if (isEditorLearningLocation(target)) {
      candidate.learningNetwork.nodeIds.push(locationId);
    }
    return this.#commit(candidate, "location-restored", {
      locationId,
      areaId,
      offset: target.offset,
    });
  }

  deleteInventoryLocation(locationId) {
    const current = this.document.locations.find(({ id }) => id === locationId);
    if (!current) {
      return mutationFailure(
        this,
        "unknown-location",
        [localIssue("unknown-location", `No existe el nodo ${String(locationId)}.`)],
      );
    }
    if (isEditorProtectedLocationId(locationId)) {
      return mutationFailure(
        this,
        "protected-location-delete",
        [localIssue("protected-location-delete", `${locationId} es un nodo académico protegido.`)],
      );
    }
    if (current.lifecycle !== "inventory") {
      return mutationFailure(
        this,
        "location-not-in-inventory",
        [localIssue("location-not-in-inventory", "La eliminación permanente solo se inicia desde el inventario.")],
      );
    }
    const candidate = structuredClone(this.document);
    candidate.locations.find(({ id }) => id === locationId).lifecycle = "deleted";
    return this.#commit(candidate, "inventory-location-deleted", {
      locationId,
      tombstone: true,
    });
  }

  moveLocation(locationId, placement) {
    const current = this.document.locations.find((location) => location.id === locationId);
    if (!current) {
      return mutationFailure(
        this,
        "unknown-location",
        [localIssue("unknown-location", `No existe el nodo ${String(locationId)}.`)],
      );
    }
    if (current.lifecycle !== "active") {
      return mutationFailure(
        this,
        "location-not-active",
        [localIssue("location-not-active", "Restaura el lugar desde el inventario antes de moverlo.")],
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
    const source = this.locationRecordById.get(sourceId);
    const target = this.locationRecordById.get(targetId);
    if (!source || !target) {
      return mutationFailure(
        this,
        "unknown-location",
        [localIssue("unknown-location", "Spider solo conecta nodos conocidos.")],
      );
    }
    if (
      source.lifecycle !== "active"
      || target.lifecycle !== "active"
      || !isEditorLearningLocation(source)
      || !isEditorLearningLocation(target)
    ) {
      return mutationFailure(
        this,
        "non-learning-location",
        [
          localIssue(
            "non-learning-location",
            "La Red de aprendizaje solo conecta lecciones o misiones.",
          ),
        ],
      );
    }
    const nodeIds = new Set(this.document.learningNetwork.nodeIds);
    if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) {
      return mutationFailure(
        this,
        "location-not-in-learning-network",
        [
          localIssue(
            "location-not-in-learning-network",
            "Añade ambos nodos a la Red de aprendizaje antes de conectarlos.",
          ),
        ],
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
      this.document.learningNetwork.connections.some(
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
    candidate.learningNetwork.connections.push({
      sourceId,
      targetId,
    });
    return this.#commit(candidate, "learning-network-connection-added", { sourceId, targetId });
  }

  disconnectLocations(sourceId, targetId) {
    const index = this.document.learningNetwork.connections.findIndex(
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
    candidate.learningNetwork.connections.splice(index, 1);
    return this.#commit(candidate, "learning-network-connection-removed", { sourceId, targetId });
  }

  removeLocationFromLearningNetwork(locationId) {
    const location = this.locationRecordById.get(locationId);
    if (!location) {
      return mutationFailure(
        this,
        "unknown-location",
        [localIssue("unknown-location", "El lugar no pertenece al curso.")],
      );
    }
    if (!isEditorLearningLocation(location)) {
      return mutationFailure(
        this,
        "non-learning-location",
        [
          localIssue(
            "non-learning-location",
            "Este lugar está fuera de la Red; solo las lecciones y misiones pueden incorporarse.",
          ),
        ],
      );
    }
    if (location.lifecycle !== "active") {
      return mutationFailure(
        this,
        "location-not-active",
        [localIssue("location-not-active", "El nodo debe estar activo para editar su pertenencia a la Red.")],
      );
    }
    if (!this.document.learningNetwork.nodeIds.includes(locationId)) {
      return this.#success(false, { locationId, removedConnectionCount: 0 });
    }

    const candidate = structuredClone(this.document);
    candidate.learningNetwork.nodeIds = candidate.learningNetwork.nodeIds.filter(
      (id) => id !== locationId,
    );
    const previousCount = candidate.learningNetwork.connections.length;
    candidate.learningNetwork.connections = candidate.learningNetwork.connections.filter(
      ({ sourceId, targetId }) =>
        sourceId !== locationId && targetId !== locationId,
    );
    return this.#commit(
      candidate,
      "learning-network-location-removed",
      {
        locationId,
        removedConnectionCount:
          previousCount - candidate.learningNetwork.connections.length,
      },
    );
  }

  addLocationToLearningNetwork(locationId) {
    const location = this.locationRecordById.get(locationId);
    if (!location) {
      return mutationFailure(
        this,
        "unknown-location",
        [localIssue("unknown-location", "El lugar no pertenece al curso.")],
      );
    }
    if (!isEditorLearningLocation(location)) {
      return mutationFailure(
        this,
        "non-learning-location",
        [
          localIssue(
            "non-learning-location",
            "Solo las lecciones y misiones pueden añadirse a la Red de aprendizaje.",
          ),
        ],
      );
    }
    if (location.lifecycle !== "active") {
      return mutationFailure(
        this,
        "location-not-active",
        [localIssue("location-not-active", "Restaura el nodo antes de añadirlo a la Red.")],
      );
    }
    if (this.document.learningNetwork.nodeIds.includes(locationId)) {
      return this.#success(false, { locationId });
    }

    const order = new Map(
      this.document.locations.map(({ id }, index) => [id, index]),
    );
    const candidate = structuredClone(this.document);
    candidate.learningNetwork.nodeIds.push(locationId);
    candidate.learningNetwork.nodeIds.sort(
      (first, second) => order.get(first) - order.get(second),
    );
    return this.#commit(
      candidate,
      "learning-network-location-added",
      { locationId },
    );
  }

  undo() {
    if (this.readOnly) {
      return mutationFailure(
        this,
        "profile-read-only",
        [localIssue("profile-read-only", "El perfil estudiante no puede deshacer cambios editoriales.")],
      );
    }
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
    const monotonicWarnings = this.#preserveMonotonicState(candidate);
    const result = sanitizeEditorDraft(candidate, this.#validationOptions());
    if (!result.ok) {
      return mutationFailure(
        this,
        result.errors[0]?.code ?? "invalid-history-entry",
        result.errors,
        result.warnings,
      );
    }
    result.warnings = mergeIssues(result.warnings, monotonicWarnings);

    const persistenceIssue = this.#persist(result.document);
    if (persistenceIssue) return this.#persistenceFailure(persistenceIssue, result.warnings);
    this.#adoptHighWater(result.document);
    this.#adoptTombstones(result.document);
    this.history.pop();
    this.future.push(structuredClone(this.document));
    this.document = result.document;
    this.warnings = result.warnings;
    this.#refreshCourse();
    this.#emit("editor-undo");
    return this.#success(true);
  }

  redo() {
    if (this.readOnly) {
      return mutationFailure(
        this,
        "profile-read-only",
        [localIssue("profile-read-only", "El perfil estudiante no puede rehacer cambios editoriales.")],
      );
    }
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
    const monotonicWarnings = this.#preserveMonotonicState(candidate);
    const result = sanitizeEditorDraft(candidate, this.#validationOptions());
    if (!result.ok) {
      return mutationFailure(
        this,
        result.errors[0]?.code ?? "invalid-history-entry",
        result.errors,
        result.warnings,
      );
    }
    result.warnings = mergeIssues(result.warnings, monotonicWarnings);

    const persistenceIssue = this.#persist(result.document);
    if (persistenceIssue) return this.#persistenceFailure(persistenceIssue, result.warnings);
    this.#adoptHighWater(result.document);
    this.#adoptTombstones(result.document);
    this.future.pop();
    this.#pushHistory(this.document);
    this.document = result.document;
    this.warnings = result.warnings;
    this.#refreshCourse();
    this.#emit("editor-redo");
    return this.#success(true);
  }

  resetDraft() {
    if (this.readOnly) {
      return mutationFailure(
        this,
        "profile-read-only",
        [localIssue("profile-read-only", "El perfil estudiante no puede restaurar el borrador editorial.")],
      );
    }
    const canonical = this.#createBaselineDocument();
    const changed = semanticDocument(canonical) !== semanticDocument(this.document);
    const persistenceIssue = this.#persist(canonical, { allowRecovery: true });
    if (persistenceIssue) return this.#persistenceFailure(persistenceIssue);
    this.#adoptHighWater(canonical);
    this.#adoptTombstones(canonical);
    this.document = canonical;
    this.history = [];
    this.future = [];
    this.warnings = [];
    this.#refreshCourse();
    this.#emit("editor-reset", { changed });
    return this.#success(changed, { reset: true });
  }

  reset() {
    return this.resetDraft();
  }

  importDocument(candidate) {
    if (this.readOnly) {
      return mutationFailure(
        this,
        "profile-read-only",
        [localIssue("profile-read-only", "El perfil estudiante no puede importar borradores editoriales.")],
      );
    }
    const result = importEditorDocument(candidate, this.#validationOptions());
    if (!result.ok) {
      return mutationFailure(
        this,
        result.errors[0]?.code ?? "invalid-editor-document",
        result.errors,
        result.warnings,
      );
    }
    const currentRecords = new Map([
      ...this.document.locations.map((record) => [record.id, record]),
      ...this.locationTombstones,
    ]);
    for (const record of result.document.locations) {
      if (record.provenance !== "editor-created") continue;
      const authority = currentRecords.get(record.id);
      if (authority && authority.kind !== record.kind) {
        return mutationFailure(
          this,
          "invalid-location-kind",
          [localIssue(
            "invalid-location-kind",
            `El tipo de ${record.id} no puede cambiar después de reservar su identidad.`,
            "locations",
          )],
          result.warnings,
        );
      }
      const sequence = Number(record.id.slice("new-node-".length));
      if (!authority && sequence < this.locationSequenceHighWater) {
        return mutationFailure(
          this,
          "reused-created-location-id",
          [localIssue(
            "reused-created-location-id",
            `El ID ${record.id} pertenece a una secuencia ya consumida en esta sesión.`,
            "locations",
          )],
          result.warnings,
        );
      }
    }
    const candidateDocument = structuredClone(result.document);
    candidateDocument.updatedAt = this.#timestamp();
    const monotonicWarnings = this.#preserveMonotonicState(candidateDocument);
    const guarded = sanitizeEditorDraft(candidateDocument, this.#validationOptions());
    if (!guarded.ok) {
      return mutationFailure(
        this,
        guarded.errors[0]?.code ?? "invalid-editor-document",
        guarded.errors,
        mergeIssues(result.warnings, guarded.warnings, monotonicWarnings),
      );
    }
    guarded.warnings = mergeIssues(result.warnings, guarded.warnings, monotonicWarnings);
    const imported = guarded.document;
    const changed = semanticDocument(imported) !== semanticDocument(this.document);
    const persistenceIssue = this.#persist(imported, { allowRecovery: true });
    if (persistenceIssue) return this.#persistenceFailure(persistenceIssue, guarded.warnings);
    this.#adoptHighWater(imported);
    this.#adoptTombstones(imported);
    this.document = imported;
    this.history = [];
    this.future = [];
    this.warnings = guarded.warnings;
    this.#refreshCourse();
    this.#emit("editor-document-imported", { changed });
    return this.#success(changed, { imported: true });
  }

  exportDocument() {
    return serializeEditorDraft(this.document, this.#validationOptions());
  }

  validate() {
    const result = sanitizeEditorDocument(this.document, this.#validationOptions());
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
