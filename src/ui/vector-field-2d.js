const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const VIEWBOX_SIZE = 100;
const PLOT_PADDING = 9;

function finiteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${label} debe ser un número finito.`);
  return number;
}

function positiveNumber(value, label) {
  const number = finiteNumber(value, label);
  if (number <= 0) throw new RangeError(`${label} debe ser mayor que cero.`);
  return number;
}

function integerAtLeast(value, minimum, label) {
  const number = finiteNumber(value, label);
  if (!Number.isInteger(number) || number < minimum) {
    throw new RangeError(`${label} debe ser un entero mayor o igual que ${minimum}.`);
  }
  return number;
}

function nonEmptyText(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${label} debe ser texto no vacío.`);
  }
  return value.trim();
}

function freezePoint(point) {
  return Object.freeze({ x: point.x, y: point.y });
}

export const VECTOR_FIELD_SHARED_VIEW = Object.freeze({
  domain: Object.freeze({
    x: Object.freeze([-2, 2]),
    y: Object.freeze([-2, 2]),
  }),
  samples: Object.freeze({ x: 9, y: 9 }),
  scale: 2.5,
});

export const VECTOR_FIELD_PARAMETER_RANGE = Object.freeze({
  min: 0.5,
  max: 1.5,
  step: 0.1,
  nominal: 1,
});

export function fieldA(x, y, params = {}) {
  const a = finiteNumber(params.a ?? VECTOR_FIELD_PARAMETER_RANGE.nominal, "a");
  return { u: a * finiteNumber(x, "x"), v: a * finiteNumber(y, "y") };
}

export function fieldB(x, y, params = {}) {
  const b = finiteNumber(params.b ?? VECTOR_FIELD_PARAMETER_RANGE.nominal, "b");
  const safeX = finiteNumber(x, "x");
  const safeY = finiteNumber(y, "y");
  const u = -b * safeY;
  const v = b * safeX;
  return { u: Object.is(u, -0) ? 0 : u, v: Object.is(v, -0) ? 0 : v };
}

export function normalizeVectorFieldDomain(domain = VECTOR_FIELD_SHARED_VIEW.domain) {
  const x = Array.isArray(domain?.x)
    ? domain.x
    : [domain?.xMin, domain?.xMax];
  const y = Array.isArray(domain?.y)
    ? domain.y
    : [domain?.yMin, domain?.yMax];
  const xMin = finiteNumber(x[0], "domain.x[0]");
  const xMax = finiteNumber(x[1], "domain.x[1]");
  const yMin = finiteNumber(y[0], "domain.y[0]");
  const yMax = finiteNumber(y[1], "domain.y[1]");
  if (xMin >= xMax || yMin >= yMax) {
    throw new RangeError("Cada intervalo del dominio debe ser estrictamente creciente.");
  }
  return Object.freeze({
    x: Object.freeze([xMin, xMax]),
    y: Object.freeze([yMin, yMax]),
  });
}

export function normalizeVectorFieldSamples(samples = VECTOR_FIELD_SHARED_VIEW.samples) {
  const x = typeof samples === "number" ? samples : samples?.x;
  const y = typeof samples === "number" ? samples : samples?.y;
  return Object.freeze({
    x: integerAtLeast(x, 2, "samples.x"),
    y: integerAtLeast(y, 2, "samples.y"),
  });
}

export function normalizeParameterDefinitions(definitions = {}) {
  const normalized = {};
  for (const [name, source] of Object.entries(definitions)) {
    const min = finiteNumber(source?.min, `parameters.${name}.min`);
    const max = finiteNumber(source?.max, `parameters.${name}.max`);
    const step = positiveNumber(source?.step, `parameters.${name}.step`);
    const nominal = finiteNumber(source?.nominal, `parameters.${name}.nominal`);
    if (min >= max) throw new RangeError(`El rango de ${name} debe ser creciente.`);
    if (nominal < min || nominal > max) {
      throw new RangeError(`El valor nominal de ${name} debe pertenecer a su rango.`);
    }
    normalized[name] = Object.freeze({
      label: typeof source.label === "string" && source.label.trim() ? source.label.trim() : name,
      min,
      max,
      step,
      nominal,
    });
  }
  return Object.freeze(normalized);
}

function decimalPlaces(value) {
  const text = String(value).toLowerCase();
  if (text.includes("e-")) return Number(text.split("e-")[1]);
  return text.includes(".") ? text.split(".")[1].length : 0;
}

