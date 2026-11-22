import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, isAbsolute } from "node:path";
import test from "node:test";
import { createOfflineWorker, sha256 } from "../src/online/service-worker.js";
import { buildOfflineResources } from "../scripts/build-offline.mjs";

function memoryCaches() {
  const contents = new Map();
  return {
    contents,
    async keys() { return [...contents.keys()]; },
    async delete(key) { return contents.delete(key); },
    async open(key) {
      if (!contents.has(key)) contents.set(key, new Map());
      const items = contents.get(key);
      return {
        async put(url, response) { items.set(String(url), response.clone()); },
        async match(url) { return items.get(String(url))?.clone(); },
      };
    },
  };
}

async function harness({ scope = "https://course.test/ORBIT/", buildId = "build-one" } = {}) {
  const bodies = new Map([
    [new URL("index.html", scope).href, "<html><head></head><body>ORBIT</body></html>"],
    [new URL("editor.html", scope).href, "<html><head></head><body>Editor</body></html>"],
    [new URL("src/main.js", scope).href, "export const value = 42;"],
  ]);
  const resources = await Promise.all([...bodies].map(async ([url, body]) => ({
    url, sha256: await sha256(new TextEncoder().encode(body)),
  })));
  const requests = [];
  const caches = memoryCaches();
  let online = true;
  let fetchOverride = null;
  const worker = createOfflineWorker({ scope, buildId, resources, caches, cryptoImpl: globalThis.crypto,
    async fetchImpl(url, options) {
      requests.push({ url, options });
      if (!online) throw new Error("Network unavailable");
      if (fetchOverride) return fetchOverride(url, options);
      return new Response(bodies.get(String(url)), { status: bodies.has(String(url)) ? 200 : 404 });
    },
  });
  return { worker, resources, bodies, requests, caches,
    offline() { online = false; }, override(fn) { fetchOverride = fn; } };
}

test("offline guarda solo recursos verificados y abre ambos shells sin red", async () => {
  const h = await harness();
  await h.worker.install();
  assert.ok(h.requests.every(({ options }) => options.credentials === "omit" && options.redirect === "error"));
  h.offline();
  const result = await h.worker.respond({ method: "GET", mode: "navigate", url: "https://course.test/ORBIT/?course=course-b&profile=debug" });
  assert.match(await result.text(), /ORBIT/);
  const editor = await h.worker.respond({ method: "GET", mode: "navigate", url: "https://course.test/ORBIT/editor.html?course=course-b" });
  assert.match(await editor.text(), /Editor/);
  assert.equal(await (await h.worker.respond(new Request("https://course.test/ORBIT/src/main.js"))).text(), "export const value = 42;");
});

test("no intercepta sesiones, APIs, cuerpos, rutas ajenas ni consultas de assets", async () => {
  const { worker } = await harness();
  for (const url of [
    "https://course.test/ORBIT/api/orbit/session",
    "https://course.test/ORBIT/api/orbit/courses/a/progress",
    "https://course.test/ORBIT/src/main.js?token=secret",
    "https://course.test/OTHER/index.html",
    "https://outside.test/ORBIT/index.html",
    "https://course.test/ORBIT/private.json",
  ]) {
    assert.equal(worker.resourceFor(new Request(url)), null, url);
    assert.equal(worker.resourceFor({ method: "GET", url, mode: "navigate" }), null, url);
  }
  assert.equal(worker.resourceFor(new Request("https://course.test/ORBIT/index.html", { method: "POST", body: "private" })), null);
});

test("acepta la identidad pública del servidor pero rechaza HTML privado o alterado", async () => {
  const h = await harness();
  h.override((url) => new Response(h.bodies.get(url).replace("</head>",
    '<meta name="orbit-mode" content="online"><meta name="orbit-server-id" content="server-123"></head>')));
  await h.worker.install();
  h.offline();
  const response = await h.worker.respond({ method: "GET", mode: "navigate", url: "https://course.test/ORBIT/" });
  assert.match(await response.text(), /server-123/);

  const bad = await harness();
  bad.override((url) => new Response(`${bad.bodies.get(url)}<p>Private user</p>`));
  await assert.rejects(bad.worker.install(), /otra compilación/);
  assert.deepEqual(await bad.caches.keys(), []);
});

test("un fallo de descarga espera escritores pendientes antes de retirar la copia parcial", async () => {
  const h = await harness();
  h.override(async (url) => {
    if (url.endsWith("index.html")) throw new Error("connection interrupted");
    await new Promise((resolve) => setTimeout(resolve, 10));
    return new Response(h.bodies.get(url));
  });
  await assert.rejects(h.worker.install(), /interrupted/);
  assert.deepEqual(await h.caches.keys(), []);
});

test("una actualización incompleta conserva shell y recursos coherentes del build anterior", async () => {
  const h = await harness();
  await h.worker.install();
  h.override(() => new Response("new release changed this file"));
  const page = await h.worker.respond({ method: "GET", mode: "navigate", url: "https://course.test/ORBIT/" });
  assert.equal(await page.text(), h.bodies.get("https://course.test/ORBIT/index.html"));
  const script = await h.worker.respond(new Request("https://course.test/ORBIT/src/main.js"));
  assert.match(await script.text(), /42/);
});

test("activar elimina solo builds ORBIT anteriores del mismo alcance", async () => {
  const h = await harness();
  await h.worker.install();
  await h.caches.open("orbit-public:%2FORBIT%2F:old");
  await h.caches.open("orbit-public:%2FOTHER%2F:keep");
  await h.caches.open("someone-elses-cache");
  await h.worker.activate();
  assert.deepEqual((await h.caches.keys()).sort(), [h.worker.cacheName, "orbit-public:%2FOTHER%2F:keep", "someone-elses-cache"].sort());
});

test("build offline contiene hashes finales de shells, recursos y una identidad por contenido", async () => {
  const parent = tmpdir();
  const temporary = await mkdtemp(join(parent, "orbit-offline-build-"));
  try {
    for (const path of ["src", "public", "vendor"]) await mkdir(join(temporary, path));
    for (const path of ["index.html", "editor.html"]) await writeFile(join(temporary, path), "<html><head></head></html>");
    await writeFile(join(temporary, "src/main.js"), "export const a = 1;");
    await writeFile(join(temporary, "private.json"), "NEVER_CACHE");
    const result = await buildOfflineResources(temporary);
    assert.equal(result.resourceCount, 3);
    const sw = await readFile(join(temporary, "sw.js"), "utf8");
    assert.doesNotMatch(sw, /private\.json/);
    const configuration = JSON.parse(sw.match(/installOrbitWorker\(self, (.+)\);/)[1]);
    for (const resource of configuration.resources) {
      assert.equal(await sha256(await readFile(join(temporary, resource.url))), resource.sha256);
    }
    assert.match(await readFile(join(temporary, "index.html"), "utf8"), new RegExp(result.buildId));
  } finally {
    const within = relative(parent, temporary);
    assert.ok(within.startsWith("orbit-offline-build-") && !isAbsolute(within) && !within.startsWith(".."));
    await rm(temporary, { recursive: true, force: true });
  }
});
