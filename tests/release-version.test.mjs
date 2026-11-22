import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { packageServer } from "../scripts/package-server.mjs";
import { setReleaseVersion } from "../scripts/set-release-version.mjs";

const pkg = { name: "orbit", version: "1.0.1", dependencies: { katex: "0.18.1" } };
const lock = {
  name: "orbit",
  version: "1.0.1",
  lockfileVersion: 3,
  packages: { "": pkg, "node_modules/katex": { version: "0.18.1" } },
};
const config = 'export const APP_CONFIG = {\n  version: "1.0.1",\n  title: "ORBIT",\n};\n';

async function createFixture(t) {
  const root = await mkdtemp(join(tmpdir(), "orbit-release-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "src"));
  await Promise.all([
    writeFile(join(root, "package.json"), JSON.stringify(pkg, null, 2) + "\n"),
    writeFile(join(root, "package-lock.json"), JSON.stringify(lock, null, 2) + "\n"),
    writeFile(join(root, "src/config.js"), config),
  ]);
  return root;
}

async function readJson(root, file) {
  return JSON.parse(await readFile(join(root, file), "utf8"));
}

test("el versionado sincroniza el paquete, el lockfile y la etiqueta del cliente", async (t) => {
  const root = await createFixture(t);

  assert.equal(await setReleaseVersion("1.0.2", { root }), 3);
  assert.deepEqual(await readJson(root, "package.json"), { ...pkg, version: "1.0.2" });
  const updatedLock = await readJson(root, "package-lock.json");
  assert.equal(updatedLock.version, "1.0.2");
  assert.deepEqual(updatedLock.packages[""], { ...pkg, version: "1.0.2" });
  assert.deepEqual(updatedLock.packages["node_modules/katex"], lock.packages["node_modules/katex"]);
  assert.equal(await readFile(join(root, "src/config.js"), "utf8"), config.replace("1.0.1", "1.0.2"));
  assert.equal(await setReleaseVersion("1.0.2", { root }), 0);
});

test("el versionado deja intactos los archivos ante entradas inválidas", async (t) => {
  const root = await createFixture(t);
  await assert.rejects(setReleaseVersion("v1.0.2", { root }), /formato X\.Y\.Z/);
  const configPath = join(root, "src/config.js");
  const ambiguousConfig = config + '  version: "1.0.1",\n';
  await writeFile(configPath, ambiguousConfig);

  await assert.rejects(setReleaseVersion("1.0.2", { root }), /versión raíz/);
  assert.deepEqual(await readJson(root, "package.json"), pkg);
  assert.deepEqual(await readJson(root, "package-lock.json"), lock);
  assert.equal(await readFile(configPath, "utf8"), ambiguousConfig);
});

test("el empaquetado rechaza un build de otra versión antes de preparar el artefacto", async (t) => {
  const root = await createFixture(t);
  const dist = join(root, "dist");
  await mkdir(dist);
  await writeFile(join(dist, "build-info.json"), JSON.stringify({ buildId: "a".repeat(64), version: "0.9.0" }));

  await assert.rejects(packageServer({ root, archive: false }), /build no corresponde a la versión/);
  assert.deepEqual((await readdir(root)).sort(), ["dist", "package-lock.json", "package.json", "src"]);
});
