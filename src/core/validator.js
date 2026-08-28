import { CONCEPTS, REWARDS, rewardKey } from "../data/knowledge.js";
import { LOCATIONS } from "../data/locations.js";
import { REFERENCE_COLLECTIONS } from "../data/reference/index.js";
import { AREAS, WORLD_CONFIG } from "../data/world.js";
import { pointInHex } from "./hex.js";
import { meetsRequirements, normalizeRequirements } from "./requirements.js";
import {
  createWorldIndex,
  deriveUnlockedAreaIds,
  getAreaNeighbors,
} from "./world-graph.js";

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function knownRewardKeys() {
  return new Set(
    Object.entries(REWARDS).flatMap(([type, rewards]) =>
      rewards.map((reward) => rewardKey(type, reward.id)),
    ),
  );
}

function validateExerciseDefinition(exercise, context, errors) {
  if (!exercise) return;
  const type = exercise.type ?? "none";
  if (!["none", "action", "acknowledge", "choice", "numeric"].includes(type)) {
    errors.push(`${context} usa un tipo de ejercicio desconocido: ${type}.`);
    return;
  }
  if (type === "action" && (typeof exercise.action !== "string" || !exercise.action.trim())) {
    errors.push(`${context} declara action sin una acción identificable.`);
  }
  if (type === "choice") {
    if (
      !Array.isArray(exercise.choices) ||
      exercise.choices.length < 2 ||
      exercise.choices.some((choice) => typeof choice !== "string" || !choice.trim())
    ) {
      errors.push(`${context} debe declarar al menos dos alternativas de texto.`);
    }
    if (
      !Number.isInteger(exercise.answerIndex) ||
      exercise.answerIndex < 0 ||
      exercise.answerIndex >= (exercise.choices?.length ?? 0)
    ) {
      errors.push(`${context} tiene answerIndex fuera del rango de alternatives.`);
    }
  }
  if (type === "numeric") {
    if (!Number.isFinite(exercise.expected)) {
      errors.push(`${context} debe declarar expected como número finito.`);
    }
    const tolerances = [exercise.absoluteTolerance, exercise.relativeTolerance].filter(
      (value) => value !== undefined,
    );
    if (
      tolerances.length === 0 ||
      tolerances.some((value) => !Number.isFinite(value) || value < 0)
    ) {
      errors.push(`${context} debe declarar una tolerancia finita y no negativa.`);
    }
    if (typeof exercise.unit !== "string" || !exercise.unit.trim()) {
      errors.push(`${context} debe declarar la unidad de la respuesta numérica.`);
    }
  }
}

export function simulateFullProgression({ areas = AREAS, locations = LOCATIONS } = {}) {
  const worldIndex = createWorldIndex(areas);
  const concepts = new Set();
  const completedLocations = new Set();
  const rewards = new Set(
    Object.entries(REWARDS).flatMap(([type, entries]) =>
      entries.filter((entry) => entry.initial).map((entry) => rewardKey(type, entry.id)),
    ),
  );
  const debugUnlockedAreas = new Set();
  const trace = [];

  let changed = true;
  let safetyCounter = 0;

  while (changed && safetyCounter < 100) {
    changed = false;
    safetyCounter += 1;

    const unlockedAreas = deriveUnlockedAreaIds({
      areas,
      worldIndex,
      concepts,
      completedLocations,
      rewards,
      debugUnlockedAreas,
    });

    for (const location of locations) {
      if (completedLocations.has(location.id)) continue;
      if (!unlockedAreas.has(location.areaId)) continue;
      const context = { concepts, completedLocations, rewards, unlockedAreas };
      if (!meetsRequirements(location.requirements, context)) continue;

      completedLocations.add(location.id);
      const granted = [];
      for (const conceptId of location.grants?.concepts ?? []) {
        if (!concepts.has(conceptId)) {
          concepts.add(conceptId);
          granted.push(`concept:${conceptId}`);
        }
      }
      for (const reward of location.grants?.rewards ?? []) {
        if (!rewards.has(reward)) {
          rewards.add(reward);
          granted.push(reward);
        }
      }
      trace.push({ locationId: location.id, areaId: location.areaId, granted });
      changed = true;
    }
  }

  const unlockedAreas = deriveUnlockedAreaIds({
    areas,
    worldIndex,
    concepts,
    completedLocations,
    rewards,
    debugUnlockedAreas,
  });

  return {
    unlockedAreas,
    completedLocations,
    concepts,
    rewards,
    trace,
    iterations: safetyCounter,
  };
}

