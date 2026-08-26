import { APP_CONFIG } from "../config.js";
import { WORLD_CONFIG } from "../data/world.js";
import { axialToPixel, pointInHex } from "./hex.js";

const V1_AREAS = Object.freeze({
  induction: Object.freeze({ q: -1, r: 1 }),
  applications: Object.freeze({ q: 1, r: -1 }),
});

const V2_AREA_TARGETS = Object.freeze({
  induction: Object.freeze({ q: -1, r: 0 }),
  applications: Object.freeze({ q: 0, r: -2 }),
});

function translatePlayerBetweenAreas(player, source, target) {
  if (!Number.isFinite(player?.x) || !Number.isFinite(player?.y)) return player;
  const sourceCenter = axialToPixel(source.q, source.r, WORLD_CONFIG.hexSize);
  if (!pointInHex(player.x, player.y, sourceCenter.x, sourceCenter.y, WORLD_CONFIG.hexSize)) {
    return player;
  }
  const targetCenter = axialToPixel(target.q, target.r, WORLD_CONFIG.hexSize);
  return {
    x: player.x + targetCenter.x - sourceCenter.x,
    y: player.y + targetCenter.y - sourceCenter.y,
  };
}

export function migrateProgressState(candidate) {
  if (!candidate || typeof candidate !== "object") return candidate;

  let state = structuredClone(candidate);
  let version = Number.isInteger(state.schemaVersion) ? state.schemaVersion : 1;

  if (version < 2) {
    const debugUnlockedAreas = Array.isArray(state.debugUnlockedAreas)
      ? state.debugUnlockedAreas.map((areaId) => (areaId === "induction" ? "maxwell" : areaId))
      : [];

    let player = state.player;
    player = translatePlayerBetweenAreas(
      player,
      V1_AREAS.induction,
      V2_AREA_TARGETS.induction,
    );
    if (player === state.player) {
      player = translatePlayerBetweenAreas(
        player,
        V1_AREAS.applications,
        V2_AREA_TARGETS.applications,
      );
    }

    state = {
      ...state,
      schemaVersion: 2,
      debugUnlockedAreas: [...new Set(debugUnlockedAreas)],
      settings: {
        ...(state.settings && typeof state.settings === "object" ? state.settings : {}),
        audioMuted: Boolean(state.settings?.audioMuted),
        audioVolume: Number.isFinite(state.settings?.audioVolume)
          ? state.settings.audioVolume
          : 1,
      },
      player,
    };
    version = 2;
  }

  if (version !== APP_CONFIG.progressSchemaVersion) {
    return { ...state, schemaVersion: APP_CONFIG.progressSchemaVersion };
  }
  return state;
}
