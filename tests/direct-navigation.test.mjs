import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_DIRECT_NEIGHBORS,
  canonicalToDisplay,
  createDirectLayout,
  createDirectNavigationIndex,
  displayToCanonical,
  getAreaRelationViolations,
} from "../src/core/direct-navigation.js";
import { AXIAL_DIRECTIONS, axialToPixel } from "../src/core/hex.js";

const HEX_SIZE = 160;

function area(id, order) {
  return { id, title: id, shortTitle: id, q: order * 3, r: -order, order };
}

function location(id, areaId, extra = {}) {
  return { id, areaId, kind: "lesson", offset: { x: 4, y: -8 }, ...extra };
}

function connectedCourse(count = 3, fillerCount = 8) {
  const neighbors = Array.from({ length: count }, (_, index) => `related-${index}`);
  const fillers = Array.from({ length: fillerCount }, (_, index) => `filler-${index}`);
  const ids = ["origin", "hub", ...neighbors, ...fillers];
  const areas = ids.map(area);
  const locations = [location("hub-node", "hub"), ...neighbors.map((id) => location(id, id))];
  const connections = neighbors.map((id, index) => index % 2
    ? { sourceId: id, targetId: "hub-node" }
    : { sourceId: "hub-node", targetId: id });
  return { areas, locations, connections };
}

function layout(index, options = {}) {
  return createDirectLayout({ index, centerAreaId: "hub", courseRevision: "revision-a", hexSize: HEX_SIZE, ...options });
}

function closePoint(actual, expected) {
  assert.ok(Math.abs(actual.x - expected.x) < 1e-9, `${actual.x} ≠ ${expected.x}`);
  assert.ok(Math.abs(actual.y - expected.y) < 1e-9, `${actual.y} ≠ ${expected.y}`);
}

test("las relaciones unen entrada y salida, deduplican zonas y excluyen inventario y tipos laterales", () => {
  const areas = ["a", "b", "c", "d", "e", "origin"].map(area);
  const locations = [
    location("a1", "a"), location("a2", "a"), location("b", "b", { kind: "mission" }),
    location("c", "c"), location("npc", "d", { kind: "npc" }),
    location("inventory", "d", { lifecycle: "inventory" }),
    location("deleted", "e", { lifecycle: "deleted" }),
  ];
  const connections = [
    ["a1", "b"], ["a1", "b"], ["b", "a2"], ["c", "a1"], ["a1", "a2"],
    ["npc", "a1"], ["a1", "inventory"], ["deleted", "a1"], ["unknown", "a1"],
  ].map(([sourceId, targetId]) => ({ sourceId, targetId }));
  const index = createDirectNavigationIndex({ areas, locations, connections });
  assert.deepEqual([...index.relatedAreaIds.get("a")], ["b", "c"]);
  assert.deepEqual([...index.relatedAreaIds.get("b")], ["a"]);
  assert.deepEqual([...index.relatedAreaIds.get("c")], ["a"]);
  for (const id of ["d", "e", "origin"]) assert.equal(index.relatedAreaIds.get(id).size, 0);
});

test("el adaptador runtime deriva solo completedLocations y coincide con las conexiones explícitas", () => {
  const course = connectedCourse();
  for (const item of course.locations) {
    item.requirements = {
      completedLocations: course.connections.filter(({ targetId }) => targetId === item.id).map(({ sourceId }) => sourceId),
      concepts: ["ignored"], rewards: ["ignored"], areas: ["origin"],
    };
  }
  const runtime = createDirectNavigationIndex({ areas: course.areas, locations: course.locations });
  const explicit = createDirectNavigationIndex(course);
  assert.deepEqual(runtime.relatedAreaIds, explicit.relatedAreaIds);
  assert.equal(runtime.relatedAreaIds.get("origin").size, 0);
  assert.equal(createDirectNavigationIndex({ ...course, connections: [] }).relatedAreaIds.get("hub").size, 0);
});

