import { APP_CONFIG } from "../config.js";
import { CONCEPTS, REWARDS, getReward, parseRewardKey, rewardKey } from "../data/knowledge.js";
import { LOCATIONS } from "../data/locations.js";
import { AREAS, WORLD_CONFIG } from "../data/world.js";
import { TREE_TWO_VISUALIZATION_MODES } from "./knowledge-graph.js";
import { isLocationAllowedForProfile } from "./profile-policy.js";
import { meetsRequirements } from "./requirements.js";
import { migrateProgressState } from "./progress-migrations.js";
import { ProgressStorage, StoragePersistenceError } from "./storage.js";
import {
  createWorldIndex,
  deriveUnlockedAreaIds,
  getAreaCenter,
  getLocationWorldPosition,
} from "./world-graph.js";

function allKnownRewardKeys() {
  return new Set(
    Object.entries(REWARDS).flatMap(([type, rewards]) =>
      rewards.map((reward) => rewardKey(type, reward.id)),
    ),
  );
}

function createInitialState(profile, worldIndex, { courseId, courseRevision }) {
  const spawnArea = worldIndex.byId.get(WORLD_CONFIG.spawnAreaId);
  const center = getAreaCenter(spawnArea, WORLD_CONFIG.hexSize);
  const initialTransport = REWARDS.transports.find((transport) => transport.initial)?.id ?? "walk";

  return {
    schemaVersion: APP_CONFIG.progressSchemaVersion,
    profile,
    courseId,
    courseRevision,
    completedLocations: [],
    concepts: [],
    rewards: [rewardKey("transports", initialTransport)],
    debugUnlockedAreas: [],
    activeTransport: initialTransport,
    settings: {
      ambienceVolume: 1,
      effectsVolume: 1,
      treeTwoVisualizationMode: "hidden",
    },
    player: {
      x: center.x + WORLD_CONFIG.spawnOffset.x,
      y: center.y + WORLD_CONFIG.spawnOffset.y,
    },
    updatedAt: new Date().toISOString(),
  };
}

function uniqueKnown(values, knownValues) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value) => knownValues.has(value)))];
}

function hasUnsupportedProgressSchema(candidate) {
  return Boolean(
    candidate
    && typeof candidate === "object"
    && Number.isInteger(candidate.schemaVersion)
    && candidate.schemaVersion > APP_CONFIG.progressSchemaVersion,
  );
}

export class ProgressSchemaError extends StoragePersistenceError {
  constructor(candidateVersion) {
    super(
      "unsupported-progress-schema",
      `El progreso usa el esquema futuro v${candidateVersion}; esta versión de ORBIT solo admite hasta v${APP_CONFIG.progressSchemaVersion}.`,
    );
    this.name = "ProgressSchemaError";
    this.candidateVersion = candidateVersion;
  }
}

export class ProgressCompatibilityError extends Error {
  constructor(message) {
    super(message);
    this.name = "ProgressCompatibilityError";
    this.code = "incompatible-progress-edition";
  }
}

export class ProgressionModel {
  constructor({
    profile,
    storage,
    areas = AREAS,
    locations = LOCATIONS,
    courseId = APP_CONFIG.activeCourseId,
    courseRevision = APP_CONFIG.legacyCourseRevision,
    acceptsUnversionedProgress = true,
  }) {
    this.profile = profile;
    this.courseId = courseId;
    this.courseRevision = courseRevision;
    this.acceptsUnversionedProgress = Boolean(acceptsUnversionedProgress);
    this.areas = areas;
    this.locations = locations;
    this.concepts = CONCEPTS;
    this.rewards = REWARDS;
    this.worldIndex = createWorldIndex(this.areas);
    this.storage = storage;
    this.listeners = new Set();
    const stored = this.storage.load();
    this.persistenceBlocker = hasUnsupportedProgressSchema(stored)
      ? new ProgressSchemaError(stored.schemaVersion)
      : null;
    this.state = this.#sanitizeState(stored);
    if (this.persistenceBlocker) {
      console.warn(
        "El progreso persistido pertenece a una versión futura y se conservó sin sobrescribir.",
      );
    } else {
      this.#save();
    }
  }

