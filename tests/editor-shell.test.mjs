import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getEditorHistoryAction } from "../src/editor/editor-ui-controller.js";

const EDITOR_PATH = new URL("../editor.html", import.meta.url);
const ORBIT_PATH = new URL("../index.html", import.meta.url);
const EDITOR_MAIN_PATH = new URL("../src/editor/editor-main.js", import.meta.url);

test("ORBIT enlaza una entrada editorial independiente", async () => {
  const orbit = await readFile(ORBIT_PATH, "utf8");
  assert.match(orbit, /<title>ORBIT · Electromagnetismo Aplicado<\/title>/);
  assert.match(orbit, />Ruta interactiva</);
  assert.match(orbit, /href=["']\.\/editor\.html["']/);
  assert.match(orbit, />Abrir ORBIT Editor</);
  assert.doesNotMatch(orbit, /ORBIT\s+Estudiante/i);
});

test("el shell del editor expone dos menús retractables y separa Spider de Bee", async () => {
  const editor = await readFile(EDITOR_PATH, "utf8");
  const requiredIds = [
    "editor-general-dock",
    "editor-tools-dock",
    "editor-general-collapse",
    "editor-tools-collapse",
    "editor-open-spider",
    "editor-open-bee",
    "editor-spider-panel",
    "editor-bee-panel",
    "editor-ring-one-list",
    "editor-ring-two-list",
    "editor-export",
    "editor-import",
    "editor-undo",
    "editor-redo",
    "editor-warning-summary",
    "editor-warning-list",
  ];

  for (const id of requiredIds) {
    assert.match(editor, new RegExp(`id=["']${id}["']`), id);
  }
  assert.match(editor, /ORBIT Editor/);
  assert.match(editor, /href=["']\.\/index\.html["'][^>]*aria-label=["']Volver a ORBIT["']/s);
  assert.match(editor, /class=["']mode-entry-label["']>Volver a ORBIT</);
  assert.doesNotMatch(editor, /ORBIT\s+Estudiante/i);
  assert.match(editor, /Anillo 1 · fundamentos teóricos/);
  assert.match(editor, /Anillo 2 · aplicaciones/);
  assert.match(editor, /src\/editor\/editor-bootstrap\.js/);
  assert.doesNotMatch(editor, /node_modules\//);
});

test("los atajos editoriales respetan el historial nativo de los campos", () => {
  const textTarget = { closest: () => ({ tagName: "INPUT" }) };
  const canvasTarget = { closest: () => null };

  assert.equal(
    getEditorHistoryAction({ target: textTarget, ctrlKey: true, code: "KeyZ" }),
    null,
  );
  assert.equal(
    getEditorHistoryAction({ target: canvasTarget, ctrlKey: true, code: "KeyZ" }),
    "undo",
  );
  assert.equal(
    getEditorHistoryAction({
      target: canvasTarget,
      metaKey: true,
      shiftKey: true,
      code: "KeyZ",
    }),
    "redo",
  );
  assert.equal(
    getEditorHistoryAction({ target: canvasTarget, ctrlKey: true, code: "KeyY" }),
    "redo",
  );
});

test("el ciclo de vida conserva el editor cuando pagehide entra en BFCache", async () => {
  const main = await readFile(EDITOR_MAIN_PATH, "utf8");
  assert.match(main, /addEventListener\("pagehide", \(event\) =>/);
  assert.match(main, /if \(event\.persisted \|\| editorDestroyed\) return;/);
  assert.doesNotMatch(main, /pagehide[\s\S]{0,240}\{ once: true \}/);
});

test("el editor explica que el borrador no publica ni toca el progreso de ORBIT", async () => {
  const editor = await readFile(EDITOR_PATH, "utf8");
  assert.match(editor, /separado del progreso de aprendizaje guardado por ORBIT/i);
  assert.match(editor, /no escribe el repositorio ni publica cambios automáticamente/i);
});
