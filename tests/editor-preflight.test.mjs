import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { checkEditionForRepository, createEditorAuthorServer } from "../scripts/editor-author.mjs";
import { createCourseEdition, materializeCourseEdition } from "../src/core/course-edition.js";
import { compileContentSource, serializeContentSource } from "../src/core/content-source.js";
import { createEditorDocument } from "../src/editor/editor-document.js";
import { EditorModel } from "../src/editor/editor-model.js";

const SOURCE = "public/data/courses/electromagnetism-applied.edition.json";
async function fixture(context) {
  const root = await mkdtemp(resolve(tmpdir(), "orbit-preflight-test-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(resolve(root, "package.json"), JSON.stringify({ name: "orbit-open-roadmap" }));
  await writeFile(resolve(root, "README.md"), "Fuente original");
  const base = createEditorDocument();
  const edition = await createCourseEdition(base);
  const serialized = JSON.stringify(edition);
  await mkdir(resolve(root, "public/data/courses"), { recursive: true });
  await writeFile(resolve(root, SOURCE), serialized);
  const model = new EditorModel({ baseDocument: base, storage: {
    loadResult: () => ({ found: false, value: null, error: null }), save() {},
  } });
  const record = model.getSnapshot().document.locations.find(({ id }) => id === "vector-workshop");
  const content = compileContentSource(record.contentSource, { kind: record.kind }).content;
  content.objective = "Objetivo editorial modificado mediante el mismo modelo de Spider.";
  assert.equal(model.updateLocationContent(record.id, serializeContentSource(content)).ok, true);
  const document = model.getSnapshot().document;
  model.destroy();
  return { root, edition, serialized, document };
}

test("Comprobar prueba el candidato en copia y conserva fuente, build y datos locales", async (context) => {
  const { root, edition, serialized, document } = await fixture(context);
  for (const directory of ["dist", ".git", ".orbit-editor-backups", ".codex", ".pnpm-store"]) {
    await mkdir(resolve(root, directory));
    await writeFile(resolve(root, directory, "keep.txt"), "Conservar");
  }
  let copyRoot;
  const result = await checkEditionForRepository({ root, document, expectedPreviousRevision: edition.revision,
    runner: async ({ cwd, args, env }) => {
      copyRoot = cwd;
      assert.notEqual(cwd, root);
      assert.equal(args.at(-1), "check");
      assert.equal(env.npm_config_cache, resolve(cwd, ".npm-cache"));
      for (const directory of ["dist", ".git", ".orbit-editor", ".orbit-editor-backups", ".codex", ".pnpm-store"]) {
        await assert.rejects(access(resolve(cwd, directory)), { code: "ENOENT" });
      }
      const applied = await materializeCourseEdition(JSON.parse(await readFile(resolve(cwd, SOURCE), "utf8")));
      assert.match(applied.locations.find(({ id }) => id === "vector-workshop").objective, /Objetivo editorial modificado/);
      await mkdir(resolve(cwd, "dist"));
      await writeFile(resolve(cwd, "dist", "generated.txt"), "Build temporal");
      return { code: 0, stdout: "Comprobaciones aprobadas", stderr: "" };
    },
  });
  assert.equal(result.kind, "orbit-editor-author-check");
  assert.equal(result.currentRevision, edition.revision);
  assert.notEqual(result.targetRevision, edition.revision);
  assert.match(result.repositoryFingerprint, /^[a-f0-9]{64}$/);
  assert.equal(await readFile(resolve(root, SOURCE), "utf8"), serialized);
  assert.equal(await readFile(resolve(root, "dist/keep.txt"), "utf8"), "Conservar");
  await assert.rejects(access(resolve(root, ".orbit-editor")), { code: "ENOENT" });
  await assert.rejects(access(copyRoot), { code: "ENOENT" });
});

test("un fallo stdout se explica antes de Aplicar y retira la copia incluso al fallar", async (context) => {
  const { root, edition, serialized, document } = await fixture(context);
  let copyRoot;
  await assert.rejects(checkEditionForRepository({ root, document, expectedPreviousRevision: edition.revision,
    runner: async ({ cwd }) => {
      copyRoot = cwd;
      return { code: 1, stdout: `Salida extensa ${"x".repeat(12000)}\n\u001b[31m✖ tests/example.test.mjs:42 AssertionError: valor inesperado\u001b[0m`, stderr: "" };
    },
  }), error => {
    assert.equal(error.code, "repository-check-failed");
    assert.match(error.message, /tests\/example\.test\.mjs:42 AssertionError/);
    assert.doesNotMatch(error.message, /\u001b/);
    assert.ok(error.message.length < 8200);
    return true;
  });
  assert.equal(await readFile(resolve(root, SOURCE), "utf8"), serialized);
  await assert.rejects(access(copyRoot), { code: "ENOENT" });
});

test("un cambio concurrente en el repositorio invalida la comprobación verde", async (context) => {
  const { root, edition, document } = await fixture(context);
  await assert.rejects(checkEditionForRepository({ root, document, expectedPreviousRevision: edition.revision,
    runner: async () => {
      await writeFile(resolve(root, "README.md"), "Edición concurrente");
      return { code: 0, stdout: "ok", stderr: "" };
    },
  }), { code: "repository-changed-during-check" });
});

test("un journal pendiente o revisión obsoleta impide comprobar antes de lanzar npm", async (context) => {
  const { root, edition, document } = await fixture(context);
  let calls = 0;
  const runner = async () => { calls++; return { code: 0 }; };
  await assert.rejects(checkEditionForRepository({ root, document, expectedPreviousRevision: "sha256:obsoleta", runner }), { code: "revision-conflict" });
  await mkdir(resolve(root, ".orbit-editor"));
  await writeFile(resolve(root, ".orbit-editor/repository-transaction.json"), "Evidencia pendiente");
  await assert.rejects(checkEditionForRepository({ root, document, expectedPreviousRevision: edition.revision, runner }), { code: "pending-browser-finalization" });
  assert.equal(calls, 0);
  assert.equal(await readFile(resolve(root, ".orbit-editor/repository-transaction.json"), "utf8"), "Evidencia pendiente");
});

test("el endpoint Comprobar exige origen/token y bloquea operaciones concurrentes", async (context) => {
  const { root, edition, serialized, document } = await fixture(context);
  let release;
  let entered;
  const running = new Promise(resolve => { entered = resolve; });
  const barrier = new Promise(resolve => { release = resolve; });
  let calls = 0;
  const author = await createEditorAuthorServer({ root, port: 0, runner: async () => {
    calls++; entered(); await barrier;
    return { code: 0, stdout: "ok", stderr: "" };
  } });
  context.after(() => { release(); return author.close(); });
  const session = await fetch(`${author.origin}/__orbit/author/session`).then(response => response.json());
  assert.equal(session.endpoints.check, "/__orbit/author/check");
  const post = (endpoint, headers = {}) => fetch(`${author.origin}${endpoint}`, {
    method: "POST", headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ document, expectedPreviousRevision: edition.revision }),
  });
  const forbidden = await post(session.endpoints.check);
  assert.equal(forbidden.status, 403);
  assert.equal(calls, 0);
  const headers = { origin: author.origin, "x-orbit-author-token": session.token };
  const pending = post(session.endpoints.check, headers);
  await running;
  const busy = await post(session.endpoints.apply, headers);
  assert.equal(busy.status, 409);
  const busyBody = await busy.json();
  assert.equal(busyBody.code, "author-busy");
  release();
  const response = await pending;
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal((await response.json()).ok, true);
  assert.equal(calls, 1);
  assert.equal(await readFile(resolve(root, SOURCE), "utf8"), serialized);
});
