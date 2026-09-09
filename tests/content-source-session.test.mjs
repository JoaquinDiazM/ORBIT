import assert from "node:assert/strict";
import test from "node:test";
import { ContentSourceSession } from "../src/editor/content-source-session.js";
import { ContentSourceEditor } from "../src/editor/content-source-editor.js";
import { CONTENT_SOURCE_TEMPLATES, createContentSourceTemplate } from "../src/editor/content-source-templates.js";
import { compileContentSource } from "../src/core/content-source.js";
import { installContentDOM } from "./helpers/content-dom.mjs";

class MemoryStorage {
  constructor(value = null) { this.value = value; this.writes = 0; this.failWrites = false; }
  loadResult() { return { value: structuredClone(this.value), error: null }; }
  save(value) { if (this.failWrites) throw new Error("cuota agotada"); this.value = structuredClone(value); this.writes++; }
}

function fixture() {
  const contentSource = createContentSourceTemplate("lesson");
  const location = { id: "lesson-one", title: "Lección", kind: "lesson", contentSource };
  const calls = [];
  const model = {
    getSnapshot: () => ({ readOnly: false, canUndo: calls.length > 0, canRedo: false, document: { courseId: "course-one" } }),
    updateLocationContent(id, source) { calls.push({ id, source }); location.contentSource = source; return { ok: true }; },
    undo() { location.contentSource = contentSource; return { ok: true }; },
    redo() { return { ok: true }; },
  };
  return { location, model, calls, contentSource };
}

test("las plantillas ofrecidas compilan para cada tipo y cubren las estructuras vigentes", () => {
  for (const kind of ["lesson", "mission", "npc"]) {
    for (const { id } of CONTENT_SOURCE_TEMPLATES) {
      if (kind === "npc" && !["basic", "equation", "steps"].includes(id)) {
        assert.throws(() => createContentSourceTemplate(kind, id), /sin evaluación/);
        continue;
      }
      const result = compileContentSource(createContentSourceTemplate(kind, id), { kind });
      assert.equal(result.ok, true, `${kind}/${id}: ${JSON.stringify(result.diagnostics)}`);
    }
  }
});

test("texto inválido se recupera por curso/nodo y jamás muta el documento aplicable", () => {
  const { model, location, calls, contentSource } = fixture();
  const storage = new MemoryStorage();
  const session = new ContentSourceSession({ model, storage });
  session.select(location, "course-one");
  session.edit("@orbit 1\n```orbit:exercise\n{");
  assert.equal(calls.length, 0);
  assert.equal(location.contentSource, contentSource);
  const source = session.current.source;
  session.select({ ...location, id: "lesson-two" }, "course-one");
  session.select(location, "course-two");
  assert.equal(session.current.source, contentSource);
  const reloaded = new ContentSourceSession({ model, storage });
  reloaded.select(location, "course-one");
  assert.equal(reloaded.current.source, source);
  assert.equal(reloaded.current.result.ok, false);
  assert.equal(reloaded.current.recovered, true);
});

test("autoguardado válido pasa por modelo y conserva fuente al fallar persistencia", () => {
  const { model, location, calls } = fixture();
  const storage = new MemoryStorage();
  const session = new ContentSourceSession({ model, storage });
  session.select(location, "course-one");
  const next = createContentSourceTemplate("lesson", "equation");
  session.edit(next);
  assert.deepEqual(calls, [{ id: location.id, source: next }]);
  assert.equal(storage.value.entries.length, 0);
  const failed = createContentSourceTemplate("lesson", "numeric");
  model.updateLocationContent = () => ({ ok: false, errors: [{ message: "No se pudo persistir" }] });
  session.edit(failed);
  assert.equal(session.current.source, failed);
  assert.equal(session.current.baseSource, next);
  assert.equal(session.current.saved, false);
  assert.equal(storage.value.entries[0].source, failed);
});

