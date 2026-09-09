import { renderMath } from "./math-renderer.js";

import { tokenizeAcademicMath as tokenizeAcademicText } from "../core/math-typesetting.js";
export { tokenizeAcademicText };

export function appendAcademicText(target, value, { render = renderMath } = {}) {
  const tokens = tokenizeAcademicText(value);
  if (!tokens.some(({ type }) => type === "math")) {
    target.textContent = tokens.map(({ value: text }) => text).join("");
    return target;
  }
  for (const token of tokens) {
    const span = document.createElement("span");
    if (token.type === "math") {
      span.className = "inline-math";
      render(span, token.value, { displayMode: token.displayMode });
    } else span.textContent = token.value;
    target.append(span);
  }
  return target;
}
