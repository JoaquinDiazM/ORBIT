export class ProgressStorage {
  constructor(key, storage = globalThis.localStorage) {
    this.key = key;
    this.storage = storage;
    this.memoryFallback = null;
  }

  load() {
    try {
      const serialized = this.storage?.getItem(this.key);
      if (!serialized) return this.memoryFallback;
      return JSON.parse(serialized);
    } catch (error) {
      console.warn("No fue posible leer el progreso persistente.", error);
      return this.memoryFallback;
    }
  }

  save(state) {
    const snapshot = structuredClone(state);
    this.memoryFallback = snapshot;
    try {
      this.storage?.setItem(this.key, JSON.stringify(snapshot));
    } catch (error) {
      console.warn("No fue posible guardar el progreso en localStorage.", error);
    }
  }

  clear() {
    this.memoryFallback = null;
    try {
      this.storage?.removeItem(this.key);
    } catch (error) {
      console.warn("No fue posible borrar el progreso persistente.", error);
    }
  }
}

export function sanitizeProfileName(value, fallback = "normal") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return normalized || fallback;
}