test("el grado siete se diagnostica completo y nunca se recorta para construir una vista", () => {
  const index = createDirectNavigationIndex(connectedCourse(7));
  assert.deepEqual(getAreaRelationViolations(index), [{
    areaId: "hub", relatedAreaIds: Array.from({ length: 7 }, (_, i) => `related-${i}`), count: 7, max: 6,
  }]);
  assert.equal(MAX_DIRECT_NEIGHBORS, 6);
  assert.throws(() => layout(index), /hub.*7.*6/u);
  assert.throws(() => layout(index, { centerAreaId: "origin" }), RangeError);
});

test("seis zonas relacionadas ocupan los seis lugares aunque Base quede fuera", () => {
  const index = createDirectNavigationIndex(connectedCourse(6));
  const view = layout(index);
  assert.equal(view.areas.length, 7);
  assert.equal(view.visibleAreaIds.has("origin"), false);
  assert.deepEqual([...view.visibleAreaIds].sort(), ["hub", ...index.relatedAreaIds.get("hub")].sort());
  assert.deepEqual({ q: view.areas[0].q, r: view.areas[0].r }, { q: 0, r: 0 });
});

test("Base sigue a las relaciones y el relleno completa sin duplicar ni añadir al centro", () => {
  const index = createDirectNavigationIndex(connectedCourse(3));
  const view = layout(index);
  assert.equal(view.areas.length, 7);
  assert.equal(view.visibleAreaIds.size, 7);
  assert.equal(view.visibleAreaIds.has("origin"), true);
  for (const id of index.relatedAreaIds.get("hub")) assert.equal(view.visibleAreaIds.has(id), true);
  assert.equal(view.areas.filter(({ id }) => id.startsWith("filler-")).length, 2);
  const baseView = layout(index, { centerAreaId: "origin" });
  assert.equal(baseView.areas.filter(({ id }) => id === "origin").length, 1);
});

test("el hash es estable por revisión y zona frente al orden de entrada, sin mutar el curso", () => {
  const course = connectedCourse(2, 20);
  const original = structuredClone(course);
  const first = layout(createDirectNavigationIndex(course));
  const reversed = Object.fromEntries(Object.entries(course).map(([key, values]) => [key, [...values].reverse()]));
  const second = layout(createDirectNavigationIndex(reversed));
  assert.deepEqual(first.areas, second.areas);
  assert.deepEqual(course, original);
  assert.deepEqual(layout(first.index).areas, first.areas);
  const selections = new Set(Array.from({ length: 12 }, (_, index) =>
    [...layout(first.index, { courseRevision: `revision-${index}` }).visibleAreaIds].sort().join("|")));
  assert.ok(selections.size > 1, "la revisión debe participar en el relleno estable");
});

test("un curso pequeño muestra solo las zonas que existen", () => {
  const index = createDirectNavigationIndex({ areas: [area("hub", 0), area("origin", 1)], locations: [] });
  assert.deepEqual([...layout(index).visibleAreaIds], ["hub", "origin"]);
});

test("el regreso a una zona seleccionada queda en la arista opuesta sin alterar los vecinos", () => {
  const index = createDirectNavigationIndex(connectedCourse());
  const baseline = layout(index);
  for (let direction = 0; direction < 6; direction += 1) {
    const view = layout(index, { entry: { fromAreaId: "related-1", direction } });
    assert.equal(view.canWalkBack, true);
    assert.deepEqual([...view.visibleAreaIds].sort(), [...baseline.visibleAreaIds].sort());
    const previous = view.worldIndex.byId.get("related-1");
    const opposite = AXIAL_DIRECTIONS[(direction + 3) % 6];
    assert.deepEqual({ q: previous.q, r: previous.r }, { q: opposite.q, r: opposite.r });
  }
});

test("el regreso ausente se declara sin quitar un vecino prioritario", () => {
  const index = createDirectNavigationIndex(connectedCourse(6));
  const view = layout(index, { entry: { fromAreaId: "origin", direction: 0 } });
  assert.equal(view.canWalkBack, false);
  assert.equal(view.visibleAreaIds.has("origin"), false);
  assert.equal(view.visibleAreaIds.size, 7);
  assert.equal(layout(index).canWalkBack, false);
});

