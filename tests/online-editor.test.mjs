import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createCourseEdition } from "../src/core/course-edition.js";
import { ProgressStorage } from "../src/core/storage.js";
import { EditorModel } from "../src/editor/editor-model.js";
import { createOnlineEditorDraftStorage, editorOnlineStorageKeys, loadOnlineEditorCourse } from "../src/editor/editor-online-session.js";
import { OnlinePublicationController } from "../src/editor/online-course-panel.js";
import { createOwlActions, mountOwlPanel } from "../src/editor/owl-panel.js";
import { installContentDOM } from "./helpers/content-dom.mjs";

const edition = JSON.parse(await readFile(new URL("../public/data/courses/electromagnetism-applied.edition.json", import.meta.url), "utf8"));
function context() {
  const course = { id: "class-a", title: "Curso A", maintenance: false, revision: edition.revision };
  const session = { serverId: "server-a", user: { id: "teacher-a", alias: "Docente", role: "teacher", courseIds: [course.id] }, courses: [structuredClone(course)] };
  return { course, session, profile: "teacher", scope: "server-a:teacher-a:class-a", offline: false };
}
function editionResponse(selected, overrides = {}) {
  return { serverId: selected.session.serverId, userId: selected.session.user.id,
    course: selected.course, edition, ...overrides };
}
function memory(key = "orbit-editor:online:test") {
  const values = new Map();
  return new ProgressStorage(key, { getItem: (name) => values.get(name) ?? null, setItem: (name, value) => values.set(name, value) });
}
function makeModel() {
  const listeners = new Set();
  return {
    document: { kind: "test-draft", changes: 0 },
    exportDocument() { return JSON.stringify(this.document); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    change() { this.document.changes++; for (const listener of listeners) listener(); },
  };
}
function publication({ affected = false } = {}) {
  const selected = context();
  const model = makeModel();
  const plan = { baseRevision: edition.revision, revision: "next", planDigest: "validated-digest", incompatibleLocationIds: affected ? ["lesson-a"] : [], affectedStudentCount: affected ? 1 : 0, requiresDecision: affected, summary: "Impacto de prueba" };
  const calls = [];
  selected.api = {
    setSession() {},
    async request(path, options = {}) {
      calls.push({ path, ...structuredClone(options) });
      if (path.endsWith("/maintenance")) return { course: { ...selected.course, maintenance: options.body.enabled } };
      if (path.endsWith("/validate")) return structuredClone(plan);
      if (path.endsWith("/publish")) return { course: { ...selected.course, revision: plan.revision }, edition: { revision: plan.revision } };
      if (path === "/session") return selected.session;
      throw new Error(`Ruta inesperada ${path}`);
    },
  };
  return { selected, model, plan, calls, controller: new OnlinePublicationController({ context: selected, model }) };
}

test("Editor materializa la edición íntegra del servidor y mantiene separados instancia e IDs de la plantilla", async () => {
  const selected = context();
  selected.api = { async request(path) { assert.equal(path, "/courses/class-a/edition"); return editionResponse(selected); } };
  const result = await loadOnlineEditorCourse(selected);
  assert.equal(result.source, "online");
  assert.equal(result.courseId, edition.courseId);
  assert.notEqual(result.courseId, selected.course.id);
  assert.equal(result.courseRevision, edition.revision);
  assert.ok(result.areas.length && result.locations.length);
  assert.equal(result.acceptsUnversionedProgress, false);
  await assert.rejects(loadOnlineEditorCourse({ ...selected, offline: true }), /requiere conexión/);
  selected.api.request = async () => editionResponse(selected, { course: { ...selected.course, id: "foreign" } });
  await assert.rejects(loadOnlineEditorCourse(selected), /no corresponde/);
  selected.api.request = async () => editionResponse(selected, { edition: { ...edition, digest: "altered" } });
  await assert.rejects(loadOnlineEditorCourse(selected));
});

test("Editor rechaza la edición si otra cuenta toma la cookie durante la carga", async () => {
  const selected = context();
  const original = structuredClone(selected.course);
  for (const field of ["userId", "serverId"]) {
    selected.api = { request: async () => editionResponse(selected, { [field]: "different-identity" }) };
    await assert.rejects(loadOnlineEditorCourse(selected), { code: "online-account-changed" });
    assert.deepEqual(selected.course, original);
  }
});

test("modelo real envía el documento estructurado validado, con revisión y decisión preserve", async () => {
  const selected = context();
  const calls = [];
  let target;
  selected.api = {
    async request(path, options) {
      if (path.endsWith("/edition")) return editionResponse(selected);
      calls.push({ path, ...structuredClone(options) });
      if (path.endsWith("/maintenance")) return { course: { ...selected.course, maintenance: options.body.enabled } };
      if (path.endsWith("/validate")) {
        assert.equal(typeof options.body.document, "object");
        target = await createCourseEdition(options.body.document, { previousRevision: edition.revision });
        return { baseRevision: edition.revision, revision: target.revision, planDigest: "digest-a", incompatibleLocationIds: [], affectedStudentCount: 0, requiresDecision: false, summary: "Sin incompatibilidades" };
      }
      assert.equal(path, "/courses/class-a/publish");
      assert.deepEqual(options.body.document, calls.find((call) => call.path.endsWith("/validate")).body.document);
      assert.equal(options.body.planDigest, "digest-a");
      assert.equal(options.body.decision, "preserve");
      return { course: { ...selected.course, revision: target.revision }, edition: target };
    },
  };
  const course = await loadOnlineEditorCourse(selected);
  const storage = createOnlineEditorDraftStorage({ storage: memory(), revision: course.courseRevision, document: course.editorDocument });
  const model = EditorModel.create({ storage, courseId: course.courseId, baseDataVersion: course.editorDocument.baseDataVersion, baseDocument: course.editorDocument });
  const controller = new OnlinePublicationController({ context: selected, model, draftStorage: storage });
  await controller.validate();
  await assert.rejects(controller.publish({ confirmed: true }), /mantenimiento/);
  await controller.setMaintenance(true);
  await assert.rejects(controller.publish(), /Confirma/);
  await controller.publish({ confirmed: true });
  assert.equal(controller.published, true);
  assert.equal(calls.filter((call) => call.path.endsWith("/publish")).length, 1);
  controller.destroy(); model.destroy();
});

test("una incompatibilidad exige confirmar el reinicio parcial además de la publicación", async () => {
  const { controller, calls, model } = publication({ affected: true });
  await controller.setMaintenance(true);
  await controller.validate();
  await assert.rejects(controller.publish({ confirmed: true }), /reinicio/);
  assert.ok(!calls.some((call) => call.path.endsWith("/publish")));
  await controller.publish({ confirmed: true, resetAffected: true });
  assert.deepEqual(calls.at(-1).body, { baseRevision: edition.revision, document: model.document, planDigest: "validated-digest", decision: "reset-affected" });
  await assert.rejects(controller.publish({ confirmed: true, resetAffected: true }), /estado actual/);
});

test("cambio del borrador durante o después de validar invalida el plan", async () => {
  const { selected, controller, model, plan, calls } = publication();
  const original = selected.api.request;
  let finish;
  selected.api.request = () => new Promise((resolve) => { finish = resolve; });
  const pending = controller.validate();
  model.change(); finish(plan);
  await assert.rejects(pending, /cambió durante/);
  assert.equal(controller.plan, null);
  selected.api.request = original;
  await controller.setMaintenance(true);
  await controller.validate(); model.change();
  await assert.rejects(controller.publish({ confirmed: true }), /plan válido/);
  assert.ok(!calls.some((call) => call.path.endsWith("/publish")));
});

test("una respuesta de publicación incompleta exige nueva validación y conserva el borrador", async () => {
  const { controller, selected, model } = publication();
  await controller.setMaintenance(true); await controller.validate();
  const original = model.exportDocument();
  selected.api.request = async () => ({ course: { ...selected.course, revision: "different" }, edition: { revision: "different" } });
  await assert.rejects(controller.publish({ confirmed: true }), /evidencia/);
  assert.equal(controller.published, false);
  assert.equal(controller.plan, null);
  assert.equal(model.exportDocument(), original);
});

test("el borrador reabierto conserva su revisión y requiere confirmación para sustituirlo por la edición vigente", async () => {
  const underlying = memory();
  const oldDraft = { local: "trabajo pendiente" }, current = { published: "otra edición" };
  const first = createOnlineEditorDraftStorage({ storage: underlying, revision: "old", document: { published: "inicial" } });
  first.save(oldDraft);
  const read = () => createOnlineEditorDraftStorage({ storage: underlying, revision: "new", document: current });
  const reopened = read();
  assert.deepEqual(reopened.loadResult().value, oldDraft);
  assert.equal(reopened.baseRevision, "old");
  const selected = context(); selected.course.revision = "new";
  selected.api = { request() { assert.fail("Un borrador obsoleto no puede enviarse al servidor"); } };
  const controller = new OnlinePublicationController({ context: selected, model: makeModel(), draftStorage: reopened });
  await assert.rejects(controller.validate(), /edición anterior/);
  assert.throws(() => controller.discardDraft(), /Confirma/);
  assert.deepEqual(reopened.loadResult().value, oldDraft);
  controller.discardDraft({ confirmed: true });
  assert.throws(() => reopened.save(oldDraft), /Recarga/);
  const next = read();
  assert.deepEqual(next.loadResult().value, current);
  assert.equal(next.baseRevision, "new");
  underlying.save({ unrecognized: true });
  assert.ok(read().loadResult().error);
  assert.deepEqual(underlying.load(), { unrecognized: true });
});

test("documento, fuente incompleta y apariencia quedan aislados por servidor, cuenta y curso", () => {
  const keys = editorOnlineStorageKeys(context());
  assert.ok(keys.document.startsWith("orbit-editor:"));
  assert.ok(keys.scratch.startsWith("orbit-editor:"));
  assert.ok(keys.appearance.startsWith("orbit-bowerbird:"));
  for (const scope of ["server-b:teacher-a:class-a", "server-a:teacher-b:class-a", "server-a:teacher-a:class-b"]) {
    const other = editorOnlineStorageKeys({ scope });
    for (const key of Object.keys(keys)) assert.notEqual(keys[key], other[key]);
  }
});

test("Owl exige docente online y confirmación exacta para la baja del curso seleccionado", async () => {
  const selected = context(); const calls = [];
  const student = { id: "student-a", courseId: selected.course.id, alias: "Estudiante A", completedCount: 2, totalCount: 4, finished: false, completedLocations: ["a", "b"] };
  selected.api = { async request(path, options) { calls.push({ path, ...options }); return { students: [student] }; } };
  for (const bad of [{ ...selected, profile: "student" }, { ...selected, offline: true }, { ...selected, course: { ...selected.course, id: "foreign" } }]) {
    assert.throws(() => createOwlActions(bad), /docente/);
    assert.throws(() => new OnlinePublicationController({ context: bad, model: makeModel() }), /docente/);
  }
  const owl = createOwlActions(selected);
  assert.deepEqual(await owl.list(), [student]);
  assert.throws(() => owl.remove(student, "estudiante a"), /exactamente/);
  assert.throws(() => owl.resetPassword({ ...student, courseId: "foreign" }, "test"), /otro curso/);
  assert.equal(calls.length, 1);
  await owl.create(" Estudiante nuevo ", "test-password");
  await owl.resetPassword(student, "replacement-test");
  await owl.remove(student, student.alias);
  assert.deepEqual(calls.slice(1), [
    { path: "/courses/class-a/students", method: "POST", body: { alias: "Estudiante nuevo", password: "test-password" } },
    { path: "/courses/class-a/students/student-a/password", method: "POST", body: { password: "replacement-test" } },
    { path: "/courses/class-a/students/student-a", method: "DELETE", body: { confirmAlias: "Estudiante A" } },
  ]);
  selected.api.request = async () => ({ students: [{ ...student, courseId: "foreign" }] });
  await assert.rejects(owl.list(), /no coincide/);
});

test("Owl muestra progreso y finalización, sin renderizar campos ajenos al monitor", async (t) => {
  const env = installContentDOM(); t.after(env.restore);
  const doc = env.document, selected = context();
  selected.api = { async request() { return { students: [{ id: "s", alias: "Estudiante", courseId: "class-a", completedCount: 3, totalCount: 3, finished: true, answers: "privado-no-renderizar" }] }; } };
  const parent = doc.createElement("nav"); doc.body.append(parent);
  const panel = mountOwlPanel({ context: selected, documentRef: doc, parent });
  await panel.refresh();
  assert.match(doc.body.textContent, /3 de 3 actividades completadas · Finalizado/);
  assert.doesNotMatch(doc.body.textContent, /privado-no-renderizar/);
  const dialog = doc.body.querySelector("dialog"); dialog.close = () => {};
  panel.destroy();
  assert.equal(parent.children.length, 0);
});
