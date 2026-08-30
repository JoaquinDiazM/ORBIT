const SESSION_ENDPOINT = "./__orbit/local/session";
const SHUTDOWN_ENDPOINT = "/__orbit/local/shutdown";
const ALLOWED_SERVICES = new Set(["development", "editor-author"]);

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export class EditorLocalServiceClientError extends Error {
  constructor(code, message, { status = null, cause = null } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = "EditorLocalServiceClientError";
    this.code = code;
    this.status = status;
  }
}

export class EditorLocalServiceClient {
  constructor({ fetchImpl = globalThis.fetch, sessionEndpoint = SESSION_ENDPOINT } = {}) {
    if (typeof fetchImpl !== "function") {
      throw new TypeError("El control del servicio local requiere fetch.");
    }
    this.fetch = fetchImpl;
    this.sessionEndpoint = sessionEndpoint;
    this.session = null;
  }

  async connect() {
    let response;
    try {
      response = await this.fetch(this.sessionEndpoint, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
        headers: { accept: "application/json" },
      });
    } catch (error) {
      throw new EditorLocalServiceClientError(
        "local-service-unavailable",
        "Este servidor no ofrece apagado controlado.",
        { cause: error },
      );
    }
    const body = await this.#readResponse(response);
    if (
      body.kind !== "orbit-local-service-session"
      || body.schemaVersion !== 1
      || !ALLOWED_SERVICES.has(body.service)
      || typeof body.token !== "string"
      || body.token.length < 32
      || typeof body.busy !== "boolean"
      || !isRecord(body.endpoints)
      || body.endpoints.shutdown !== SHUTDOWN_ENDPOINT
    ) {
      throw new EditorLocalServiceClientError(
        "invalid-local-service-session",
        "El servidor actual no expone un control local compatible.",
      );
    }
    this.session = body;
    return structuredClone(body);
  }

  async shutdown() {
    let session = this.session ?? await this.connect();
    if (session.busy) {
      this.session = null;
      session = await this.connect();
    }
    if (session.busy) {
      throw new EditorLocalServiceClientError(
        "local-service-busy",
        "El servicio local tiene una aplicación pendiente o en curso.",
        { status: 409 },
      );
    }

    let response;
    try {
      response = await this.fetch(SHUTDOWN_ENDPOINT, {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-orbit-local-token": session.token,
        },
        body: JSON.stringify({ intent: "shutdown" }),
      });
    } catch (error) {
      throw new EditorLocalServiceClientError(
        "local-service-unavailable",
        "Se perdió la conexión con el servidor local.",
        { cause: error },
      );
    }
    return this.#readResponse(response);
  }

  async #readResponse(response) {
    let body;
    try {
      body = await response.json();
    } catch (error) {
      throw new EditorLocalServiceClientError(
        "invalid-local-service-response",
        "El servidor actual no devolvió una respuesta de control compatible.",
        { status: response?.status ?? null, cause: error },
      );
    }
    if (!response.ok || body?.ok === false) {
      throw new EditorLocalServiceClientError(
        body?.code ?? "local-service-request-failed",
        body?.message ?? `El control local falló (${response.status}).`,
        { status: response.status },
      );
    }
    return body;
  }
}