  static create({
    profile,
    storageKey,
    legacyStorageKeys = [],
    areas = AREAS,
    locations = LOCATIONS,
    courseId = APP_CONFIG.activeCourseId,
    courseRevision = APP_CONFIG.legacyCourseRevision,
    acceptsUnversionedProgress = true,
  }) {
    return new ProgressionModel({
      profile,
      storage: new ProgressStorage(storageKey, globalThis.localStorage, legacyStorageKeys),
      areas,
      locations,
      courseId,
      courseRevision,
      acceptsUnversionedProgress,
    });
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  #emit(type, detail = {}) {
    const event = { type, detail, snapshot: this.getSnapshot() };
    for (const listener of this.listeners) listener(event);
  }

  #sanitizeState(candidate) {
    const initial = createInitialState(this.profile, this.worldIndex, {
      courseId: this.courseId,
      courseRevision: this.courseRevision,
    });
    if (!candidate || typeof candidate !== "object") return initial;
    const candidateVersion = Number.isInteger(candidate.schemaVersion)
      ? candidate.schemaVersion
      : 1;
    if (candidateVersion > APP_CONFIG.progressSchemaVersion) {
      return initial;
    }
    if (candidateVersion >= 4) {
      if (
        candidate.courseId !== this.courseId
        || candidate.courseRevision !== this.courseRevision
      ) {
        return initial;
      }
    } else if (!this.acceptsUnversionedProgress) {
      return initial;
    }
    const migrated = migrateProgressState(candidate, {
      courseId: this.courseId,
      courseRevision: this.courseRevision,
    });

    const knownConcepts = new Set(this.concepts.map((concept) => concept.id));
    const knownLocations = new Set(this.locations.map((location) => location.id));
    const knownAreas = new Set(this.areas.map((area) => area.id));
    const knownRewards = allKnownRewardKeys();

    const state = {
      ...initial,
      ...migrated,
      schemaVersion: APP_CONFIG.progressSchemaVersion,
      profile: this.profile,
      courseId: this.courseId,
      courseRevision: this.courseRevision,
      completedLocations: uniqueKnown(migrated.completedLocations, knownLocations),
      concepts: uniqueKnown(migrated.concepts, knownConcepts),
      rewards: uniqueKnown(migrated.rewards, knownRewards),
      debugUnlockedAreas: uniqueKnown(migrated.debugUnlockedAreas, knownAreas),
      settings: { ...initial.settings },
      player: {
        x: Number.isFinite(migrated.player?.x) ? migrated.player.x : initial.player.x,
        y: Number.isFinite(migrated.player?.y) ? migrated.player.y : initial.player.y,
      },
      updatedAt: new Date().toISOString(),
    };

    const initialTransportKey = rewardKey("transports", "walk");
    if (!state.rewards.includes(initialTransportKey)) state.rewards.push(initialTransportKey);

    const ownedTransportIds = this.#ownedTransportIdsFromRewards(state.rewards);
    if (!ownedTransportIds.includes(state.activeTransport)) state.activeTransport = "walk";
    const migratedSettings =
      migrated.settings && typeof migrated.settings === "object" ? migrated.settings : {};
    state.settings.ambienceVolume = Math.min(
      1,
      Math.max(
        0,
        Number.isFinite(migratedSettings.ambienceVolume)
          ? migratedSettings.ambienceVolume
          : 1,
      ),
    );
    state.settings.effectsVolume = Math.min(
      1,
      Math.max(
        0,
        Number.isFinite(migratedSettings.effectsVolume) ? migratedSettings.effectsVolume : 1,
      ),
    );
    state.settings.treeTwoVisualizationMode = TREE_TWO_VISUALIZATION_MODES.includes(
      migratedSettings.treeTwoVisualizationMode,
    )
      ? migratedSettings.treeTwoVisualizationMode
      : "hidden";

