import { CONCEPTS, REWARDS, rewardKey } from "../data/knowledge.js";
import { LOCATIONS } from "../data/locations.js";
import { REFERENCE_COLLECTIONS } from "../data/reference/index.js";
import { AREAS, WORLD_CONFIG } from "../data/world.js";
import { pointInHex } from "./hex.js";
import {
  createMathExpressionPolicy,
  evaluateMathAst,
  parseMathExpression,
} from "./math-expression.js";
import {
  isLearningLocation,
  meetsLearningPrerequisites,
} from "./knowledge-graph.js";
import { normalizeRequirements } from "./requirements.js";
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

const INTERNAL_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VECTOR_FIELD_IDS = new Set(["radial-linear", "rotational-linear"]);
const ATOMIC_SEQUENCE_TYPES = new Set(["choice", "numeric", "expression"]);
const CHOICE_PRESENTATIONS = new Set(["vector-field-cards", "point-charge-field"]);
const FEEDBACK_LEVELS = new Set(["guided", "binary"]);
const COMPLETABLE_EXERCISE_TYPES = new Set([
  "choice",
  "numeric",
  "acknowledge",
  "expression",
  "sequence",
]);

function sameNumericPair(left, right) {
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === 2 &&
    right.length === 2 &&
    left[0] === right[0] &&
    left[1] === right[1]
  );
}

function validateDomain(domain, context, errors) {
  if (!domain || typeof domain !== "object") {
    errors.push(`${context} debe declarar un dominio bidimensional.`);
    return false;
  }
  let valid = true;
  for (const axis of ["x", "y"]) {
    const interval = domain[axis];
    if (
      !Array.isArray(interval) ||
      interval.length !== 2 ||
      !interval.every(Number.isFinite) ||
      interval[0] >= interval[1]
    ) {
      errors.push(`${context} debe declarar domain.${axis} como [mínimo, máximo] finito.`);
      valid = false;
    }
  }
  if (valid) {
    const xSpan = domain.x[1] - domain.x[0];
    const ySpan = domain.y[1] - domain.y[0];
    const tolerance = Number.EPSILON * Math.max(1, Math.abs(xSpan), Math.abs(ySpan)) * 8;
    if (Math.abs(xSpan - ySpan) > tolerance) {
      errors.push(`${context} debe usar una ventana matemática con relación 1:1.`);
      valid = false;
    }
  }
  return valid;
}

function domainContains(domain, point) {
  return (
    ["x", "y"].every(
      (axis) =>
        Array.isArray(domain?.[axis])
        && domain[axis].length === 2
        && domain[axis].every(Number.isFinite)
        && Number.isFinite(point?.[axis]),
    )
    && point.x >= domain.x[0]
    && point.x <= domain.x[1]
    && point.y >= domain.y[0]
    && point.y <= domain.y[1]
  );
}

function validateParameter(parameter, context, errors) {
  if (!parameter || typeof parameter !== "object") {
    errors.push(`${context} debe declarar un parámetro de deslizador.`);
    return false;
  }
  let valid = true;
  if (typeof parameter.id !== "string" || !INTERNAL_ID_PATTERN.test(parameter.id)) {
    errors.push(`${context} tiene un ID de parámetro inválido.`);
    valid = false;
  }
  for (const property of ["min", "max", "step", "nominal"]) {
    if (!Number.isFinite(parameter[property])) {
      errors.push(`${context} debe declarar parameter.${property} como número finito.`);
      valid = false;
    }
  }
  if (!valid) return false;
  if (parameter.min <= 0 || parameter.min >= parameter.max) {
    errors.push(`${context} requiere 0 < parameter.min < parameter.max.`);
    valid = false;
  }
  if (parameter.step <= 0) {
    errors.push(`${context} requiere un paso positivo.`);
    valid = false;
  }
  if (parameter.nominal < parameter.min || parameter.nominal > parameter.max) {
    errors.push(`${context} tiene un valor nominal fuera del rango.`);
    valid = false;
  }
  const midpoint = (parameter.min + parameter.max) / 2;
  const midpointTolerance = Number.EPSILON * Math.max(1, Math.abs(midpoint)) * 8;
  if (Math.abs(parameter.nominal - midpoint) > midpointTolerance) {
    errors.push(`${context} debe ubicar el valor nominal en el centro del rango.`);
    valid = false;
  }
  const stepCount = (parameter.max - parameter.min) / parameter.step;
  const nominalStep = (parameter.nominal - parameter.min) / parameter.step;
  if (
    Math.abs(stepCount - Math.round(stepCount)) > 1e-9 ||
    Math.abs(nominalStep - Math.round(nominalStep)) > 1e-9
  ) {
    errors.push(`${context} debe alinear los extremos y el valor nominal con el paso.`);
    valid = false;
  }
  return valid;
}

