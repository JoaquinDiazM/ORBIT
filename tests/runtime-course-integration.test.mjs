import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { REWARDS } from "../src/data/knowledge.js";
import { createLearningEdgeCurve, drawLearningEdge, pointOnLearningEdge } from "../src/game/learning-edge-visuals.js";
import {
  CanvasRenderer,
  getTreeTwoEdgeVisualStyle,
  resolveRuntimeAreaAppearance,
} from "../src/game/renderer.js";
import { TransportVisuals } from "../src/game/transport-visuals.js";

const PERSONAL = Object.freeze({
  paletteId: "polar",
  motifId: "waves",
  contourId: "dashed",
});
const PUBLISHED = Object.freeze({
  paletteId: "ember",
  motifId: "constellation",
  contourId: "double",
});

function createContextRecorder() {
  const calls = [];
  const gradient = {
    addColorStop(...args) {
      calls.push(["addColorStop", ...args]);
    },
  };
  const target = {};
  const context = new Proxy(target, {
    get(object, property) {
      if (property in object) return object[property];
      if (property === "createRadialGradient") {
        return (...args) => {
          calls.push([property, ...args]);
          return gradient;
        };
      }
      if (property === "measureText") return () => ({ width: 24 });
      return (...args) => calls.push([String(property), ...args]);
    },
    set(object, property, value) {
      object[property] = value;
      calls.push([`set:${String(property)}`, value]);
      return true;
    },
  });
  return { calls, context };
}

function createCanvas(context) {
  return {
    width: 0,
    height: 0,
    getContext() {
      return context;
    },
    getBoundingClientRect() {
      return { width: 640, height: 480 };
    },
  };
}

function renderAppearance({ reducedMotion, timeSeconds, unlocked = true } = {}) {
  const { calls, context } = createContextRecorder();
  const area = {
    id: "custom-zone",
    q: 0,
    r: 0,
    order: 0,
    title: "Zona personalizada",
    shortTitle: "Personalizada",
    color: "#214765",
    accent: "#8bdcf7",
    appearance: PUBLISHED,
  };
  let personalReads = 0;
  const renderer = new CanvasRenderer(createCanvas(context), {
    areas: [area],
    locations: [],
    getPersonalAreaAppearance() {
      personalReads += 1;
      return PERSONAL;
    },
  });
  renderer.render({
    camera: { x: 0, y: 0, zoom: 1 },
    player: { x: 0, y: 0, heading: 0 },
    snapshot: {
      activeTransport: { id: "walk" },
      unlockedAreaIds: new Set(unlocked ? [area.id] : []),
      visibleLocationIds: new Set(),
      accessibleLocationIds: new Set(),
      completedLocationIds: new Set(),
      state: { settings: { treeTwoVisualizationMode: "hidden" } },
    },
    nearestLocation: null,
    debugState: { showCoords: false, showGraph: false, showIds: false },
    timeSeconds,
    reducedMotion,
  });
  return { calls, personalReads, renderer };
}

test("runtime Bowerbird aplica personal > publicada > canónica y neutraliza zonas cerradas", () => {
  const area = {
    color: "#123456",
    accent: "#abcdef",
    appearance: PUBLISHED,
  };

  const personal = resolveRuntimeAreaAppearance(area, {
    personalAppearance: PERSONAL,
    unlocked: true,
  });
  assert.equal(personal.paletteId, "polar");
  assert.equal(personal.motifId, "waves");
  assert.equal(personal.contourId, "dashed");

  const published = resolveRuntimeAreaAppearance(area, { unlocked: true });
  assert.equal(published.paletteId, "ember");
  assert.equal(published.motifId, "constellation");
  assert.equal(published.contourId, "double");

  const invalidPersonal = resolveRuntimeAreaAppearance(area, {
    personalAppearance: { ...PERSONAL, motifId: "desconocido" },
    unlocked: true,
  });
  assert.equal(invalidPersonal.paletteId, "ember");
  assert.equal(invalidPersonal.motifId, "constellation");

  const canonical = resolveRuntimeAreaAppearance(
    { color: "#123456", accent: "#abcdef" },
    { unlocked: true },
  );
  assert.equal(canonical.paletteId, "canonical");
  assert.equal(canonical.color, "#123456");
  assert.equal(canonical.accent, "#abcdef");

  const locked = resolveRuntimeAreaAppearance(area, {
    personalAppearance: PERSONAL,
    unlocked: false,
  });
  assert.deepEqual(locked, {
    paletteId: "locked",
    motifId: "none",
    contourId: "locked",
    color: "#111d2a",
    accent: "#8294a3",
  });
});

