export const APP_CONFIG = Object.freeze({
  appName: "Atlas de Electromagnetismo Aplicado",
  version: "0.1.0",
  locale: "es-CL",
  storagePrefix: "aea-progress",
  progressSchemaVersion: 1,
  defaultProfile: "normal",
  debugProfile: "debug",
  baseMoveSpeed: 235,
  playerRadius: 14,
  cameraFollowRate: 7.5,
  minZoom: 0.58,
  maxZoom: 1.55,
  defaultZoom: 0.88,
  positionSaveIntervalMs: 900,
  interactionRadius: 72,
});

export const DEBUG_DEFAULTS = Object.freeze({
  enabled: false,
  noclip: false,
  showIds: true,
  showGraph: false,
  showCoords: true,
});
