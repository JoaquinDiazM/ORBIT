import assert from "node:assert/strict";
import test from "node:test";

import { AudioManager } from "../src/audio/audio-manager.js";

const MANIFEST_URL = "https://example.test/ORBIT/public/assets/audio/audio-manifest.json";
const MANIFEST = Object.freeze({
  schema_version: 2,
  base_path: ".",
  assets: {
    mission_start: {
      id: "mission_start_roger_beep_01",
      src: "interactions/mission_start_roger_beep_01.ogg",
      metadata: "interactions/mission_start_roger_beep_01.json",
      category: "effects",
      loop: false,
      volume: 0.75,
    },
    hexagon_transition: {
      id: "hexagon_transition_scifi_inspect_01",
      src: "transitions/hexagon_transition_scifi_inspect_01.ogg",
      metadata: "transitions/hexagon_transition_scifi_inspect_01.json",
      category: "effects",
      loop: false,
      volume: 0.65,
    },
    global_ambience: {
      id: "global_space_ambient_loop_01",
      src: "ambience/global_space_ambient_loop_01.ogg",
      metadata: "ambience/global_space_ambient_loop_01.json",
      category: "ambience",
      loop: true,
      volume: 0.28,
    },
    ui_select: {
      id: "ui_select_default_01",
      src: "interactions/ui_select_default_01.ogg",
      metadata: "interactions/ui_select_default_01.json",
      category: "effects",
      loop: false,
      volume: 0.55,
    },
    zone_unlocked: {
      id: "zone_unlocked_airlock_01",
      src: "transitions/zone_unlocked_airlock_01.ogg",
      metadata: "transitions/zone_unlocked_airlock_01.json",
      category: "effects",
      loop: false,
      volume: 0.65,
    },
  },
});

class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
    this.visibilityState = "visible";
    this.hidden = false;
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type) {
    for (const listener of this.listeners.get(type) ?? []) listener({ type, target: this });
  }
}

class FakeAudio {
  constructor(source, { rejectPlay = false } = {}) {
    this.src = source;
    this.rejectPlay = rejectPlay;
    this.loop = false;
    this.volume = 1;
    this.paused = true;
    this.currentTime = 0;
    this.preload = "none";
    this.playsInline = false;
    this.loadCalls = 0;
    this.playCalls = 0;
    this.pauseCalls = 0;
    this.listeners = new Map();
  }

  load() {
    this.loadCalls += 1;
  }

  async play() {
    this.playCalls += 1;
    if (this.rejectPlay) throw new Error("play bloqueado");
    this.paused = false;
  }

