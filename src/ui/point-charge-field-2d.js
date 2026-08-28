import {
  mapPointToVectorFieldView,
  normalizeVectorFieldDomain,
} from "./vector-field-2d.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const VIEWBOX_SIZE = 100;

export const POINT_CHARGE_VALUE_RANGE = Object.freeze({
  min: -1,
  max: 1,
  step: 0.1,
});

export const POINT_CHARGE_DOMAIN = Object.freeze({
  x: Object.freeze([-2, 2]),
  y: Object.freeze([-2, 2]),
});

function finiteNumber(value, label) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) throw new TypeError(`${label} debe ser un número finito.`);
  return numeric;
}

function nonEmptyText(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${label} debe ser texto no vacío.`);
  }
  return value.trim();
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function decimalPlaces(value) {
  const text = String(value).toLowerCase();
  if (text.includes("e-")) return Number(text.split("e-")[1]);
  return text.includes(".") ? text.split(".")[1].length : 0;
}

function snap(value, { min, max, step }) {
  const bounded = clamp(finiteNumber(value, "valor"), min, max);
  const steps = Math.round((bounded - min) / step);
  return Number((min + steps * step).toFixed(decimalPlaces(step)));
}

function normalizeRange(range = POINT_CHARGE_VALUE_RANGE) {
  const min = finiteNumber(range.min, "chargeRange.min");
  const max = finiteNumber(range.max, "chargeRange.max");
  const step = finiteNumber(range.step, "chargeRange.step");
  if (min >= max || step <= 0) throw new RangeError("El rango de carga debe ser creciente.");
  if (min > 0 || max < 0) throw new RangeError("El rango de carga debe incluir el valor cero.");
  return Object.freeze({ min, max, step });
}

function normalizePoint(point, domain, label) {
  return Object.freeze({
    x: clamp(finiteNumber(point?.x, `${label}.x`), domain.x[0], domain.x[1]),
    y: clamp(finiteNumber(point?.y, `${label}.y`), domain.y[0], domain.y[1]),
  });
}

export function normalizePointChargeConfig(options = {}) {
  const domain = normalizeVectorFieldDomain(options.domain ?? POINT_CHARGE_DOMAIN);
  const chargeRange = normalizeRange(options.chargeRange);
  const charges = (options.charges ?? []).map((charge, index) => {
    const id = nonEmptyText(charge?.id, `charges[${index}].id`);
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(id)) {
      throw new RangeError(`charges[${index}].id debe ser un identificador estable.`);
    }
    return Object.freeze({
      id,
      label: nonEmptyText(charge?.label ?? `Carga ${index + 1}`, `charges[${index}].label`),
      ...normalizePoint(charge, domain, `charges[${index}]`),
      value: snap(charge?.value ?? 0, chargeRange),
    });
  });
  if (charges.length === 0) throw new RangeError("La figura requiere al menos una carga.");
  if (new Set(charges.map((charge) => charge.id)).size !== charges.length) {
    throw new RangeError("Los IDs de carga no pueden repetirse.");
  }

  return Object.freeze({
    id: nonEmptyText(options.id, "id"),
    title: nonEmptyText(options.title, "title"),
    caption: typeof options.caption === "string" ? options.caption.trim() : "",
    description: nonEmptyText(options.description, "description"),
    domain,
    chargeRange,
    charges: Object.freeze(charges),
    probe: normalizePoint(options.probe ?? { x: 0, y: 0 }, domain, "probe"),
    keyboardStep: Math.max(0.01, finiteNumber(options.keyboardStep ?? 0.1, "keyboardStep")),
    singularityRadius: Math.max(
      0,
      finiteNumber(options.singularityRadius ?? 0, "singularityRadius"),
    ),
    onStateChange:
      typeof options.onStateChange === "function" ? options.onStateChange : null,
    onInteraction:
      typeof options.onInteraction === "function" ? options.onInteraction : null,
  });
}

export function normalizedElectricFieldAtPoint(charges, point, { singularityRadius = 0 } = {}) {
  const target = {
    x: finiteNumber(point?.x, "point.x"),
    y: finiteNumber(point?.y, "point.y"),
  };
  const contributions = [];
  let u = 0;
  let v = 0;

  for (const [index, charge] of charges.entries()) {
    const dx = target.x - finiteNumber(charge?.x, `charges[${index}].x`);
    const dy = target.y - finiteNumber(charge?.y, `charges[${index}].y`);
    const value = finiteNumber(charge?.value, `charges[${index}].value`);
    const distance = Math.hypot(dx, dy);
    if (Math.abs(value) < 1e-12) {
      contributions.push(Object.freeze({
        chargeId: charge.id ?? String(index),
        u: 0,
        v: 0,
        magnitude: 0,
      }));
      continue;
    }
    if (distance <= singularityRadius) {
      return Object.freeze({
        defined: false,
        reason: "probe-overlaps-charge",
        chargeId: charge.id ?? String(index),
        contributions: Object.freeze(contributions),
      });
    }
    const factor = value / distance ** 3;
    const contribution = Object.freeze({
      chargeId: charge.id ?? String(index),
      u: factor * dx,
      v: factor * dy,
      magnitude: Math.abs(value) / distance ** 2,
    });
    contributions.push(contribution);
    u += contribution.u;
    v += contribution.v;
  }

  return Object.freeze({
    defined: true,
    u,
    v,
    magnitude: Math.hypot(u, v),
    contributions: Object.freeze(contributions),
  });
}

export function movePointCharge(charge, position, domain = POINT_CHARGE_DOMAIN) {
  const safeDomain = normalizeVectorFieldDomain(domain);
  return Object.freeze({
    ...charge,
    ...normalizePoint(position, safeDomain, "position"),
  });
}

export function pointChargeKeyboardOffset(
  key,
  { step = POINT_CHARGE_VALUE_RANGE.step, accelerated = false } = {},
) {
  const directions = {
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    ArrowUp: { x: 0, y: 1 },
    ArrowDown: { x: 0, y: -1 },
  };
  const direction = directions[key];
  if (!direction) return null;
  const safeStep = finiteNumber(step, "keyboardStep");
  if (safeStep <= 0) throw new RangeError("keyboardStep debe ser positivo.");
  const multiplier = accelerated ? 5 : 1;
  return Object.freeze({
    x: direction.x * safeStep * multiplier,
    y: direction.y * safeStep * multiplier,
  });
}

function svgElement(documentRef, name, attributes = {}) {
  const node = documentRef.createElementNS(SVG_NAMESPACE, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

function htmlElement(documentRef, name, { className, text, attributes } = {}) {
  const node = documentRef.createElement(name);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  for (const [key, value] of Object.entries(attributes ?? {})) node.setAttribute(key, String(value));
  return node;
}

function chargeValueLabel(value) {
  if (Math.abs(value) < 1e-12) return "0";
  return `${value > 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}`;
}

function vectorEndpoint(origin, vector, maximumLength = 18) {
  const magnitude = Math.hypot(vector.u, vector.v);
  if (magnitude < 1e-12) return { ...origin, length: 0 };
  const length = Math.min(maximumLength, 5 + Math.log1p(magnitude) * 4);
  return {
    x: origin.x + (vector.u / magnitude) * length,
    y: origin.y - (vector.v / magnitude) * length,
    length,
  };
}

export class PointChargeField2D {
  constructor({
    container,
    documentRef = container?.ownerDocument ?? globalThis.document,
    ...options
  } = {}) {
    if (!container || typeof container.replaceChildren !== "function") {
      throw new TypeError("PointChargeField2D requiere un contenedor DOM.");
    }
    if (!documentRef) throw new TypeError("PointChargeField2D requiere un documento DOM.");

    this.container = container;
    this.document = documentRef;
    this.config = normalizePointChargeConfig(options);
    this.charges = this.config.charges.map((charge) => ({ ...charge }));
    this.activePointerId = null;
    this.activeChargeId = null;
    this.chargeOutputs = new Map();
    this.chargeInputs = new Map();
    this.statusTimer = null;
    this.destroyed = false;

    this.figure = htmlElement(this.document, "figure", { className: "point-charge-field" });
    const headingId = `${this.config.id}-title`;
    const descriptionId = `${this.config.id}-description`;
    const caption = htmlElement(this.document, "figcaption", { className: "point-charge-caption" });
    caption.append(
      htmlElement(this.document, "h4", { text: this.config.title, attributes: { id: headingId } }),
      htmlElement(this.document, "p", {
        text: this.config.description,
        attributes: { id: descriptionId },
      }),
    );
    this.svg = svgElement(this.document, "svg", {
      viewBox: `0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`,
      role: "group",
      "aria-labelledby": headingId,
      "aria-describedby": descriptionId,
      "data-animation": "none",
      tabindex: "-1",
    });
    this.svg.classList.add("point-charge-plot");
    this.dynamicLayer = svgElement(this.document, "g", { class: "point-charge-dynamic" });
    this.#appendStaticPlot();
    this.svg.append(this.dynamicLayer);
    this.controls = htmlElement(this.document, "div", { className: "point-charge-controls" });
    this.status = htmlElement(this.document, "p", {
      className: "point-charge-status",
      attributes: { role: "status", "aria-live": "polite", "aria-atomic": "true" },
    });
    if (this.config.caption) caption.append(htmlElement(this.document, "p", { text: this.config.caption }));
    this.figure.append(caption, this.svg, this.controls, this.status);
    this.container.replaceChildren(this.figure);
    this.#appendControls();
    this.#bindPointerEvents();
    this.#redraw({ updateStatusImmediately: true });
  }

  getState() {
    return Object.freeze({
      charges: Object.freeze(this.charges.map((charge) => Object.freeze({ ...charge }))),
      probe: Object.freeze({ ...this.config.probe }),
    });
  }

  setChargeValue(chargeId, value) {
    const charge = this.charges.find((candidate) => candidate.id === chargeId);
    if (!charge) return false;
    charge.value = snap(value, this.config.chargeRange);
    this.#syncControl(charge);
    this.#redraw();
    this.#notify();
    return true;
  }

  setChargePosition(chargeId, position, { focus = false } = {}) {
    const index = this.charges.findIndex((charge) => charge.id === chargeId);
    if (index < 0) return false;
    this.charges[index] = { ...movePointCharge(this.charges[index], position, this.config.domain) };
    this.#redraw({ focusChargeId: focus ? chargeId : null });
    this.#notify();
    return true;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.statusTimer !== null) {
      this.document.defaultView?.clearTimeout(this.statusTimer);
      this.statusTimer = null;
    }
    this.container.replaceChildren();
    this.chargeOutputs.clear();
    this.chargeInputs.clear();
  }

  #appendStaticPlot() {
    const background = svgElement(this.document, "rect", {
      x: 9,
      y: 9,
      width: 82,
      height: 82,
      rx: 3,
      class: "point-charge-background",
    });
    this.svg.append(background);
    for (const coordinate of [-1, 0, 1]) {
      const verticalStart = mapPointToVectorFieldView({ x: coordinate, y: this.config.domain.y[0] }, this.config.domain);
      const verticalEnd = mapPointToVectorFieldView({ x: coordinate, y: this.config.domain.y[1] }, this.config.domain);
      const horizontalStart = mapPointToVectorFieldView({ x: this.config.domain.x[0], y: coordinate }, this.config.domain);
      const horizontalEnd = mapPointToVectorFieldView({ x: this.config.domain.x[1], y: coordinate }, this.config.domain);
      this.svg.append(
        svgElement(this.document, "line", {
          x1: verticalStart.x,
          y1: verticalStart.y,
          x2: verticalEnd.x,
          y2: verticalEnd.y,
          class: coordinate === 0 ? "point-charge-axis" : "point-charge-grid",
        }),
        svgElement(this.document, "line", {
          x1: horizontalStart.x,
          y1: horizontalStart.y,
          x2: horizontalEnd.x,
          y2: horizontalEnd.y,
          class: coordinate === 0 ? "point-charge-axis" : "point-charge-grid",
        }),
      );
    }

    const definitions = svgElement(this.document, "defs");
    for (const [suffix, className] of [["component", "point-charge-arrow-component"], ["result", "point-charge-arrow-result"]]) {
      const marker = svgElement(this.document, "marker", {
        id: `${this.config.id}-${suffix}-arrow`,
        viewBox: "0 0 10 10",
        refX: 8,
        refY: 5,
        markerWidth: 5,
        markerHeight: 5,
        orient: "auto-start-reverse",
      });
      marker.append(svgElement(this.document, "path", { d: "M 0 0 L 10 5 L 0 10 z", class: className }));
      definitions.append(marker);
    }
    this.svg.prepend(definitions);
  }

  #appendControls() {
    for (const charge of this.charges) {
      const row = htmlElement(this.document, "div", { className: "point-charge-control" });
      const inputId = `${this.config.id}-${charge.id}-value`;
      const label = htmlElement(this.document, "label", {
        text: `${charge.label} · valor normalizado`,
        attributes: { for: inputId },
      });
      const input = htmlElement(this.document, "input", {
        attributes: {
          id: inputId,
          type: "range",
          min: this.config.chargeRange.min,
          max: this.config.chargeRange.max,
          step: this.config.chargeRange.step,
          value: charge.value,
          "aria-describedby": `${inputId}-output`,
        },
      });
      const output = htmlElement(this.document, "output", {
        text: chargeValueLabel(charge.value),
        attributes: { id: `${inputId}-output`, for: inputId },
      });
      input.addEventListener("input", () => this.setChargeValue(charge.id, input.value));
      row.append(label, input, output);
      this.controls.append(row);
      this.chargeInputs.set(charge.id, input);
      this.chargeOutputs.set(charge.id, output);
    }
  }

  #bindPointerEvents() {
    this.svg.addEventListener("pointermove", (event) => {
      if (this.activePointerId !== event.pointerId || !this.activeChargeId) return;
      const position = this.#eventToDomainPoint(event);
      this.setChargePosition(this.activeChargeId, position);
    });
    const release = (event) => {
      if (this.activePointerId !== event.pointerId) return;
      this.svg.releasePointerCapture?.(event.pointerId);
      this.activePointerId = null;
      this.activeChargeId = null;
    };
    this.svg.addEventListener("pointerup", release);
    this.svg.addEventListener("pointercancel", release);
  }

  #eventToDomainPoint(event) {
    const rectangle = this.svg.getBoundingClientRect();
    const viewX = ((event.clientX - rectangle.left) / Math.max(1, rectangle.width)) * VIEWBOX_SIZE;
    const viewY = ((event.clientY - rectangle.top) / Math.max(1, rectangle.height)) * VIEWBOX_SIZE;
    const lowerLeft = mapPointToVectorFieldView(
      { x: this.config.domain.x[0], y: this.config.domain.y[0] },
      this.config.domain,
    );
    const upperRight = mapPointToVectorFieldView(
      { x: this.config.domain.x[1], y: this.config.domain.y[1] },
      this.config.domain,
    );
    return {
      x: this.config.domain.x[0]
        + ((viewX - lowerLeft.x) / (upperRight.x - lowerLeft.x))
          * (this.config.domain.x[1] - this.config.domain.x[0]),
      y: this.config.domain.y[0]
        + ((lowerLeft.y - viewY) / (lowerLeft.y - upperRight.y))
          * (this.config.domain.y[1] - this.config.domain.y[0]),
    };
  }

  #redraw({ focusChargeId = null, updateStatusImmediately = false } = {}) {
    if (this.destroyed) return;
    this.dynamicLayer.replaceChildren();
    const probeView = mapPointToVectorFieldView(this.config.probe, this.config.domain);
    const field = normalizedElectricFieldAtPoint(this.charges, this.config.probe, {
      singularityRadius: this.config.singularityRadius,
    });

    if (field.defined) {
      for (const contribution of field.contributions) {
        if (contribution.magnitude < 1e-12) continue;
        const endpoint = vectorEndpoint(probeView, contribution, 13);
        this.dynamicLayer.append(
          svgElement(this.document, "line", {
            x1: probeView.x,
            y1: probeView.y,
            x2: endpoint.x,
            y2: endpoint.y,
            class: "point-charge-contribution",
            "marker-end": `url(#${this.config.id}-component-arrow)`,
          }),
        );
      }
      const resultEndpoint = vectorEndpoint(probeView, field, 21);
      if (resultEndpoint.length > 0) {
        this.dynamicLayer.append(
          svgElement(this.document, "line", {
            x1: probeView.x,
            y1: probeView.y,
            x2: resultEndpoint.x,
            y2: resultEndpoint.y,
            class: "point-charge-resultant",
            "marker-end": `url(#${this.config.id}-result-arrow)`,
          }),
        );
      }
    }

    this.dynamicLayer.append(
      svgElement(this.document, "circle", {
        cx: probeView.x,
        cy: probeView.y,
        r: 2.4,
        class: "point-charge-probe",
      }),
      svgElement(this.document, "text", {
        x: probeView.x + 3.2,
        y: probeView.y - 3.2,
        class: "point-charge-probe-label",
      }),
    );
    this.dynamicLayer.lastChild.textContent = "P";

    for (const charge of this.charges) {
      const position = mapPointToVectorFieldView(charge, this.config.domain);
      const node = svgElement(this.document, "g", {
        transform: `translate(${position.x} ${position.y})`,
        class: `point-charge-node ${charge.value > 0 ? "positive" : charge.value < 0 ? "negative" : "neutral"}`,
        role: "button",
        tabindex: 0,
        "aria-label": `${charge.label}: ${chargeValueLabel(charge.value)}, posición x ${charge.x.toFixed(2)}, y ${charge.y.toFixed(2)}. Usa las flechas para moverla.`,
        "data-audio-cue": "none",
      });
      node.append(
        svgElement(this.document, "circle", { cx: 0, cy: 0, r: 5.4 }),
        svgElement(this.document, "text", { x: 0, y: 1.2, "text-anchor": "middle" }),
        svgElement(this.document, "text", { x: 0, y: 9.2, "text-anchor": "middle", class: "point-charge-node-label" }),
      );
      node.children[1].textContent = chargeValueLabel(charge.value);
      node.children[2].textContent = charge.label;
      node.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        this.activePointerId = event.pointerId;
        this.activeChargeId = charge.id;
        this.svg.setPointerCapture?.(event.pointerId);
        this.config.onInteraction?.();
      });
      node.addEventListener("keydown", (event) => {
        const offset = pointChargeKeyboardOffset(event.key, {
          step: this.config.keyboardStep,
          accelerated: event.shiftKey,
        });
        if (!offset) return;
        event.preventDefault();
        this.config.onInteraction?.();
        this.setChargePosition(
          charge.id,
          {
            x: charge.x + offset.x,
            y: charge.y + offset.y,
          },
          { focus: true },
        );
      });
      node.setAttribute("data-charge-id", charge.id);
      this.dynamicLayer.append(node);
    }

    const statusMessage = field.defined
      ? `Campo normalizado en P: Ex = ${field.u.toFixed(2)}, Ey = ${field.v.toFixed(2)}. Las flechas finas son contribuciones; la flecha gruesa es la suma.`
      : "Campo no definido en P: una carga coincide con el punto de observación. Muévela para continuar explorando.";
    this.#updateStatus(statusMessage, { immediately: updateStatusImmediately });

    if (focusChargeId) {
      this.dynamicLayer.querySelector(`[data-charge-id="${focusChargeId}"]`)?.focus();
    }
  }

  #syncControl(charge) {
    const input = this.chargeInputs.get(charge.id);
    const output = this.chargeOutputs.get(charge.id);
    if (input) input.value = String(charge.value);
    if (output) output.textContent = chargeValueLabel(charge.value);
  }

  #updateStatus(message, { immediately = false } = {}) {
    const view = this.document.defaultView;
    if (this.statusTimer !== null) {
      view?.clearTimeout(this.statusTimer);
      this.statusTimer = null;
    }
    if (immediately || !view?.setTimeout) {
      this.status.textContent = message;
      return;
    }
    this.statusTimer = view.setTimeout(() => {
      this.status.textContent = message;
      this.statusTimer = null;
    }, 160);
  }

  #notify() {
    this.config.onStateChange?.(this.getState());
  }
}
