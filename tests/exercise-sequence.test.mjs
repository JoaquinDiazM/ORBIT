import assert from "node:assert/strict";
import test from "node:test";

import {
  createExerciseSequenceState,
  isExerciseSequenceComplete,
  markExerciseSequenceItemPassed,
  normalizeExerciseSequenceState,
} from "../src/core/exercise-sequence.js";

const exercise = Object.freeze({
  type: "sequence",
  items: Object.freeze([
    Object.freeze({ id: "one" }),
    Object.freeze({ id: "two" }),
    Object.freeze({ id: "three" }),
  ]),
});

test("una secuencia comienza en la primera intervención y sin respuestas persistidas", () => {
  const state = createExerciseSequenceState(exercise);
  assert.equal(state.activeItemIndex, 0);
  assert.deepEqual([...state.completedItemIds], []);
  assert.equal(isExerciseSequenceComplete(exercise, state), false);
});

test("solo la intervención activa puede hacer avanzar la secuencia", () => {
  const initial = createExerciseSequenceState(exercise);
  const outOfOrder = markExerciseSequenceItemPassed(exercise, initial, "two");
  assert.equal(outOfOrder.activeItemIndex, 0);
  assert.deepEqual([...outOfOrder.completedItemIds], []);

  const first = markExerciseSequenceItemPassed(exercise, initial, "one");
  assert.equal(first.activeItemIndex, 1);
  assert.deepEqual([...first.completedItemIds], ["one"]);
});

test("normalizar descarta huecos y conserva únicamente el prefijo completado", () => {
  const state = normalizeExerciseSequenceState(exercise, {
    activeItemIndex: 2,
    completedItemIds: new Set(["one", "three", "unknown"]),
  });
  assert.equal(state.activeItemIndex, 1);
  assert.deepEqual([...state.completedItemIds], ["one"]);
});

test("la secuencia solo queda completa tras su última intervención", () => {
  let state = createExerciseSequenceState(exercise);
  state = markExerciseSequenceItemPassed(exercise, state, "one");
  state = markExerciseSequenceItemPassed(exercise, state, "two");
  assert.equal(isExerciseSequenceComplete(exercise, state), false);
  state = markExerciseSequenceItemPassed(exercise, state, "three");
  assert.equal(isExerciseSequenceComplete(exercise, state), true);
});

test("el modo de revisión deriva todas las intervenciones como completas", () => {
  const state = normalizeExerciseSequenceState(exercise, null, { completed: true });
  assert.deepEqual([...state.completedItemIds], ["one", "two", "three"]);
  assert.equal(isExerciseSequenceComplete(exercise, state), true);
});
