import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { createServer, request } from "node:http";
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

function requestLocal(server, path, { host = "127.0.0.1:4173" } = {}) {
  const address = server.address();
  return new Promise((resolve, reject) => {
    const call = request({
      hostname: "127.0.0.1",
      port: address.port,
      method: "GET",
      path,
      headers: { Host: host },
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
    call.end();
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
