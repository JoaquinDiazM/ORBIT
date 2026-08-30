export class ProgressStorage {
  constructor(key, storage = globalThis.localStorage, legacyKeys = []) {
    this.key = key;
    this.storage = storage;
    this.legacyKeys = [...new Set(legacyKeys)].filter((legacyKey) => legacyKey !== key);
    this.memoryFallback = null;
  }

  loadResult() {
    try {
      for (const key of [this.key, ...this.legacyKeys]) {
        const serialized = this.storage?.getItem(key);
        if (serialized === null || serialized === undefined) continue;
        try {
          return {
            found: true,
            key,
            value: JSON.parse(serialized),
            error: null,
          };
        } catch (error) {
          console.warn("No fue posible interpretar el progreso persistente.", error);
          return {
            found: true,
            key,
            value: this.memoryFallback,
            error,
          };
        }
      }
      return {
        found: this.memoryFallback !== null,
        key: null,
        value: this.memoryFallback,
        error: null,
      };
    } catch (error) {
      console.warn("No fue posible leer el progreso persistente.", error);
      return {
        found: true,
        key: null,
        value: this.memoryFallback,
        error,
      };
    }
  }

  load() {
    return this.loadResult().value;
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
      for (const key of [this.key, ...this.legacyKeys]) this.storage?.removeItem(key);
    } catch (error) {
      console.warn("No fue posible borrar el progreso persistente.", error);
    }
  }
}

export function createLegacyProgressKeys({
  prefixes = [],
  currentVersion,
  profile,
  profileAliases = [],
}) {
  const highestLegacyVersion = Math.max(0, Math.trunc(Number(currentVersion)) - 1);
  const uniquePrefixes = [...new Set(
    prefixes.filter((prefix) => typeof prefix === "string" && prefix.length > 0),
  )];
  const profiles = [...new Set(
    [profile, ...profileAliases].filter(
      (profileName) => typeof profileName === "string" && profileName.length > 0,
    ),
  )];
  const currentAliasKeys = profiles.slice(1).flatMap((profileName) =>
    uniquePrefixes.map(
      (prefix) => `${prefix}:v${currentVersion}:${profileName}`,
    ),
  );

  const olderKeys = Array.from(
    { length: highestLegacyVersion },
    (_, index) => highestLegacyVersion - index,
  ).flatMap((version) =>
    profiles.flatMap((profileName) =>
      uniquePrefixes.map((prefix) => `${prefix}:v${version}:${profileName}`),
    ),
  );
  return [...currentAliasKeys, ...olderKeys];
}

export function sanitizeProfileName(value, fallback = "student") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return normalized || fallback;
}