    return state;
  }

  #save(previousState = null, options = undefined) {
    const previousUpdatedAt = this.state.updatedAt;
    this.state.updatedAt = new Date().toISOString();
    try {
      if (this.persistenceBlocker) throw this.persistenceBlocker;
      this.storage.save(this.state, options);
    } catch (error) {
      if (previousState) this.state = previousState;
      else this.state.updatedAt = previousUpdatedAt;
      throw error;
    }
  }

  #ownedTransportIdsFromRewards(rewardKeys) {
    return rewardKeys
      .map(parseRewardKey)
      .filter((reward) => reward.type === "transports")
      .map((reward) => reward.id)
      .filter((id) => getReward("transports", id));
  }

  #context(unlockedAreas = this.getUnlockedAreaIds()) {
    return {
      concepts: new Set(this.state.concepts),
      completedLocations: new Set(this.state.completedLocations),
      rewards: new Set(this.state.rewards),
      unlockedAreas,
    };
  }

  #accessibleLocationIds(unlockedAreas = this.getUnlockedAreaIds()) {
    const context = this.#context(unlockedAreas);
    return new Set(
      this.locations
        .filter(
          (location) =>
            isLocationAllowedForProfile(this.profile, location) &&
            unlockedAreas.has(location.areaId) &&
            meetsRequirements(location.requirements, context),
        )
        .map((location) => location.id),
    );
  }

  getUnlockedAreaIds() {
    return deriveUnlockedAreaIds({
      areas: this.areas,
      worldIndex: this.worldIndex,
      concepts: new Set(this.state.concepts),
      completedLocations: new Set(this.state.completedLocations),
      rewards: new Set(this.state.rewards),
      debugUnlockedAreas: new Set(this.state.debugUnlockedAreas),
    });
  }

  isAreaUnlocked(areaId) {
    return this.getUnlockedAreaIds().has(areaId);
  }

  isLocationAccessible(locationOrId) {
    const location =
      typeof locationOrId === "string"
        ? this.locations.find((candidate) => candidate.id === locationOrId)
        : locationOrId;
    if (!location) return false;
    if (!isLocationAllowedForProfile(this.profile, location)) return false;

    const unlockedAreas = this.getUnlockedAreaIds();
    if (!unlockedAreas.has(location.areaId)) return false;
    return meetsRequirements(location.requirements, this.#context(unlockedAreas));
  }

  isLocationVisible(locationOrId) {
    const location =
      typeof locationOrId === "string"
        ? this.locations.find((candidate) => candidate.id === locationOrId)
        : locationOrId;
    if (!location) return false;
    if (!isLocationAllowedForProfile(this.profile, location)) return false;
    if (!this.isAreaUnlocked(location.areaId)) return false;
    if (location.visibility === "hiddenUntilUnlocked") {
      return this.isLocationAccessible(location);
    }
    return true;
  }

  isLocationCompleted(locationId) {
    return this.state.completedLocations.includes(locationId);
  }

  getLocationPosition(locationOrId) {
    const location =
      typeof locationOrId === "string"
        ? this.locations.find((candidate) => candidate.id === locationOrId)
        : locationOrId;
    return location
      ? getLocationWorldPosition(location, this.worldIndex, WORLD_CONFIG.hexSize)
      : null;
  }

  completeLocation(locationId, { force = false } = {}) {
    const location = this.locations.find((candidate) => candidate.id === locationId);
    if (!location) return { ok: false, reason: "unknown-location" };
    if (!force && !this.isLocationAccessible(location)) {
      return { ok: false, reason: "locked-location" };
    }
    if (location.repeatable && !location.grants?.concepts?.length && !location.grants?.rewards?.length) {
      return {
        ok: true,
        repeated: true,
        newlyGranted: [],
        newlyUnlockedAreaIds: [],
        newlyAccessibleLocationIds: [],
      };
    }

    const previousState = structuredClone(this.state);
    const previouslyUnlockedAreaIds = this.getUnlockedAreaIds();
    const previouslyAccessibleLocationIds = this.#accessibleLocationIds(
      previouslyUnlockedAreaIds,
    );

    const wasCompleted = this.isLocationCompleted(locationId);
    if (!wasCompleted) this.state.completedLocations.push(locationId);

    const newlyGranted = [];
    for (const conceptId of location.grants?.concepts ?? []) {
      if (!this.state.concepts.includes(conceptId)) {
        this.state.concepts.push(conceptId);
        newlyGranted.push(`concept:${conceptId}`);
      }
    }
    for (const grantedReward of location.grants?.rewards ?? []) {
      if (!this.state.rewards.includes(grantedReward)) {
        this.state.rewards.push(grantedReward);
        newlyGranted.push(grantedReward);
      }
    }

    this.#save(previousState);

    const unlockedAreaIds = this.getUnlockedAreaIds();
    const accessibleLocationIds = this.#accessibleLocationIds(unlockedAreaIds);
    const newlyUnlockedAreaIds = this.areas
      .map((area) => area.id)
      .filter(
        (areaId) =>
          unlockedAreaIds.has(areaId) && !previouslyUnlockedAreaIds.has(areaId),
      );
    const newlyAccessibleLocationIds = this.locations
      .map((candidate) => candidate.id)
      .filter(
        (candidateId) =>
          accessibleLocationIds.has(candidateId) &&
          !previouslyAccessibleLocationIds.has(candidateId),
      );

    const detail = {
      locationId,
      newlyGranted,
      wasCompleted,
      newlyUnlockedAreaIds,
      newlyAccessibleLocationIds,
    };
    this.#emit("location-completed", detail);
    return { ok: true, ...detail };
  }

  grantConcept(conceptId) {
    if (!this.concepts.some((concept) => concept.id === conceptId)) return false;
    if (this.state.concepts.includes(conceptId)) return false;
    const previousState = structuredClone(this.state);
    this.state.concepts.push(conceptId);
    this.#save(previousState);
    this.#emit("concept-granted", { conceptId });
    return true;
  }

  grantNextConcept() {
    const next = [...this.concepts]
      .sort((a, b) => a.order - b.order)
      .find((concept) => !this.state.concepts.includes(concept.id));
    if (!next) return null;
    this.grantConcept(next.id);
    return next;
  }

  unlockAllAreasForDebug() {
    const previousState = structuredClone(this.state);
    this.state.debugUnlockedAreas = this.areas.map((area) => area.id);
    this.#save(previousState);
    this.#emit("debug-areas-unlocked");
  }

  completeAllForDebug() {
    const previousState = structuredClone(this.state);
    this.state.concepts = this.concepts.map((concept) => concept.id);
    this.state.completedLocations = this.locations
      .filter((location) => location.kind !== "debug" && location.kind !== "base")
      .map((location) => location.id);
    this.state.rewards = [
      ...new Set(
        Object.entries(this.rewards).flatMap(([type, rewards]) =>
          rewards.map((reward) => rewardKey(type, reward.id)),
        ),
      ),
    ];
    this.state.debugUnlockedAreas = this.areas.map((area) => area.id);
    this.#save(previousState);
    this.#emit("debug-complete-all");
  }

  getOwnedTransports() {
    const ownedIds = this.#ownedTransportIdsFromRewards(this.state.rewards);
    return this.rewards.transports.filter((transport) => ownedIds.includes(transport.id));
  }

  getActiveTransport() {
    return (
      this.rewards.transports.find((transport) => transport.id === this.state.activeTransport) ??
      this.rewards.transports[0]
    );
  }

  cycleTransport() {
    const owned = this.getOwnedTransports();
    if (owned.length <= 1) return this.getActiveTransport();
    const currentIndex = Math.max(
      0,
      owned.findIndex((transport) => transport.id === this.state.activeTransport),
    );
    const next = owned[(currentIndex + 1) % owned.length];
    const previousState = structuredClone(this.state);
    this.state.activeTransport = next.id;
    this.#save(previousState);
    this.#emit("transport-changed", { transportId: next.id });
    return next;
  }

  ownsReward(key) {
    return this.state.rewards.includes(key);
  }

  #setAudioCategoryVolume(category, volume) {
    const numeric = Number(volume);
    const setting = category === "ambience" ? "ambienceVolume" : "effectsVolume";
    if (!Number.isFinite(numeric)) return this.state.settings[setting];
    const previousState = structuredClone(this.state);
    this.state.settings[setting] = Math.min(1, Math.max(0, numeric));
    this.#save(previousState);
    this.#emit(`${category}-volume-changed`, {
      category,
      volume: this.state.settings[setting],
    });
    return this.state.settings[setting];
  }

  setAmbienceVolume(volume) {
    return this.#setAudioCategoryVolume("ambience", volume);
  }

  setEffectsVolume(volume) {
    return this.#setAudioCategoryVolume("effects", volume);
  }

  setTreeTwoVisualizationMode(mode) {
    if (!TREE_TWO_VISUALIZATION_MODES.includes(mode)) {
      return this.state.settings.treeTwoVisualizationMode;
    }
    if (mode === this.state.settings.treeTwoVisualizationMode) return mode;
    const previousState = structuredClone(this.state);
    this.state.settings.treeTwoVisualizationMode = mode;
    this.#save(previousState);
    this.#emit("tree-two-visualization-mode-changed", { mode });
    return mode;
  }

  setPlayerPosition(x, y, { save = true } = {}) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const previousState = save ? structuredClone(this.state) : null;
    this.state.player = { x, y };
    if (save) this.#save(previousState);
  }

  teleportToArea(areaId) {
    const area = this.worldIndex.byId.get(areaId);
    if (!area) return null;
    const center = getAreaCenter(area, WORLD_CONFIG.hexSize);
    this.setPlayerPosition(center.x, center.y);
    this.#emit("player-teleported", { areaId, position: center });
    return center;
  }

  reset() {
    const previousState = structuredClone(this.state);
    this.state = createInitialState(this.profile, this.worldIndex, {
      courseId: this.courseId,
      courseRevision: this.courseRevision,
    });
    this.#save(previousState, { clearLegacyKeys: true });
    this.#emit("reset");
  }

  importState(candidate) {
    if (hasUnsupportedProgressSchema(candidate)) {
      throw new ProgressSchemaError(candidate.schemaVersion);
    }
    const candidateVersion = Number.isInteger(candidate?.schemaVersion)
      ? candidate.schemaVersion
      : 1;
    if (
      candidateVersion >= 4
      && (
        candidate?.courseId !== this.courseId
        || candidate?.courseRevision !== this.courseRevision
      )
    ) {
      throw new ProgressCompatibilityError(
        "El progreso importado pertenece a otro curso o a otra revisión de la edición activa.",
      );
    }
    if (candidateVersion < 4 && !this.acceptsUnversionedProgress) {
      throw new ProgressCompatibilityError(
        "La edición activa no admite importar progreso sin revisión de curso.",
      );
    }
    const previousState = structuredClone(this.state);
    this.state = this.#sanitizeState(candidate);
    this.#save(previousState);
    this.#emit("state-imported");
    return this.getSnapshot();
  }

  exportState() {
    return JSON.stringify(this.getSnapshot().state, null, 2);
  }

  getNextMission() {
    const orderedLearningLocations = this.locations.filter(
      (location) => location.grants?.concepts?.length > 0,
    );
    const available = orderedLearningLocations.find(
      (location) =>
        !this.isLocationCompleted(location.id) && this.isLocationAccessible(location.id),
    );
    if (available) return `Visita ${available.shortTitle}`;

    const pending = orderedLearningLocations.find(
      (location) => !this.isLocationCompleted(location.id),
    );
    if (pending) return `Desbloquea ${pending.shortTitle}`;

    if (!this.ownsReward(rewardKey("milestones", "lunar-link"))) {
      return "Completa el Relé Lunar";
    }
    return "Demostración completada";
  }

  getSnapshot() {
    const unlockedAreaIds = this.getUnlockedAreaIds();
    const visibleLocationIds = new Set(
      this.locations.filter((location) => this.isLocationVisible(location)).map((location) => location.id),
    );
    const accessibleLocationIds = this.#accessibleLocationIds(unlockedAreaIds);

    return {
      profile: this.profile,
      state: structuredClone(this.state),
      unlockedAreaIds,
      visibleLocationIds,
      accessibleLocationIds,
      completedLocationIds: new Set(this.state.completedLocations),
      concepts: new Set(this.state.concepts),
      rewards: new Set(this.state.rewards),
      activeTransport: this.getActiveTransport(),
      nextMission: this.getNextMission(),
    };
  }
}
