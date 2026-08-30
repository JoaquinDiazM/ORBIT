import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CanvasRenderer,
  resolveRuntimeAreaAppearance,
} from "../src/game/renderer.js";

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
  assert.match(main, /\["juego", \(\) => game\.destroy\(\)\]/);
  assert.match(main, /\["audio", \(\) => audio\.destroy\(\)\]/);
  assert.match(main, /\["suscripción de audio", \(\) => unsubscribeAudioSettings\(\)\]/);
  assert.match(main, /\["preferencias Bowerbird", \(\) => bowerbirdPreferences\?\.destroy\(\)\]/);
  assert.match(main, /try \{\s*release\(\);\s*\} catch \(error\)/);
  assert.match(main, /finally \{\s*runtimeLock\?\.release\(\);\s*\}/);
  assert.match(main, /window\.addEventListener\("pagehide", dispose, \{ once: true \}\)/);
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
