const DEFAULT_RETRY_DELAY_MS = 1_000;

function defaultShouldRetry({ result, error }) {
  return Boolean(error || result?.transient);
}

export class EditorServiceMonitor {
  constructor({
    probe,
    shouldRetry = defaultShouldRetry,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    windowTarget = globalThis.window ?? null,
    documentTarget = globalThis.document ?? null,
    schedule = (callback, delay) => globalThis.setTimeout(callback, delay),
    cancelSchedule = (timer) => globalThis.clearTimeout(timer),
  } = {}) {
    if (typeof probe !== "function") {
      throw new TypeError("El monitor del servicio editorial requiere un sondeo.");
    }
    if (typeof shouldRetry !== "function") {
      throw new TypeError("El monitor del servicio editorial requiere una política de reintento.");
    }
    if (!Number.isFinite(retryDelayMs) || retryDelayMs < 0) {
      throw new TypeError("El intervalo de reconexión editorial debe ser un número no negativo.");
    }
    if (typeof schedule !== "function" || typeof cancelSchedule !== "function") {
      throw new TypeError("El monitor del servicio editorial requiere un temporizador compatible.");
    }

    this.probe = probe;
    this.shouldRetry = shouldRetry;
    this.retryDelayMs = retryDelayMs;
    this.windowTarget = windowTarget;
    this.documentTarget = documentTarget;
    this.schedule = schedule;
    this.cancelSchedule = cancelSchedule;
    this.started = false;
    this.destroyed = false;
    this.queued = false;
    this.activeRefresh = null;
    this.retryTimer = null;

    this.onWake = () => this.#wake();
    this.onVisibilityChange = () => {
      if (this.documentTarget?.visibilityState === "visible") this.#wake();
    };
  }

  start() {
    if (this.destroyed) return Promise.resolve(undefined);
    if (!this.started) {
      this.started = true;
      this.windowTarget?.addEventListener?.("focus", this.onWake);
      this.windowTarget?.addEventListener?.("pageshow", this.onWake);
      this.documentTarget?.addEventListener?.("visibilitychange", this.onVisibilityChange);
    }
    return this.refresh();
  }

  refresh() {
    if (this.destroyed) return Promise.resolve(undefined);
    this.#clearRetry();
    if (this.activeRefresh) {
      this.queued = true;
      return this.activeRefresh;
    }
    this.activeRefresh = this.#drainProbes();
    return this.activeRefresh;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.queued = false;
    this.#clearRetry();
    if (this.started) {
      this.windowTarget?.removeEventListener?.("focus", this.onWake);
      this.windowTarget?.removeEventListener?.("pageshow", this.onWake);
      this.documentTarget?.removeEventListener?.("visibilitychange", this.onVisibilityChange);
    }
    this.started = false;
  }

  #wake() {
    return this.refresh().catch(() => undefined);
  }

  #clearRetry() {
    if (this.retryTimer === null) return;
    this.cancelSchedule(this.retryTimer);
    this.retryTimer = null;
  }

  #scheduleRetry() {
    if (this.destroyed || this.retryTimer !== null) return;
    this.retryTimer = this.schedule(() => {
      this.retryTimer = null;
      return this.#wake();
    }, this.retryDelayMs);
  }

  async #drainProbes() {
    let result;
    let error = null;
    try {
      do {
        this.queued = false;
        result = undefined;
        error = null;
        try {
          result = await this.probe();
        } catch (probeError) {
          error = probeError;
        }
      } while (!this.destroyed && this.queued);

      if (!this.destroyed && this.shouldRetry({ result, error })) {
        this.#scheduleRetry();
      }
      if (error) throw error;
      return result;
    } finally {
      this.activeRefresh = null;
    }
  }
}