test("CanvasRenderer consume solo la cartografía inyectada y no consulta Bowerbird bajo bloqueo", () => {
  const previousWindow = global.window;
  global.window = { devicePixelRatio: 1 };
  try {
    const open = renderAppearance({ reducedMotion: false, timeSeconds: 3, unlocked: true });
    assert.deepEqual(open.renderer.areas.map((area) => area.id), ["custom-zone"]);
    assert.equal(open.renderer.locations.length, 0);
    assert.equal(open.renderer.worldIndex.byId.has("custom-zone"), true);
    assert.equal(open.personalReads, 1);
    assert.ok(
      open.calls.some(
        ([name, dash]) => name === "setLineDash" && JSON.stringify(dash) === "[13,8]",
      ),
      "el contorno personal discontinuo debe llegar al canvas",
    );

    const locked = renderAppearance({ reducedMotion: false, timeSeconds: 3, unlocked: false });
    assert.equal(locked.personalReads, 0);
    assert.equal(
      locked.calls.some(
        ([name, dash]) => name === "setLineDash" && JSON.stringify(dash) === "[13,8]",
      ),
      false,
      "una zona bloqueada no debe revelar su contorno personal",
    );
  } finally {
    global.window = previousWindow;
  }
});

test("movimiento reducido congela de forma determinista los motivos animados", () => {
  const previousWindow = global.window;
  global.window = { devicePixelRatio: 1 };
  try {
    const stableLog = (calls) => JSON.stringify(
      calls,
      (_key, value) => typeof value === "function" ? "[function]" : value,
    );
    const first = stableLog(
      renderAppearance({ reducedMotion: true, timeSeconds: 1 }).calls,
    );
    const second = stableLog(
      renderAppearance({ reducedMotion: true, timeSeconds: 27 }).calls,
    );
    assert.equal(second, first);

    const animated = stableLog(
      renderAppearance({ reducedMotion: false, timeSeconds: 27 }).calls,
    );
    assert.notEqual(animated, first);
  } finally {
    global.window = previousWindow;
  }
});

test("las estelas aparecen con desplazamiento real, se disipan y se distinguen por transporte", () => {
  assert.equal(REWARDS.transports.find(({ id }) => id === "electric-cart").title, "Auto");
  for (const { id } of REWARDS.transports) {
    const visuals = new TransportVisuals();
    const frame = (x, movementDistance, timeSeconds) => {
      const { calls, context } = createContextRecorder();
      visuals.update({ player: { x, y: 0, heading: 0 }, transportId: id, movementDistance, timeSeconds, lineScale: 1 });
      visuals.drawTrail(context, timeSeconds, 1);
      return calls;
    };
    const shape = id === "radio-skiff" ? "stroke" : "arc";
    assert.deepEqual(frame(0, 0, 1), [], id);
    const moving = frame(9, 9, 1.1);
    assert.ok(moving.some(([name]) => name === shape), id);
    const phaseAtStop = visuals.phase;
    const stopped = frame(9, 0, 1.2);
    assert.ok(stopped.some(([name]) => name === shape), id);
    assert.equal(visuals.phase, phaseAtStop, id);
    assert.deepEqual(frame(9, 0, 2), [], id);
  }
});

test("cambiar de transporte, saltar o reducir movimiento retira la estela anterior", () => {
  const visuals = new TransportVisuals();
  const { context, calls } = createContextRecorder();
  const frame = (transportId, x, distance, timeSeconds, reducedMotion = false) => {
    calls.length = 0;
    visuals.update({ player: { x, y: 0, heading: 0 }, transportId, movementDistance: distance, timeSeconds, lineScale: 1, reducedMotion });
    visuals.drawTrail(context, timeSeconds, 1);
    return calls.length;
  };
  assert.ok(frame("walk", 4, 4, 1) > 0);
  assert.equal(frame("electric-cart", 4, 0, 1.01), 0);
  assert.ok(frame("electric-cart", 8, 4, 1.02) > 0);
  assert.equal(frame("electric-cart", 800, 0, 1.03), 0);
  assert.ok(frame("electric-cart", 804, 4, 1.04) > 0);
  assert.equal(frame("electric-cart", 808, 4, 1.05, true), 0);
  assert.equal(visuals.phase, 0);
  assert.equal(visuals.bob, 0);
});

