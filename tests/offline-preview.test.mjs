import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative } from "node:path";
import test from "node:test";
import { createOfflinePreviewHandler } from "../scripts/orbit-offline.mjs";

test("Editor portable sirve solo el build, sin caché de 4173 ni API y respeta mantenimiento local", async () => {
  const parent = tmpdir();
  const root = await mkdtemp(join(parent, "orbit-offline-preview-"));
  try {
    await mkdir(join(root, "dist/vendor/katex"), { recursive: true });
    await mkdir(join(root, "dist/src"), { recursive: true });
    await writeFile(join(root, "dist/index.html"), '<head><meta name="orbit-build" content="123abc"></head>ORBIT');
    await writeFile(join(root, "dist/editor.html"), '<head><meta name="orbit-build" content="123abc"></head>Editor');
    await writeFile(join(root, "dist/vendor/katex/katex.mjs"), "export default {};");
    await writeFile(join(root, "private.json"), "PRIVATE");
    await writeFile(join(root, "dist/private.json"), "ALSO_PRIVATE");
    const handler = createOfflinePreviewHandler({ projectRoot: root });
    const request = async (url, { method = "GET", host = "127.0.0.1:4173" } = {}) => {
      const response = { headers: {}, setHeader(key, value) { this.headers[key.toLowerCase()] = value; },
        writeHead(status) { this.status = status; }, end(body) { this.body = String(body ?? ""); } };
      await handler({ url, method, headers: { host } }, response);
      return response;
    };
    const editor = await request("/editor.html");
    assert.equal(editor.status, 200);
    assert.match(editor.body, /Editor/);
    assert.doesNotMatch(editor.body, /orbit-build/);
    assert.equal(editor.headers["cache-control"], "no-store");
    assert.equal((await request("/vendor/katex/katex.mjs")).status, 200);
    for (const path of ["/api/orbit/session", "/sw.js", "/private.json", "/../private.json", "/%2e%2e/private.json", "/src/../../private.json", "/.git/config"]) {
      assert.equal((await request(path)).status, 404, path);
    }
    assert.equal((await request("/", { host: "evil.test" })).status, 421);
    assert.equal((await request("/", { method: "POST" })).status, 405);
    assert.equal((await request("/editor.html", { method: "HEAD" })).body, "");
    await mkdir(join(root, ".orbit-editor"));
    await writeFile(join(root, ".orbit-editor/repository-transaction.json"), "{}");
    assert.equal((await request("/")).status, 503);
    assert.equal((await request("/editor.html")).status, 200);
  } finally {
    const contained = relative(parent, root);
    assert.ok(contained.startsWith("orbit-offline-preview-") && !isAbsolute(contained) && !contained.startsWith(".."));
    await rm(root, { recursive: true, force: true });
  }
});
