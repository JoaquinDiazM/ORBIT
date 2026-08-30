import assert from "node:assert/strict";
import test from "node:test";

import {
  LOCATION_INTERACTION_AUDIO_KEY,
  openLocationWithInteractionCue,
  reduceLatestTreeTwoUnlock,
} from "../src/game/game-app.js";

test("una interacción válida solicita solo el cue específico antes de abrir su señal visual", () => {
  const events = [];
  const location = { id: "base-camp" };
  const audio = {
    playInteractionCue({ specificAssetKey } = {}) {
      events.push(`cue:${specificAssetKey ?? "default"}`);
      return Promise.resolve({ ok: true, assetKey: specificAssetKey ?? "ui_select" });
    },
    play(assetKey) {
      events.push(`fallback:${assetKey}`);
      return Promise.resolve({ ok: true, assetKey });
    },
  };
  const ui = {
    openLocation(candidate) {
      events.push(`visual:${candidate.id}`);
    },
  };

  openLocationWithInteractionCue(location, audio, ui);

  assert.equal(LOCATION_INTERACTION_AUDIO_KEY, "mission_start");
  assert.deepEqual(events, ["cue:mission_start", "visual:base-camp"]);
  assert.equal(events.includes("cue:default"), false);
  assert.equal(events.some((entry) => entry.startsWith("fallback:")), false);
});

test("la señal visual sigue abriéndose si el servicio de audio no existe", () => {
  const openedLocations = [];
  const location = { id: "base-camp" };
  const ui = {
    openLocation(candidate) {
      openedLocations.push(candidate.id);
    },
  };

  openLocationWithInteractionCue(location, null, ui);

  assert.deepEqual(openedLocations, ["base-camp"]);
});

test("el autocompletado docente emite finalización sin duplicar mission_start", () => {
  const events = [];
  const location = { id: "evaluated-mission" };
  const audio = {
    playInteractionCue({ specificAssetKey } = {}) {
      events.push(`cue:${specificAssetKey}`);
    },
  };
  const ui = {
    willAutoCompleteLocation(candidate) {
      return candidate.id === location.id;
    },
    openLocation(candidate) {
      events.push(`completion:${candidate.id}`);
      return { completionCueHandled: true };
    },
  };

  const result = openLocationWithInteractionCue(location, audio, ui);

  assert.deepEqual(events, ["completion:evaluated-mission"]);
  assert.equal(result.completionCueHandled, true);
});

test("si el autocompletado docente falla se conserva una señal de interacción", () => {
  const events = [];
  const location = { id: "stale-mission" };
  const audio = {
    playInteractionCue({ specificAssetKey } = {}) {
      events.push(`cue:${specificAssetKey}`);
    },
  };
  const ui = {
    willAutoCompleteLocation() {
      return true;
    },
    openLocation(candidate) {
      events.push(`visual:${candidate.id}`);
      return { completionCueHandled: false };
    },
  };

  openLocationWithInteractionCue(location, audio, ui);

  assert.deepEqual(events, ["visual:stale-mission", "cue:mission_start"]);
});

test("el último desbloqueo visual sobrevive completaciones que no abren nodos", () => {
  const empty = {
    newlyAccessibleLocationIds: new Set(),
    unlockSourceLocationId: null,
  };
  const first = reduceLatestTreeTwoUnlock(empty, {
    type: "location-completed",
    detail: {
      locationId: "source",
      newlyAccessibleLocationIds: ["target-a", "target-b"],
    },
  });
  const unchanged = reduceLatestTreeTwoUnlock(first, {
    type: "location-completed",
    detail: {
      locationId: "unrelated",
      newlyAccessibleLocationIds: [],
    },
  });

  assert.equal(unchanged, first);
  assert.deepEqual(
    [...unchanged.newlyAccessibleLocationIds],
    ["target-a", "target-b"],
  );
  assert.equal(unchanged.unlockSourceLocationId, "source");
});

test("reinicio e importación limpian el desbloqueo visual efímero", () => {
  const current = {
    newlyAccessibleLocationIds: new Set(["target"]),
    unlockSourceLocationId: "source",
  };

  for (const type of ["reset", "state-imported"]) {
    const cleared = reduceLatestTreeTwoUnlock(current, { type, detail: {} });
    assert.deepEqual([...cleared.newlyAccessibleLocationIds], []);
    assert.equal(cleared.unlockSourceLocationId, null);
  }
});
