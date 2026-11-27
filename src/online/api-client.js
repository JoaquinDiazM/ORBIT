import { APP_CONFIG } from "../config.js";

export class OrbitApiError extends Error {
  constructor(code, message, { status = 0, details = null, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = "OrbitApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function createOnlineScope(serverId, userId, courseId) {
  const parts = [serverId, userId, courseId];
  if (parts.some((part) => typeof part !== "string" || !part.trim())) {
    throw new TypeError("El alcance online requiere servidor, cuenta y curso.");
  }
  return parts.map((part) => encodeURIComponent(part)).join(":");
}

export function assertOnlineResponseIdentity(response, { serverId, userId }) {
  if (!serverId || !userId || response?.serverId !== serverId || response?.userId !== userId) {
    throw new OrbitApiError("online-account-changed", "La respuesta pertenece a otra cuenta o servidor. Vuelve a ingresar antes de continuar.", { status: 409 });
  }
}

export class OrbitApiClient {
  constructor({ fetchImpl = globalThis.fetch, baseUrl = "/api/orbit" } = {}) {
    if (typeof fetchImpl !== "function") throw new TypeError("La API requiere fetch.");
    if (typeof baseUrl !== "string" || !baseUrl.startsWith("/") || baseUrl.startsWith("//")) {
      throw new TypeError("La API debe usar una ruta del mismo origen.");
    }
    this.fetchImpl = fetchImpl;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.session = null;
  }

  setSession(session) {
    this.session = session ? structuredClone(session) : null;
  }

  async request(path, { method = "GET", body } = {}) {
    if (typeof path !== "string" || !/^\/(?!\/)/.test(path)
      || path.includes("\\") || path.split(/[/?#]/).includes("..")) {
      throw new TypeError("La ruta API debe ser relativa a /api/orbit.");
    }
    const verb = String(method).toUpperCase();
    if (!["GET", "POST", "PUT", "DELETE"].includes(verb)) {
      throw new TypeError("Método API no admitido.");
    }
    const headers = { accept: "application/json", "X-Orbit-Web-Version": APP_CONFIG.version };
    const launcherVersion = globalThis.__orbitWindowsVersion;
    if (typeof launcherVersion === "string" && /^\d+\.\d+\.\d+$/.test(launcherVersion)) {
      headers["X-Orbit-Windows-Version"] = launcherVersion;
    }
    const options = { method: verb, credentials: "same-origin", cache: "no-store", headers };
    if (verb !== "GET") {
      headers["content-type"] = "application/json";
      if (path !== "/login") {
        if (typeof this.session?.csrfToken !== "string" || !this.session.csrfToken) {
          throw new OrbitApiError("authentication-required", "Inicia sesión antes de realizar esta operación.", { status: 401 });
        }
        headers["X-Orbit-CSRF"] = this.session.csrfToken;
      }
      options.body = JSON.stringify(body ?? {});
    }
    let response;
    try {
      const fetchImpl = this.fetchImpl;
      response = await fetchImpl(`${this.baseUrl}${path}`, options);
    } catch (cause) {
      throw new OrbitApiError("network-unavailable", "No se pudo conectar con el servidor. Comprueba tu conexión o VPN.", { cause });
    }
    let result;
    try {
      result = await response.json();
    } catch (cause) {
      throw new OrbitApiError("invalid-response", "El servidor no devolvió una respuesta válida.", { status: response.status || 502, cause });
    }
    if (!response.ok) {
      if (response.status === 401) this.setSession(null);
      throw new OrbitApiError(
        typeof result?.error?.code === "string" ? result.error.code : "request-failed",
        typeof result?.error?.message === "string" ? result.error.message : "El servidor rechazó la operación.",
        { status: response.status, details: result?.error?.details ?? null },
      );
    }
    if (path === "/logout") this.setSession(null);
    return result;
  }
}
