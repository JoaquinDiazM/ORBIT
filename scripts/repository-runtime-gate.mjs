import { existsSync } from "node:fs";
import { posix, resolve } from "node:path";

export const REPOSITORY_TRANSACTION_RELATIVE_PATH =
  ".orbit-editor/repository-transaction.json";

const RUNTIME_ENTRY_PATHS = new Set([
  "/",
  "/index.html",
  "/src/bootstrap.js",
  "/src/main.js",
  "/dist",
  "/dist/",
  "/dist/index.html",
  "/dist/src/bootstrap.js",
  "/dist/src/main.js",
]);

export function isRuntimeEntryRequest(requestUrl) {
  try {
    const url = new URL(requestUrl ?? "/", "http://127.0.0.1");
    const decoded = decodeURIComponent(url.pathname).replaceAll("\\", "/");
    const normalized = posix
      .normalize(decoded.startsWith("/") ? decoded : `/${decoded}`)
      .toLowerCase();
    return RUNTIME_ENTRY_PATHS.has(normalized);
  } catch {
    // El resolvedor estático también rechazará la URI. Con una transacción
    // pendiente se clasifica como entrada para no abrir un bypass ambiguo.
    return true;
  }
}

export function repositoryTransactionPending(root) {
  return existsSync(resolve(root, REPOSITORY_TRANSACTION_RELATIVE_PATH));
}

export function shouldBlockRuntimeEntry(root, requestUrl, { busy = false } = {}) {
  return isRuntimeEntryRequest(requestUrl)
    && (busy || repositoryTransactionPending(root));
}

export function sendRuntimeEntryUnavailable(response) {
  const body = [
    "ORBIT Estudiante está temporalmente bloqueado por una aplicación pendiente.",
    "Abre /editor.html, completa la recuperación y vuelve a cargar esta página.",
    "",
  ].join("\n");
  response.writeHead(503, {
    "content-type": "text/plain; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
    "retry-after": "1",
    "x-content-type-options": "nosniff",
    "x-orbit-runtime-status": "repository-transaction-pending",
  });
  response.end(body);
}
