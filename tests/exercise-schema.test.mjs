import assert from "node:assert/strict";
import test from "node:test";

import { validateExerciseDefinition } from "../src/core/validator.js";

function vectorChoice({
  id,
  fieldId,
  parameterId,
  domain = { x: [-2, 2], y: [-2, 2] },
  samplesPerAxis = 9,
  visualScale = 2.5,
  parameter = {},
  reveal = { sections: [{ title: "Comprobación" }] },
}) {
  return {
    id,
    label: id === "field-a" ? "Campo A" : "Campo B",
    figure: {
      fieldId,
      domain,
      samplesPerAxis,
      visualScale,
      parameter: {
        id: parameterId,
        min: 0.5,
        max: 1.5,
        step: 0.1,
        nominal: 1,
        ...parameter,
      },
    },
    reveal,
  };
}

function vectorFieldCards(overrides = {}) {
  return {
    type: "choice",
    presentation: "vector-field-cards",
    choices: [
      vectorChoice({ id: "field-a", fieldId: "radial-linear", parameterId: "a" }),
      vectorChoice({ id: "field-b", fieldId: "rotational-linear", parameterId: "b" }),
    ],
    answerId: "field-a",
    ...overrides,
  };
}

function cylindricalPolicy(overrides = {}) {
  return {
    kind: "gradient-equivalent",
    version: 1,
    variables: ["r", "phi", "z"],
    constants: ["C"],
    coordinateSystem: "cylindrical",
    testPoints: [{ r: 1, phi: 0.4, z: 2 }],
    expectedGradient: ["r*z/(r^2+z^2)^(3/2)", "0", "-r^2/(r^2+z^2)^(3/2)"],
    feedback: "binary",
    ...overrides,
  };
}

test("acepta alternativas heredadas y objetos con IDs internos", () => {
  assert.deepEqual(
    validateExerciseDefinition({ type: "choice", choices: ["A", "B"], answerIndex: 0 }),
    [],
  );
  assert.deepEqual(
    validateExerciseDefinition({
      type: "choice",
      choices: [
        { id: "option-a", label: "Opción A" },
        { id: "option-b", label: "Opción B" },
      ],
      answerId: "option-b",
    }),
    [],
  );
});

test("rechaza IDs de alternativa repetidos y respuestas contradictorias", () => {
  const errors = validateExerciseDefinition({
    type: "choice",
    choices: [
      { id: "same", label: "Primera" },
      { id: "same", label: "Segunda" },
    ],
    answerId: "same",
    answerIndex: 1,
  });
  assert.ok(errors.some((error) => error.includes("repite el ID interno")));

  const contradiction = validateExerciseDefinition({
    type: "choice",
    choices: [
      { id: "first", label: "Primera" },
      { id: "second", label: "Segunda" },
    ],
    answerId: "first",
    answerIndex: 1,
  });
  assert.ok(contradiction.some((error) => error.includes("contradictorios")));

  const malformedAnswers = validateExerciseDefinition({
    type: "choice",
    choices: ["Primera", "Segunda"],
    answerId: "",
    answerIndex: 0.5,
  });
  assert.ok(malformedAnswers.some((error) => error.includes("answerId como ID")));
  assert.ok(malformedAnswers.some((error) => error.includes("answerIndex como entero")));
});

test("valida una secuencia de items atómicos con IDs únicos", () => {
  const errors = validateExerciseDefinition({
    type: "sequence",
    feedback: "guided",
    items: [
      {
        id: "method",
        type: "choice",
        choices: [
          { id: "direct", label: "Integración directa" },
          { id: "fourier", label: "Transformada de Fourier" },
        ],
        answerId: "direct",
      },
      {
        id: "final-expression",
        type: "expression",
        answerPolicy: {
          kind: "gradient-equivalent",
          version: 1,
          variables: ["x"],
          constants: ["C"],
          testPoints: [{ x: -1 }, { x: 1 }],
          expectedGradient: ["2*x"],
          feedback: "guided",
        },
      },
    ],
  });
  assert.deepEqual(errors, []);
});

test("rechaza secuencias anidadas, feedback desconocido e IDs repetidos", () => {
  const errors = validateExerciseDefinition({
    type: "sequence",
    feedback: "verbose",
    items: [
      { id: "same", type: "choice", choices: ["A", "B"], answerIndex: 0 },
      { id: "same", type: "sequence", feedback: "binary", items: [] },
    ],
  });
  assert.ok(errors.some((error) => error.includes("feedback")));
  assert.ok(errors.some((error) => error.includes("repite el ID interno de item")));
  assert.ok(errors.some((error) => error.includes("no atómico")));

  const leakedFeedback = validateExerciseDefinition({
    type: "sequence",
    feedback: "binary",
    items: [
      {
        id: "expression",
        type: "expression",
        answerPolicy: {
          kind: "expression-equivalent",
          version: 1,
          variables: ["x"],
          constants: [],
          expectedExpression: "x",
          feedback: "guided",
        },
      },
    ],
  });
  assert.ok(leakedFeedback.some((error) => error.includes("conservar feedback binary")));
});

