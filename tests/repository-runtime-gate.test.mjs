import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
  isRuntimeEntryRequest,
  repositoryTransactionPending,
  shouldBlockRuntimeEntry,
} from "../scripts/repository-runtime-gate.mjs";

test("el gate distingue entradas Estudiante de editor.html", async (t) => {
  const root = await mkdtemp(resolve(tmpdir(), "orbit-runtime-gate-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  assert.equal(isRuntimeEntryRequest("/?profile=student"), true);
  assert.equal(isRuntimeEntryRequest("/index.html?debug=1"), true);
  assert.equal(isRuntimeEntryRequest("/src/main.js"), true);
  assert.equal(isRuntimeEntryRequest("/%69ndex.html"), true);
  assert.equal(isRuntimeEntryRequest("/index%2ehtml"), true);
  assert.equal(isRuntimeEntryRequest("/dist/%69ndex.html"), true);
  assert.equal(isRuntimeEntryRequest("/dist/%2e%2e/index.html"), true);
  assert.equal(isRuntimeEntryRequest("/INDEX.HTML"), true);
  assert.equal(isRuntimeEntryRequest("/Src/Main.js"), true);
  assert.equal(isRuntimeEntryRequest("/%E0%A4%A"), true);
  assert.equal(isRuntimeEntryRequest("/editor.html"), false);
  assert.equal(repositoryTransactionPending(root), false);
  assert.equal(shouldBlockRuntimeEntry(root, "/"), false);

  const directory = resolve(root, ".orbit-editor");
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, "repository-transaction.json"), "malformado", "utf8");

  assert.equal(repositoryTransactionPending(root), true);
  assert.equal(shouldBlockRuntimeEntry(root, "/index.html"), true);
  assert.equal(shouldBlockRuntimeEntry(root, "/%69ndex.html"), true);
  assert.equal(shouldBlockRuntimeEntry(root, "/index%2ehtml"), true);
  assert.equal(shouldBlockRuntimeEntry(root, "/dist/%69ndex.html"), true);
  assert.equal(shouldBlockRuntimeEntry(root, "/INDEX.HTML"), true);
  assert.equal(shouldBlockRuntimeEntry(root, "/Src/Main.js"), true);
  assert.equal(shouldBlockRuntimeEntry(root, "/%E0%A4%A"), true);
  assert.equal(shouldBlockRuntimeEntry(root, "/src/bootstrap.js"), true);
  assert.equal(shouldBlockRuntimeEntry(root, "/editor.html"), false);
});

test("el helper bloquea la entrada desde busy aun antes de materializar el journal", () => {
  assert.equal(shouldBlockRuntimeEntry("C:/inexistente", "/", { busy: true }), true);
  assert.equal(
    shouldBlockRuntimeEntry("C:/inexistente", "/editor.html", { busy: true }),
    false,
  );
});

test("el modo mantenimiento bloquea ORBIT pero conserva el editor", () => {
  assert.equal(
    shouldBlockRuntimeEntry("C:/inexistente", "/?profile=teacher", {
      maintenance: true,
    }),
    true,
  );
  assert.equal(
    shouldBlockRuntimeEntry("C:/inexistente", "/src/main.js", {
      maintenance: true,
    }),
    true,
  );
  assert.equal(
    shouldBlockRuntimeEntry("C:/inexistente", "/editor.html", {
      maintenance: true,
    }),
    false,
  );
});