test("la Red usa un arco sin punta, conserva el trazo discontinuo y anima pulsos hacia el destino", () => {
  const curve = createLearningEdgeCurve({ x: 0, y: 0 }, { x: 180, y: 0 });
  assert.deepEqual(curve.start, { x: 25, y: 0 });
  assert.deepEqual(curve.end, { x: 151, y: 0 });
  assert.ok(pointOnLearningEdge(curve, 0.5).y > 0);
  const short = createLearningEdgeCurve({ x: 0, y: 0 }, { x: 10, y: 0 });
  assert.ok(short.start.x < short.end.x);

  const style = getTreeTwoEdgeVisualStyle("muted");
  const record = (timeSeconds) => {
    const { calls, context } = createContextRecorder();
    drawLearningEdge(context, curve, style, { timeSeconds, lineScale: 1 });
    return calls;
  };
  const staticCalls = record(null);
  assert.ok(staticCalls.some(([name, dash]) => name === "setLineDash" && dash === style.lineDash));
  assert.ok(staticCalls.some(([name]) => name === "quadraticCurveTo"));
  assert.ok(!staticCalls.some(([name]) => ["lineTo", "closePath", "fill"].includes(name)));
  const pulses = (calls) => calls.filter(([name]) => name === "arc");
  assert.deepEqual(pulses(staticCalls), []);
  const first = pulses(record(0.22));
  const second = pulses(record(0.34));
  assert.equal(first.length, 3);
  for (const [index, [, x, y]] of second.entries()) {
    assert.ok(x > first[index][1]);
    const t = (x - curve.start.x) / curve.length;
    assert.ok(Math.abs(y - pointOnLearningEdge(curve, t).y) < 1e-9);
  }
});

test("el zoom reúne nombres de zona, rótulos y detalle con progreso e invitación accesible", (t) => {
  const previousWindow = global.window;
  global.window = { devicePixelRatio: 1 };
  t.after(() => { global.window = previousWindow; });
  const { calls, context } = createContextRecorder();
  const area = { id: "origin", q: 0, r: 0, title: "Campamento", shortTitle: "Base", color: "#214765", accent: "#8bdcf7" };
  const lesson = { id: "bench", areaId: area.id, kind: "lesson", shortTitle: "Banco", marker: "L",
    offset: { x: 0, y: 0 }, steps: [{ id: "read" }, { id: "apply" }], mapInvitation: "Explora el circuito" };
  const renderer = new CanvasRenderer(createCanvas(context), { areas: [area], locations: [lesson] });
  const snapshot = { activeTransport: { id: "walk" }, unlockedAreaIds: new Set([area.id]),
    visibleLocationIds: new Set([lesson.id]), accessibleLocationIds: new Set([lesson.id]),
    completedLocationIds: new Set(), state: { passedLessonSteps: { bench: ["read"] } } };
  const render = (zoom, timeSeconds, reducedMotion = false) => {
    calls.length = 0;
    renderer.render({ camera: { x: 0, y: 0, zoom }, player: { x: 0, y: 0, heading: 0 }, snapshot,
      debugState: {}, timeSeconds, reducedMotion });
    return calls.filter(([name]) => name === "fillText").map(([, text]) => text);
  };
  assert.deepEqual(render(0.4, 1), ["Base", "L"]);
  assert.deepEqual(render(0.88, 2), ["Base", "ZONA ABIERTA", "L", "Banco"]);
  const boundary = calls.findLastIndex(([name, style]) => name === "set:strokeStyle" && style.startsWith("rgba(255, 161, 87,"));
  assert.ok(boundary >= 0);
  for (const label of ["Base", "ZONA ABIERTA", "Banco"]) {
    const outline = calls.findIndex(([name, text]) => name === "strokeText" && text === label);
    const fill = calls.findIndex(([name, text]) => name === "fillText" && text === label);
    assert.ok(fill > outline && outline > boundary, `${label} debe leerse sobre el borde`);
  }
  assert.ok(render(1.3, 3).includes("E"));
  assert.ok(calls.some(([name, dash]) => name === "setLineDash" && dash.length === 2 && dash[0] === dash[1] / 2));
  assert.ok(render(1.3, 4).includes(lesson.mapInvitation));
  render(0.88, 5);
  assert.ok(render(1.3, 6, true).includes(lesson.mapInvitation));
});

