const DEFAULT_MANIFEST_URL = new URL(
  "../../public/assets/audio/audio-manifest.json",
  import.meta.url,
);

const USER_GESTURE_EVENTS = Object.freeze(["pointerdown", "keydown", "touchstart"]);
const AUDIO_CATEGORIES = Object.freeze(["ambience", "effects"]);
const DEFAULT_INTERACTION_KEY = "ui_select";

function clampVolume(value, fallback = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(1, Math.max(0, numeric));
}

function createBrowserAudio(source) {
  if (typeof globalThis.Audio !== "function") {
    throw new Error("HTMLAudioElement no está disponible en este entorno.");
  }
  return new globalThis.Audio(source);
}

function defaultFetch(...arguments_) {
  if (typeof globalThis.fetch !== "function") {
    throw new Error("fetch no está disponible en este entorno.");
  }
  return globalThis.fetch(...arguments_);
}

function isRelativeAssetPath(path) {
  return (
    typeof path === "string" &&
    path.length > 0 &&
    !path.startsWith("/") &&
    !path.startsWith("\\") &&
    !/^[a-z][a-z\d+.-]*:/i.test(path) &&
    !path.split(/[\\/]+/).includes("..")
  );
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest !== "object") {
    throw new Error("El manifiesto de audio no es un objeto válido.");
  }
  if (!manifest.assets || typeof manifest.assets !== "object") {
    throw new Error("El manifiesto de audio no contiene assets.");
  }
  if (manifest.schema_version !== 2) {
    throw new Error("El manifiesto de audio debe usar el esquema 2.");
  }
  if (!isRelativeAssetPath(manifest.base_path ?? ".")) {
    throw new Error("base_path debe ser relativo al manifiesto de audio.");
  }

  for (const [key, definition] of Object.entries(manifest.assets)) {
    if (!definition || typeof definition !== "object") {
      throw new Error(`La definición de audio ${key} no es válida.`);
    }
    if (typeof definition.id !== "string" || definition.id.length === 0) {
      throw new Error(`La definición de audio ${key} no tiene un ID válido.`);
    }
    if (!isRelativeAssetPath(definition.src)) {
      throw new Error(`La ruta del audio ${key} debe ser relativa.`);
    }
    if (!AUDIO_CATEGORIES.includes(definition.category)) {
      throw new Error(`La categoría del audio ${key} debe ser ambience o effects.`);
    }
    if (!Number.isFinite(definition.volume) || definition.volume < 0 || definition.volume > 1) {
      throw new Error(`El volumen del audio ${key} debe estar entre 0 y 1.`);
    }
  }

  return manifest;
}

export class AudioManager {
  constructor({
    manifestUrl = DEFAULT_MANIFEST_URL,
    fetchImpl = defaultFetch,
    audioFactory = createBrowserAudio,
    gestureTarget = globalThis.window ?? null,
    visibilityTarget = globalThis.document ?? null,
    ambienceVolume = 1,
    effectsVolume = 1,
    ambienceKey = "global_ambience",
    defaultInteractionKey = DEFAULT_INTERACTION_KEY,
    logger = globalThis.console,
    setTimeoutImpl = globalThis.setTimeout?.bind(globalThis),
    clearTimeoutImpl = globalThis.clearTimeout?.bind(globalThis),
  } = {}) {
    this.manifestUrl = new URL(String(manifestUrl), import.meta.url);
    this.fetchImpl = fetchImpl;
    this.audioFactory = audioFactory;
    this.gestureTarget = gestureTarget;
    this.visibilityTarget = visibilityTarget;
    this.categoryVolumes = {
      ambience: clampVolume(ambienceVolume),
      effects: clampVolume(effectsVolume),
    };
    this.ambienceKey = ambienceKey;
    this.defaultInteractionKey = defaultInteractionKey;
    this.logger = logger;
    this.setTimeoutImpl = setTimeoutImpl;
    this.clearTimeoutImpl = clearTimeoutImpl;

    this.started = false;
    this.activated = false;
    this.loadState = "idle";
    this.loadPromise = null;
    this.activationPromise = null;
    this.manifest = null;
    this.assets = new Map();
    this.previews = new Set();
    this.listeners = new Set();
    this.warnedMessages = new Set();

    this.onUserGesture = () => {
      this.activationPromise = this.activateFromGesture();
      void this.activationPromise;
    };
    this.onVisibilityChange = () => {
      void this.#handleVisibilityChange();
    };
  }

