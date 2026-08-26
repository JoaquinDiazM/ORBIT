import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import process from "node:process";

const root = resolve(process.cwd());
const katexRoot = resolve(root, "node_modules", "katex", "dist");
const requestedPort = Number(process.env.PORT ?? process.argv[2] ?? 4173);
const port = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 4173;

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

function safeFilePath(requestUrl) {
  const parsed = new URL(requestUrl, "http://localhost");
  const decodedPath = decodeURIComponent(parsed.pathname);
  if (decodedPath.startsWith("/vendor/katex/")) {
    const relativeVendorPath = normalize(decodedPath.slice("/vendor/katex/".length));
    const vendorCandidate = resolve(join(katexRoot, relativeVendorPath));
    return vendorCandidate === katexRoot || vendorCandidate.startsWith(`${katexRoot}${sep}`)
      ? vendorCandidate
      : null;
  }
  const relative = normalize(decodedPath).replace(/^([/\\])+/, "");
  const candidate = resolve(join(root, relative || "index.html"));
  if (!candidate.startsWith(root)) return null;
  if (existsSync(candidate) && statSync(candidate).isDirectory()) {
    return join(candidate, "index.html");
  }
  return candidate;
}

const server = createServer((request, response) => {
  if (!request.url || !["GET", "HEAD"].includes(request.method ?? "")) {
    response.writeHead(405, { "content-type": "text/plain; charset=utf-8" });
    response.end("Método no permitido");
    return;
  }

  const filePath = safeFilePath(request.url);
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
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Atlas disponible en http://127.0.0.1:${port}/`);
  console.log(`Debugger aislado: http://127.0.0.1:${port}/?debug=1&profile=debug`);
  console.log("Presiona Ctrl+C para detener el servidor.");
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
