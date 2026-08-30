import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { createServer, request } from "node:http";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  EDITOR_AUTHOR_CANONICAL_PORT,
} from "../scripts/editor-author.mjs";
import {
  createOrbitDevRequestHandler,
  ORBIT_DEV_CANONICAL_ORIGIN,
  ORBIT_DEV_CANONICAL_PORT,
  resolveOrbitDevStaticPath,
  resolveOrbitDevCliPort,
} from "../scripts/serve.mjs";
import { createLocalServiceControl } from "../scripts/local-service-control.mjs";

function requestLocal(server, path, {
  host = "127.0.0.1:4173",
  method = "GET",
  headers = {},
  body = null,
} = {}) {
  const address = server.address();
  return new Promise((resolve, reject) => {
    const call = request({
      hostname: "127.0.0.1",
      port: address.port,
      method,
      path,
      headers: { Host: host, ...headers },
    }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => resolve({
        body,
        headers: response.headers,
        status: response.statusCode,
      }));
    });
    call.on("error", reject);
    call.end(body);
  });
}

function abortPartialShutdown(server, token) {
  const address = server.address();
  return new Promise((resolve, reject) => {
    const socket = connect({ host: "127.0.0.1", port: address.port }, () => {
      socket.write([
        "POST /__orbit/local/shutdown HTTP/1.1",
        "Host: 127.0.0.1:4173",
        `Origin: ${ORBIT_DEV_CANONICAL_ORIGIN}`,
        "Content-Type: application/json",
        `X-Orbit-Local-Token: ${token}`,
        "Content-Length: 100",
        "",
        "{",
      ].join("\r\n"));
      setImmediate(() => socket.destroy());
    });
    socket.once("close", resolve);
    socket.once("error", (error) => {
      if (error.code === "ECONNRESET") resolve();
      else reject(error);
    });
  });
}

function runNode(args, environment) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd: fileURLToPath(new URL("../", import.meta.url)),
      env: environment,
      shell: false,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("close", (code) => resolve({ code, stdout, stderr }));
  });
}

test("dev y autoría comparten el único puerto local canónico", () => {
  assert.equal(ORBIT_DEV_CANONICAL_PORT, 4173);
  assert.equal(ORBIT_DEV_CANONICAL_PORT, EDITOR_AUTHOR_CANONICAL_PORT);
  assert.equal(ORBIT_DEV_CANONICAL_ORIGIN, "http://127.0.0.1:4173");
  assert.equal(
    resolveOrbitDevCliPort({ environment: {}, argv: ["node", "serve"] }),
    ORBIT_DEV_CANONICAL_PORT,
  );
  assert.equal(
    resolveOrbitDevCliPort({ environment: { PORT: "4173" }, argv: [] }),
    ORBIT_DEV_CANONICAL_PORT,
  );
  assert.throws(
    () => resolveOrbitDevCliPort({ environment: { PORT: "4174" }, argv: [] }),
    /No se admite cambiar el origen local/,
  );
  assert.throws(
    () => resolveOrbitDevCliPort({ environment: {}, argv: ["node", "serve", "4200"] }),
    /No se admite cambiar el origen local/,
  );
});

test("la ejecución directa rechaza PORT antes de escuchar o buscar fallback", async () => {
  const environment = { ...process.env, PORT: "4174" };
  const script = new URL("../scripts/serve.mjs", import.meta.url);
  const result = await runNode([fileURLToPath(script)], environment);

  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /http:\/\/127\.0\.0\.1:4173/);
  assert.match(result.stderr, /Web Locks y localStorage/);

  const source = await readFile(script, "utf8");
  assert.doesNotMatch(source, /fallbackAttempts|candidatePort \+ 1|elige otro puerto/);
});