  start() {
    if (this.started) return this;
    this.started = true;

    for (const eventName of USER_GESTURE_EVENTS) {
      this.gestureTarget?.addEventListener?.(eventName, this.onUserGesture, {
        capture: true,
        passive: true,
      });
    }
    this.visibilityTarget?.addEventListener?.("visibilitychange", this.onVisibilityChange);
    return this;
  }

  destroy() {
    if (this.started) {
      for (const eventName of USER_GESTURE_EVENTS) {
        this.gestureTarget?.removeEventListener?.(eventName, this.onUserGesture, {
          capture: true,
        });
      }
      this.visibilityTarget?.removeEventListener?.("visibilitychange", this.onVisibilityChange);
    }

    this.started = false;
    this.#pauseAllPrimaryAudio();
    this.stopPreviews();
    this.assets.clear();
    this.listeners.clear();
  }

  subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState() {
    const ambience = this.assets.get(this.ambienceKey)?.element;
    return Object.freeze({
      started: this.started,
      activated: this.activated,
      loadState: this.loadState,
      ready: this.loadState === "ready",
      ambienceVolume: this.categoryVolumes.ambience,
      effectsVolume: this.categoryVolumes.effects,
      categoryVolumes: Object.freeze({ ...this.categoryVolumes }),
      ambiencePlaying: Boolean(ambience && !ambience.paused),
      activePreviews: this.previews.size,
      assetKeys: Object.freeze([...this.assets.keys()]),
    });
  }

  whenReady() {
    if (this.activationPromise) {
      return this.activationPromise.then(() => this.loadState === "ready");
    }
    if (this.loadPromise) return this.loadPromise;
    return Promise.resolve(this.loadState === "ready");
  }

  async activateFromGesture() {
    this.activated = true;
    const loaded = await this.#ensureLoaded();
    if (!loaded) return { ok: false, reason: "audio-unavailable" };

    this.#applyPlaybackSettings();
    this.#emit("audio-activated");
    if (this.categoryVolumes.ambience > 0 && !this.#isDocumentHidden()) {
      await this.resumeAmbience();
    }
    return { ok: true };
  }

  setCategoryVolume(category, volume) {
    if (!AUDIO_CATEGORIES.includes(category)) return null;
    const previousVolume = this.categoryVolumes[category];
    const nextVolume = clampVolume(volume, previousVolume);
    this.categoryVolumes[category] = nextVolume;
    this.#applyPlaybackSettings();

    if (nextVolume === 0) {
      this.#pauseCategory(category);
    } else if (
      category === "ambience" &&
      previousVolume === 0 &&
      this.activated &&
      !this.#isDocumentHidden()
    ) {
      void this.resumeAmbience();
    }

    this.#emit("category-volume-changed", { category, volume: nextVolume });
    return nextVolume;
  }

  setAmbienceVolume(volume) {
    return this.setCategoryVolume("ambience", volume);
  }

  setEffectsVolume(volume) {
    return this.setCategoryVolume("effects", volume);
  }