function validateVectorFieldCards(exercise, context, errors) {
  if (exercise.presentation !== "vector-field-cards") return;
  if (!Array.isArray(exercise.choices) || exercise.choices.length !== 2) {
    errors.push(`${context} con vector-field-cards debe declarar exactamente dos tarjetas.`);
    return;
  }

  const figures = [];
  const fieldIds = [];
  const parameterIds = [];
  for (const [index, choice] of exercise.choices.entries()) {
    const cardContext = `${context}, tarjeta ${index + 1}`;
    if (!choice || typeof choice !== "object" || Array.isArray(choice)) {
      errors.push(`${cardContext} debe ser una alternativa estructurada.`);
      continue;
    }
    if (
      !choice.reveal ||
      typeof choice.reveal !== "object" ||
      !Array.isArray(choice.reveal.sections) ||
      choice.reveal.sections.length === 0
    ) {
      errors.push(`${cardContext} debe declarar reveal.sections para mostrar tras acertar.`);
    }
    const figure = choice.figure;
    if (!figure || typeof figure !== "object") {
      errors.push(`${cardContext} debe declarar figure.`);
      continue;
    }
    figures.push(figure);
    if (!VECTOR_FIELD_IDS.has(figure.fieldId)) {
      errors.push(`${cardContext} usa un fieldId no compatible: ${figure.fieldId}.`);
    } else {
      fieldIds.push(figure.fieldId);
    }
    validateDomain(figure.domain, cardContext, errors);
    if (
      !Number.isInteger(figure.samplesPerAxis) ||
      figure.samplesPerAxis < 3 ||
      figure.samplesPerAxis > 41
    ) {
      errors.push(`${cardContext} requiere samplesPerAxis entero entre 3 y 41.`);
    }
    if (!Number.isFinite(figure.visualScale) || figure.visualScale <= 0) {
      errors.push(`${cardContext} requiere visualScale finita y positiva.`);
    }
    validateParameter(figure.parameter, cardContext, errors);
    if (
      typeof figure.parameter?.id === "string" &&
      INTERNAL_ID_PATTERN.test(figure.parameter.id)
    ) {
      parameterIds.push(figure.parameter.id);
    }
    const expectedParameterId =
      figure.fieldId === "radial-linear"
        ? "a"
        : figure.fieldId === "rotational-linear"
          ? "b"
          : null;
    if (expectedParameterId && figure.parameter?.id !== expectedParameterId) {
      errors.push(
        `${cardContext} debe usar el parámetro ${expectedParameterId} con ${figure.fieldId}.`,
      );
    }
  }

  for (const duplicate of duplicateValues(fieldIds)) {
    errors.push(`${context} repite el fieldId ${duplicate}.`);
  }
  for (const duplicate of duplicateValues(parameterIds)) {
    errors.push(`${context} repite el ID de parámetro ${duplicate}.`);
  }
  if (figures.length !== 2) return;
  const [first, second] = figures;
  if (
    !sameNumericPair(first.domain?.x, second.domain?.x) ||
    !sameNumericPair(first.domain?.y, second.domain?.y)
  ) {
    errors.push(`${context} debe compartir el mismo dominio entre tarjetas.`);
  }
  if (first.samplesPerAxis !== second.samplesPerAxis) {
    errors.push(`${context} debe compartir samplesPerAxis entre tarjetas.`);
  }
  if (first.visualScale !== second.visualScale) {
    errors.push(`${context} debe compartir visualScale entre tarjetas.`);
  }
  const firstParameter = first.parameter;
  const secondParameter = second.parameter;
  if (
    firstParameter &&
    secondParameter &&
    ["min", "max", "step", "nominal"].some(
      (property) => firstParameter[property] !== secondParameter[property],
    )
  ) {
    errors.push(`${context} debe compartir rango, paso y valor nominal entre deslizadores.`);
  }
}

