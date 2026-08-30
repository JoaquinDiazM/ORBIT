const LOCAL_SERVICE_SESSION_ENDPOINT = "./__orbit/local/session";
const LOCAL_SERVICE_SESSION_KIND = "orbit-local-service-session";
const LOCAL_SERVICE_SCHEMA_VERSION = 1;
const KNOWN_SERVICES = new Set(["development", "editor-author"]);
const CANONICAL_LOCAL_SERVICE_ORIGIN = "http://127.0.0.1:4173";

function validSession(candidate) {
  return Boolean(
    candidate
    && typeof candidate === "object"
    && !Array.isArray(candidate)
    && candidate.kind === LOCAL_SERVICE_SESSION_KIND
    && candidate.schemaVersion === LOCAL_SERVICE_SCHEMA_VERSION
    && KNOWN_SERVICES.has(candidate.service),
  );
}

export async function probeLocalServiceMode({
  fetchImpl = globalThis.fetch,
  endpoint = LOCAL_SERVICE_SESSION_ENDPOINT,
} = {}) {
  if (typeof fetchImpl !== "function") return null;
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      headers: { accept: "application/json" },
    });
  } catch {
    return null;
  }
  if (!response?.ok) return null;
  let session;
  try {
    session = await response.json();
  } catch {
    return null;
  }
  return validSession(session) ? session.service : null;
}

export class OrbitMaintenanceMonitor {
  constructor({
    fetchImpl = globalThis.fetch,
    schedule = globalThis.setTimeout,
    cancel = globalThis.clearTimeout,
    intervalMs = 1_500,
    origin = globalThis.location?.origin ?? null,
    onMaintenance,
  } = {}) {
    if (typeof schedule !== "function" || typeof cancel !== "function") {
      throw new TypeError("El monitor local requiere temporizadores válidos.");
    }
    if (typeof onMaintenance !== "function") {
      throw new TypeError("El monitor local requiere una transición de mantenimiento.");
    }
    this.fetchImpl = fetchImpl;
    this.schedule = schedule;
    this.cancel = cancel;
    this.intervalMs = intervalMs;
    this.monitorUnknown = origin === CANONICAL_LOCAL_SERVICE_ORIGIN;
    this.onMaintenance = onMaintenance;
    this.active = false;
    this.timer = null;
    this.maintenanceTriggered = false;
  }

  async start() {
    if (this.active || this.maintenanceTriggered) {
      return { monitoring: this.active, maintenance: this.maintenanceTriggered };
    }
    const service = await probeLocalServiceMode({ fetchImpl: this.fetchImpl });
    if (service === "editor-author") {
      await this.#triggerMaintenance();
      return { monitoring: false, maintenance: true, service };
    }
    if (service !== "development" && !this.monitorUnknown) {
      return { monitoring: false, maintenance: false, service };
    }
    this.active = true;
    this.#scheduleNext();
    return { monitoring: true, maintenance: false, service };
  }

  stop() {
    this.active = false;
    if (this.timer !== null) {
      this.cancel(this.timer);
      this.timer = null;
    }
  }

  #scheduleNext() {
    if (!this.active || this.timer !== null) return;
    this.timer = this.schedule(() => this.#poll(), this.intervalMs);
  }

  async #poll() {
    this.timer = null;
    if (!this.active) return;
    const service = await probeLocalServiceMode({ fetchImpl: this.fetchImpl });
    if (!this.active) return;
    if (service === "editor-author") {
      await this.#triggerMaintenance();
      return;
    }
    this.#scheduleNext();
  }

  async #triggerMaintenance() {
    if (this.maintenanceTriggered) return;
    this.maintenanceTriggered = true;
    this.stop();
    await this.onMaintenance();
  }
}
