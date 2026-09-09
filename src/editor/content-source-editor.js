import { ContentView } from "../ui/content-view.js";
import { ContentSourceSession } from "./content-source-session.js";
import { CONTENT_SOURCE_TEMPLATES, createContentSourceTemplate } from "./content-source-templates.js";

function downloadSource(filename, source) {
  const url = URL.createObjectURL(new Blob([source], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export class ContentSourceEditor {
  constructor({ model, root, button, toast = () => {}, session = new ContentSourceSession({ model }) }) {
    this.bindings = [];
    this.destroyed = false;
    this.model = model;
    this.root = root;
    this.button = button;
    this.toast = toast;
    this.session = session;
    this.timer = null;
    this.syncing = false;
    this.previewSource = null;
    this.location = null;
    this.readOnly = Boolean(model.getSnapshot().readOnly);
    this.elements = Object.fromEntries([
      "title", "source", "status", "diagnostics", "preview", "preview-status", "undo", "redo",
      "export", "import", "close", "save", "rebase", "discard", "template", "template-source", "template-export",
    ].map((name) => [name, root.querySelector(`#content-editor-${name}`)]));
    this.preview = new ContentView({ container: this.elements.preview, toast });
    this.#listen(this.button, "click", () => this.open());
    this.#listen(this.elements.close, "click", () => { this.close(); this.button.focus(); });
    this.#listen(this.elements.save, "click", () => {
      this.#clearTimer();
      this.session.edit(this.elements.source.value);
      this.#renderResult();
    });
    this.#listen(this.elements.source, "input", () => {
      if (this.readOnly) return;
      this.session.stage(this.elements.source.value);
      this.elements.status.textContent = this.session.storageError
        ? "El texto solo está en memoria: no se pudo guardar el borrador recuperable. Exporta la fuente."
        : "Borrador recuperable guardado. Comprobando fuente…";
      this.#clearTimer();
      this.timer = window.setTimeout(() => this.flush(), 450);
    });
    this.#listen(this.elements.source, "blur", () => this.flush());
    this.#listen(this.elements.undo, "click", () => this.#history("undo"));
    this.#listen(this.elements.redo, "click", () => this.#history("redo"));
    this.#listen(this.elements.export, "click", () => {
      if (this.session.current) downloadSource(`${this.session.current.id}.orbit.md`, this.elements.source.value);
    });
    this.#listen(this.elements.import, "change", () => { void this.#import(); });
    this.#listen(this.elements.rebase, "click", () => {
      this.session.rebase();
      this.#renderResult();
    });
    this.#listen(this.elements.discard, "click", () => {
      this.#clearTimer();
      this.session.discard();
      this.elements.source.value = this.session.current.source;
      this.#renderResult();
    });
    for (const { id, label } of CONTENT_SOURCE_TEMPLATES) {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = label;
      this.elements.template.append(option);
    }
    this.#listen(this.elements.template, "change", () => this.#renderTemplate());
    this.#listen(this.elements["template-export"], "click", () => {
      downloadSource(`plantilla-${this.elements.template.value}.orbit.md`, this.elements["template-source"].value);
    });
  }

  #listen(target, type, listener) {
    target.addEventListener(type, listener);
    this.bindings.push({ target, type, listener });
  }

  sync(location, snapshot = this.model.getSnapshot()) {
    if (this.syncing || this.session.saving) return;
    this.syncing = true;
    try {
      const changed = location?.id !== this.location?.id;
      if (changed) this.flush();
      this.location = location;
      const editable = ["lesson", "mission", "npc"].includes(location?.kind);
      this.button.disabled = this.readOnly || !editable;
      this.button.title = this.readOnly ? "Editar contenido requiere el perfil Docente."
        : editable ? "Abrir la fuente académica y su previsualización." : "Este nodo de sistema no admite autoría de contenido.";
      const previous = this.session.current;
      const current = this.session.select(editable ? location : null, snapshot.document?.courseId ?? "electromagnetism");
      this.elements.undo.disabled = this.readOnly || !snapshot.canUndo;
      this.elements.redo.disabled = this.readOnly || !snapshot.canRedo;
      if (!current) { this.close(); return; }
      if (current !== previous || changed) {
        this.elements.source.value = current.source;
        this.previewSource = null;
        this.#renderTemplate();
      }
      this.elements.title.textContent = `Contenido de ${location.title} · ${location.id}`;
      if (!this.root.hidden) this.#renderResult();
    } finally { this.syncing = false; }
  }

  open() {
    if (this.button.disabled || !this.location) return;
    this.root.hidden = false;
    this.button.setAttribute("aria-expanded", "true");
    this.#renderResult();
    this.elements.source.focus({ preventScroll: true });
  }

  close() {
    this.flush();
    this.root.hidden = true;
    this.button.setAttribute("aria-expanded", "false");
    this.preview.destroy();
    this.previewSource = null;
  }

  #clearTimer() {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
  }

  flush() {
    if (this.timer === null) return;
    this.#clearTimer();
    this.session.validateAndSave();
    if (!this.root.hidden) this.#renderResult();
  }

  #history(action) {
    this.flush();
    if (this.readOnly) return;
    const result = this.model[action]();
    if (!result.ok) this.toast(result.errors?.[0]?.message ?? "No fue posible cambiar el historial.", "error");
  }

  async #import() {
    const [file] = this.elements.import.files ?? [];
    this.elements.import.value = "";
    if (!file || this.readOnly || !this.session.current) return;
    const id = this.session.current.id;
    try {
      if (file.size > 900_000) throw new Error("La fuente supera el límite de 900 000 bytes.");
      const source = await file.text();
      if (this.destroyed || this.session.current?.id !== id) {
        this.toast("Cambió el nodo seleccionado; vuelve a importar el archivo en el nodo deseado.", "warning");
        return;
      }
      this.#clearTimer();
      this.elements.source.value = source;
      this.session.edit(source);
      this.#renderResult();
    } catch (error) { this.toast(`No fue posible importar la fuente: ${error.message}`, "error"); }
  }

  #renderTemplate() {
    if (!this.location) return;
    for (const option of this.elements.template.querySelectorAll("option")) {
      option.disabled = this.location.kind === "npc" && !["basic", "equation", "steps"].includes(option.value);
    }
    if (this.location.kind === "npc" && !["basic", "equation", "steps"].includes(this.elements.template.value)) {
      this.elements.template.value = "basic";
    }
    this.elements["template-source"].value = createContentSourceTemplate(this.location.kind, this.elements.template.value || "basic");
  }

  #renderResult() {
    const current = this.session.current;
    if (!current) return;
    const result = current.result;
    const snapshot = this.model.getSnapshot();
    this.elements.undo.disabled = this.readOnly || !snapshot.canUndo;
    this.elements.redo.disabled = this.readOnly || !snapshot.canRedo;
    const errors = [...(result?.diagnostics ?? [])];
    if (current.saveResult?.ok === false) {
      errors.push(...(current.saveResult.errors ?? []));
    }
    this.elements.diagnostics.replaceChildren();
    for (const error of errors) {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${error.line ? `Línea ${error.line}, columna ${error.column ?? 1}: ` : ""}${error.message}`;
      button.addEventListener("click", () => {
        const lines = current.source.split("\n");
        const offset = lines.slice(0, Math.max(0, (error.line ?? 1) - 1)).reduce((sum, line) => sum + line.length + 1, 0)
          + Math.max(0, (error.column ?? 1) - 1);
        this.elements.source.focus();
        this.elements.source.setSelectionRange(offset, Math.min(offset + 1, current.source.length));
      });
      item.append(button);
      this.elements.diagnostics.append(item);
    }
    const unsaved = current.source !== current.baseSource;
    this.elements.rebase.hidden = !current.conflict;
    this.elements.discard.hidden = !unsaved && !current.conflict;
    this.elements.status.textContent = this.session.storageError || this.session.readError
      ? "No se pudo guardar el borrador recuperable; el texto sigue en memoria. Exporta la fuente antes de salir."
      : current.conflict
        ? "La fuente base cambió. Tu texto recuperado se conserva y no se guardará sobre ella sin tu decisión."
        : !result?.ok
          ? "Fuente incompleta conservada para recuperar. El curso mantiene la última fuente válida."
          : current.saveResult?.ok === false
            ? "No se pudo guardar en el documento. La fuente permanece en el borrador recuperable."
            : unsaved
              ? "Fuente recuperada válida: edítala para guardarla en el documento."
              : "Fuente válida guardada en el documento editorial.";
    this.elements.source.setAttribute("aria-invalid", String(!result?.ok));
    if (!result?.ok) {
      this.preview.reset();
      this.elements.preview.replaceChildren();
      this.previewSource = null;
      this.elements["preview-status"].textContent = "Corrige los diagnósticos para reanudar la previsualización.";
      return;
    }
    this.elements["preview-status"].textContent = "Sesión de prueba independiente: resolver ejercicios aquí no concede progreso. Reinicia al cambiar la fuente.";
    if (this.previewSource !== current.source) {
      this.preview.reset();
      this.preview.render({
        id: this.location.id,
        kind: this.location.kind,
        title: this.location.title,
        shortTitle: this.location.shortTitle,
        ...result.content,
      });
      this.previewSource = current.source;
    }
  }

  destroy() {
    this.destroyed = true;
    this.flush();
    for (const { target, type, listener } of this.bindings) target.removeEventListener(type, listener);
    this.bindings = [];
    this.#clearTimer();
    this.preview.destroy();
  }
}