function validatePointChargeField(exercise, context, errors) {
  if (exercise.presentation !== "point-charge-field") return;
  const figure = exercise.figure;
  if (!figure || typeof figure !== "object" || Array.isArray(figure)) {
    errors.push(`${context} con point-charge-field debe declarar figure.`);
    return;
  }

  for (const property of ["title", "description"]) {
    if (typeof figure[property] !== "string" || !figure[property].trim()) {
      errors.push(`${context} con point-charge-field debe declarar figure.${property}.`);
    }
  }

  validateDomain(figure.domain, `${context}, figura de cargas`, errors);
  const charges = figure.charges;
  if (!Array.isArray(charges) || charges.length !== 3) {
    errors.push(`${context} con point-charge-field debe declarar exactamente tres cargas.`);
  } else {
    const chargeIds = [];
    for (const [index, charge] of charges.entries()) {
      const chargeContext = `${context}, carga ${index + 1}`;
      if (!charge || typeof charge !== "object" || Array.isArray(charge)) {
        errors.push(`${chargeContext} debe ser un objeto.`);
        continue;
      }
      if (typeof charge.id !== "string" || !INTERNAL_ID_PATTERN.test(charge.id)) {
        errors.push(`${chargeContext} tiene un ID interno inválido.`);
      } else {
        chargeIds.push(charge.id);
      }
      if (typeof charge.label !== "string" || !charge.label.trim()) {
        errors.push(`${chargeContext} debe declarar label.`);
      }
      for (const coordinate of ["x", "y", "value"]) {
        if (!Number.isFinite(charge[coordinate])) {
          errors.push(`${chargeContext} debe declarar ${coordinate} como número finito.`);
        }
      }
      if (
        Number.isFinite(charge.x)
        && Number.isFinite(charge.y)
        && !domainContains(figure.domain, charge)
      ) {
        errors.push(`${chargeContext} debe situarse dentro del dominio.`);
      }
    }
    for (const duplicate of duplicateValues(chargeIds)) {
      errors.push(`${context} repite el ID interno de carga ${duplicate}.`);
    }
  }

  const range = figure.chargeRange;
  const validRange =
    range
    && typeof range === "object"
    && range.min === -1
    && range.max === 1
    && Number.isFinite(range.step)
    && range.step > 0
    && Math.abs(2 / range.step - Math.round(2 / range.step)) <= 1e-9
    && Math.abs(1 / range.step - Math.round(1 / range.step)) <= 1e-9;
  if (!validRange) {
    errors.push(
      `${context} con point-charge-field debe usar chargeRange [-1, 1], incluir cero y alinear sus extremos con un paso positivo.`,
    );
  } else if (Array.isArray(charges)) {
    for (const [index, charge] of charges.entries()) {
      if (!Number.isFinite(charge?.value)) continue;
      const aligned = Math.abs((charge.value + 1) / range.step - Math.round((charge.value + 1) / range.step)) <= 1e-9;
      if (charge.value < -1 || charge.value > 1 || !aligned) {
        errors.push(`${context}, carga ${index + 1} debe tener value alineado dentro de [-1, 1].`);
      }
    }
  }

  const probe = figure.probe;
  if (!probe || !Number.isFinite(probe.x) || !Number.isFinite(probe.y)) {
    errors.push(`${context} con point-charge-field debe declarar un probe bidimensional finito.`);
  } else if (!domainContains(figure.domain, probe)) {
    errors.push(`${context} con point-charge-field debe situar probe dentro del dominio.`);
  }
  if (!Number.isFinite(figure.keyboardStep) || figure.keyboardStep <= 0) {
    errors.push(`${context} con point-charge-field requiere keyboardStep finito y positivo.`);
  }
  if (!Number.isFinite(figure.singularityRadius) || figure.singularityRadius < 0) {
    errors.push(`${context} con point-charge-field requiere singularityRadius finito y no negativo.`);
  }
}