test("el servidor dev rechaza autoridades ajenas y no expone el checkout", async (context) => {
  const projectRoot = fileURLToPath(new URL("../", import.meta.url));
  const server = createServer(createOrbitDevRequestHandler({ projectRoot }));
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  context.after(() => new Promise((resolve) => server.close(resolve)));

  assert.equal((await requestLocal(server, "/editor.html")).status, 200);
  const editorRedirect = await requestLocal(
    server,
    "/editor.html/?profile=teacher&panel=overview",
  );
  assert.equal(editorRedirect.status, 307);
  assert.equal(
    editorRedirect.headers.location,
    "/editor.html?profile=teacher&panel=overview",
  );
  assert.equal(editorRedirect.headers["cache-control"], "no-store");
  assert.match(editorRedirect.body, /entrada canónica de ORBIT Editor/);
  const editorHeadRedirect = await requestLocal(
    server,
    "/editor.html/?profile=student",
    { method: "HEAD" },
  );
  assert.equal(editorHeadRedirect.status, 307);
  assert.equal(editorHeadRedirect.headers.location, "/editor.html?profile=student");
  assert.equal(editorHeadRedirect.body, "");
  assert.equal((await requestLocal(server, "/src/styles.css")).status, 200);
  assert.equal((await requestLocal(server, "/public/favicon.svg")).status, 200);
  assert.equal(
    (await requestLocal(server, "/node_modules/katex/dist/katex.mjs")).status,
    200,
  );

  for (const sensitive of [
    "/ORBIT_UPDATES.md",
    "/package.json",
    "/scripts/editor-author.mjs",
    "/tests/editor-author.test.mjs",
    "/docs/ARCHITECTURE.md",
    "/.git/config",
    "/src/%2e%2e/ORBIT_UPDATES.md",
  ]) {
    assert.equal((await requestLocal(server, sensitive)).status, 404, sensitive);
  }
  assert.equal((await requestLocal(server, "/%ZZ")).status, 421);

  assert.equal(
    (await requestLocal(server, "/editor.html", { host: "evil.example:4173" })).status,
    421,
  );
  assert.equal(
    (await requestLocal(server, "http://evil.example:4173/editor.html")).status,
    421,
  );
  assert.equal((await requestLocal(server, "//evil.example/editor.html")).status, 421);
  assert.equal(
    (await requestLocal(server, "http://user@127.0.0.1:4173/editor.html")).status,
    421,
  );
  assert.equal(
    (await requestLocal(server, "http://127.0.0.1:4173/editor.html")).status,
    200,
  );
});

test("el servidor dev apaga solo su propia sesión local autenticada", async (context) => {
  const projectRoot = fileURLToPath(new URL("../", import.meta.url));
  const token = "d".repeat(64);
  let shutdownCount = 0;
  let releaseShutdown;
  const shutdownCalled = new Promise((resolve) => {
    releaseShutdown = resolve;
  });
  const server = createServer(createOrbitDevRequestHandler({
    projectRoot,
    localServiceToken: token,
    shutdown: () => {
      shutdownCount += 1;
      releaseShutdown();
    },
  }));
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  context.after(() => new Promise((resolve) => server.close(resolve)));

  const session = await requestLocal(server, "/__orbit/local/session");
  assert.equal(session.status, 200);
  assert.equal(session.headers["cache-control"], "no-store");
  assert.equal(session.headers["access-control-allow-origin"], undefined);
  assert.deepEqual(JSON.parse(session.body), {
    kind: "orbit-local-service-session",
    schemaVersion: 1,
    service: "development",
    token,
    busy: false,
    endpoints: { shutdown: "/__orbit/local/shutdown" },
  });

  for (const path of [
    "/\\evil/__orbit/local/session",
    "/%5c%5cevil/__orbit/local/session",
  ]) {
    assert.equal((await requestLocal(server, path)).status, 421, path);
  }

  const rejected = await requestLocal(server, "/__orbit/local/shutdown", {
    method: "POST",
    headers: {
      origin: "https://example.invalid",
      "content-type": "application/json",
      "x-orbit-local-token": token,
    },
    body: JSON.stringify({ intent: "shutdown" }),
  });
  assert.equal(rejected.status, 403);
  assert.equal(shutdownCount, 0);

  for (const candidate of [
    {
      headers: {
        origin: ORBIT_DEV_CANONICAL_ORIGIN,
        "content-type": "application/json",
        "x-orbit-local-token": "incorrecto",
      },
      body: JSON.stringify({ intent: "shutdown" }),
      status: 403,
    },
    {
      headers: {
        origin: ORBIT_DEV_CANONICAL_ORIGIN,
        "content-type": "text/plain",
        "x-orbit-local-token": token,
      },
      body: JSON.stringify({ intent: "shutdown" }),
      status: 403,
    },
    {
      headers: {
        origin: ORBIT_DEV_CANONICAL_ORIGIN,
        "content-type": "application/json",
        "x-orbit-local-token": token,
        "sec-fetch-site": "cross-site",
      },
      body: JSON.stringify({ intent: "shutdown" }),
      status: 403,
    },
    {
      headers: {
        origin: ORBIT_DEV_CANONICAL_ORIGIN,
        "content-type": "application/json",
        "x-orbit-local-token": token,
      },
      body: JSON.stringify({ intent: "restart" }),
      status: 400,
    },
  ]) {
    const response = await requestLocal(server, "/__orbit/local/shutdown", {
      method: "POST",
      headers: candidate.headers,
      body: candidate.body,
    });
    assert.equal(response.status, candidate.status);
    assert.equal(shutdownCount, 0);
  }

  await abortPartialShutdown(server, token);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(shutdownCount, 0);
  assert.equal((await requestLocal(server, "/__orbit/local/session")).status, 200);

  const shutdownRequest = () => requestLocal(server, "/__orbit/local/shutdown", {
    method: "POST",
    headers: {
      origin: ORBIT_DEV_CANONICAL_ORIGIN,
      "content-type": "application/json",
      "x-orbit-local-token": token,
      "sec-fetch-site": "same-origin",
    },
    body: JSON.stringify({ intent: "shutdown" }),
  });
  const concurrent = await Promise.all([shutdownRequest(), shutdownRequest()]);
  assert.deepEqual(concurrent.map(({ status }) => status).sort(), [202, 409]);
  const accepted = concurrent.find(({ status }) => status === 202);
  const repeated = concurrent.find(({ status }) => status === 409);
  assert.equal(accepted.status, 202);
  assert.equal(accepted.headers.connection, "close");
  assert.equal(JSON.parse(accepted.body).state, "shutting-down");
  await shutdownCalled;
  assert.equal(shutdownCount, 1);
  assert.equal(repeated.status, 409);
  assert.equal(JSON.parse(repeated.body).code, "local-service-shutdown-pending");
  const pendingSession = await requestLocal(server, "/__orbit/local/session");
  assert.equal(pendingSession.status, 503);
  assert.equal(pendingSession.headers.connection, "close");
  assert.equal(JSON.parse(pendingSession.body).code, "local-service-shutdown-pending");
  assert.equal(shutdownCount, 1);
});

