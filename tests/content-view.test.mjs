import assert from "node:assert/strict";
import test from "node:test";
import { ContentView } from "../src/ui/content-view.js";
import { tokenizeAcademicText, appendAcademicText } from "../src/ui/academic-text.js";
import { createEquationFigure } from "../src/ui/math-renderer.js";
import { installContentDOM } from "./helpers/content-dom.mjs";
import { CONTENT_SOURCE_TEMPLATES, createContentSourceTemplate } from "../src/editor/content-source-templates.js";
import { compileContentSource } from "../src/core/content-source.js";

test("el texto académico separa delimitadores y conserva HTML como texto", () => {
  assert.deepEqual(tokenizeAcademicText(String.raw`Texto $f$ y \(F=\nabla f\), \[E=F/q\], \$5.`), [
    { type: "text", value: "Texto " }, { type: "math", value: "f", displayMode: false },
    { type: "text", value: " y " }, { type: "math", value: "F=\\nabla f", displayMode: false },
    { type: "text", value: ", " }, { type: "math", value: "E=F/q", displayMode: true },
    { type: "text", value: ", $5." },
  ]);
  const dom = installContentDOM();
  try {
    const node = dom.document.createElement("p");
    appendAcademicText(node, "<script>alert(1)</script> $x^2$");
    assert.equal(node.querySelectorAll("script").length, 0);
    assert.equal(node.querySelectorAll("math").length, 1);
    assert.match(node.textContent, /<script>/);
    const figure = createEquationFigure({ tex: "E=F/q", caption: "Campo $E$" }, { renderCaption: appendAcademicText });
    assert.equal(figure.querySelector("figcaption").querySelectorAll("math").length, 1);
  } finally { dom.restore(); }
});

function lesson() {
  return { id: "preview-lesson", title: "Ensayo", kind: "lesson", objective: "Calcular $E$.", sources: [], grants: {},
    steps: [
      { id: "read", title: "Lectura", sections: [{ title: "Modelo", paragraphs: ["Modelo $E=F/q$."] }], exercise: { type: "none" } },
      { id: "answer", title: "Salida", sections: [], exercise: { type: "numeric", prompt: "Si $F=6$ y $q=2$, calcula $E$.", expected: 3, unit: "N/C", absoluteTolerance: 0.01, explanation: "El campo es $E=3$." } },
    ] };
}

test("runtime y preview comparten etapas, evaluación y MathML con progreso aislado", () => {
  const dom = installContentDOM();
  try {
    const location = lesson();
    const previewBody = dom.document.createElement("div");
    const runtimeBody = dom.document.createElement("div");
    let completions = 0;
    const completed = new Set();
    const runtime = new ContentView({ container: runtimeBody,
      isCompleted: (id) => completed.has(id),
      onComplete: (entry) => { completions++; completed.add(entry.id); return { ok: true }; },
    });
    const preview = new ContentView({ container: previewBody });
    runtime.render(location);
    preview.render(location);
    assert.equal(previewBody.textContent, runtimeBody.textContent);
    for (const body of [previewBody, runtimeBody]) {
      body.querySelectorAll("button").find((button) => button.textContent === "Continuar").dispatch("click");
      assert.equal(body.querySelectorAll("math").length, 4);
      const input = body.querySelector('input[type="text"]');
      input.value = "2";
      body.querySelector("form").dispatch("submit");
      assert.match(body.textContent, /todavía no es correcta/);
      input.value = "3,0";
      body.querySelector("form").dispatch("submit");
      assert.match(body.textContent, /Lugar completado/);
    }
    assert.equal(completions, 1);
    assert.deepEqual([...completed], [location.id]);
    assert.equal(previewBody.textContent, runtimeBody.textContent);
    preview.reset();
    preview.render(location);
    assert.doesNotMatch(previewBody.textContent, /Lugar completado/);
    assert.equal(completions, 1);
    runtime.destroy(); preview.destroy();
  } finally { dom.restore(); }
});

test("un rechazo de guardado no completa la sesión de contenido", () => {
  const dom = installContentDOM();
  try {
    const body = dom.document.createElement("div");
    const view = new ContentView({ container: body, isCompleted: () => false,
      onComplete: () => ({ ok: false, reason: "storage-write-failed" }) });
    view.render({ id: "failed", kind: "npc", objective: "Leer.", sections: [], exercise: { type: "acknowledge", prompt: "Continuar" } });
    body.querySelector("form").dispatch("submit");
    assert.match(body.textContent, /No fue posible guardar el progreso/);
    assert.equal(view.completedIds.size, 0);
    view.destroy();
  } finally { dom.restore(); }
});

test("el renderer compartido monta y libera todas las estructuras y figuras registradas", () => {
  const dom = installContentDOM();
  try {
    for (const { id } of CONTENT_SOURCE_TEMPLATES) {
      const result = compileContentSource(createContentSourceTemplate("lesson", id), { kind: "lesson" });
      const body = dom.document.createElement("div");
      const view = new ContentView({ container: body });
      const location = { id: `sample-${id}`, kind: "lesson", title: id, ...result.content };
      assert.doesNotThrow(() => view.render(location), id);
      assert.ok(body.childNodes.length > 0, id);
      if (id === "vector-field-cards") assert.equal(view.activeInteractiveFigures.length, 2);
      if (id === "point-charge-field") assert.equal(view.activeInteractiveFigures.length, 1);
      // Completed sessions use the exact same controls and reveal figures in review mode.
      view.completedIds.add(location.id);
      assert.doesNotThrow(() => view.render(location), `${id}: resuelto`);
      view.destroy();
      assert.equal(view.activeInteractiveFigures.length, 0);
    }
    assert.equal(dom.timers.size, 0);
  } finally { dom.restore(); }
});

test("la secuencia comparte evaluación de expresiones y revela el siguiente ejercicio sin completar antes", () => {
  const dom = installContentDOM();
  try {
    const body = dom.document.createElement("div");
    let completions = 0;
    const view = new ContentView({ container: body, onComplete: (location) => {
      completions++; view.completedIds.add(location.id); return { ok: true };
    } });
    view.render({ id: "sequence", kind: "lesson", objective: "Comprobar $f$.", sections: [],
      exercise: { type: "sequence", feedback: "guided", items: [
        { id: "expression", type: "expression", prompt: "Escribe $2x$.",
          answerPolicy: { kind: "expression-equivalent", version: 1, variables: ["x"], constants: [], expectedExpression: "2*x", feedback: "guided" },
          explanation: "La respuesta es $2x$." },
        { id: "choice", type: "choice", prompt: "Selecciona $x^2$.", choices: ["$x^2$", "$x$"], answerIndex: 0, explanation: "Se eligió $x^2$." },
      ] } });
    body.querySelector('input[type="text"]').value = "x+x";
    body.querySelector("form").dispatch("submit");
    assert.equal(completions, 0);
    assert.match(body.textContent, /Selecciona/);
    body.querySelector('input[type="radio"]').checked = true;
    body.querySelector("form").dispatch("submit");
    assert.equal(completions, 1);
    assert.match(body.textContent, /Lugar completado/);
    assert.ok(body.querySelectorAll("math").length >= 3);
    view.destroy();
  } finally { dom.restore(); }
});