function mathPolicyScope(point, constants) {
  return Object.assign(Object.create(null), point, constants);
}

function validateMathTarget(policy, context, errors) {
  const parseOptions = {
    variables: policy.variables,
    constants: policy.constants,
    functions: policy.functions,
    limits: policy.limits,
  };
  if (
    policy.coordinateSystem === "cylindrical" &&
    policy.testPoints.some((point) => point[policy.radialVariable] <= 0)
  ) {
    errors.push(`${context} debe usar puntos cilíndricos con radio estrictamente positivo.`);
  }
  let targets;
  if (policy.kind === "numeric-equivalent") {
    if (typeof policy.expected === "number") {
      if (!Number.isFinite(policy.expected)) {
        errors.push(`${context} debe declarar expected como número finito o expresión.`);
      }
      return;
    }
    targets = [policy.expected];
  } else if (policy.kind === "expression-equivalent") {
    targets = [policy.expectedExpression];
  } else {
    const componentCount = policy.coordinateSystem === "cylindrical" ? 3 : policy.variables.length;
    if (!Array.isArray(policy.targetField) || policy.targetField.length !== componentCount) {
      errors.push(`${context} debe declarar expectedGradient con ${componentCount} componentes.`);
      return;
    }
    targets = policy.targetField;
  }

  const parsedTargets = [];
  for (const [index, target] of targets.entries()) {
    if (Number.isFinite(target)) {
      parsedTargets.push(target);
      continue;
    }
    if (typeof target !== "string" || !target.trim()) {
      errors.push(`${context} tiene un objetivo matemático inválido en la posición ${index + 1}.`);
      return;
    }
    try {
      parsedTargets.push(parseMathExpression(target, parseOptions));
    } catch (error) {
      errors.push(`${context} contiene una expresión objetivo inválida: ${error.message}`);
      return;
    }
  }

  try {
    for (const point of policy.testPoints) {
      for (const constants of policy.constantSets) {
        const scope = mathPolicyScope(point, constants);
        for (const target of parsedTargets) {
          if (typeof target !== "number") evaluateMathAst(target, scope, { limits: policy.limits });
        }
      }
    }
  } catch (error) {
    errors.push(`${context} no está definida en todos sus puntos de prueba: ${error.message}`);
  }
}

function validateAnswerPolicy(answerPolicy, context, errors) {
  if (!answerPolicy || typeof answerPolicy !== "object" || Array.isArray(answerPolicy)) {
    errors.push(`${context} debe declarar answerPolicy como objeto.`);
    return;
  }
  if (answerPolicy.version !== 1) {
    errors.push(`${context} debe declarar answerPolicy.version = 1.`);
  }
  try {
    const policy = createMathExpressionPolicy(answerPolicy);
    validateMathTarget(policy, context, errors);
  } catch (error) {
    errors.push(`${context} tiene una política matemática inválida: ${error.message}`);
  }
}

