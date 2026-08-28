import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import process from "node:process";

const root = resolve(process.cwd());
const requestedPort = Number(process.env.PORT ?? process.argv[2] ?? 4173);
const port =
  Number.isInteger(requestedPort) && requestedPort > 0 && requestedPort <= 65_535
    ? requestedPort
    : 4173;
const hasExplicitPort = process.env.PORT !== undefined || process.argv[2] !== undefined;
const fallbackAttempts = hasExplicitPort ? 0 : 10;

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
  const relative = normalize(decodedPath).replace(/^([/\\])+/, "");
  const candidate = resolve(join(root, relative || "index.html"));
  if (!candidate.startsWith(root)) return null;
  if (existsSync(candidate) && statSync(candidate).isDirectory()) {
    return join(candidate, "index.html");
  }
  return candidate;
}

function handleRequest(request, response) {
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
}

let activeServer = null;

function listen(candidatePort, attemptsRemaining) {
  const candidateServer = createServer(handleRequest);

  candidateServer.once("error", (error) => {
    if (error.code === "EADDRINUSE" && attemptsRemaining > 0 && candidatePort < 65_535) {
      console.warn(`ATENCIÓN: el puerto ${candidatePort} está ocupado por otro proceso.`);
      console.warn(`El servidor nuevo se abrirá en ${candidatePort + 1}; usa la URL que aparecerá abajo.`);
      listen(candidatePort + 1, attemptsRemaining - 1);
      return;
    }

    if (error.code === "EADDRINUSE") {
      console.error(`No se pudo iniciar ORBIT: el puerto ${candidatePort} ya está ocupado.`);
      console.error("Detén el servidor anterior con Ctrl+C o elige otro puerto con $env:PORT.");
    } else {
      console.error("No se pudo iniciar el servidor local de ORBIT.", error);
    }
    process.exitCode = 1;
  });

  candidateServer.listen(candidatePort, "127.0.0.1", () => {
    activeServer = candidateServer;
    console.log(`ORBIT disponible en http://127.0.0.1:${candidatePort}/`);
    console.log(`Debugger aislado: http://127.0.0.1:${candidatePort}/?debug=1&profile=debug`);
    console.log("Presiona Ctrl+C para detener el servidor.");
  });
}

listen(port, fallbackAttempts);

function shutdown() {
  if (!activeServer?.listening) {
    process.exit(0);
    return;
  }
  activeServer.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
