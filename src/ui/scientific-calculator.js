import { MathExpressionError } from "../core/math-expression.js";
import { evaluateScientificExpression } from "../core/scientific-expression.js";

function element(documentRef, tagName, { className, text, attributes } = {}) {
  const node = documentRef.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  for (const [name, value] of Object.entries(attributes ?? {})) {
    node.setAttribute(name, String(value));
  }
  return node;
}

export function formatScientificResult(value) {
  if (!Number.isFinite(value)) throw new TypeError("El resultado debe ser finito.");
  if (Object.is(value, -0) || value === 0) return "0";
  return String(Number(value.toPrecision(12)));
}

export function describeScientificError(error) {
  if (!(error instanceof MathExpressionError)) {
    return "No fue posible evaluar la expresión.";
  }
  if (["input-too-long", "too-many-tokens", "tree-too-deep", "evaluation-limit"].includes(error.code)) {
    return "La expresión supera los límites de complejidad permitidos.";
  }
  if (["division-by-zero", "invalid-domain", "non-finite-result", "undefined-symbol"].includes(error.code)) {
    return "La expresión no está definida o no produce un resultado finito.";
  }
  if (["function-not-allowed", "symbol-not-allowed", "ambiguous-symbol"].includes(error.code)) {
    return "La expresión contiene una función o un símbolo no admitido.";
  }
  return "Revisa la sintaxis de la expresión.";
}

export class ScientificCalculator {
  constructor({ container, documentRef = globalThis.document } = {}) {
    if (!container?.append) throw new TypeError("ScientificCalculator requiere un contenedor DOM.");
    this.document = documentRef;
    this.container = container;
    this.#build();
  }

  #build() {
    const section = element(this.document, "section", { className: "gadget-tool calculator-tool" });
    section.append(
      element(this.document, "h3", { text: "Calculadora científica" }),
      element(this.document, "p", {
        text: "Disponible desde el inicio. Usa radianes y admite pi, e, potencias, raíces, funciones trigonométricas, logaritmos y notación científica.",
      }),
    );

    const form = element(this.document, "form", { className: "gadget-form" });
    const inputId = "scientific-calculator-expression";
    const label = element(this.document, "label", {
      className: "field-label",
      text: "Expresión",
      attributes: { for: inputId },
    });
    const input = element(this.document, "input", {
      attributes: {
        id: inputId,
        name: "expression",
        type: "text",
        value: "sin(pi/2)+sqrt(9)",
        autocomplete: "off",
        spellcheck: "false",
        inputmode: "text",
        "aria-describedby": "scientific-calculator-help",
      },
    });
    input.value = "sin(pi/2)+sqrt(9)";
    const help = element(this.document, "p", {
      className: "field-help",
      text: "Funciones: sin, cos, tan, asin, acos, atan, sqrt, abs, ln, log y exp. Los ángulos se expresan en radianes.",
      attributes: { id: "scientific-calculator-help" },
    });
    const submit = element(this.document, "button", {
      text: "Calcular",
      attributes: { type: "submit" },
    });
    const resultLabel = element(this.document, "span", {
      className: "calculator-result-label",
      text: "Resultado",
    });
    const result = element(this.document, "output", {
      className: "calculator-result",
      text: "4",
      attributes: {
        for: inputId,
        "aria-live": "polite",
        "aria-labelledby": "scientific-calculator-result-label",
      },
    });
    resultLabel.id = "scientific-calculator-result-label";
    const error = element(this.document, "p", {
      className: "interactive-figure-error",
      attributes: { role: "alert" },
    });
    error.hidden = true;
    form.append(label, input, help, submit);
    section.append(form, resultLabel, result, error);
    this.container.append(section);
    this.elements = { section, form, input, submit, result, error };
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.calculate();
    });
  }

  calculate(expression = this.elements.input.value) {
    try {
      const value = evaluateScientificExpression(expression);
      const formatted = formatScientificResult(value);
      this.elements.result.textContent = formatted;
      this.elements.error.textContent = "";
      this.elements.error.hidden = true;
      return Object.freeze({ ok: true, value, formatted });
    } catch (error) {
      const message = describeScientificError(error);
      this.elements.error.textContent = message;
      this.elements.error.hidden = false;
      return Object.freeze({ ok: false, error, message });
    }
  }

  destroy() {
    this.elements?.section?.remove();
    this.elements = {};
  }
}
