const SESSION_ENDPOINT = "./__orbit/author/session";

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export class EditorAuthorClientError extends Error {
  constructor(code, message, { status = null, cause = null } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = "EditorAuthorClientError";
    this.code = code;
    this.status = status;
  }
}

export class EditorAuthorClient {
  constructor({ fetchImpl = globalThis.fetch, sessionEndpoint = SESSION_ENDPOINT } = {}) {
    if (typeof fetchImpl !== "function") {
      throw new TypeError("El cliente de autoría requiere fetch.");
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
        headers: { accept: "application/json" },
      });
    } catch (error) {
      throw new EditorAuthorClientError(
        "author-helper-unavailable",
        "El helper de autoría no está disponible. Inicia `npm run editor:author` y abre la URL que indique.",
        { cause: error },
      );
    }
    const body = await this.#readResponse(response);
    if (
      body.kind !== "orbit-editor-author-session"
      || body.schemaVersion !== 1
      || typeof body.token !== "string"
      || !isRecord(body.endpoints)
    ) {
      throw new EditorAuthorClientError(
        "invalid-author-session",
        "El servidor local no expone una sesión de autoría compatible.",
      );
    }
    this.session = body;
    return structuredClone(body);
  }

  async apply({ document, expectedPreviousRevision }) {
    return this.#post("apply", { document, expectedPreviousRevision });
  }

  async finalize(rollbackToken) {
    return this.#post("finalize", { rollbackToken });
  }

  async rollback(rollbackToken) {
    return this.#post("rollback", { rollbackToken });
  }

  async #post(endpointName, payload) {
    const session = this.session ?? await this.connect();
    const endpoint = session.endpoints?.[endpointName];
    if (typeof endpoint !== "string" || !endpoint.startsWith("/__orbit/author/")) {
      throw new EditorAuthorClientError(
        "invalid-author-endpoint",
        "La sesión local no declara un endpoint de autoría permitido.",
      );
    }
    let response;
    try {
      response = await this.fetch(endpoint, {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-orbit-author-token": session.token,
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      throw new EditorAuthorClientError(
        "author-helper-unavailable",
        "Se perdió la conexión con el helper de autoría local.",
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
      throw new EditorAuthorClientError(
        "invalid-author-response",
        "El helper devolvió una respuesta que no es JSON.",
        { status: response?.status ?? null, cause: error },
      );
    }
    if (!response.ok || body?.ok === false) {
      throw new EditorAuthorClientError(
        body?.code ?? "author-request-failed",
        body?.message ?? `La operación de autoría falló (${response.status}).`,
        { status: response.status },
      );
    }
    return body;
  }
}