test("las conversiones conservan el offset y son inversas en todas las zonas visibles", () => {
  const view = layout(createDirectNavigationIndex(connectedCourse()));
  for (const areaId of view.visibleAreaIds) {
    const canonical = view.index.areasById.get(areaId);
    const center = axialToPixel(canonical.q, canonical.r, HEX_SIZE);
    const projected = view.worldIndex.byId.get(areaId);
    const displayCenter = axialToPixel(projected.q, projected.r, HEX_SIZE);
    for (const offset of [{ x: 0, y: 0 }, { x: 32.25, y: -21.5 }, { x: -60, y: 55 }]) {
      const point = { areaId, x: center.x + offset.x, y: center.y + offset.y };
      const display = canonicalToDisplay(view, point);
      closePoint(display, { x: displayCenter.x + offset.x, y: displayCenter.y + offset.y });
      const restored = displayToCanonical(view, display);
      assert.equal(restored.areaId, areaId);
      closePoint(restored, point);
    }
  }
});

test("recentrar tras cruzar conserva la entrada local y permite volver por la misma arista", () => {
  const index = createDirectNavigationIndex(connectedCourse());
  const before = layout(index);
  const destination = before.areas.find(({ id }) => id === "related-0");
  const direction = AXIAL_DIRECTIONS.findIndex(({ q, r }) => q === destination.q && r === destination.r);
  const displayCenter = axialToPixel(destination.q, destination.r, HEX_SIZE);
  const crossed = { x: displayCenter.x * 0.51, y: displayCenter.y * 0.51 };
  const canonical = displayToCanonical(before, crossed);
  assert.equal(canonical.areaId, destination.id);
  const after = layout(index, {
    centerAreaId: destination.id,
    entry: { fromAreaId: "hub", direction },
  });
  const recentered = canonicalToDisplay(after, canonical);
  closePoint(recentered, { x: crossed.x - displayCenter.x, y: crossed.y - displayCenter.y });
  const previous = after.worldIndex.byId.get("hub");
  const previousCenter = axialToPixel(previous.q, previous.r, HEX_SIZE);
  const returnPoint = displayToCanonical(after, { x: previousCenter.x * 0.51, y: previousCenter.y * 0.51 });
  assert.equal(returnPoint.areaId, "hub");
  assert.equal(after.canWalkBack, true);
});

test("posiciones no finitas, zonas no visibles y puntos fuera de la vista no se convierten", () => {
  const view = layout(createDirectNavigationIndex(connectedCourse()));
  assert.equal(canonicalToDisplay(view, { areaId: "missing", x: 0, y: 0 }), null);
  assert.equal(canonicalToDisplay(view, { areaId: "hub", x: NaN, y: 0 }), null);
  assert.equal(displayToCanonical(view, { x: Infinity, y: 0 }), null);
  assert.equal(displayToCanonical(view, { x: 1e6, y: -1e6 }), null);
  const hidden = view.index.areas.find(({ id }) => !view.visibleAreaIds.has(id));
  assert.equal(canonicalToDisplay(view, { areaId: hidden.id, x: 0, y: 0 }), null);
});

test("los parámetros inválidos fallan antes de proyectar una cartografía", () => {
  assert.throws(() => createDirectNavigationIndex({}), TypeError);
  assert.throws(() => createDirectNavigationIndex({ areas: [], locations: [], connections: null }), TypeError);
  const index = createDirectNavigationIndex(connectedCourse());
  assert.throws(() => layout(index, { centerAreaId: "missing" }), RangeError);
  for (const hexSize of [0, -1, Infinity, NaN]) assert.throws(() => layout(index, { hexSize }), RangeError);
  assert.throws(() => layout(index, { entry: { fromAreaId: "origin", direction: 6 } }), RangeError);
});