test("undo o cambio externo conserva scratch y requiere resolver su fuente base", () => {
  const { model, location, calls } = fixture();
  const storage = new MemoryStorage();
  const session = new ContentSourceSession({ model, storage });
  session.select(location, "course-one");
  session.edit("@orbit 1\ncontenido incompleto");
  const changed = { ...location, contentSource: createContentSourceTemplate("lesson", "equation") };
  session.select(changed, "course-one");
  assert.equal(session.current.conflict, true);
  const valid = createContentSourceTemplate("lesson", "numeric");
  session.edit(valid);
  assert.equal(calls.length, 0);
  session.rebase();
  assert.equal(calls.length, 1);
  assert.equal(session.current.baseSource, valid);
});

test("scratch malformado no rompe arranque ni sobrescribe bytes desconocidos", () => {
  const { model, location } = fixture();
  for (const value of [
    { kind: "orbit-content-source-scratch", schemaVersion: 1, entries: {} },
    { kind: "orbit-content-source-scratch", schemaVersion: 1, entries: [null] },
    { kind: "orbit-content-source-scratch", schemaVersion: 1, entries: Array(129).fill({}) },
    { kind: "future-format", schemaVersion: 7 },
  ]) {
    const storage = new MemoryStorage(value);
    const session = new ContentSourceSession({ model, storage });
    session.select(location, "course-one");
    session.stage("texto incompleto");
    assert.ok(session.readError);
    assert.equal(storage.writes, 0);
    assert.deepEqual(storage.value, value);
    assert.equal(session.current.source, "texto incompleto");
  }
});

test("un fallo al guardar scratch conserva el texto en memoria sin anunciar guardado", () => {
  const { model, location } = fixture();
  const storage = new MemoryStorage(); storage.failWrites = true;
  const session = new ContentSourceSession({ model, storage });
  session.select(location, "course-one");
  session.edit("fuente incompleta");
  assert.equal(session.current.source, "fuente incompleta");
  assert.ok(session.storageError);
  assert.equal(storage.value, null);
});

test("el debounce guarda sin blur; selección, cierre y destroy liberan recursos y conservan texto", () => {
  const dom = installContentDOM();
  try {
    const { model, location, calls } = fixture();
    const root = dom.document.createElement("section"); root.hidden = true;
    for (const id of ["title", "source", "status", "diagnostics", "preview", "preview-status", "undo", "redo", "export", "import", "close", "save", "rebase", "discard", "template", "template-source", "template-export"]) {
      const node = dom.document.createElement(id.includes("source") ? "textarea" : id === "template" ? "select" : "div");
      node.setAttribute("id", `content-editor-${id}`); root.append(node);
    }
    const button = dom.document.createElement("button");
    const storage = new MemoryStorage();
    const session = new ContentSourceSession({ model, storage });
    const editor = new ContentSourceEditor({ model, root, button, session });
    const oldContent = compileContentSource(createContentSourceTemplate("lesson", "steps"), { kind: "lesson" }).content;
    // Materialized location may still carry the old body during a synchronous model notification.
    editor.sync({ ...location, ...oldContent }); editor.open();
    const textarea = root.querySelector("#content-editor-source");
    textarea.value = createContentSourceTemplate("lesson", "equation");
    textarea.dispatch("input");
    assert.equal(calls.length, 0);
    dom.runTimers();
    assert.equal(calls.length, 1, "el timeout debe validar y guardar sin blur");
    assert.equal(root.querySelector("#content-editor-undo").disabled, false);
    assert.match(root.querySelector("#content-editor-preview").textContent, /Etapa 1 de 1/);
    textarea.value = "@orbit 1\n```";
    textarea.dispatch("input");
    editor.sync({ ...location, id: "lesson-two" });
    editor.sync(location);
    assert.equal(textarea.value, "@orbit 1\n```");
    root.querySelector("#content-editor-close").dispatch("click");
    assert.equal(dom.document.activeElement, button);
    assert.equal(root.hidden, true);
    editor.destroy();
    assert.equal(dom.timers.size, 0);
    assert.equal([...textarea.listeners.values()].reduce((sum, listeners) => sum + listeners.size, 0), 0);
    assert.equal([...button.listeners.values()].reduce((sum, listeners) => sum + listeners.size, 0), 0);
    assert.equal(calls.length, 1);
  } finally { dom.restore(); }
});
