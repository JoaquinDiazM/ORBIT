import { evaluateMathExpressionAnswer } from "./math-expression.js";

export function parseLocaleNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN;
  if (typeof value !== "string") return Number.NaN;

  const trimmed = value.trim().replace(/\s+/g, "");
  if (!trimmed) return Number.NaN;

  let normalized = trimmed;
  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma && hasDot) {
    const lastComma = normalized.lastIndexOf(",");
    const lastDot = normalized.lastIndexOf(".");
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = normalized.replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function choiceId(choice) {
  return choice && typeof choice === "object" ? choice.id : null;
}

function selectedChoice(exercise, response) {
  const choices = Array.isArray(exercise.choices) ? exercise.choices : [];
  if (
    response === null
    || response === undefined
    || (typeof response === "string" && response.trim() === "")
  ) {
    return null;
  }
  const responseId =
    response && typeof response === "object" && typeof response.id === "string"
      ? response.id
      : typeof response === "string" && !/^\s*[+-]?\d+\s*$/.test(response)
        ? response
        : null;
  if (responseId !== null) {
    const index = choices.findIndex((choice) => choiceId(choice) === responseId);
    return index < 0 ? null : { index, id: responseId };
  }

  const index = typeof response === "number" ? response : Number(response);
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    (choices.length > 0 && index >= choices.length)
  ) {
    return null;
  }
  return { index, id: choiceId(choices[index]) };
}

export function evaluateExercise(exercise, response) {
  if (!exercise || exercise.type === "none" || exercise.type === "action") {
    return { correct: false, reason: "not-evaluable" };
  }

  if (exercise.type === "acknowledge") {
    return { correct: true, reason: "acknowledged" };
  }

  if (exercise.type === "choice") {
    const selected = selectedChoice(exercise, response);
    if (!selected) return { correct: false, reason: "missing-response" };
    const correct =
      typeof exercise.answerId === "string"
        ? selected.id === exercise.answerId
        : selected.index === exercise.answerIndex;
    return {
      correct,
      reason: "evaluated",
      selectedIndex: selected.index,
      ...(selected.id ? { selectedId: selected.id } : {}),
    };
  }

  if (exercise.type === "numeric") {
    const value = parseLocaleNumber(response);
    if (!Number.isFinite(value)) {
      return { correct: false, reason: "invalid-number" };
    }

    const absoluteTolerance = Number.isFinite(exercise.absoluteTolerance)
      ? Math.abs(exercise.absoluteTolerance)
      : 0;
    const relativeTolerance = Number.isFinite(exercise.relativeTolerance)
      ? Math.abs(exercise.relativeTolerance)
      : 0;
    const allowedError = Math.max(
      absoluteTolerance,
      Math.abs(exercise.expected) * relativeTolerance,
    );
    const error = Math.abs(value - exercise.expected);

    return {
      correct: error <= allowedError,
      reason: "evaluated",
      value,
      error,
      allowedError,
    };
  }

  if (exercise.type === "expression") {
    try {
      const result = evaluateMathExpressionAnswer(response, exercise.answerPolicy);
      return { ...result, reason: result.code };
    } catch {
      return {
        correct: false,
        reason: "invalid-answer-policy",
        code: "invalid-policy",
        message: "La configuración de esta respuesta matemática no es válida.",
      };
    }
  }

  if (exercise.type === "sequence") {
    return { correct: false, reason: "sequence-requires-item" };
  }

  return { correct: false, reason: "unknown-exercise-type" };
}
