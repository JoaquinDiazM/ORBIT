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

export function evaluateExercise(exercise, response) {
  if (!exercise || exercise.type === "none" || exercise.type === "action") {
    return { correct: false, reason: "not-evaluable" };
  }

  if (exercise.type === "acknowledge") {
    return { correct: true, reason: "acknowledged" };
  }

  if (exercise.type === "choice") {
    const selectedIndex = Number(response);
    return {
      correct: Number.isInteger(selectedIndex) && selectedIndex === exercise.answerIndex,
      reason: Number.isInteger(selectedIndex) ? "evaluated" : "missing-response",
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

  return { correct: false, reason: "unknown-exercise-type" };
}