export function constrainParameterValue(value, definition) {
  const numeric = finiteNumber(value, "valor del parámetro");
  const bounded = Math.min(definition.max, Math.max(definition.min, numeric));
  const steps = Math.round((bounded - definition.min) / definition.step);
  const snapped = definition.min + steps * definition.step;
  const precision = Math.max(
    decimalPlaces(definition.min),
    decimalPlaces(definition.max),
    decimalPlaces(definition.step),
  );
  return Number(Math.min(definition.max, Math.max(definition.min, snapped)).toFixed(precision));
}

export function normalizeParameterValues(definitions, values = {}) {
  const normalized = {};
  for (const [name, definition] of Object.entries(definitions)) {
    normalized[name] = constrainParameterValue(values[name] ?? definition.nominal, definition);
  }
  for (const name of Object.keys(values)) {
    if (!Object.hasOwn(definitions, name)) throw new RangeError(`Parámetro desconocido: ${name}.`);
  }
  return Object.freeze(normalized);
}

function normalizeIntegralCurves(option, domain) {
  if (!option) return Object.freeze({ enabled: false, seeds: Object.freeze([]) });
  const source = option === true ? {} : option;
  const defaultSeeds = [
    { x: (domain.x[1] - domain.x[0]) * 0.2, y: 0 },
    { x: 0, y: (domain.y[1] - domain.y[0]) * 0.3 },
  ];
  const seeds = (source.seeds ?? defaultSeeds).map((seed, index) =>
    freezePoint({
      x: finiteNumber(seed?.x, `integralCurves.seeds[${index}].x`),
      y: finiteNumber(seed?.y, `integralCurves.seeds[${index}].y`),
    }),
  );
  return Object.freeze({
    enabled: source.enabled !== false,
    seeds: Object.freeze(seeds),
    step: positiveNumber(source.step ?? Math.min(
      domain.x[1] - domain.x[0],
      domain.y[1] - domain.y[0],
    ) / 70, "integralCurves.step"),
    maxSteps: integerAtLeast(source.maxSteps ?? 160, 1, "integralCurves.maxSteps"),
  });
}

export function normalizeVectorFieldConfig(options = {}) {
  const domain = normalizeVectorFieldDomain(options.domain);
  const samples = normalizeVectorFieldSamples(options.samples);
  const parameters = normalizeParameterDefinitions(options.parameters);
  if (typeof options.field !== "function") throw new TypeError("field debe ser una función.");
  const id = nonEmptyText(options.id, "id");
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(id)) {
    throw new RangeError("id debe ser un identificador HTML estable sin espacios.");
  }
  return Object.freeze({
    id,
    title: nonEmptyText(options.title, "title"),
    caption: typeof options.caption === "string" ? options.caption.trim() : "",
    description: nonEmptyText(options.description, "description"),
    field: options.field,
    domain,
    samples,
    scale: positiveNumber(options.scale ?? VECTOR_FIELD_SHARED_VIEW.scale, "scale"),
    parameters,
    params: normalizeParameterValues(parameters, options.params),
    integralCurves: normalizeIntegralCurves(options.integralCurves, domain),
    showParameters: Boolean(options.showParameters),
    onParametersChange:
      typeof options.onParametersChange === "function" ? options.onParametersChange : null,
    errorMessage:
      typeof options.errorMessage === "string" && options.errorMessage.trim()
        ? options.errorMessage.trim()
        : "No fue posible representar este campo.",
  });
}

function validateFieldResult(result, x, y) {
  const u = finiteNumber(result?.u, `field(${x}, ${y}).u`);
  const v = finiteNumber(result?.v, `field(${x}, ${y}).v`);
  return Object.freeze({ x, y, u, v, magnitude: Math.hypot(u, v) });
}

export function sampleVectorField(field, { domain, samples, params = {} }) {
  if (typeof field !== "function") throw new TypeError("field debe ser una función.");
  const safeDomain = normalizeVectorFieldDomain(domain);
  const safeSamples = normalizeVectorFieldSamples(samples);
  const points = [];
  for (let row = 0; row < safeSamples.y; row += 1) {
    const y = safeDomain.y[0]
      + ((safeDomain.y[1] - safeDomain.y[0]) * row) / (safeSamples.y - 1);
    for (let column = 0; column < safeSamples.x; column += 1) {
      const x = safeDomain.x[0]
        + ((safeDomain.x[1] - safeDomain.x[0]) * column) / (safeSamples.x - 1);
      points.push(validateFieldResult(field(x, y, params), x, y));
    }
  }
  return Object.freeze(points);
}

