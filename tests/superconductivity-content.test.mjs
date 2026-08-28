import assert from "node:assert/strict";
import test from "node:test";

import { CONCEPTS } from "../src/data/knowledge.js";
import { LOCATIONS } from "../src/data/locations.js";
import { FORMULAS } from "../src/data/reference/formulas.js";
import { AREAS } from "../src/data/world.js";
import { meetsRequirements } from "../src/core/requirements.js";

const LEGACY_AREA_AND_CONCEPT_ID = "electromagnetic-compatibility";
const LEGACY_LOCATION_ID = "shielding-chamber";
const LEARNING_LOCATION_ID = "superconductivity-transition-lab";
const NOBEL_ONNES_URL = "https://www.nobelprize.org/prizes/physics/1913/onnes/facts/";

test("Superconductividad conserva los IDs, requisitos y orden publicados", () => {
  const area = AREAS.find((entry) => entry.id === LEGACY_AREA_AND_CONCEPT_ID);
  const concept = CONCEPTS.find((entry) => entry.id === LEGACY_AREA_AND_CONCEPT_ID);

  assert.ok(area);
  assert.equal(area.title, "Estación de Superconductividad");
  assert.equal(area.shortTitle, "Superconductividad");
  assert.deepEqual(area.requirements, {
    concepts: ["maxwell-synthesis", "circuit-analysis"],
  });
  assert.equal(area.order, 13);
  assert.deepEqual({ q: area.q, r: area.r, tier: area.tier }, { q: -2, r: 0, tier: 2 });

  assert.ok(concept);
  assert.equal(concept.title, "Introducción a la superconductividad");
  assert.equal(concept.shortTitle, "Superconductividad");
  assert.equal(concept.order, 15);
});

test("la zona separa el encuentro histórico de Onnes y el punto de aprendizaje", () => {
  const locations = LOCATIONS.filter(
    (entry) => entry.areaId === LEGACY_AREA_AND_CONCEPT_ID,
  );
  assert.equal(locations.length, 2);

  const onnes = locations.find((entry) => entry.id === LEGACY_LOCATION_ID);
  const lesson = locations.find((entry) => entry.id === LEARNING_LOCATION_ID);
  assert.ok(onnes);
  assert.ok(lesson);
  assert.equal(onnes.id, LEGACY_LOCATION_ID);
  assert.equal(onnes.kind, "npc");
  assert.equal(onnes.title, "Heike Kamerlingh Onnes");
  assert.deepEqual(onnes.requirements, {});
  assert.deepEqual(onnes.grants, {});
  assert.equal(onnes.exercise.type, "acknowledge");
  assert.equal(onnes.steps, undefined);

  assert.equal(lesson.kind, "lesson");
  assert.deepEqual(lesson.requirements, {});
  assert.deepEqual(lesson.grants, {
    concepts: [LEGACY_AREA_AND_CONCEPT_ID],
  });
  assert.equal(lesson.exercise.type, "choice");
  assert.match(lesson.objective, /Distinguir/);
});

test("todos los personajes secundarios son encuentros sin preguntas", () => {
  const npcs = LOCATIONS.filter((entry) => entry.kind === "npc");
  assert.ok(npcs.length > 0);
  for (const npc of npcs) {
    assert.equal(npc.exercise?.type, "acknowledge", npc.id);
    assert.equal(npc.steps, undefined, npc.id);
    assert.doesNotMatch(
      JSON.stringify(npc.exercise),
      /answer(?:Id|Index)|choices|expected|answerPolicy/,
      npc.id,
    );
  }
});

test("Onnes conserva contexto histórico y una sola fuente oficial", () => {
  const onnes = LOCATIONS.find((entry) => entry.id === LEGACY_LOCATION_ID);
  const visibleContent = JSON.stringify({
    title: onnes.title,
    shortTitle: onnes.shortTitle,
    objective: onnes.objective,
    model: onnes.model,
    application: onnes.application,
    sections: onnes.sections,
    exercise: onnes.exercise,
  });

  assert.match(onnes.objective, /hito experimental/i);
  assert.ok(Array.isArray(onnes.prerequisites));
  assert.ok(onnes.prerequisites.length > 0);
  assert.match(onnes.model, /no evaluativo/i);
  assert.ok(onnes.application.length > 0);
  assert.match(visibleContent, /1911/);
  assert.doesNotMatch(visibleContent, /Compatibilidad|Apantallamiento|interferencia/i);
  assert.deepEqual(onnes.sources, [
    {
      label: "Nobel Prize — Heike Kamerlingh Onnes",
      url: NOBEL_ONNES_URL,
    },
  ]);
});

test("completar Onnes desbloquea fórmulas sin migrar un perfil anterior", () => {
  const onnesFormulas = FORMULAS.filter((entry) =>
    entry.requirements?.completedLocations?.includes(LEGACY_LOCATION_ID),
  );
  assert.ok(onnesFormulas.length >= 1);

  const oldProfileContext = {
    concepts: new Set(),
    completedLocations: new Set([LEGACY_LOCATION_ID]),
    rewards: new Set(),
    unlockedAreas: new Set([LEGACY_AREA_AND_CONCEPT_ID]),
  };
  for (const formula of onnesFormulas) {
    assert.equal(meetsRequirements(formula.requirements, oldProfileContext), true);
  }
});