  async play(assetKey, { restart = true } = {}) {
    if (!this.activated) return { ok: false, reason: "awaiting-user-gesture" };
    if (this.#isDocumentHidden()) return { ok: false, reason: "document-hidden" };
    if (!(await this.#ensureLoaded())) return { ok: false, reason: "audio-unavailable" };

    const asset = this.assets.get(assetKey);
    if (!asset) return { ok: false, reason: "unknown-asset" };
    if (this.categoryVolumes[asset.definition.category] === 0) {
      return { ok: false, reason: "category-silent", category: asset.definition.category };
    }
    const element = asset.element;
    if (restart) this.#rewind(element);

    try {
      await Promise.resolve(element.play());
      this.#emit("asset-played", { assetKey });
      return { ok: true, assetKey };
    } catch (error) {
      this.#warnOnce(`play:${assetKey}`, `No fue posible reproducir el audio ${assetKey}.`, error);
      this.#emit("playback-error", { assetKey, error });
      return { ok: false, reason: "playback-rejected", error };
    }
  }

  playInteractionCue({ specificAssetKey } = {}) {
    const assetKey =
      typeof specificAssetKey === "string" && specificAssetKey.length > 0
        ? specificAssetKey
        : this.defaultInteractionKey;
    return this.play(assetKey);
  }

  async resumeAmbience() {
    if (!this.activated) return { ok: false, reason: "awaiting-user-gesture" };
    if (this.#isDocumentHidden()) return { ok: false, reason: "document-hidden" };
    if (!(await this.#ensureLoaded())) return { ok: false, reason: "audio-unavailable" };

    const ambienceAsset = this.assets.get(this.ambienceKey);
    if (!ambienceAsset) return { ok: false, reason: "unknown-ambience" };
    if (this.categoryVolumes[ambienceAsset.definition.category] === 0) {
      return { ok: false, reason: "category-silent", category: ambienceAsset.definition.category };
    }
    if (!ambienceAsset.element.paused) return { ok: true, reason: "already-playing" };
    return this.play(this.ambienceKey, { restart: false });
  }

  pauseAmbience() {
    const ambience = this.assets.get(this.ambienceKey)?.element;
    ambience?.pause?.();
    this.#emit("ambience-paused");
  }

  async preview(assetKey, { durationMs } = {}) {
    if (!this.activated) return { ok: false, reason: "awaiting-user-gesture" };
    if (this.#isDocumentHidden()) return { ok: false, reason: "document-hidden" };
    if (!(await this.#ensureLoaded())) return { ok: false, reason: "audio-unavailable" };

    const asset = this.assets.get(assetKey);
    if (!asset) return { ok: false, reason: "unknown-asset" };
    if (this.categoryVolumes[asset.definition.category] === 0) {
      return { ok: false, reason: "category-silent", category: asset.definition.category };
    }
    if (assetKey === this.ambienceKey && !asset.element.paused) {
      return { ok: true, assetKey, reason: "already-playing" };
    }

    let previewElement;
    try {
      previewElement = this.audioFactory(asset.source);
      this.#configureElement(previewElement, asset.definition, { loop: false });
      previewElement.preload = "auto";
      previewElement.load?.();
    } catch (error) {
      this.#warnOnce(`preview-create:${assetKey}`, `No fue posible preparar la vista previa ${assetKey}.`, error);
      return { ok: false, reason: "audio-unavailable", error };
    }

    const preview = { element: previewElement, definition: asset.definition, timer: null };
    this.previews.add(preview);
    const cleanup = () => this.#disposePreview(preview);
    previewElement.addEventListener?.("ended", cleanup, { once: true });

    const effectiveDuration = Number.isFinite(durationMs)
      ? Math.max(0, durationMs)
      : asset.definition.loop
        ? 5000
        : 0;
    if (effectiveDuration > 0 && this.setTimeoutImpl) {
      preview.timer = this.setTimeoutImpl(cleanup, effectiveDuration);
    }

    try {
      await Promise.resolve(previewElement.play());
      this.#emit("preview-started", { assetKey });
      return { ok: true, assetKey };
    } catch (error) {
      cleanup();
      this.#warnOnce(`preview-play:${assetKey}`, `No fue posible reproducir la vista previa ${assetKey}.`, error);
      return { ok: false, reason: "playback-rejected", error };
    }
  }

  stopPreviews() {
    for (const preview of [...this.previews]) this.#disposePreview(preview);
  }

  async #ensureLoaded() {
    if (this.loadState === "ready") return true;
    if (this.loadState === "failed") return false;
    if (this.loadPromise) return this.loadPromise;

    this.loadState = "loading";
    this.loadPromise = this.#loadManifestAndAssets()
      .then(() => {
        this.loadState = "ready";
        this.#emit("audio-ready");
        return true;
      })
      .catch((error) => {
        this.loadState = "failed";
        this.#warnOnce("load", "El sistema de audio no pudo inicializarse; ORBIT continuará en silencio.", error);
        this.#emit("audio-unavailable", { error });
        return false;
      });
    return this.loadPromise;
  }

  async #loadManifestAndAssets() {
    const response = await this.fetchImpl(this.manifestUrl.href);
    if (!response || response.ok === false) {
      throw new Error(`No fue posible cargar el manifiesto de audio (${response?.status ?? "sin respuesta"}).`);
    }

    const manifest = validateManifest(await response.json());
    const baseUrl = new URL(manifest.base_path ?? ".", this.manifestUrl);
    const assets = new Map();

    for (const [key, definition] of Object.entries(manifest.assets)) {
      const source = new URL(definition.src, baseUrl).href;
      const element = this.audioFactory(source);
      this.#configureElement(element, definition);
      element.preload = "auto";
      element.load?.();
      assets.set(key, { definition, element, source });
    }

    this.manifest = manifest;
    this.assets = assets;
  }

  #configureElement(element, definition, { loop = Boolean(definition.loop) } = {}) {
    element.loop = loop;
    element.volume =
      clampVolume(definition.volume) * this.categoryVolumes[definition.category];
    if ("playsInline" in element) element.playsInline = true;
  }

  #applyPlaybackSettings() {
    for (const asset of this.assets.values()) {
      asset.element.volume =
        clampVolume(asset.definition.volume) * this.categoryVolumes[asset.definition.category];
    }
    for (const preview of this.previews) {
      preview.element.volume =
        clampVolume(preview.definition.volume) *
        this.categoryVolumes[preview.definition.category];
    }
  }

  #rewind(element) {
    try {
      element.currentTime = 0;
    } catch {
      // Algunos navegadores no permiten buscar antes de cargar metadatos.
    }
  }

  #pauseAllPrimaryAudio() {
    for (const asset of this.assets.values()) asset.element.pause?.();
  }

  #pauseCategory(category) {
    for (const asset of this.assets.values()) {
      if (asset.definition.category === category) asset.element.pause?.();
    }
    for (const preview of [...this.previews]) {
      if (preview.definition.category === category) this.#disposePreview(preview);
    }
  }

  #disposePreview(preview) {
    if (!this.previews.delete(preview)) return;
    preview.element.pause?.();
    this.#rewind(preview.element);
    if (preview.timer !== null && this.clearTimeoutImpl) this.clearTimeoutImpl(preview.timer);
  }

  #isDocumentHidden() {
    return Boolean(
      this.visibilityTarget?.hidden || this.visibilityTarget?.visibilityState === "hidden",
    );
  }

  async #handleVisibilityChange() {
    if (this.#isDocumentHidden()) {
      this.#pauseAllPrimaryAudio();
      this.stopPreviews();
      this.#emit("audio-suspended");
      return;
    }
    this.#emit("audio-resumed");
    if (this.activated && this.categoryVolumes.ambience > 0) await this.resumeAmbience();
  }

  #warnOnce(key, message, error) {
    if (this.warnedMessages.has(key)) return;
    this.warnedMessages.add(key);
    this.logger?.warn?.(message, error);
  }

  #emit(type, detail = {}) {
    const event = Object.freeze({ type, detail, state: this.getState() });
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        this.#warnOnce("listener", "Un observador del sistema de audio produjo un error.", error);
      }
    }
  }
}

export const AUDIO_MANIFEST_URL = DEFAULT_MANIFEST_URL;
