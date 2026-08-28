import assert from "node:assert/strict";
import test from "node:test";

import {
  LOCATION_INTERACTION_AUDIO_KEY,
  openLocationWithInteractionCue,
} from "../src/game/game-app.js";

test("una interacción válida solicita el cue antes de abrir su señal visual", () => {
  const events = [];
  const location = { id: "base-camp" };
  const audio = {
    play(assetKey) {
      events.push(`audio:${assetKey}`);
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
  assert.deepEqual(events, ["audio:mission_start", "visual:base-camp"]);
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
