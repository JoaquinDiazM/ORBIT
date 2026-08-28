import test from "node:test";
import assert from "node:assert/strict";
import {
  createLocationStepState,
  getLocationSteps,
  markLocationStepPassed,
  normalizeLocationStepState,
  selectLocationStep,
  unlockLocationStep,
} from "../src/core/location-steps.js";
import { validateProjectData } from "../src/core/validator.js";
import { LOCATIONS } from "../src/data/locations.js";

const stagedLocation = {
  id: "vector-workshop",
  steps: [
    { id: "observe", title: "Observar", sections: [] },
    { id: "operate", title: "Operadores", sections: [] },
    { id: "exit", title: "Salida", sections: [], exercise: { type: "choice" } },
  ],
};

test("el contenido antiguo se normaliza como una única etapa", () => {
  const location = {
    id: "legacy-location",
    sections: [{ title: "Modelo" }],
    exercise: { type: "numeric" },
  };
  const [step] = getLocationSteps(location);
  assert.equal(step.id, "legacy-location-content");
  assert.equal(step.sections, location.sections);
  assert.equal(step.exercise, location.exercise);
});

test("una ubicación por etapas solo abre la primera al comenzar", () => {
  const state = createLocationStepState(stagedLocation);
  assert.equal(state.activeIndex, 0);
  assert.equal(state.maxUnlockedIndex, 0);

  const unchanged = selectLocationStep(state, 2);
  assert.equal(unchanged.activeIndex, 0);
});

test("aprobar y continuar abre exactamente la etapa siguiente", () => {
  let state = createLocationStepState(stagedLocation);
  state = markLocationStepPassed(state, "observe");
  state = unlockLocationStep(state, 0, stagedLocation.steps.length);
  state = selectLocationStep(state, 1);

  assert.equal(state.activeIndex, 1);
  assert.equal(state.maxUnlockedIndex, 1);
  assert.equal(state.passedStepIds.has("observe"), true);
});

test("un lugar completado permite revisar todas sus etapas", () => {
  const state = normalizeLocationStepState(stagedLocation, null, { completed: true });
  assert.equal(state.maxUnlockedIndex, 2);
  assert.equal(selectLocationStep(state, 2).activeIndex, 2);
});

test("el validador rechaza etapas finales incompletables y acciones internas", () => {
  const invalidLocations = LOCATIONS.map((location) => {
    if (location.id !== "vector-workshop") return location;
    return {
      ...location,
      steps: location.steps.map((step, index) =>
        index === 0
          ? { ...step, exercise: { type: "choice", choices: [], answerIndex: 3 } }
          : index === 1
          ? { ...step, exercise: { type: "action", action: "open-debug" } }
          : index === 2
            ? { ...step, exercise: { type: "numeric", expected: Number.NaN, unit: "" } }
          : index === location.steps.length - 1
            ? { ...step, exercise: { type: "none" } }
            : step,
      ),
    };
  });
  const result = validateProjectData({ locations: invalidLocations });

  assert.ok(result.errors.some((error) => error.includes("no compatible: action")));
  assert.ok(result.errors.some((error) => error.includes("debe cerrar con")));
  assert.ok(result.errors.some((error) => error.includes("dos alternativas")));
  assert.ok(result.errors.some((error) => error.includes("answerIndex")));
  assert.ok(result.errors.some((error) => error.includes("expected")));
  assert.ok(result.errors.some((error) => error.includes("tolerancia")));
  assert.ok(result.errors.some((error) => error.includes("unidad")));
});
