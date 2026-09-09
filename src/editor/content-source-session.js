import { compileContentSource } from "../core/content-source.js";
import { ProgressStorage } from "../core/storage.js";

export const CONTENT_SCRATCH_KEY = "orbit-editor-content-scratch-v1";
const MAX_SCRATCH_BYTES = 1_800_000;

function validScratch(value) {
  if (!value || value.kind !== "orbit-content-source-scratch" || value.schemaVersion !== 1
    || !Array.isArray(value.entries) || value.entries.length > 128) return false;
  if (new TextEncoder().encode(JSON.stringify(value)).length > MAX_SCRATCH_BYTES) return false;
  const keys = new Set();
  return value.entries.every((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)
      || typeof entry.id !== "string" || !entry.id || entry.id.length > 160
      || typeof entry.courseId !== "string" || !entry.courseId || entry.courseId.length > 160
      || typeof entry.baseSource !== "string" || entry.baseSource.length > 900_000
      || typeof entry.source !== "string" || entry.source.length > 900_000) return false;
    const key = JSON.stringify([entry.courseId, entry.id]);
    if (keys.has(key)) return false;
    keys.add(key);
    return true;
  });
}

/** Incomplete source stays outside the applicable editorial document. */
export class ContentSourceSession {
  constructor({ model, storage = new ProgressStorage(CONTENT_SCRATCH_KEY), compile = compileContentSource }) {
    this.model = model;
    this.storage = storage;
    this.compile = compile;
    this.entries = new Map();
    this.current = null;
    this.saving = false;
    this.storageError = null;
    const loaded = storage.loadResult?.() ?? { value: storage.load() };
    const value = loaded.value;
    this.readError = loaded.error ?? null;
    if (validScratch(value)) {
      for (const entry of value.entries) this.entries.set(this.#key(entry.courseId, entry.id), structuredClone(entry));
    } else if (value !== null && value !== undefined) {
      this.readError = new Error("El borrador recuperable tiene un formato desconocido; expórtalo antes de continuar.");
    }
  }

  #key(courseId, id) { return JSON.stringify([courseId, id]); }

  select(location, courseId = "electromagnetism") {
    if (this.saving) return this.current;
    if (!location) { this.current = null; return null; }
    const baseSource = location.contentSource;
    const key = this.#key(courseId, location.id);
    const scratch = this.entries.get(key);
    if (this.current?.key === key && this.current.baseSource === baseSource) return this.current;
    this.current = {
      key, courseId, id: location.id, kind: location.kind, baseSource,
      source: scratch?.source ?? baseSource,
      conflict: Boolean(scratch && scratch.baseSource !== baseSource),
      recovered: Boolean(scratch),
    };
    this.current.result = this.compile(this.current.source, { kind: location.kind });
    return this.current;
  }

  #storeCurrent() {
    if (!this.current) return;
    const { key, courseId, id, baseSource, source } = this.current;
    // Keep the original base until an explicit conflict resolution.
    const existing = this.entries.get(key);
    this.entries.set(key, {
      courseId, id, baseSource: this.current.conflict ? existing.baseSource : baseSource,
      source, updatedAt: new Date().toISOString(),
    });
    this.#persistScratch();
  }

  #persistScratch() {
    try {
      if (this.readError) throw this.readError;
      const value = {
        kind: "orbit-content-source-scratch", schemaVersion: 1,
        entries: [...this.entries.values()],
      };
      if (!validScratch(value)) throw new Error("El borrador recuperable supera su límite; exporta la fuente.");
      this.storage.save(value);
      this.storageError = null;
    } catch (error) { this.storageError = error; }
  }

  stage(source) {
    if (!this.current) return null;
    this.current.source = String(source);
    this.current.saveResult = null;
    this.current.saved = false;
    this.#storeCurrent();
    return this.current;
  }

  validateAndSave() {
    const current = this.current;
    if (!current) return null;
    current.result = this.compile(current.source, { kind: current.kind });
    if (!current.result.ok || current.conflict) return current;
    if (current.source === current.baseSource) {
      this.entries.delete(current.key);
      this.#persistScratch();
      current.saved = true;
      return current;
    }
    this.saving = true;
    try {
      const result = this.model.updateLocationContent(current.id, current.source);
      current.saveResult = result;
      if (result.ok) {
        current.baseSource = current.source;
        current.saved = true;
        current.recovered = false;
        this.entries.delete(current.key);
        this.#persistScratch();
      } else current.saved = false;
    } catch (error) {
      current.saved = false;
      current.saveResult = { ok: false, errors: [{ message: error.message }] };
    } finally { this.saving = false; }
    return current;
  }

  edit(source) { this.stage(source); return this.validateAndSave(); }

  rebase() {
    if (!this.current) return null;
    this.current.conflict = false;
    this.#storeCurrent();
    return this.validateAndSave();
  }

  discard() {
    if (!this.current) return;
    this.entries.delete(this.current.key);
    this.current.source = this.current.baseSource;
    this.current.conflict = false;
    this.current.recovered = false;
    this.current.saveResult = null;
    this.current.result = this.compile(this.current.source, { kind: this.current.kind });
    this.#persistScratch();
  }
}