function inDomain(point, domain) {
  return point.x >= domain.x[0] && point.x <= domain.x[1]
    && point.y >= domain.y[0] && point.y <= domain.y[1];
}

function normalizedDirection(field, point, params, direction) {
  const vector = validateFieldResult(field(point.x, point.y, params), point.x, point.y);
  if (vector.magnitude < 1e-10) return null;
  return {
    x: (direction * vector.u) / vector.magnitude,
    y: (direction * vector.v) / vector.magnitude,
  };
}

function traceDirection(field, seed, { domain, params, step, maxSteps }, direction) {
  const points = [];
  let current = { x: seed.x, y: seed.y };
  for (let index = 0; index < maxSteps; index += 1) {
    const first = normalizedDirection(field, current, params, direction);
    if (!first) break;
    const midpoint = {
      x: current.x + first.x * step * 0.5,
      y: current.y + first.y * step * 0.5,
    };
    const second = normalizedDirection(field, midpoint, params, direction);
    if (!second) break;
    const next = {
      x: current.x + second.x * step,
      y: current.y + second.y * step,
    };
    if (!inDomain(next, domain)) break;
    points.push(freezePoint(next));
    current = next;
  }
  return points;
}

export function traceIntegralCurve(field, seed, options) {
  const domain = normalizeVectorFieldDomain(options.domain);
  const safeSeed = freezePoint({
    x: finiteNumber(seed?.x, "seed.x"),
    y: finiteNumber(seed?.y, "seed.y"),
  });
  if (!inDomain(safeSeed, domain)) throw new RangeError("La semilla debe pertenecer al dominio.");
  const settings = {
    domain,
    params: options.params ?? {},
    step: positiveNumber(options.step, "step"),
    maxSteps: integerAtLeast(options.maxSteps, 1, "maxSteps"),
  };
  const backward = traceDirection(field, safeSeed, settings, -1).reverse();
  const forward = traceDirection(field, safeSeed, settings, 1);
  return Object.freeze([...backward, safeSeed, ...forward]);
}

export function mapPointToVectorFieldView(point, domain) {
  const safeDomain = normalizeVectorFieldDomain(domain);
  const width = VIEWBOX_SIZE - 2 * PLOT_PADDING;
  return Object.freeze({
    x: PLOT_PADDING + ((point.x - safeDomain.x[0]) / (safeDomain.x[1] - safeDomain.x[0])) * width,
    y: VIEWBOX_SIZE - PLOT_PADDING
      - ((point.y - safeDomain.y[0]) / (safeDomain.y[1] - safeDomain.y[0])) * width,
  });
}

export function createArrowGeometry(sample, { domain, scale }) {
  const center = mapPointToVectorFieldView(sample, domain);
  const fixedScale = positiveNumber(scale, "scale");
  const dx = finiteNumber(sample.u, "sample.u") * fixedScale;
  const dy = -finiteNumber(sample.v, "sample.v") * fixedScale;
  return Object.freeze({
    x1: center.x - dx / 2,
    y1: center.y - dy / 2,
    x2: center.x + dx / 2,
    y2: center.y + dy / 2,
  });
}

export function createFieldAConfig(overrides = {}) {
  return {
    id: "vector-field-a",
    title: "Campo A",
    caption: "Campo definido en ℝ²; ventana compartida: −2 ≤ x, y ≤ 2.",
    description:
      "Sobre los ejes, las flechas apuntan en el mismo sentido que la coordenada y crecen al alejarse del origen.",
    field: fieldA,
    domain: VECTOR_FIELD_SHARED_VIEW.domain,
    samples: VECTOR_FIELD_SHARED_VIEW.samples,
    scale: VECTOR_FIELD_SHARED_VIEW.scale,
    parameters: { a: { label: "a", ...VECTOR_FIELD_PARAMETER_RANGE } },
    params: { a: VECTOR_FIELD_PARAMETER_RANGE.nominal },
    integralCurves: true,
    showParameters: false,
    ...overrides,
  };
}

