import assert from "node:assert/strict";
import test from "node:test";

import {
  ZONE_UNLOCK_AUDIO_KEY,
  locationCompletionCueOptions,
  playLocationCompletionCue,
} from "../src/ui/audio-policy.js";

test("una finalización que abre zona solicita solo el cue específico", () => {
  const calls = [];
  const audio = {
    playInteractionCue(options) {
      calls.push(options);
      return { ok: true };
    },
  };
  const result = { newlyUnlockedAreaIds: ["electrostatics", "magnetism"] };

  assert.deepEqual(locationCompletionCueOptions(result), {
    specificAssetKey: ZONE_UNLOCK_AUDIO_KEY,
  });
  playLocationCompletionCue(audio, result);
  assert.deepEqual(calls, [{ specificAssetKey: "zone_unlocked" }]);
});

test("una finalización sin zona nueva solicita el cue predeterminado sin superponer otro", () => {
  const calls = [];
  const audio = {
    playInteractionCue(options) {
      calls.push(options);
    },
  };

  playLocationCompletionCue(audio, { newlyUnlockedAreaIds: [] });
  assert.deepEqual(calls, [undefined]);
});
