import assert from "node:assert/strict";
import test from "node:test";
import {
  VECTOR_FIELD_PARAMETER_RANGE,
  VECTOR_FIELD_SHARED_VIEW,
  VectorField2D,
  createArrowGeometry,
  createFieldAConfig,
  createFieldBConfig,
  fieldA,
  fieldB,
  normalizeVectorFieldConfig,
  sampleVectorField,
  traceIntegralCurve,
} from "../src/ui/vector-field-2d.js";

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.childNodes = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.style = {};
    this.hidden = false;
    this.textContent = "";
    this.className = "";
    this.parentNode = null;
    this.value = "";
  }

  append(...nodes) {
    for (const node of nodes) {
      this.childNodes.push(node);
      node.parentNode = this;
    }
  }

  replaceChildren(...nodes) {
    this.childNodes = [];
    this.append(...nodes);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === "value") this.value = String(value);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }

  dispatch(type, properties = {}) {
    const event = {
      type,
      target: this,
      key: "",
      stopped: false,
      stopPropagation() { this.stopped = true; },
      ...properties,
    };
    for (const listener of this.listeners.get(type) ?? []) listener(event);
    return event;
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.childNodes = this.parentNode.childNodes.filter((node) => node !== this);
    this.parentNode = null;
  }
}

const fakeDocument = {
  createElement: (tagName) => new FakeElement(tagName),
  createElementNS: (_namespace, tagName) => new FakeElement(tagName),
};

function descendants(root) {
  return [root, ...root.childNodes.flatMap((node) => descendants(node))];
}

test("los campos A y B producen los vectores esperados en puntos conocidos", () => {
  assert.deepEqual(fieldA(2, -3, { a: 1.5 }), { u: 3, v: -4.5 });
  assert.deepEqual(fieldA(0, 0, { a: 0.5 }), { u: 0, v: 0 });
  assert.deepEqual(fieldB(2, -3, { b: 1.5 }), { u: 4.5, v: 3 });
  assert.deepEqual(fieldB(0, 0, { b: 0.5 }), { u: 0, v: 0 });
});

test("ambas configuraciones comparten dominio, muestreo y escala fija", () => {
  const a = normalizeVectorFieldConfig(createFieldAConfig());
  const b = normalizeVectorFieldConfig(createFieldBConfig());
  assert.deepEqual(a.domain, VECTOR_FIELD_SHARED_VIEW.domain);
  assert.deepEqual(b.domain, VECTOR_FIELD_SHARED_VIEW.domain);
  assert.deepEqual(a.samples, b.samples);
  assert.equal(a.scale, b.scale);
  assert.equal(a.samples.x, 9);
  assert.equal(a.samples.y, 9);
});

test("el valor nominal queda al centro y el rango no admite b = 0", () => {
  const midpoint = (VECTOR_FIELD_PARAMETER_RANGE.min + VECTOR_FIELD_PARAMETER_RANGE.max) / 2;
  assert.equal(VECTOR_FIELD_PARAMETER_RANGE.nominal, midpoint);
  const config = normalizeVectorFieldConfig(createFieldBConfig({ params: { b: 0 } }));
  assert.equal(config.parameters.b.min, 0.5);
  assert.equal(config.params.b, 0.5);
  assert.ok(config.params.b > 0);
});

test("el muestreador es determinista e incluye el origen de una malla impar", () => {
  const config = normalizeVectorFieldConfig(createFieldAConfig());
  const first = sampleVectorField(config.field, config);
  const second = sampleVectorField(config.field, config);
  assert.deepEqual(first, second);
  assert.equal(first.length, 81);
  assert.deepEqual(
    first.find((point) => point.x === 0 && point.y === 0),
    { x: 0, y: 0, u: 0, v: 0, magnitude: 0 },
  );
});

test("la escala de flechas es fija y conserva la dirección", () => {
  const geometry = createArrowGeometry(
    { x: 0, y: 0, u: 2, v: -1 },
    { domain: VECTOR_FIELD_SHARED_VIEW.domain, scale: 2.5 },
  );
  assert.equal(geometry.x2 - geometry.x1, 5);
  assert.equal(geometry.y2 - geometry.y1, 2.5);
});

test("las curvas integrales se calculan desde el campo y sin aleatoriedad", () => {
  const options = {
    domain: VECTOR_FIELD_SHARED_VIEW.domain,
    params: { b: 1 },
    step: 0.05,
    maxSteps: 30,
  };
  const curve = traceIntegralCurve(fieldB, { x: 1, y: 0 }, options);
  assert.deepEqual(curve, traceIntegralCurve(fieldB, { x: 1, y: 0 }, options));
  assert.ok(curve.length > 20);
  for (const point of curve) assert.ok(Math.abs(Math.hypot(point.x, point.y) - 1) < 0.01);
});

test("el renderer accesible actualiza parámetros directamente y nunca anima", () => {
  const container = new FakeElement("div");
  const notifications = [];
  const renderer = new VectorField2D({
    container,
    documentRef: fakeDocument,
    windowRef: { matchMedia: () => ({ matches: true }) },
    ...createFieldAConfig({
      showParameters: true,
      onParametersChange: (event) => notifications.push(event),
    }),
  });
  assert.equal(container.childNodes.length, 1);
  assert.equal(renderer.elements.svg.getAttribute("role"), "img");
  assert.match(renderer.elements.svg.getAttribute("aria-labelledby"), /vector-field-a-title/);
  assert.match(renderer.elements.svg.getAttribute("aria-describedby"), /vector-field-a-description/);
  assert.equal(renderer.elements.svg.getAttribute("data-animation"), "none");
  assert.equal(renderer.getState().reducedMotion, true);
  assert.equal(renderer.getState().animationsEnabled, false);
  assert.equal(renderer.elements.controls.hidden, false);

  const input = descendants(renderer.elements.controls).find((node) => node.tagName === "input");
  input.value = "1.4";
  input.dispatch("input");
  assert.equal(renderer.getState().params.a, 1.4);
  assert.equal(notifications.length, 1);
  assert.deepEqual(notifications[0].changed, ["a"]);

  const reset = descendants(renderer.elements.controls)
    .find((node) => node.tagName === "button" && node.textContent === "Restablecer");
  reset.dispatch("click");
  assert.equal(renderer.getState().params.a, 1);
  assert.equal(input.value, "1");
});

test("los controles frenan selección accidental de la tarjeta pero conservan Tab", () => {
  const container = new FakeElement("div");
  const renderer = new VectorField2D({
    container,
    documentRef: fakeDocument,
    ...createFieldBConfig({ showParameters: true }),
  });
  assert.equal(renderer.elements.controls.dispatch("click").stopped, true);
  assert.equal(renderer.elements.controls.dispatch("keydown", { key: "Enter" }).stopped, true);
  assert.equal(renderer.elements.controls.dispatch("keydown", { key: " " }).stopped, true);
  assert.equal(renderer.elements.controls.dispatch("keydown", { key: "ArrowRight" }).stopped, false);
  assert.equal(renderer.elements.controls.dispatch("keydown", { key: "Tab" }).stopped, false);
  renderer.setParametersVisible(false);
  assert.equal(renderer.elements.controls.hidden, true);
  assert.equal(renderer.elements.controls.getAttribute("aria-hidden"), "true");
});
