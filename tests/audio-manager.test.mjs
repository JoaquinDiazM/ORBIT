import assert from "node:assert/strict";
import test from "node:test";

import { AudioManager } from "../src/audio/audio-manager.js";

const MANIFEST_URL = "https://example.test/ATLAS/public/assets/audio/audio-manifest.json";
const MANIFEST = Object.freeze({
  schema_version: 1,
  base_path: ".",
  assets: {
    mission_start: {
      id: "mission_start_roger_beep_01",
      src: "interactions/mission_start_roger_beep_01.ogg",
      metadata: "interactions/mission_start_roger_beep_01.json",
      loop: false,
      volume: 0.75,
    },
    hexagon_transition: {
      id: "hexagon_transition_scifi_inspect_01",
      src: "transitions/hexagon_transition_scifi_inspect_01.ogg",
      metadata: "transitions/hexagon_transition_scifi_inspect_01.json",
      loop: false,
      volume: 0.65,
    },
    global_ambience: {
      id: "global_space_ambient_loop_01",
      src: "ambience/global_space_ambient_loop_01.ogg",
      metadata: "ambience/global_space_ambient_loop_01.json",
      loop: true,
      volume: 0.28,
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
    this.muted = false;
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

function createHarness({ muted = false, rejectPlay = false, fetchError = null } = {}) {
  const gestureTarget = new FakeEventTarget();
  const visibilityTarget = new FakeEventTarget();
  const audioElements = [];
  const warnings = [];
  let fetchCalls = 0;

  const manager = new AudioManager({
    manifestUrl: MANIFEST_URL,
    gestureTarget,
    visibilityTarget,
    muted,
    fetchImpl: async () => {
      fetchCalls += 1;
      if (fetchError) throw fetchError;
      return { ok: true, json: async () => structuredClone(MANIFEST) };
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

test("difiere manifiesto, elementos y ambiente hasta el primer gesto", async () => {
  const harness = createHarness();
  harness.manager.start();

  assert.equal(harness.fetchCalls, 0);
  assert.equal(harness.audioElements.length, 0);

  harness.gestureTarget.dispatch("pointerdown");
  assert.equal(await harness.manager.whenReady(), true);

  assert.equal(harness.fetchCalls, 1);
  assert.equal(harness.audioElements.length, 3);
  assert.deepEqual([...harness.manager.getState().assetKeys].sort(), [
    "global_ambience",
    "hexagon_transition",
    "mission_start",
  ]);

  const ambience = harness.audioElements.find((audio) => audio.src.includes("/ambience/"));
  assert.equal(
    ambience.src,
    "https://example.test/ATLAS/public/assets/audio/ambience/global_space_ambient_loop_01.ogg",
  );
  assert.equal(ambience.loop, true);
  assert.equal(ambience.volume, 0.28);
  assert.equal(ambience.playCalls, 1);
  assert.equal(harness.manager.getState().ambiencePlaying, true);
});

test("mute, volumen y visibilidad controlan la reproducción sin persistencia propia", async () => {
  const harness = createHarness();
  harness.manager.start();
  await harness.manager.activateFromGesture();

  const ambience = harness.audioElements.find((audio) => audio.src.includes("/ambience/"));
  const transition = harness.audioElements.find((audio) => audio.src.includes("/transitions/"));

  await harness.manager.setMuted(true);
  assert.equal(ambience.paused, true);
  assert.equal((await harness.manager.play("hexagon_transition")).reason, "muted");

  harness.manager.setMasterVolume(0.5);
  assert.equal(transition.volume, 0.325);
  await harness.manager.setMuted(false);
  assert.equal(ambience.paused, false);

  harness.visibilityTarget.hidden = true;
  harness.visibilityTarget.visibilityState = "hidden";
  harness.visibilityTarget.dispatch("visibilitychange");
  assert.equal(ambience.paused, true);
  assert.equal((await harness.manager.play("hexagon_transition")).reason, "document-hidden");

  harness.visibilityTarget.hidden = false;
  harness.visibilityTarget.visibilityState = "visible";
  harness.visibilityTarget.dispatch("visibilitychange");
  await new Promise((resolvePromise) => setImmediate(resolvePromise));
  assert.equal(ambience.paused, false);
});

test("las vistas previas usan un elemento aislado y se pueden detener", async () => {
  const harness = createHarness();
  await harness.manager.activateFromGesture();

  const result = await harness.manager.preview("mission_start");
  assert.equal(result.ok, true);
  assert.equal(harness.audioElements.length, 4);

  const preview = harness.audioElements.at(-1);
  assert.match(preview.src, /interactions\/mission_start_roger_beep_01\.ogg$/);
  assert.equal(preview.loop, false);
  assert.equal(preview.volume, 0.75);
  assert.equal(preview.playCalls, 1);
  assert.equal(harness.manager.getState().activePreviews, 1);

  harness.manager.stopPreviews();
  assert.equal(preview.paused, true);
  assert.equal(harness.manager.getState().activePreviews, 0);
});

test("fallos de carga o reproducción degradan a silencio sin lanzar", async () => {
  const loadFailure = createHarness({ fetchError: new Error("sin manifiesto") });
  const activation = await loadFailure.manager.activateFromGesture();
  assert.deepEqual(activation, { ok: false, reason: "audio-unavailable" });
  assert.equal(loadFailure.manager.getState().loadState, "failed");
  assert.equal(loadFailure.warnings.length, 1);

  const playFailure = createHarness({ rejectPlay: true });
  const safeActivation = await playFailure.manager.activateFromGesture();
  assert.equal(safeActivation.ok, true);
  const playback = await playFailure.manager.play("mission_start");
  assert.equal(playback.ok, false);
  assert.equal(playback.reason, "playback-rejected");
  assert.ok(playFailure.warnings.length >= 2);
});
