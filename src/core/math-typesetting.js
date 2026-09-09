import katex from "katex";

export const KATEX_RENDER_OPTIONS = Object.freeze({
  output: "htmlAndMathml", throwOnError: true, trust: false,
  strict: "error", maxExpand: 1000, maxSize: 20,
});
export const MATH_TYPESETTING_LIMITS = Object.freeze({ maxLength: 12_000, cacheEntries: 256 });
const validTypesetting = new Map();

/** Uses the public, DOM-free KaTeX API and retains only bounded successful keys. */
export function validateMathTypesetting(tex, { displayMode = false } = {}) {
  if (typeof tex !== "string" || !tex.trim() || tex.length > MATH_TYPESETTING_LIMITS.maxLength) {
    return { ok: false, message: "La expresión TeX está vacía o excede el límite de longitud." };
  }
  const key = `${displayMode ? "display" : "inline"}:${tex}`;
  if (validTypesetting.has(key)) return { ok: true };
  try {
    katex.renderToString(tex, { ...KATEX_RENDER_OPTIONS, displayMode });
    if (validTypesetting.size >= MATH_TYPESETTING_LIMITS.cacheEntries) validTypesetting.delete(validTypesetting.keys().next().value);
    validTypesetting.set(key, true);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: `TeX inválido: ${error.message}` };
  }
}

/** Shared lexical contract for compilation and display; never interprets HTML. */
export function tokenizeAcademicMath(value, { strict = false, includeOffsets = false } = {}) {
  const source = String(value ?? "");
  const tokens = [];
  let plain = "";
  const flush = () => { if (plain) tokens.push({ type: "text", value: plain }); plain = ""; };
  const invalid = (message, offset) => {
    const error = new Error(message); error.code = "math-delimiter"; error.offset = offset; throw error;
  };
  for (let index = 0; index < source.length;) {
    if (source.startsWith("\\$", index)) { plain += "$"; index += 2; continue; }
    if (source.startsWith("\\\\", index)) { plain += "\\\\"; index += 2; continue; }
    const parenthesized = source.startsWith("\\(", index);
    const bracketed = source.startsWith("\\[", index);
    const dollar = source[index] === "$";
    if (!parenthesized && !bracketed && !dollar) {
      if (strict && (source.startsWith("\\)", index) || source.startsWith("\\]", index))) invalid("Hay un cierre matemático sin apertura.", index);
      plain += source[index++]; continue;
    }
    const opener = parenthesized ? "\\(" : bracketed ? "\\[" : source.startsWith("$$", index) ? "$$" : "$";
    const closer = parenthesized ? "\\)" : bracketed ? "\\]" : opener;
    let end = index + opener.length;
    while (end < source.length) {
      if (source.startsWith(closer, end)) break;
      if (source.startsWith("\\$", end) || source.startsWith("\\\\", end)) { end += 2; continue; }
      if (strict && (source[end] === "$" || source.startsWith("\\)", end) || source.startsWith("\\]", end))) invalid("Los delimitadores matemáticos no coinciden.", end);
      end += 1;
    }
    const tex = source.slice(index + opener.length, end);
    if (end >= source.length || !tex.trim()) {
      if (strict) invalid("La expresión matemática está vacía o no tiene cierre.", index);
      plain += opener; index += opener.length; continue;
    }
    flush();
    tokens.push({ type: "math", value: tex, displayMode: bracketed || opener === "$$",
      ...(includeOffsets ? { offset: index + opener.length } : {}) });
    index = end + closer.length;
  }
  flush();
  return tokens;
}
