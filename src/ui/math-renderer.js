import katex from "katex";

export const KATEX_RENDER_OPTIONS = Object.freeze({
  output: "htmlAndMathml",
  throwOnError: true,
  trust: false,
  strict: "error",
  maxExpand: 1000,
  maxSize: 20,
});

let equationId = 0;

export function getEquationTex(equation) {
  if (typeof equation === "string") return equation.trim();
  if (equation && typeof equation === "object" && typeof equation.tex === "string") {
    return equation.tex.trim();
  }
  return "";
}

export function renderMath(target, equation, { displayMode = true } = {}) {
  const tex = getEquationTex(equation);
  target.textContent = tex || "Ecuación no disponible.";
  target.classList?.remove("math-render-error");

  if (!tex) {
    target.classList?.add("math-render-error");
    return false;
  }

  try {
    katex.render(tex, target, {
      ...KATEX_RENDER_OPTIONS,
      displayMode,
    });
    return true;
  } catch (error) {
    target.textContent = tex;
    target.classList?.add("math-render-error");
    console.error("No se pudo renderizar una ecuación de ORBIT con KaTeX.", error);
    return false;
  }
}

export function createEquationFigure(equation) {
  const figure = document.createElement("figure");
  figure.className = "equation-card";

  const viewport = document.createElement("div");
  viewport.className = "equation-render";
  viewport.tabIndex = 0;

  const captionText =
    equation && typeof equation === "object" && typeof equation.caption === "string"
      ? equation.caption.trim()
      : "";

  if (captionText) {
    equationId += 1;
    const caption = document.createElement("figcaption");
    caption.className = "equation-caption";
    caption.id = `equation-caption-${equationId}`;
    caption.textContent = captionText;
    viewport.setAttribute("aria-describedby", caption.id);
    figure.append(viewport, caption);
  } else {
    figure.append(viewport);
  }

  figure.dataset.rendered = renderMath(viewport, equation) ? "true" : "false";
  return figure;
}