test("un socket abortado durante la comprobación final no bloquea el control local", async (context) => {
  const token = "q".repeat(64);
  let busyChecks = 0;
  let shutdownCount = 0;
  let releaseFinalCheck;
  let announceFinalCheck;
  const finalCheckReached = new Promise((resolve) => {
    announceFinalCheck = resolve;
  });
  const finalCheckBarrier = new Promise((resolve) => {
    releaseFinalCheck = resolve;
  });
  const control = createLocalServiceControl({
    service: "development",
    token,
    isBusy: async () => {
      busyChecks += 1;
      if (busyChecks === 2) {
        announceFinalCheck();
        await finalCheckBarrier;
      }
      return false;
    },
    shutdown: () => {
      shutdownCount += 1;
    },
  });
  const server = createServer((request, response) => {
    void control.handle({
      request,
      response,
      requestOrigin: ORBIT_DEV_CANONICAL_ORIGIN,
      url: new URL(request.url, ORBIT_DEV_CANONICAL_ORIGIN),
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  context.after(() => new Promise((resolve) => server.close(resolve)));

  const address = server.address();
  const socket = connect({ host: "127.0.0.1", port: address.port });
  await new Promise((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("error", reject);
  });
  const body = JSON.stringify({ intent: "shutdown" });
  socket.write([
    "POST /__orbit/local/shutdown HTTP/1.1",
    "Host: 127.0.0.1:4173",
    `Origin: ${ORBIT_DEV_CANONICAL_ORIGIN}`,
    "Content-Type: application/json",
    `X-Orbit-Local-Token: ${token}`,
    `Content-Length: ${Buffer.byteLength(body)}`,
    "",
    body,
  ].join("\r\n"));
  await finalCheckReached;
  const socketClosed = new Promise((resolve) => socket.once("close", resolve));
  socket.destroy();
  await socketClosed;
  releaseFinalCheck();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(shutdownCount, 0);
  assert.equal(control.shutdownPending, false);
  const retry = await requestLocal(server, "/__orbit/local/shutdown", {
    method: "POST",
    headers: {
      origin: ORBIT_DEV_CANONICAL_ORIGIN,
      "content-type": "application/json",
      "x-orbit-local-token": token,
    },
    body,
  });
  assert.equal(retry.status, 202);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(shutdownCount, 1);
});

test("la whitelist revalida el destino real de enlaces simbólicos", async (context) => {
  const sandbox = await mkdtemp(resolve(tmpdir(), "orbit-dev-static-"));
  context.after(() => rm(sandbox, { recursive: true, force: true }));
  const root = resolve(sandbox, "repository");
  const outside = resolve(sandbox, "outside.js");
  await mkdir(resolve(root, "src"), { recursive: true });
  await writeFile(outside, "contenido privado\n", "utf8");
  const link = resolve(root, "src", "leak.js");
  try {
    await symlink(outside, link, "file");
  } catch (error) {
    if (["EPERM", "EACCES", "ENOSYS"].includes(error?.code)) {
      context.skip(`symlink no disponible en esta plataforma: ${error.code}`);
      return;
    }
    throw error;
  }
  assert.equal(resolveOrbitDevStaticPath("/src/leak.js", { projectRoot: root }), null);
});

test("las guías vigentes no recomiendan fragmentar el origen local", async () => {
  const urls = [
    "../README.md",
    "../docs/DEVELOPMENT.md",
    "../docs/DEBUGGING.md",
    "../docs/EDITOR_GUIDE.md",
    "../docs/USER_GUIDE.md",
  ].map((path) => new URL(path, import.meta.url));
  const documentation = (await Promise.all(urls.map((url) => readFile(url, "utf8")))).join("\n");

  assert.doesNotMatch(documentation, /<puerto>|\$env:PORT\s*=\s*4200/);
  assert.doesNotMatch(
    documentation,
    /puertos siguientes|siguiente disponible|avanza hasta encontrar uno libre/,
  );
  assert.match(documentation, /127\.0\.0\.1:4173/);
});