test("la composición runtime carga la edición, la inyecta y limita Bowerbird personal a estudiante", async () => {
  const [main, game, renderer, ui] = await Promise.all([
    readFile(new URL("../src/main.js", import.meta.url), "utf8"),
    readFile(new URL("../src/game/game-app.js", import.meta.url), "utf8"),
    readFile(new URL("../src/game/renderer.js", import.meta.url), "utf8"),
    readFile(new URL("../src/ui/ui-controller.js", import.meta.url), "utf8"),
  ]);

  assert.match(main, /prepareCourseRuntimeLock\(/);
  assert.match(main, /inspectCourseApplicationTransaction\(/);
  assert.match(main, /recoverCourseApplication\(/);
  assert.match(main, /await assertCourseRuntimeEntryAvailable\(\)/);
  assert.match(
    main,
    /if \(courseSession\.reloadRequired\) \{\s*window\.location\.reload\(\);\s*return;\s*\}/,
  );
  assert.match(main, /loadCourseEdition\(/);
  assert.match(main, /areas: course\.areas/);
  assert.match(main, /locations: course\.locations/);
  assert.match(main, /courseId: course\.courseId/);
  assert.match(main, /courseRevision: course\.courseRevision/);
  assert.match(main, /acceptsUnversionedProgress: course\.acceptsUnversionedProgress/);
  assert.match(
    main,
    /profile === APP_CONFIG\.defaultProfile\s*\? new BowerbirdPreferencesModel/,
  );
  assert.match(main, /const dispose = \(\) => \{[\s\S]*for \(const \[label, release\] of \[/);
  assert.match(main, /\["monitor de mantenimiento", \(\) => maintenanceMonitor\?\.stop\(\)\]/);
  assert.match(main, /\["juego", \(\) => game\.destroy\(\)\]/);
  assert.match(main, /\["audio", \(\) => audio\.destroy\(\)\]/);
  assert.match(main, /\["suscripción de audio", \(\) => unsubscribeAudioSettings\(\)\]/);
  assert.match(main, /\["preferencias Bowerbird", \(\) => bowerbirdPreferences\?\.destroy\(\)\]/);
  assert.match(main, /try \{\s*release\(\);\s*\} catch \(error\)/);
  assert.match(main, /finally \{\s*runtimeLock\?\.release\(\);\s*\}/);
  assert.match(main, /window\.addEventListener\("pagehide", dispose, \{ once: true \}\)/);
  assert.match(main, /maintenanceMonitor = new OrbitMaintenanceMonitor\(/);
  assert.match(
    main,
    /onMaintenance: \(\) => \{[\s\S]*shell\.inert = true;[\s\S]*dispose\(\);[\s\S]*window\.location\.reload\(\);/,
  );
  assert.match(
    main,
    /window\.addEventListener\("pageshow", \(event\) => \{\s*if \(event\.persisted\) window\.location\.reload\(\);/,
  );
  assert.match(
    main,
    /finally \{\s*if \(!startupReady\) runtimeLock\?\.release\(\);\s*\}/,
    "un fallo de arranque también debe liberar el bloqueo compartido",
  );
  assert.ok(
    main.indexOf("prepareCourseRuntimeLock(") < main.indexOf("loadCourseEdition("),
    "el journal debe resolverse antes de leer fuente/build",
  );
  assert.ok(
    main.indexOf("assertCourseRuntimeEntryAvailable()") < main.indexOf("ProgressionModel.create("),
    "la entrada local debe probar que no hay journal de repositorio antes de guardar progreso",
  );

  assert.doesNotMatch(game, /data\/locations\.js|\{ AREAS,/);
  assert.doesNotMatch(renderer, /data\/locations\.js|\{ AREAS,/);
  assert.doesNotMatch(ui, /data\/locations\.js|\{ AREAS \}/);
});
