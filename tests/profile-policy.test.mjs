import assert from "node:assert/strict";
import test from "node:test";

import {
  ORBIT_PROFILE_IDS,
  getProfileCapabilities,
  getProfileLabel,
  isLocationAllowedForProfile,
  resolveEditorProfile,
  resolveOrbitProfile,
  shouldAutoCompleteLocationOnInteraction,
} from "../src/core/profile-policy.js";

test("ORBIT expone exactamente los perfiles locales estudiante, docente y debug", () => {
  assert.deepEqual(ORBIT_PROFILE_IDS, ["student", "teacher", "debug"]);
  assert.equal(resolveOrbitProfile(), "student");
  assert.equal(resolveOrbitProfile({ requestedProfile: "normal" }), "student");
  assert.equal(resolveOrbitProfile({ requestedProfile: "teacher" }), "teacher");
  assert.equal(resolveOrbitProfile({ requestedProfile: "debug" }), "debug");
  assert.equal(resolveOrbitProfile({ requestedProfile: "debug-demo" }), "student");
  assert.equal(resolveOrbitProfile({ debugRequested: true }), "debug");
  assert.equal(resolveOrbitProfile({ requestedProfile: "teacher", debugRequested: true }), "teacher");
  assert.equal(resolveEditorProfile(), "teacher");
  assert.equal(resolveEditorProfile({ requestedProfile: "student" }), "student");
  assert.deepEqual(
    ORBIT_PROFILE_IDS.map((profile) => getProfileLabel(profile)),
    ["estudiante", "docente", "debug"],
  );
});

test("la matriz de capacidades mantiene separados debugger y Editor", () => {
  assert.deepEqual(getProfileCapabilities("student"), {
    canUseDebugger: false,
    autoCompletesEvaluatedLocations: false,
    editorAccess: "read-only",
  });
  assert.deepEqual(getProfileCapabilities("teacher"), {
    canUseDebugger: false,
    autoCompletesEvaluatedLocations: true,
    editorAccess: "full",
  });
  assert.deepEqual(getProfileCapabilities("debug"), {
    canUseDebugger: true,
    autoCompletesEvaluatedLocations: false,
    editorAccess: "blocked",
  });

  const debugLocation = { kind: "debug" };
  assert.equal(isLocationAllowedForProfile("student", debugLocation), false);
  assert.equal(isLocationAllowedForProfile("teacher", debugLocation), false);
  assert.equal(isLocationAllowedForProfile("debug", debugLocation), true);
});

test("docente solo autocompleta lugares evaluados de aprendizaje", () => {
  const evaluatedLesson = { kind: "lesson", exercise: { type: "numeric" } };
  const stagedMission = {
    kind: "mission",
    steps: [
      { exercise: { type: "acknowledge" } },
      { exercise: { type: "choice" } },
    ],
  };

  assert.equal(shouldAutoCompleteLocationOnInteraction("teacher", evaluatedLesson), true);
  assert.equal(shouldAutoCompleteLocationOnInteraction("teacher", stagedMission), true);
  assert.equal(shouldAutoCompleteLocationOnInteraction("student", evaluatedLesson), false);
  assert.equal(
    shouldAutoCompleteLocationOnInteraction("teacher", {
      kind: "lesson",
      exercise: { type: "acknowledge" },
    }),
    false,
  );
  assert.equal(
    shouldAutoCompleteLocationOnInteraction("teacher", {
      kind: "npc",
      exercise: { type: "choice" },
    }),
    false,
  );
});