function validateChoiceDefinition(exercise, context, errors) {
  const choicesAreInvalid =
    !Array.isArray(exercise.choices) ||
    exercise.choices.length < 2 ||
    exercise.choices.some(
      (choice) =>
        !(
          (typeof choice === "string" && choice.trim()) ||
          (choice && typeof choice === "object" && !Array.isArray(choice))
        ),
    );
  if (choicesAreInvalid) {
    errors.push(`${context} debe declarar al menos dos alternativas de texto u objeto.`);
  }

  const choiceIds = [];
  for (const [index, choice] of (Array.isArray(exercise.choices) ? exercise.choices : []).entries()) {
    if (typeof choice === "string") continue;
    if (typeof choice.id !== "string" || !INTERNAL_ID_PATTERN.test(choice.id)) {
      errors.push(`${context} tiene un ID de alternativa inválido en la posición ${index + 1}.`);
    } else {
      choiceIds.push(choice.id);
    }
    if (typeof choice.label !== "string" || !choice.label.trim()) {
      errors.push(`${context} tiene una alternativa sin label en la posición ${index + 1}.`);
    }
  }
  for (const duplicate of duplicateValues(choiceIds)) {
    errors.push(`${context} repite el ID interno de alternativa ${duplicate}.`);
  }

  const answerIdProvided = exercise.answerId !== undefined;
  const answerIndexProvided = exercise.answerIndex !== undefined;
  const hasAnswerId =
    typeof exercise.answerId === "string" &&
    INTERNAL_ID_PATTERN.test(exercise.answerId);
  const hasAnswerIndex = Number.isInteger(exercise.answerIndex);
  if (answerIdProvided && !hasAnswerId) {
    errors.push(`${context} debe declarar answerId como ID interno válido.`);
  }
  if (answerIndexProvided && !hasAnswerIndex) {
    errors.push(`${context} debe declarar answerIndex como entero.`);
  }
  if (!hasAnswerId && !hasAnswerIndex) {
    errors.push(`${context} debe declarar answerId o answerIndex.`);
  }
  if (hasAnswerId && !choiceIds.includes(exercise.answerId)) {
    errors.push(`${context} tiene answerId que no referencia una alternativa existente.`);
  }
  if (
    hasAnswerIndex &&
    (exercise.answerIndex < 0 || exercise.answerIndex >= (exercise.choices?.length ?? 0))
  ) {
    errors.push(`${context} tiene answerIndex fuera del rango de alternatives.`);
  }
  if (
    hasAnswerId &&
    hasAnswerIndex &&
    exercise.choices[exercise.answerIndex]?.id !== exercise.answerId
  ) {
    errors.push(`${context} declara answerId y answerIndex contradictorios.`);
  }

  if (exercise.presentation !== undefined && !CHOICE_PRESENTATIONS.has(exercise.presentation)) {
    errors.push(`${context} usa una presentación desconocida: ${exercise.presentation}.`);
  }
  validateVectorFieldCards(exercise, context, errors);
  validatePointChargeField(exercise, context, errors);
}