export function validateProjectData({ areas = AREAS, locations = LOCATIONS } = {}) {
  const errors = [];
  const warnings = [];
  const worldIndex = createWorldIndex(areas);
  const knownAreaIds = new Set(areas.map((area) => area.id));
  const knownLocationIds = new Set(locations.map((location) => location.id));
  const knownConceptIds = new Set(CONCEPTS.map((concept) => concept.id));
  const rewards = knownRewardKeys();

  for (const duplicate of duplicateValues(areas.map((area) => area.id))) {
    errors.push(`ID de zona duplicado: ${duplicate}`);
  }
  for (const duplicate of duplicateValues(areas.map((area) => `${area.q},${area.r}`))) {
    errors.push(`Coordenada axial duplicada: ${duplicate}`);
  }
  for (const duplicate of duplicateValues(locations.map((location) => location.id))) {
    errors.push(`ID de lugar duplicado: ${duplicate}`);
  }
  for (const duplicate of duplicateValues(CONCEPTS.map((concept) => concept.id))) {
    errors.push(`ID de concepto duplicado: ${duplicate}`);
  }
  for (const [collectionId, entries] of Object.entries(REFERENCE_COLLECTIONS)) {
    for (const duplicate of duplicateValues(entries.map((entry) => entry.id))) {
      errors.push(`ID de referencia duplicado en ${collectionId}: ${duplicate}`);
    }
  }

  const initialAreas = areas.filter((area) => area.initial);
  if (initialAreas.length !== 1) {
    errors.push(`Debe existir exactamente una zona inicial; se encontraron ${initialAreas.length}.`);
  }
  if (!knownAreaIds.has(WORLD_CONFIG.spawnAreaId)) {
    errors.push(`La zona de spawn ${WORLD_CONFIG.spawnAreaId} no existe.`);
  }

  for (const area of areas) {
    if (!Number.isInteger(area.q) || !Number.isInteger(area.r)) {
      errors.push(`La zona ${area.id} debe usar coordenadas axiales enteras.`);
    }
    if (!area.initial && getAreaNeighbors(area, worldIndex).length === 0) {
      errors.push(`La zona ${area.id} no comparte aristas con ninguna zona definida.`);
    }

    const requirements = normalizeRequirements(area.requirements);
    for (const conceptId of requirements.concepts) {
      if (!knownConceptIds.has(conceptId)) {
        errors.push(`La zona ${area.id} exige un concepto inexistente: ${conceptId}.`);
      }
    }
    for (const locationId of requirements.completedLocations) {
      if (!knownLocationIds.has(locationId)) {
        errors.push(`La zona ${area.id} exige un lugar inexistente: ${locationId}.`);
      }
    }
    for (const reward of requirements.rewards) {
      if (!rewards.has(reward)) {
        errors.push(`La zona ${area.id} exige una recompensa inexistente: ${reward}.`);
      }
    }
    for (const areaId of requirements.areas) {
      if (!knownAreaIds.has(areaId)) {
        errors.push(`La zona ${area.id} exige una zona inexistente: ${areaId}.`);
      }
    }
  }

  for (const location of locations) {
    if (!knownAreaIds.has(location.areaId)) {
      errors.push(`El lugar ${location.id} referencia una zona inexistente: ${location.areaId}.`);
      continue;
    }

    if (!pointInHex(location.offset.x, location.offset.y, 0, 0, WORLD_CONFIG.hexSize - 28)) {
      warnings.push(`El marcador ${location.id} está cerca o fuera del margen seguro del hexágono.`);
    }

    const requirements = normalizeRequirements(location.requirements);
    for (const conceptId of requirements.concepts) {
      if (!knownConceptIds.has(conceptId)) {
        errors.push(`El lugar ${location.id} exige un concepto inexistente: ${conceptId}.`);
      }
      if ((location.grants?.concepts ?? []).includes(conceptId)) {
        errors.push(`El lugar ${location.id} exige el mismo concepto que concede: ${conceptId}.`);
      }
    }
    for (const prerequisiteLocationId of requirements.completedLocations) {
      if (!knownLocationIds.has(prerequisiteLocationId)) {
        errors.push(
          `El lugar ${location.id} exige un lugar inexistente: ${prerequisiteLocationId}.`,
        );
      }
      if (prerequisiteLocationId === location.id) {
        errors.push(`El lugar ${location.id} se exige a sí mismo.`);
      }
    }
    for (const reward of requirements.rewards) {
      if (!rewards.has(reward)) {
        errors.push(`El lugar ${location.id} exige una recompensa inexistente: ${reward}.`);
      }
    }
    for (const areaId of requirements.areas) {
      if (!knownAreaIds.has(areaId)) {
        errors.push(`El lugar ${location.id} exige una zona inexistente: ${areaId}.`);
      }
    }
    for (const conceptId of location.grants?.concepts ?? []) {
      if (!knownConceptIds.has(conceptId)) {
        errors.push(`El lugar ${location.id} concede un concepto inexistente: ${conceptId}.`);
      }
    }
    for (const reward of location.grants?.rewards ?? []) {
      if (!rewards.has(reward)) {
        errors.push(`El lugar ${location.id} concede una recompensa inexistente: ${reward}.`);
      }
    }

    validateExerciseDefinition(location.exercise, `El lugar ${location.id}`, errors);

    if (Array.isArray(location.steps)) {
      if (location.steps.length === 0) {
        errors.push(`El lugar ${location.id} declara steps pero no contiene ninguna etapa.`);
      }
      for (const duplicate of duplicateValues(location.steps.map((step) => step.id))) {
        errors.push(`El lugar ${location.id} repite el ID de etapa ${duplicate}.`);
      }
      for (const [index, step] of location.steps.entries()) {
        if (typeof step.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(step.id)) {
          errors.push(`El lugar ${location.id} tiene un ID de etapa inválido en la posición ${index + 1}.`);
        }
        if (typeof step.title !== "string" || !step.title.trim()) {
          errors.push(`El lugar ${location.id} tiene una etapa sin título en la posición ${index + 1}.`);
        }
        const exerciseType = step.exercise?.type ?? "none";
        if (!["none", "choice", "numeric", "acknowledge"].includes(exerciseType)) {
          errors.push(
            `El lugar ${location.id} usa un ejercicio de etapa no compatible: ${exerciseType}.`,
          );
        }
        validateExerciseDefinition(
          step.exercise,
          `La etapa ${step.id ?? index + 1} del lugar ${location.id}`,
          errors,
        );
      }
      const finalExerciseType = location.steps.at(-1)?.exercise?.type ?? "none";
      if (!["choice", "numeric", "acknowledge"].includes(finalExerciseType)) {
        errors.push(
          `El lugar por etapas ${location.id} debe cerrar con choice, numeric o acknowledge para poder completarse.`,
        );
      }
    }
  }

  for (const [collectionId, entries] of Object.entries(REFERENCE_COLLECTIONS)) {
    for (const entry of entries) {
      const requirements = normalizeRequirements(entry.requirements);
      for (const conceptId of requirements.concepts) {
        if (!knownConceptIds.has(conceptId)) {
          errors.push(
            `La referencia ${collectionId}:${entry.id} exige un concepto inexistente: ${conceptId}.`,
          );
        }
      }
      for (const locationId of requirements.completedLocations) {
        if (!knownLocationIds.has(locationId)) {
          errors.push(
            `La referencia ${collectionId}:${entry.id} exige un lugar inexistente: ${locationId}.`,
          );
        }
      }
      for (const reward of requirements.rewards) {
        if (!rewards.has(reward)) {
          errors.push(
            `La referencia ${collectionId}:${entry.id} exige una recompensa inexistente: ${reward}.`,
          );
        }
      }
      for (const areaId of requirements.areas) {
        if (!knownAreaIds.has(areaId)) {
          errors.push(
            `La referencia ${collectionId}:${entry.id} exige una zona inexistente: ${areaId}.`,
          );
        }
      }
    }
  }

  const simulation = simulateFullProgression({ areas, locations });
  const grantedConceptIds = new Set(
    locations.flatMap((location) => location.grants?.concepts ?? []),
  );
  for (const concept of CONCEPTS) {
    if (!grantedConceptIds.has(concept.id)) {
      errors.push(`El concepto ${concept.id} no es concedido por ningún lugar.`);
    }
  }
  for (const area of areas) {
    if (!simulation.unlockedAreas.has(area.id)) {
      errors.push(
        `La zona ${area.id} no puede alcanzarse al completar todo el contenido accesible. Posible bloqueo lógico.`,
      );
    }
  }
  for (const location of locations) {
    const hasProgressionEffect =
      (location.grants?.concepts?.length ?? 0) > 0 ||
      (location.grants?.rewards?.length ?? 0) > 0;
    if (hasProgressionEffect && !simulation.completedLocations.has(location.id)) {
      errors.push(
        `El lugar progresivo ${location.id} no puede alcanzarse. Revisa sus prerrequisitos y la zona que lo contiene.`,
      );
    }
  }

  if (simulation.iterations >= 100) {
    errors.push("La simulación de progresión excedió el límite de seguridad.");
  }

  return { errors, warnings, simulation };
}