test("acepta dos tarjetas vectoriales con dominio, escala y sliders compartidos", () => {
  assert.deepEqual(validateExerciseDefinition(vectorFieldCards()), []);
});

test("rechaza fieldId, dominio, muestreo, escala y slider incompatibles", () => {
  const first = vectorChoice({
    id: "field-a",
    fieldId: "unsupported-field",
    parameterId: "a",
    parameter: { min: 0 },
  });
  const second = vectorChoice({
    id: "field-b",
    fieldId: "unsupported-field",
    parameterId: "a",
    domain: { x: [-3, 3], y: [-2, 2] },
    samplesPerAxis: 8,
    visualScale: 3,
    parameter: { min: 0, nominal: 0.75 },
    reveal: null,
  });
  const errors = validateExerciseDefinition(
    vectorFieldCards({ choices: [first, second], answerId: "field-a" }),
  );

  assert.ok(errors.some((error) => error.includes("fieldId no compatible")));
  assert.ok(errors.some((error) => error.includes("mismo dominio")));
  assert.ok(errors.some((error) => error.includes("samplesPerAxis")));
  assert.ok(errors.some((error) => error.includes("visualScale")));
  assert.ok(errors.some((error) => error.includes("0 < parameter.min")));
  assert.ok(errors.some((error) => error.includes("reveal.sections")));
  assert.ok(errors.some((error) => error.includes("ID de parámetro")));
});

test("vincula cada campo con su parámetro y exige una ventana matemática cuadrada", () => {
  const errors = validateExerciseDefinition(
    vectorFieldCards({
      choices: [
        vectorChoice({
          id: "field-a",
          fieldId: "radial-linear",
          parameterId: "b",
          domain: { x: [-3, 3], y: [-2, 2] },
        }),
        vectorChoice({
          id: "field-b",
          fieldId: "rotational-linear",
          parameterId: "a",
          domain: { x: [-3, 3], y: [-2, 2] },
        }),
      ],
    }),
  );
  assert.ok(errors.some((error) => error.includes("parámetro a con radial-linear")));
  assert.ok(errors.some((error) => error.includes("parámetro b con rotational-linear")));
  assert.ok(errors.some((error) => error.includes("relación 1:1")));
});

test("requiere MathExpressionPolicy v1 con tolerancias y gradiente válidos", () => {
  assert.deepEqual(
    validateExerciseDefinition({ type: "expression", answerPolicy: cylindricalPolicy() }),
    [],
  );

  const wrongVersion = validateExerciseDefinition({
    type: "expression",
    answerPolicy: cylindricalPolicy({ version: 2 }),
  });
  assert.ok(wrongVersion.some((error) => error.includes("version = 1")));

  const wrongTolerance = validateExerciseDefinition({
    type: "expression",
    answerPolicy: cylindricalPolicy({ absoluteTolerance: -1 }),
  });
  assert.ok(wrongTolerance.some((error) => error.includes("tolerancia")));

  const wrongComponents = validateExerciseDefinition({
    type: "expression",
    answerPolicy: cylindricalPolicy({ expectedGradient: ["0", "0"] }),
  });
  assert.ok(wrongComponents.some((error) => error.includes("3 componentes")));
});

test("rechaza r = 0 y objetivos indefinidos en los puntos declarados", () => {
  const singularPoint = validateExerciseDefinition({
    type: "expression",
    answerPolicy: cylindricalPolicy({ testPoints: [{ r: 0, phi: 0, z: 1 }] }),
  });
  assert.ok(singularPoint.some((error) => error.includes("singularidad")));

  const negativeRadius = validateExerciseDefinition({
    type: "expression",
    answerPolicy: cylindricalPolicy({ testPoints: [{ r: -1, phi: 0, z: 1 }] }),
  });
  assert.ok(negativeRadius.some((error) => error.includes("radio estrictamente positivo")));

  const undefinedTarget = validateExerciseDefinition({
    type: "expression",
    answerPolicy: cylindricalPolicy({ expectedGradient: ["1/(r-1)", "0", "0"] }),
  });
  assert.ok(undefinedTarget.some((error) => error.includes("no está definida")));
});
