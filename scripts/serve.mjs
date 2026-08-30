import { createReadStream, existsSync, realpathSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  sendEditorEntryRedirect,
  sendRuntimeEntryUnavailable,
  shouldBlockRuntimeEntry,
} from "./repository-runtime-gate.mjs";
import {
  createLocalServiceControl,
  createLocalServiceToken,
} from "./local-service-control.mjs";

export const ORBIT_DEV_CANONICAL_PORT = 4173;
export const ORBIT_DEV_CANONICAL_ORIGIN =
  `http://127.0.0.1:${ORBIT_DEV_CANONICAL_PORT}`;

const root = resolve(process.cwd());

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".md", "text/markdown; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".ogg", "audio/ogg"],
  [".woff2", "font/woff2"],
  [".woff", "font/woff"],
  [".ttf", "font/ttf"],
]);

function isAllowedDevResource(relativePath) {
  if (["index.html", "editor.html"].includes(relativePath)) return true;
  if (/^src\/.+\.(?:css|js|json)$/i.test(relativePath)) return true;
  if (/^public\/.+\.(?:json|ogg|png|jpe?g|svg|webp|webmanifest|woff2?|ttf)$/i.test(relativePath)) {
    return true;
  }
  return /^node_modules\/katex\/dist\/.+\.(?:css|js|mjs|woff2?|ttf)$/i.test(relativePath);
}

export function resolveOrbitDevStaticPath(requestUrl, { projectRoot = root } = {}) {
  let parsed;
  try {
    parsed = new URL(requestUrl, ORBIT_DEV_CANONICAL_ORIGIN);
  } catch {
    return null;
  }
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(parsed.pathname).replaceAll("\\", "/");
  } catch {
    return null;
  }
  const requested = decodedPath.replace(/^\/+/, "") || "index.html";
  const lexicalRoot = resolve(projectRoot);
  const candidate = resolve(lexicalRoot, requested);
  const containment = relative(lexicalRoot, candidate);
  if (
    !containment
    || containment === ".."
    || containment.startsWith(`..${sep}`)
    || isAbsolute(containment)
  ) {
    return null;
  }
  const portable = containment.split(sep).join("/");
  if (!isAllowedDevResource(portable)) return null;
  if (!existsSync(candidate) || !statSync(candidate).isFile()) return null;
  let canonicalRoot;
  let canonicalCandidate;
  try {
    canonicalRoot = realpathSync(lexicalRoot);
    canonicalCandidate = realpathSync(candidate);
  } catch {
    return null;
  }
  const realContainment = relative(canonicalRoot, canonicalCandidate);
  if (
    !realContainment
    || realContainment === ".."
    || realContainment.startsWith(`..${sep}`)
    || isAbsolute(realContainment)
    || !isAllowedDevResource(realContainment.split(sep).join("/"))
  ) {
    return null;
  }
  return canonicalCandidate;
}

export function isCanonicalOrbitDevRequest(request, {
  canonicalOrigin = ORBIT_DEV_CANONICAL_ORIGIN,
} = {}) {
  const canonical = new URL(canonicalOrigin);
  if (request.headers?.host !== canonical.host) return false;
  try {
    const requestTarget = request.url ?? "";
    const parsed = new URL(requestTarget, canonical);
    if (
      parsed.origin !== canonical.origin
      || parsed.username !== ""
      || parsed.password !== ""
    ) return false;
    const absoluteForm = /^[a-z][a-z0-9+.-]*:\/\//i.test(requestTarget);
    if (absoluteForm) {
      return true;
    }
    if (!requestTarget.startsWith("/") || requestTarget.startsWith("//")) return false;
    return !decodeURIComponent(parsed.pathname).replaceAll("\\", "/").startsWith("//");
  } catch {
    return false;
  }
}

