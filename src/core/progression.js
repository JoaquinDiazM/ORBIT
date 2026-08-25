import { APP_CONFIG } from "../config.js";
import { CONCEPTS, REWARDS, getReward, parseRewardKey, rewardKey } from "../data/knowledge.js";
import { LOCATIONS } from "../data/locations.js";
import { AREAS, WORLD_CONFIG } from "../data/world.js";
import { meetsRequirements } from "./requirements.js";
import { ProgressStorage } from "./storage.js";
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

function createInitialState(profile, worldIndex) {
  const spawnArea = worldIndex.byId.get(WORLD_CONFIG.spawnAreaId);
  const center = getAreaCenter(spawnArea, WORLD_CONFIG.hexSize);
  const initialTransport = REWARDS.transports.find((transport) => transport.initial)?.id ?? "walk";

  return {
    schemaVersion: APP_CONFIG.progressSchemaVersion,
    profile,
    completedLocations: [],
    concepts: [],
    rewards: [rewardKey("transports", initialTransport)],
    debugUnlockedAreas: [],
    activeTransport: initialTransport,
    settings: {
      fieldLensEnabled: false,
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

export class ProgressionModel {
  constructor({ profile, storage }) {
    this.profile = profile;
    this.areas = AREAS;
    this.locations = LOCATIONS;
    this.concepts = CONCEPTS;
    this.rewards = REWARDS;
    this.worldIndex = createWorldIndex(this.areas);
    this.storage = storage;
    this.listeners = new Set();
    this.state = this.#sanitizeState(this.storage.load());
    this.#save();
  }

  static create({ profile, storageKey }) {
    return new ProgressionModel({
      profile,
      storage: new ProgressStorage(storageKey),
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
    const initial = createInitialState(this.profile, this.worldIndex);
    if (!candidate || typeof candidate !== "object") return initial;

    const knownConcepts = new Set(this.concepts.map((concept) => concept.id));
    const knownLocations = new Set(this.locations.map((location) => location.id));
    const knownAreas = new Set(this.areas.map((area) => area.id));
    const knownRewards = allKnownRewardKeys();

    const state = {
      ...initial,
      ...candidate,
      schemaVersion: APP_CONFIG.progressSchemaVersion,
      profile: this.profile,
      completedLocations: uniqueKnown(candidate.completedLocations, knownLocations),
      concepts: uniqueKnown(candidate.concepts, knownConcepts),
      rewards: uniqueKnown(candidate.rewards, knownRewards),
      debugUnlockedAreas: uniqueKnown(candidate.debugUnlockedAreas, knownAreas),
      settings: {
        ...initial.settings,
        ...(candidate.settings && typeof candidate.settings === "object"
          ? candidate.settings
          : {}),
      },
      player: {
        x: Number.isFinite(candidate.player?.x) ? candidate.player.x : initial.player.x,
        y: Number.isFinite(candidate.player?.y) ? candidate.player.y : initial.player.y,
      },
      updatedAt: new Date().toISOString(),
    };

    const initialTransportKey = rewardKey("transports", "walk");
    if (!state.rewards.includes(initialTransportKey)) state.rewards.push(initialTransportKey);

    const ownedTransportIds = this.#ownedTransportIdsFromRewards(state.rewards);
    if (!ownedTransportIds.includes(state.activeTransport)) state.activeTransport = "walk";

    return state;
  }

  #save() {
    this.state.updatedAt = new Date().toISOString();
    this.storage.save(this.state);
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
      return { ok: true, repeated: true, newlyGranted: [] };
    }

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

    this.#save();
    this.#emit("location-completed", { locationId, newlyGranted, wasCompleted });
    return { ok: true, wasCompleted, newlyGranted };
  }

  grantConcept(conceptId) {
    if (!this.concepts.some((concept) => concept.id === conceptId)) return false;
    if (this.state.concepts.includes(conceptId)) return false;
    this.state.concepts.push(conceptId);
    this.#save();
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
    this.state.debugUnlockedAreas = this.areas.map((area) => area.id);
    this.#save();
    this.#emit("debug-areas-unlocked");
  }

  completeAllForDebug() {
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
    this.#save();
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
    this.state.activeTransport = next.id;
    this.#save();
    this.#emit("transport-changed", { transportId: next.id });
    return next;
  }

  ownsReward(key) {
    return this.state.rewards.includes(key);
  }

  toggleFieldLens() {
    if (!this.ownsReward(rewardKey("gadgets", "field-lens"))) {
      return { ok: false, enabled: false };
    }
    this.state.settings.fieldLensEnabled = !this.state.settings.fieldLensEnabled;
    this.#save();
    this.#emit("field-lens-toggled", { enabled: this.state.settings.fieldLensEnabled });
    return { ok: true, enabled: this.state.settings.fieldLensEnabled };
  }

  setPlayerPosition(x, y, { save = true } = {}) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    this.state.player = { x, y };
    if (save) this.#save();
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
    this.storage.clear();
    this.state = createInitialState(this.profile, this.worldIndex);
    this.#save();
    this.#emit("reset");
  }

  importState(candidate) {
    this.state = this.#sanitizeState(candidate);
    this.#save();
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
    const accessibleLocationIds = new Set(
      this.locations
        .filter((location) => this.isLocationAccessible(location))
        .map((location) => location.id),
    );

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
