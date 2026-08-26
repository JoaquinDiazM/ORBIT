import { APP_CONFIG } from "./config.js";
import { AudioManager } from "./audio/audio-manager.js";
import { ProgressionModel } from "./core/progression.js";
import { sanitizeProfileName } from "./core/storage.js";
import { validateProjectData } from "./core/validator.js";
import { GameApp } from "./game/game-app.js";
import { UIController } from "./ui/ui-controller.js";

const url = new URL(window.location.href);
const debugInitiallyEnabled = ["1", "true", "yes"].includes(
  (url.searchParams.get("debug") ?? "").toLowerCase(),
);
const requestedProfile = url.searchParams.get("profile");
const profile = sanitizeProfileName(
  requestedProfile ?? (debugInitiallyEnabled ? APP_CONFIG.debugProfile : APP_CONFIG.defaultProfile),
  APP_CONFIG.defaultProfile,
);
const storageKey = `${APP_CONFIG.storagePrefix}:v${APP_CONFIG.progressSchemaVersion}:${profile}`;
const legacyStorageKeys = Array.from(
  { length: Math.max(0, APP_CONFIG.progressSchemaVersion - 1) },
  (_, index) => `${APP_CONFIG.storagePrefix}:v${index + 1}:${profile}`,
);

const validation = validateProjectData();
if (validation.errors.length > 0) {
  console.error("La definición del mundo contiene errores:", validation.errors);
  throw new Error("La cartografía no superó la validación. Revisa la consola.");
}
if (validation.warnings.length > 0) {
  console.warn("Advertencias de cartografía:", validation.warnings);
}

const canvas = document.querySelector("#world-canvas");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("No se encontró el canvas principal.");
}

const progression = ProgressionModel.create({ profile, storageKey, legacyStorageKeys });
const initialSettings = progression.getSnapshot().state.settings;
const audio = new AudioManager({
  muted: initialSettings.audioMuted,
  masterVolume: initialSettings.audioVolume,
}).start();
const ui = new UIController({ progression, audio });
const game = new GameApp({ canvas, progression, ui, audio, debugInitiallyEnabled });

progression.subscribe((event) => {
  if (["reset", "state-imported", "audio-muted-changed"].includes(event.type)) {
    void audio.setMuted(event.snapshot.state.settings.audioMuted);
  }
  if (["reset", "state-imported", "audio-volume-changed"].includes(event.type)) {
    audio.setMasterVolume(event.snapshot.state.settings.audioVolume);
  }
});

const gameApi = {
  getDebugState: () => game.getDebugState(),
  setDebugOption: (option, value) => game.setDebugOption(option, value),
  teleportToArea: (areaId) => game.teleportToArea(areaId),
  teleportToWorld: (x, y) => game.teleportToWorld(x, y),
  completeNearby: () => game.completeNearby(),
  syncPlayerFromProgress: () => game.syncPlayerFromProgress(),
  getDebugSnapshot: () => game.getDebugSnapshot(),
};
ui.bindGameApi(gameApi);

if (debugInitiallyEnabled) ui.openDebugPanel();
game.start();
requestAnimationFrame(() => {
  ui.hideLoadingScreen();
  window.AtlasStartup?.ready();
});

window.AtlasDebug = Object.freeze({
  help() {
    return {
      profile,
      methods: [
        "snapshot()",
        "grantConcept(id)",
        "grantNextConcept()",
        "unlockAllAreas()",
        "completeLocation(id)",
        "completeAll()",
        "teleportArea(id)",
        "teleport(x, y)",
        "setNoclip(boolean)",
        "toggleFieldLens()",
        "toggleAudio()",
        "reset()",
        "exportProgress()",
        "importProgress(object)",
      ],
    };
  },
  snapshot: () => game.getDebugSnapshot(),
  grantConcept: (id) => progression.grantConcept(id),
  grantNextConcept: () => progression.grantNextConcept(),
  unlockAllAreas: () => progression.unlockAllAreasForDebug(),
  completeLocation: (id) => progression.completeLocation(id, { force: true }),
  completeAll: () => progression.completeAllForDebug(),
  teleportArea: (id) => game.teleportToArea(id),
  teleport: (x, y) => game.teleportToWorld(Number(x), Number(y)),
  setNoclip: (enabled) => game.setDebugOption("noclip", Boolean(enabled)),
  toggleFieldLens: () => progression.toggleFieldLens(),
  toggleAudio: () => {
    const muted = progression.toggleAudioMuted();
    void audio.setMuted(muted);
    return { muted };
  },
  reset: () => {
    progression.reset();
    game.syncPlayerFromProgress();
  },
  exportProgress: () => progression.exportState(),
  importProgress: (candidate) => {
    const result = progression.importState(candidate);
    game.syncPlayerFromProgress();
    return result;
  },
});

console.info(
  `%c${APP_CONFIG.appName} ${APP_CONFIG.version}%c\nDebugger disponible en window.AtlasDebug. Ejecuta AtlasDebug.help().`,
  "color:#78e3ff;font-weight:700;font-size:14px",
  "color:#a9bfd0",
);