function collectExerciseDefinitionErrors(exercise, context, errors, { inSequence = false } = {}) {
  if (!exercise) return;
  const type = exercise.type ?? "none";
  if (
    !["none", "action", "acknowledge", "choice", "numeric", "expression", "sequence"].includes(
      type,
    )
  ) {
    errors.push(`${context} usa un tipo de ejercicio desconocido: ${type}.`);
    return;
  }
  if (inSequence && !ATOMIC_SEQUENCE_TYPES.has(type)) {
    errors.push(`${context} usa un tipo no atómico dentro de sequence: ${type}.`);
    return;
  }
  if (type === "action" && (typeof exercise.action !== "string" || !exercise.action.trim())) {
    errors.push(`${context} declara action sin una acción identificable.`);
  }
  if (type === "choice") {
    validateChoiceDefinition(exercise, context, errors);
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
  if (type === "expression") {
    validateAnswerPolicy(exercise.answerPolicy, context, errors);
  }
  if (type === "sequence") {
    if (!FEEDBACK_LEVELS.has(exercise.feedback)) {
      errors.push(`${context} debe declarar feedback como guided o binary.`);
    }
    if (!Array.isArray(exercise.items) || exercise.items.length === 0) {
      errors.push(`${context} debe declarar al menos un item en sequence.`);
      return;
    }
    for (const duplicate of duplicateValues(
      exercise.items.map((item) => item?.id).filter((id) => typeof id === "string"),
    )) {
      errors.push(`${context} repite el ID interno de item ${duplicate}.`);
    }
    for (const [index, item] of exercise.items.entries()) {
      const itemContext = `${context}, item ${index + 1}`;
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        errors.push(`${itemContext} debe ser un objeto.`);
        continue;
      }
      if (typeof item.id !== "string" || !INTERNAL_ID_PATTERN.test(item.id)) {
        errors.push(`${itemContext} tiene un ID interno inválido.`);
      }
      if (
        exercise.feedback === "binary" &&
        item.type === "expression" &&
        item.answerPolicy?.feedback !== "binary"
      ) {
        errors.push(`${itemContext} debe conservar feedback binary en su answerPolicy.`);
      }
      collectExerciseDefinitionErrors(item, itemContext, errors, { inSequence: true });
    }
  }
}

export function validateExerciseDefinition(exercise, context = "El ejercicio") {
  const errors = [];
  collectExerciseDefinitionErrors(exercise, context, errors);
  return errors;
}

export function simulateFullProgression({ areas = AREAS, locations = LOCATIONS } = {}) {
  const worldIndex = createWorldIndex(areas);
  const concepts = new Set();
  const completedLocations = new Set();
  const completedLearningLocations = new Set();
  const availableLateralLocations = new Set();
  const rewards = new Set(
    Object.entries(REWARDS).flatMap(([type, entries]) =>
      entries.filter((entry) => entry.initial).map((entry) => rewardKey(type, entry.id)),
    ),
  );
  const debugUnlockedAreas = new Set();
  const trace = [];

  let changed = true;
  let safetyCounter = 0;

  // Cada pasada que mantiene `changed` añade al menos un lugar nuevo al Set.
  // Por lo tanto el proceso termina por construcción para una colección finita y
  // no necesita un límite mágico que rechace redes editoriales profundas válidas.
  while (changed) {
    changed = false;
    safetyCounter += 1;

    const unlockedAreas = deriveUnlockedAreaIds({
      areas,
      locations,
      worldIndex,
      completedLocations,
      debugUnlockedAreas,
    });

    for (const location of locations) {
      if (!unlockedAreas.has(location.areaId)) continue;
      if (!isLearningLocation(location) && !["base", "debug"].includes(location.kind)) {
        availableLateralLocations.add(location.id);
      }
      if (completedLocations.has(location.id)) continue;
      if (
        isLearningLocation(location) &&
        !meetsLearningPrerequisites(location, completedLocations)
      ) {
        continue;
      }

      completedLocations.add(location.id);
      if (isLearningLocation(location)) completedLearningLocations.add(location.id);
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
    locations,
    worldIndex,
    completedLocations,
    debugUnlockedAreas,
  });

  for (const location of locations) {
    if (
      unlockedAreas.has(location.areaId) &&
      !isLearningLocation(location) &&
      !["base", "debug"].includes(location.kind)
    ) {
      availableLateralLocations.add(location.id);
    }
  }

  return {
    unlockedAreas,
    completedLocations,
    completedLearningLocations,
    availableLateralLocations,
    concepts,
    rewards,
    trace,
    iterations: safetyCounter,
  };
}