  pause() {
    this.pauseCalls += 1;
    this.paused = true;
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  dispatch(type) {
    for (const listener of this.listeners.get(type) ?? []) listener({ type, target: this });
  }
}

function createHarness({
  ambienceVolume = 1,
  effectsVolume = 1,
  rejectPlay = false,
  fetchError = null,
  manifest = MANIFEST,
} = {}) {
  const gestureTarget = new FakeEventTarget();
  const visibilityTarget = new FakeEventTarget();
  const audioElements = [];
  const warnings = [];
  let fetchCalls = 0;

  const manager = new AudioManager({
    manifestUrl: MANIFEST_URL,
    gestureTarget,
    visibilityTarget,
    ambienceVolume,
    effectsVolume,
    fetchImpl: async () => {
      fetchCalls += 1;
      if (fetchError) throw fetchError;
      return { ok: true, json: async () => structuredClone(manifest) };
    },
    audioFactory: (source) => {
      const audio = new FakeAudio(source, { rejectPlay });
      audioElements.push(audio);
      return audio;
    },
    logger: { warn: (...arguments_) => warnings.push(arguments_) },
    setTimeoutImpl: null,
    clearTimeoutImpl: null,
  });

  return {
    manager,
    gestureTarget,
    visibilityTarget,
    audioElements,
    warnings,
    get fetchCalls() {
      return fetchCalls;
    },
  };
}

function findAudio(harness, fragment) {
  return harness.audioElements.find((audio) => audio.src.includes(fragment));
}

test("difiere manifiesto, elementos y ambiente hasta el primer gesto", async () => {
  const harness = createHarness();
  harness.manager.start();

  assert.equal(harness.fetchCalls, 0);
  assert.equal(harness.audioElements.length, 0);

  harness.gestureTarget.dispatch("pointerdown");
  assert.equal(await harness.manager.whenReady(), true);

  assert.equal(harness.fetchCalls, 1);
  assert.equal(harness.audioElements.length, 5);
  assert.deepEqual([...harness.manager.getState().assetKeys].sort(), [
    "global_ambience",
    "hexagon_transition",
    "mission_start",
    "ui_select",
    "zone_unlocked",
  ]);

  const ambience = findAudio(harness, "/ambience/");
  assert.equal(
    ambience.src,
    "https://example.test/ORBIT/public/assets/audio/ambience/global_space_ambient_loop_01.ogg",
  );
  assert.equal(ambience.loop, true);
  assert.equal(ambience.volume, 0.28);
  assert.equal(ambience.playCalls, 1);
  assert.equal(harness.manager.getState().ambiencePlaying, true);
});

test("las categorías aplican base por volumen y cero pausa solo la categoría elegida", async () => {
  const harness = createHarness({ ambienceVolume: 0.5, effectsVolume: 0.25 });
  await harness.manager.activateFromGesture();

  const ambience = findAudio(harness, "/ambience/");
  const transition = findAudio(harness, "/transitions/hexagon_transition");
  assert.equal(ambience.volume, 0.14);
  assert.equal(transition.volume, 0.1625);

  assert.equal((await harness.manager.play("hexagon_transition")).ok, true);
  harness.manager.setAmbienceVolume(0);
  assert.equal(ambience.paused, true);
  assert.equal(transition.paused, false);
  assert.equal((await harness.manager.play("hexagon_transition")).ok, true);

  harness.manager.setEffectsVolume(0);
  assert.equal(transition.paused, true);
  assert.deepEqual(await harness.manager.play("hexagon_transition"), {
    ok: false,
    reason: "category-silent",
    category: "effects",
  });
  assert.equal(ambience.paused, true);

  harness.manager.setAmbienceVolume(0.4);
  await new Promise((resolvePromise) => setImmediate(resolvePromise));
  assert.equal(ambience.paused, false);
  assert.ok(Math.abs(ambience.volume - 0.112) < 1e-12);
  assert.deepEqual(harness.manager.getState().categoryVolumes, {
    ambience: 0.4,
    effects: 0,
  });
  assert.equal(harness.manager.setCategoryVolume("unknown", 0.5), null);
});

test("la visibilidad suspende todo y al volver reanuda únicamente el ambiente", async () => {
  const harness = createHarness();
  harness.manager.start();
  await harness.manager.activateFromGesture();
  const ambience = findAudio(harness, "/ambience/");
  const transition = findAudio(harness, "/transitions/hexagon_transition");
  await harness.manager.play("hexagon_transition");

  harness.visibilityTarget.hidden = true;
  harness.visibilityTarget.visibilityState = "hidden";
  harness.visibilityTarget.dispatch("visibilitychange");
  assert.equal(ambience.paused, true);
  assert.equal(transition.paused, true);
  assert.equal((await harness.manager.play("hexagon_transition")).reason, "document-hidden");

  harness.visibilityTarget.hidden = false;
  harness.visibilityTarget.visibilityState = "visible";
  harness.visibilityTarget.dispatch("visibilitychange");
  await new Promise((resolvePromise) => setImmediate(resolvePromise));
  assert.equal(ambience.paused, false);
  assert.equal(transition.paused, true);
});

test("las vistas previas respetan la categoría y usan un elemento aislado", async () => {
  const harness = createHarness({ ambienceVolume: 0, effectsVolume: 0 });
  await harness.manager.activateFromGesture();

  assert.deepEqual(await harness.manager.preview("mission_start"), {
    ok: false,
    reason: "category-silent",
    category: "effects",
  });
  assert.equal(harness.audioElements.length, 5);

  harness.manager.setEffectsVolume(0.5);
  const result = await harness.manager.preview("mission_start");
  assert.equal(result.ok, true);
  assert.equal(harness.audioElements.length, 6);
  const preview = harness.audioElements.at(-1);
  assert.equal(preview.loop, false);
  assert.equal(preview.volume, 0.375);
  assert.equal(harness.manager.getState().activePreviews, 1);

  assert.equal((await harness.manager.preview("global_ambience")).reason, "category-silent");
  harness.manager.stopPreviews();
  assert.equal(preview.paused, true);
  assert.equal(harness.manager.getState().activePreviews, 0);
});

test("el cue de interacción elige exactamente el predeterminado o el específico", async () => {
  const harness = createHarness();
  await harness.manager.activateFromGesture();
  const uiSelect = findAudio(harness, "/interactions/ui_select");
  const zoneUnlocked = findAudio(harness, "/transitions/zone_unlocked");

  assert.equal((await harness.manager.playInteractionCue()).assetKey, "ui_select");
  assert.equal(uiSelect.playCalls, 1);
  assert.equal(zoneUnlocked.playCalls, 0);

  assert.equal(
    (
      await harness.manager.playInteractionCue({
        specificAssetKey: "zone_unlocked",
      })
    ).assetKey,
    "zone_unlocked",
  );
  assert.equal(uiSelect.playCalls, 1);
  assert.equal(zoneUnlocked.playCalls, 1);

  assert.equal(
    (
      await harness.manager.playInteractionCue({
        specificAssetKey: "missing-specific",
      })
    ).reason,
    "unknown-asset",
  );
  assert.equal(uiSelect.playCalls, 1, "Un cue específico inválido no debe caer al predeterminado.");
});

test("fallos de esquema, carga o reproducción degradan a silencio sin lanzar", async () => {
  const invalidManifest = structuredClone(MANIFEST);
  invalidManifest.assets.mission_start.category = "unknown";
  const invalidCategory = createHarness({ manifest: invalidManifest });
  assert.equal((await invalidCategory.manager.activateFromGesture()).ok, false);
  assert.equal(invalidCategory.manager.getState().loadState, "failed");

  const loadFailure = createHarness({ fetchError: new Error("sin manifiesto") });
  const activation = await loadFailure.manager.activateFromGesture();
  assert.deepEqual(activation, { ok: false, reason: "audio-unavailable" });
  assert.equal(loadFailure.manager.getState().loadState, "failed");
  assert.equal(loadFailure.warnings.length, 1);

  const playFailure = createHarness({ rejectPlay: true });
  const safeActivation = await playFailure.manager.activateFromGesture();
  assert.equal(safeActivation.ok, true);
  const playback = await playFailure.manager.playInteractionCue();
  assert.equal(playback.ok, false);
  assert.equal(playback.reason, "playback-rejected");
  assert.ok(playFailure.warnings.length >= 2);
});
