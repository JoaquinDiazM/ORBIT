import { createServer } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { isCanonicalOrbitDevRequest, resolveOrbitDevCliPort } from "./serve.mjs";
import { shouldBlockRuntimeEntry } from "./repository-runtime-gate.mjs";

const mime = new Map(Object.entries({
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".webmanifest": "application/manifest+json",
  ".png": "image/png", ".svg": "image/svg+xml", ".ogg": "audio/ogg",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf",
  ".md": "text/markdown; charset=utf-8", ".txt": "text/plain; charset=utf-8",
}));

function allowed(path) {
  return ["index.html", "editor.html", "build-info.json"].includes(path)
    || /^(?:src|public|vendor)\/[^?]*\.(?:js|mjs|css|json|webmanifest|png|svg|ogg|woff2?|ttf|md|txt)$/.test(path);
}

export function createOfflinePreviewHandler({ projectRoot = process.cwd(), dist = resolve(projectRoot, "dist") } = {}) {
  return async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    const fail = (status, message) => { response.writeHead(status); response.end(request.method === "HEAD" ? undefined : message); };
    if (!isCanonicalOrbitDevRequest(request)) return fail(421, "Abre http://127.0.0.1:4173/editor.html.");
    if (!["GET", "HEAD"].includes(request.method)) return fail(405, "Método no permitido.");
    if (shouldBlockRuntimeEntry(projectRoot, request.url)) return fail(503, "Hay una aplicación local pendiente de recuperar.");
    let path;
    try { path = decodeURIComponent(new URL(request.url, "http://127.0.0.1:4173").pathname).slice(1) || "index.html"; }
    catch { return fail(400, "Ruta no válida."); }
    if (!allowed(path)) return fail(404, "Recurso no disponible.");
    try {
      const root = await realpath(dist);
      const file = await realpath(resolve(root, path));
      const contained = relative(root, file);
      if (!contained || contained.startsWith(`..${sep}`) || isAbsolute(contained)
        || !allowed(contained.split(sep).join("/")) || !(await stat(file)).isFile()) {
        return fail(404, "Recurso no disponible.");
      }
      let bytes = await readFile(file);
      if (extname(file) === ".html") {
        // A worker at the canonical development origin would also intercept dev/author later.
        // The offline Editor needs its local server, but never installs a cache there.
        bytes = Buffer.from(bytes.toString("utf8").replace(/<meta name="orbit-build" content="[a-f0-9]+">/g, ""));
      }
      response.setHeader("Content-Type", mime.get(extname(file)) ?? "application/octet-stream");
      response.writeHead(200);
      response.end(request.method === "HEAD" ? undefined : bytes);
    } catch { fail(404, "Recurso no disponible. Comprueba que el paquete incluye dist."); }
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const port = resolveOrbitDevCliPort();
    await stat(resolve("dist/index.html"));
    const server = createServer(createOfflinePreviewHandler());
    server.on("error", (error) => {
      console.error(error.code === "EADDRINUSE"
        ? "4173 está ocupado. No se cambió el puerto ni se detuvo otro servicio."
        : "No se pudo iniciar el Editor offline.");
      process.exitCode = 1;
    });
    const close = () => { server.close(); server.closeIdleConnections(); };
    process.once("SIGINT", close);
    process.once("SIGTERM", close);
    server.listen(port, "127.0.0.1", () => {
      console.log("ORBIT Editor offline: http://127.0.0.1:4173/editor.html");
      console.log("Prepara y exporta tu borrador. Ctrl+C cierra este servicio. Publica desde tu curso online.");
    });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