export function createFieldBConfig(overrides = {}) {
  return {
    id: "vector-field-b",
    title: "Campo B",
    caption: "Campo definido en ℝ²; ventana compartida: −2 ≤ x, y ≤ 2.",
    description:
      "En (1, 0) las flechas apuntan hacia y positiva; en (0, 1), hacia x negativa. El patrón gira alrededor del origen.",
    field: fieldB,
    domain: VECTOR_FIELD_SHARED_VIEW.domain,
    samples: VECTOR_FIELD_SHARED_VIEW.samples,
    scale: VECTOR_FIELD_SHARED_VIEW.scale,
    parameters: { b: { label: "b", ...VECTOR_FIELD_PARAMETER_RANGE } },
    params: { b: VECTOR_FIELD_PARAMETER_RANGE.nominal },
    integralCurves: true,
    showParameters: false,
    ...overrides,
  };
}

function svgElement(documentRef, tagName, attributes = {}) {
  const node = documentRef.createElementNS(SVG_NAMESPACE, tagName);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  return node;
}

function htmlElement(documentRef, tagName, { className, text, attributes } = {}) {
  const node = documentRef.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  for (const [name, value] of Object.entries(attributes ?? {})) {
    node.setAttribute(name, String(value));
  }
  return node;
}

function detectsReducedMotion(windowRef) {
  return Boolean(
    windowRef
      && typeof windowRef.matchMedia === "function"
      && windowRef.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
}

export class VectorField2D {
  constructor(options = {}) {
    if (!options.container || typeof options.container.append !== "function") {
      throw new TypeError("container debe ser un elemento DOM.");
    }
    this.document = options.documentRef ?? globalThis.document;
    if (!this.document?.createElement || !this.document?.createElementNS) {
      throw new TypeError("VectorField2D requiere una implementación del DOM.");
    }
    this.window = options.windowRef ?? globalThis.window;
    this.config = normalizeVectorFieldConfig(options);
    this.reducedMotion = options.reducedMotion ?? detectsReducedMotion(this.window);
    this.animationsEnabled = false;
    this.elements = {};
    this.#build(options.container);
    this.render();
  }

  #build(container) {
    const { id, title, description, caption } = this.config;
    const titleId = `${id}-title`;
    const descriptionId = `${id}-description`;
    const figure = htmlElement(this.document, "figure", {
      className: "interactive-figure vector-field-2d",
      attributes: {
        "data-vector-field-id": id,
        "data-reduced-motion": String(this.reducedMotion),
      },
    });
    const heading = htmlElement(this.document, "h4", {
      className: "interactive-figure-title",
      text: title,
      attributes: { id: titleId },
    });
    const descriptionNode = htmlElement(this.document, "p", {
      className: "interactive-figure-description",
      text: description,
      attributes: { id: descriptionId },
    });
    if (descriptionNode.style) {
      descriptionNode.style.position = "absolute";
      descriptionNode.style.width = "1px";
      descriptionNode.style.height = "1px";
      descriptionNode.style.padding = "0";
      descriptionNode.style.margin = "-1px";
      descriptionNode.style.overflow = "hidden";
      descriptionNode.style.clipPath = "inset(50%)";
      descriptionNode.style.whiteSpace = "nowrap";
      descriptionNode.style.border = "0";
    }
    const svg = svgElement(this.document, "svg", {
      viewBox: `0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`,
      preserveAspectRatio: "xMidYMid meet",
      role: "img",
      "aria-labelledby": titleId,
      "aria-describedby": descriptionId,
      "data-animation": "none",
      focusable: "false",
    });
    if (svg.style) {
      svg.style.display = "block";
      svg.style.width = "100%";
      svg.style.aspectRatio = "1 / 1";
      svg.style.animation = "none";
      svg.style.transition = "none";
    }
    const svgTitle = svgElement(this.document, "title");
    svgTitle.textContent = title;
    const svgDescription = svgElement(this.document, "desc");
    svgDescription.textContent = description;
    const definitions = svgElement(this.document, "defs");
    const marker = svgElement(this.document, "marker", {
      id: `${id}-arrowhead`,
      markerWidth: 5,
      markerHeight: 5,
      refX: 4.2,
      refY: 2.5,
      orient: "auto",
      markerUnits: "strokeWidth",
    });
    marker.append(svgElement(this.document, "path", {
      d: "M0,0 L5,2.5 L0,5 Z",
      fill: "currentColor",
    }));
    definitions.append(marker);
    const graph = svgElement(this.document, "g", { class: "vector-field-plot" });
    svg.append(svgTitle, svgDescription, definitions, graph);

    const error = htmlElement(this.document, "p", {
      className: "interactive-figure-error",
      attributes: { role: "alert" },
    });
    error.hidden = true;
    const controls = this.#buildParameterControls();
    const figcaption = htmlElement(this.document, "figcaption", {
      className: "interactive-figure-caption",
      text: caption,
    });
    figure.append(heading, svg, descriptionNode, error, controls, figcaption);
    container.append(figure);
    this.elements = { figure, heading, svg, graph, description: descriptionNode, error, controls };
    this.setParametersVisible(this.config.showParameters);
  }

  #buildParameterControls() {
    const fieldset = htmlElement(this.document, "fieldset", {
      className: "vector-field-parameters",
    });
    fieldset.append(htmlElement(this.document, "legend", { text: "Parámetros" }));
    fieldset.addEventListener("pointerdown", (event) => event.stopPropagation());
    fieldset.addEventListener("click", (event) => event.stopPropagation());
    fieldset.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " " || event.code === "Space") {
        event.stopPropagation();
      }
    });
    this.parameterElements = new Map();
    for (const [name, definition] of Object.entries(this.config.parameters)) {
      const row = htmlElement(this.document, "div", { className: "vector-field-parameter" });
      const inputId = `${this.config.id}-parameter-${name}`;
      const outputId = `${inputId}-value`;
      const label = htmlElement(this.document, "label", {
        text: `${definition.label}:`,
        attributes: { for: inputId },
      });
      const input = htmlElement(this.document, "input", {
        attributes: {
          id: inputId,
          name,
          type: "range",
          min: definition.min,
          max: definition.max,
          step: definition.step,
          value: this.config.params[name],
          "aria-describedby": outputId,
          "aria-valuetext": String(this.config.params[name]),
        },
      });
      const output = htmlElement(this.document, "output", {
        text: String(this.config.params[name]),
        attributes: { id: outputId, for: inputId, "aria-live": "polite" },
      });
      const reset = htmlElement(this.document, "button", {
        text: "Restablecer",
        attributes: { type: "button" },
      });
      input.addEventListener("input", () => this.updateParameters({ [name]: input.value }));
      reset.addEventListener("click", () => this.updateParameters({ [name]: definition.nominal }));
      row.append(label, input, output, reset);
      fieldset.append(row);
      this.parameterElements.set(name, { input, output, reset });
    }
    return fieldset;
  }

  #appendGridAndAxes(group) {
    const { domain, samples } = this.config;
    for (let index = 0; index < samples.x; index += 1) {
      const coordinate = PLOT_PADDING
        + ((VIEWBOX_SIZE - 2 * PLOT_PADDING) * index) / (samples.x - 1);
      group.append(svgElement(this.document, "line", {
        class: "vector-field-grid-line",
        stroke: "currentColor",
        "stroke-width": 0.25,
        opacity: 0.14,
        x1: coordinate,
        y1: PLOT_PADDING,
        x2: coordinate,
        y2: VIEWBOX_SIZE - PLOT_PADDING,
      }));
    }
    for (let index = 0; index < samples.y; index += 1) {
      const coordinate = PLOT_PADDING
        + ((VIEWBOX_SIZE - 2 * PLOT_PADDING) * index) / (samples.y - 1);
      group.append(svgElement(this.document, "line", {
        class: "vector-field-grid-line",
        stroke: "currentColor",
        "stroke-width": 0.25,
        opacity: 0.14,
        x1: PLOT_PADDING,
        y1: coordinate,
        x2: VIEWBOX_SIZE - PLOT_PADDING,
        y2: coordinate,
      }));
    }
    if (domain.x[0] <= 0 && domain.x[1] >= 0) {
      const origin = mapPointToVectorFieldView({ x: 0, y: domain.y[0] }, domain).x;
      group.append(svgElement(this.document, "line", {
        class: "vector-field-axis",
        stroke: "currentColor",
        "stroke-width": 0.55,
        opacity: 0.5,
        x1: origin,
        y1: PLOT_PADDING,
        x2: origin,
        y2: VIEWBOX_SIZE - PLOT_PADDING,
      }));
    }
    if (domain.y[0] <= 0 && domain.y[1] >= 0) {
      const origin = mapPointToVectorFieldView({ x: domain.x[0], y: 0 }, domain).y;
      group.append(svgElement(this.document, "line", {
        class: "vector-field-axis",
        stroke: "currentColor",
        "stroke-width": 0.55,
        opacity: 0.5,
        x1: PLOT_PADDING,
        y1: origin,
        x2: VIEWBOX_SIZE - PLOT_PADDING,
        y2: origin,
      }));
    }
  }

  #appendIntegralCurves(group) {
    const settings = this.config.integralCurves;
    if (!settings.enabled) return;
    for (const seed of settings.seeds) {
      const points = traceIntegralCurve(this.config.field, seed, {
        domain: this.config.domain,
        params: this.config.params,
        step: settings.step,
        maxSteps: settings.maxSteps,
      });
      if (points.length < 2) continue;
      const pathData = points.map((point, index) => {
        const mapped = mapPointToVectorFieldView(point, this.config.domain);
        return `${index === 0 ? "M" : "L"}${mapped.x.toFixed(3)},${mapped.y.toFixed(3)}`;
      }).join(" ");
      group.append(svgElement(this.document, "path", {
        class: "vector-field-integral-curve",
        d: pathData,
        fill: "none",
        stroke: "currentColor",
        "stroke-width": 0.55,
        "stroke-dasharray": "2 1.4",
        opacity: 0.52,
        "data-animation": "none",
      }));
    }
  }

  #appendArrows(group, samples) {
    for (const sample of samples) {
      const center = mapPointToVectorFieldView(sample, this.config.domain);
      if (sample.magnitude < 1e-10) {
        group.append(svgElement(this.document, "circle", {
          class: "vector-field-zero",
          cx: center.x,
          cy: center.y,
          r: 0.8,
          fill: "currentColor",
        }));
        continue;
      }
      const arrow = createArrowGeometry(sample, this.config);
      group.append(svgElement(this.document, "line", {
        class: "vector-field-arrow",
        x1: arrow.x1,
        y1: arrow.y1,
        x2: arrow.x2,
        y2: arrow.y2,
        stroke: "currentColor",
        "stroke-width": 0.72,
        "stroke-linecap": "round",
        "marker-end": `url(#${this.config.id}-arrowhead)`,
        "data-direction": "vector",
      }));
    }
  }

  render() {
    try {
      const samples = sampleVectorField(this.config.field, this.config);
      const fragment = this.document.createElementNS(SVG_NAMESPACE, "g");
      this.#appendGridAndAxes(fragment);
      this.#appendIntegralCurves(fragment);
      this.#appendArrows(fragment, samples);
      this.elements.graph.replaceChildren(...fragment.childNodes);
      this.elements.svg.hidden = false;
      this.elements.error.hidden = true;
      this.elements.error.textContent = "";
      this.samples = samples;
      return samples;
    } catch (error) {
      this.elements.graph.replaceChildren();
      this.elements.svg.hidden = true;
      this.elements.error.textContent = this.config.errorMessage;
      this.elements.error.hidden = false;
      this.lastError = error;
      return Object.freeze([]);
    }
  }

  updateParameters(partialParams, { notify = true } = {}) {
    const candidate = { ...this.config.params, ...partialParams };
    const params = normalizeParameterValues(this.config.parameters, candidate);
    const changed = Object.keys(params).filter((name) => params[name] !== this.config.params[name]);
    if (changed.length === 0) return this.getState();
    this.config = Object.freeze({ ...this.config, params });
    for (const name of changed) {
      const elements = this.parameterElements.get(name);
      if (!elements) continue;
      elements.input.value = String(params[name]);
      elements.input.setAttribute("aria-valuetext", String(params[name]));
      elements.output.textContent = String(params[name]);
    }
    const samples = this.render();
    const state = this.getState();
    if (notify) {
      this.config.onParametersChange?.(Object.freeze({
        id: this.config.id,
        params,
        changed: Object.freeze(changed),
        samples,
      }));
    }
    return state;
  }

  resetParameters(options) {
    const nominal = Object.fromEntries(
      Object.entries(this.config.parameters).map(([name, definition]) => [name, definition.nominal]),
    );
    return this.updateParameters(nominal, options);
  }

  setParametersVisible(visible) {
    const show = Boolean(visible);
    if (this.elements.controls) {
      this.elements.controls.hidden = !show;
      this.elements.controls.setAttribute("aria-hidden", String(!show));
    }
    return show;
  }

  getState() {
    return Object.freeze({
      id: this.config.id,
      params: this.config.params,
      reducedMotion: Boolean(this.reducedMotion),
      animationsEnabled: false,
      samples: this.samples ?? Object.freeze([]),
    });
  }

  destroy() {
    this.elements.figure?.remove();
    this.elements = {};
    this.parameterElements?.clear();
  }
}