export function validateProjectData({
  areas = AREAS,
  locations = LOCATIONS,
  allowContentSubset = false,
  dynamicEdition = false,
} = {}) {
  const errors = [];
  const warnings = [];
  const contentSubsetAllowed = Boolean(allowContentSubset || dynamicEdition);
  const worldIndex = createWorldIndex(areas);
  const knownAreaIds = new Set(areas.map((area) => area.id));
  const knownLocationIds = new Set(locations.map((location) => location.id));
  const learningLocations = locations.filter(isLearningLocation);
  const learningLocationIds = new Set(learningLocations.map((location) => location.id));
  const learningAdjacency = new Map(
    learningLocations.map((location) => [location.id, []]),
  );
  const learningIncoming = new Map(
    learningLocations.map((location) => [location.id, 0]),
  );
  const knownConceptIds = new Set(CONCEPTS.map((concept) => concept.id));
  const canonicalLocationIds = new Set(LOCATIONS.map((location) => location.id));
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
  const learningRoot = locations.find(
    (location) => location.id === WORLD_CONFIG.learningRootLocationId,
  );
  if (!learningRoot || !isLearningLocation(learningRoot)) {
    errors.push(
      `La raíz académica ${WORLD_CONFIG.learningRootLocationId} no existe o no es lesson/mission.`,
    );
  }

  for (const area of areas) {
    if (!Number.isInteger(area.q) || !Number.isInteger(area.r)) {
      errors.push(`La zona ${area.id} debe usar coordenadas axiales enteras.`);
    }
    if (!area.initial && getAreaNeighbors(area, worldIndex).length === 0) {
      errors.push(`La zona ${area.id} no comparte aristas con ninguna zona definida.`);
    }

    const requirements = normalizeRequirements(area.requirements);
    if (Object.values(requirements).some((entries) => entries.length > 0)) {
      errors.push(
        `La zona ${area.id} no puede declarar prerrequisitos: su apertura se deriva de la Red de aprendizaje y la adyacencia.`,
      );
    }
    if (!area.initial && !learningLocations.some((location) => location.areaId === area.id)) {
      errors.push(
        `La zona ${area.id} no contiene ningún nodo académico que permita derivar su apertura.`,
      );
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
    const usesLegacyRequirement =
      requirements.concepts.length > 0 ||
      requirements.rewards.length > 0 ||
      requirements.areas.length > 0;
    if (usesLegacyRequirement) {
      errors.push(
        isLearningLocation(location)
          ? `El nodo académico ${location.id} solo puede declarar prerrequisitos completedLocations de la Red de aprendizaje.`
          : `El lugar lateral ${location.id} se habilita con su zona y no puede declarar prerrequisitos.`,
      );
    }
    if (!isLearningLocation(location) && requirements.completedLocations.length > 0) {
      errors.push(
        `El lugar lateral ${location.id} está fuera de la Red de aprendizaje y no puede declarar completedLocations.`,
      );
    }
    for (const duplicate of duplicateValues(requirements.completedLocations)) {
      errors.push(`El nodo ${location.id} repite el prerrequisito ${duplicate}.`);
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
      if (
        isLearningLocation(location) &&
        knownLocationIds.has(prerequisiteLocationId) &&
        !learningLocationIds.has(prerequisiteLocationId)
      ) {
        errors.push(
          `El nodo académico ${location.id} no puede depender del lugar lateral ${prerequisiteLocationId}.`,
        );
      }
      if (
        isLearningLocation(location) &&
        learningLocationIds.has(prerequisiteLocationId) &&
        prerequisiteLocationId !== location.id
      ) {
        learningAdjacency.get(prerequisiteLocationId)?.push(location.id);
        learningIncoming.set(location.id, (learningIncoming.get(location.id) ?? 0) + 1);
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

    collectExerciseDefinitionErrors(location.exercise, `El lugar ${location.id}`, errors);

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
        if (
          !["none", "choice", "numeric", "acknowledge", "expression", "sequence"].includes(
            exerciseType,
          )
        ) {
          errors.push(
            `El lugar ${location.id} usa un ejercicio de etapa no compatible: ${exerciseType}.`,
          );
        }
        collectExerciseDefinitionErrors(
          step.exercise,
          `La etapa ${step.id ?? index + 1} del lugar ${location.id}`,
          errors,
        );
      }
      const finalExerciseType = location.steps.at(-1)?.exercise?.type ?? "none";
      if (!COMPLETABLE_EXERCISE_TYPES.has(finalExerciseType)) {
        errors.push(
          `El lugar por etapas ${location.id} debe cerrar con un ejercicio completable para poder completarse.`,
        );
      }
    }
  }

  const learningRoots = learningLocations
    .filter((location) => learningIncoming.get(location.id) === 0)
    .map((location) => location.id);
  if (
    learningRoots.length !== 1 ||
    learningRoots[0] !== WORLD_CONFIG.learningRootLocationId
  ) {
    errors.push(
      `La Red de aprendizaje debe tener como única raíz ${WORLD_CONFIG.learningRootLocationId}; raíces detectadas: ${learningRoots.join(", ") || "ninguna"}.`,
    );
  }

  const learningVisitState = new Map();
  const learningPath = [];
  let learningCycle = null;
  const visitLearningLocation = (locationId) => {
    learningVisitState.set(locationId, 1);
    learningPath.push(locationId);
    for (const targetId of learningAdjacency.get(locationId) ?? []) {
      if (learningVisitState.get(targetId) === 1) {
        const cycleStart = learningPath.indexOf(targetId);
        learningCycle = [...learningPath.slice(cycleStart), targetId];
        return;
      }
      if (!learningVisitState.has(targetId)) visitLearningLocation(targetId);
      if (learningCycle) return;
    }
    learningPath.pop();
    learningVisitState.set(locationId, 2);
  };
  for (const location of learningLocations) {
    if (!learningVisitState.has(location.id)) visitLearningLocation(location.id);
    if (learningCycle) break;
  }
  if (learningCycle) {
    errors.push(`La Red de aprendizaje contiene un ciclo: ${learningCycle.join(" → ")}.`);
  }

  const reachableLearningLocations = new Set();
  const learningQueue = learningLocationIds.has(WORLD_CONFIG.learningRootLocationId)
    ? [WORLD_CONFIG.learningRootLocationId]
    : [];
  while (learningQueue.length > 0) {
    const locationId = learningQueue.shift();
    if (reachableLearningLocations.has(locationId)) continue;
    reachableLearningLocations.add(locationId);
    learningQueue.push(...(learningAdjacency.get(locationId) ?? []));
  }
  const disconnectedLearningLocations = learningLocations
    .map((location) => location.id)
    .filter((locationId) => !reachableLearningLocations.has(locationId));
  if (disconnectedLearningLocations.length > 0) {
    errors.push(
      `La Red de aprendizaje no alcanza desde ${WORLD_CONFIG.learningRootLocationId}: ${disconnectedLearningLocations.join(", ")}.`,
    );
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
          const message =
            `La referencia ${collectionId}:${entry.id} exige un lugar inexistente: ${locationId}.`;
          if (contentSubsetAllowed && canonicalLocationIds.has(locationId)) {
            warnings.push(`${message} La edición dinámica retiró ese lugar canónico.`);
          } else {
            errors.push(message);
          }
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
      const message = `El concepto ${concept.id} no es concedido por ningún lugar.`;
      if (contentSubsetAllowed) {
        warnings.push(`${message} La edición dinámica conserva el concepto en el catálogo.`);
      } else {
        errors.push(message);
      }
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
    if (
      isLearningLocation(location) &&
      !simulation.completedLearningLocations.has(location.id)
    ) {
      errors.push(
        `El nodo académico ${location.id} no puede completarse desde ${WORLD_CONFIG.learningRootLocationId}. Revisa la red y la apertura territorial.`,
      );
    }
    if (
      !isLearningLocation(location) &&
      !["base", "debug"].includes(location.kind) &&
      !simulation.availableLateralLocations.has(location.id)
    ) {
      errors.push(
        `El lugar lateral ${location.id} no queda disponible al abrir su zona.`,
      );
    }
  }

  return { errors, warnings, simulation };
}
