const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function element(documentRef, tagName, { className, text, attributes } = {}) {
  const node = documentRef.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  for (const [name, value] of Object.entries(attributes ?? {})) {
    node.setAttribute(name, String(value));
  }
  return node;
}

function svgElement(documentRef, tagName, attributes = {}) {
  const node = documentRef.createElementNS(SVG_NAMESPACE, tagName);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  return node;
}

export function createSmithChartScaffold(documentRef = globalThis.document) {
  const figure = element(documentRef, "figure", { className: "smith-chart-scaffold" });
  const titleId = "smith-chart-scaffold-title";
  const descriptionId = "smith-chart-scaffold-description";
  const heading = element(documentRef, "h3", {
    text: "Carta de Smith — esqueleto",
    attributes: { id: titleId },
  });
  const description = element(documentRef, "p", {
    text: "Referencia preliminar del plano del coeficiente de reflexión: circunferencia unidad, eje real y familias representativas de resistencia y reactancia normalizadas.",
    attributes: { id: descriptionId },
  });
  const svg = svgElement(documentRef, "svg", {
    viewBox: "-112 -112 224 224",
    role: "img",
    "aria-labelledby": titleId,
    "aria-describedby": descriptionId,
  });
  const svgTitle = svgElement(documentRef, "title");
  svgTitle.textContent = "Esqueleto estático de una carta de Smith";
  const svgDescription = svgElement(documentRef, "desc");
  svgDescription.textContent = description.textContent;
  const definitions = svgElement(documentRef, "defs");
  const clip = svgElement(documentRef, "clipPath", { id: "smith-chart-unit-clip" });
  clip.append(svgElement(documentRef, "circle", { cx: 0, cy: 0, r: 100 }));
  definitions.append(clip);
  const grid = svgElement(documentRef, "g", {
    class: "smith-chart-grid",
    "clip-path": "url(#smith-chart-unit-clip)",
  });
  for (const resistance of [0.5, 1, 2]) {
    grid.append(svgElement(documentRef, "circle", {
      cx: (100 * resistance) / (1 + resistance),
      cy: 0,
      r: 100 / (1 + resistance),
    }));
  }
  for (const reactance of [-2, -1, -0.5, 0.5, 1, 2]) {
    grid.append(svgElement(documentRef, "circle", {
      cx: 100,
      cy: -100 / reactance,
      r: Math.abs(100 / reactance),
    }));
  }
  const boundary = svgElement(documentRef, "circle", {
    class: "smith-chart-boundary",
    cx: 0,
    cy: 0,
    r: 100,
  });
  const axis = svgElement(documentRef, "line", {
    class: "smith-chart-axis",
    x1: -100,
    y1: 0,
    x2: 100,
    y2: 0,
  });
  const match = svgElement(documentRef, "circle", {
    class: "smith-chart-match",
    cx: 0,
    cy: 0,
    r: 3.2,
  });
  svg.append(svgTitle, svgDescription, definitions, grid, boundary, axis, match);
  const caption = element(documentRef, "figcaption", {
    text: "Estructura de referencia únicamente. Esta versión no convierte impedancias, no traza recorridos y no resuelve ejercicios.",
  });
  figure.append(heading, description, svg, caption);
  return figure;
}

export class SmithChartScaffold {
  constructor({ container, documentRef = globalThis.document } = {}) {
    if (!container?.append) throw new TypeError("SmithChartScaffold requiere un contenedor DOM.");
    this.figure = createSmithChartScaffold(documentRef);
    container.append(this.figure);
  }

  destroy() {
    this.figure?.remove();
    this.figure = null;
  }
}
