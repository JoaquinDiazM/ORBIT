import { randomBytes } from "node:crypto";

export const LOCAL_SERVICE_SESSION_PATH = "/__orbit/local/session";
export const LOCAL_SERVICE_SHUTDOWN_PATH = "/__orbit/local/shutdown";
export const LOCAL_SERVICE_TOKEN_HEADER = "x-orbit-local-token";

const MAX_CONTROL_BODY_BYTES = 1_024;
const ALLOWED_SERVICES = new Set(["development", "editor-author"]);

export function createLocalServiceToken() {
  return randomBytes(32).toString("hex");
}

function sendJson(response, status, value, { close = false } = {}) {
  const body = `${JSON.stringify(value)}\n`;
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...(close ? { connection: "close" } : {}),
  });
  response.end(body);
}

async function readControlBody(request) {
  const declaredLength = Number(request.headers["content-length"] ?? 0);
  if (!Number.isFinite(declaredLength) || declaredLength > MAX_CONTROL_BODY_BYTES) {
    return null;
  }
  let size = 0;
  const chunks = [];
  try {
    for await (const chunk of request) {
      size += chunk.length;
      if (size > MAX_CONTROL_BODY_BYTES) return null;
      chunks.push(chunk);
    }
  } catch {
    return null;
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

export function isLocalServiceControlPath(pathname) {
  return pathname === LOCAL_SERVICE_SESSION_PATH
    || pathname === LOCAL_SERVICE_SHUTDOWN_PATH;
}

export function createLocalServiceControl({
  service,
  token = createLocalServiceToken(),
  isBusy = () => false,
  shutdown,
} = {}) {
  if (!ALLOWED_SERVICES.has(service)) {
    throw new TypeError("El control local requiere un servicio conocido.");
  }
  if (typeof token !== "string" || token.length < 32) {
    throw new TypeError("El control local requiere un token de sesión robusto.");
  }
  if (typeof isBusy !== "function" || typeof shutdown !== "function") {
    throw new TypeError("El control local requiere callbacks de estado y apagado.");
  }

  let shutdownAccepted = false;

  return {
    token,
    get shutdownPending() {
      return shutdownAccepted;
    },
    async handle({ request, response, requestOrigin, url }) {
      if (!isLocalServiceControlPath(url.pathname)) return false;

      if (url.pathname === LOCAL_SERVICE_SESSION_PATH) {
        if (request.method !== "GET") {
          sendJson(response, 405, { ok: false, code: "method-not-allowed" });
          return true;
        }
        const busy = Boolean(await isBusy());
        if (request.aborted || response.destroyed) return true;
        sendJson(response, 200, {
          kind: "orbit-local-service-session",
          schemaVersion: 1,
          service,
          token,
          busy,
          endpoints: { shutdown: LOCAL_SERVICE_SHUTDOWN_PATH },
        });
        return true;
      }

      if (request.method !== "POST") {
        sendJson(response, 405, { ok: false, code: "method-not-allowed" });
        return true;
      }
      if (
        request.headers.origin !== requestOrigin
        || request.headers[LOCAL_SERVICE_TOKEN_HEADER] !== token
        || !String(request.headers["content-type"] ?? "").toLowerCase().startsWith("application/json")
        || (
          request.headers["sec-fetch-site"] !== undefined
          && request.headers["sec-fetch-site"] !== "same-origin"
        )
      ) {
        sendJson(response, 403, { ok: false, code: "local-service-request-rejected" });
        return true;
      }
      const initiallyBusy = Boolean(await isBusy());
      if (request.aborted || response.destroyed) return true;
      if (initiallyBusy) {
        sendJson(response, 409, {
          ok: false,
          code: "local-service-busy",
          message: "El servicio local está ejecutando una operación y no puede apagarse todavía.",
        });
        return true;
      }
      if (shutdownAccepted) {
        sendJson(response, 409, {
          ok: false,
          code: "local-service-shutdown-pending",
          message: "El apagado del servicio local ya está en curso.",
        });
        return true;
      }
      const body = await readControlBody(request);
      if (request.aborted || response.destroyed) return true;
      if (
        !body
        || Object.keys(body).length !== 1
        || body.intent !== "shutdown"
      ) {
        sendJson(response, 400, { ok: false, code: "invalid-local-service-request" });
        return true;
      }
      const finallyBusy = Boolean(await isBusy());
      if (request.aborted || response.destroyed) return true;
      if (finallyBusy) {
        sendJson(response, 409, {
          ok: false,
          code: "local-service-busy",
          message: "El servicio local está ejecutando una operación y no puede apagarse todavía.",
        });
        return true;
      }
      if (shutdownAccepted) {
        sendJson(response, 409, {
          ok: false,
          code: "local-service-shutdown-pending",
          message: "El apagado del servicio local ya está en curso.",
        });
        return true;
      }

      shutdownAccepted = true;
      response.once("finish", () => {
        setImmediate(() => {
          void Promise.resolve(shutdown()).catch((error) => {
            console.error("No fue posible completar el apagado local de ORBIT.", error);
          });
        });
      });
      sendJson(response, 202, {
        ok: true,
        service,
        state: "shutting-down",
      }, { close: true });
      return true;
    },
  };
}