export function createOrbitDevRequestHandler({
  projectRoot = root,
  localServiceToken = createLocalServiceToken(),
  shutdown = null,
} = {}) {
  const localServiceControl = typeof shutdown === "function"
    ? createLocalServiceControl({
        service: "development",
        token: localServiceToken,
        shutdown,
      })
    : null;

  return async function handleRequest(request, response) {
    if (!isCanonicalOrbitDevRequest(request)) {
      response.writeHead(421, {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      });
      response.end("Autoridad local no permitida");
      return;
    }
    const requestOrigin = ORBIT_DEV_CANONICAL_ORIGIN;
    const url = new URL(request.url, requestOrigin);
    if (
      localServiceControl
      && await localServiceControl.handle({ request, response, requestOrigin, url })
    ) return;
    if (!request.url || !["GET", "HEAD"].includes(request.method ?? "")) {
      response.writeHead(405, { "content-type": "text/plain; charset=utf-8" });
      response.end("Método no permitido");
      return;
    }

    if (sendEditorEntryRedirect(response, request.url, {
      head: request.method === "HEAD",
    })) return;

    if (shouldBlockRuntimeEntry(projectRoot, request.url)) {
      sendRuntimeEntryUnavailable(response);
      return;
    }

    const filePath = resolveOrbitDevStaticPath(request.url, { projectRoot });
    if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Recurso no encontrado");
      return;
    }

    const extension = extname(filePath).toLowerCase();
    response.writeHead(200, {
      "content-type": mimeTypes.get(extension) ?? "application/octet-stream",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(filePath).pipe(response);
  };
}

export function resolveOrbitDevCliPort({
  environment = process.env,
  argv = process.argv,
} = {}) {
  const explicit = environment?.PORT ?? argv?.[2];
  if (
    explicit !== undefined
    && String(explicit).trim() !== String(ORBIT_DEV_CANONICAL_PORT)
  ) {
    throw new Error(
      `No se admite cambiar el origen local de ORBIT: usa ${ORBIT_DEV_CANONICAL_ORIGIN}. Web Locks y localStorage no se comparten entre puertos.`,
    );
  }
  return ORBIT_DEV_CANONICAL_PORT;
}

let activeServer = null;
let shutdownStarted = false;

function listen(candidatePort) {
  const candidateServer = createServer(createOrbitDevRequestHandler({ shutdown }));

  candidateServer.once("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`No se pudo iniciar ORBIT: ${ORBIT_DEV_CANONICAL_ORIGIN} ya está ocupado.`);
      console.error(
        "Detén con Ctrl+C el npm run dev/editor:author anterior; no abras otro puerto porque separaría locks y progreso.",
      );
    } else {
      console.error("No se pudo iniciar el servidor local de ORBIT.", error);
    }
    process.exitCode = 1;
  });

  candidateServer.listen(candidatePort, "127.0.0.1", () => {
    activeServer = candidateServer;
    console.log(`ORBIT · Estudiante: http://127.0.0.1:${candidatePort}/`);
    console.log(`ORBIT · Docente: http://127.0.0.1:${candidatePort}/?profile=teacher`);
    console.log(`ORBIT · Debug: http://127.0.0.1:${candidatePort}/?debug=1&profile=debug`);
    console.log(`ORBIT Editor · Docente: http://127.0.0.1:${candidatePort}/editor.html`);
    console.log(`ORBIT Editor · Estudiante (solo lectura): http://127.0.0.1:${candidatePort}/editor.html?profile=student`);
    console.log(`ORBIT Editor · Debug (bloqueado): http://127.0.0.1:${candidatePort}/editor.html?profile=debug`);
    console.log("Presiona Ctrl+C para detener el servidor.");
  });
}

function shutdown() {
  if (shutdownStarted) return;
  shutdownStarted = true;
  if (!activeServer?.listening) {
    process.exit(0);
    return;
  }
  activeServer.close(() => process.exit(0));
  activeServer.closeIdleConnections?.();
}

const invokedDirectly = process.argv[1]
  && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  try {
    listen(resolveOrbitDevCliPort());
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error(error?.message ?? String(error));
    process.exitCode = 1;
  }
}
