import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { readClientPolicy } from "../scripts/online/client-policy.mjs";
import { hashPassword } from "../scripts/online/auth.mjs";
import { ServerStore, createInitialServerState, decodeBackup } from "../scripts/online/store.mjs";
import { updateServer } from "../scripts/update-server.mjs";

const storeUrl = new URL("../scripts/online/store.mjs", import.meta.url).href;
const verifier = new URL("../scripts/verify-package.mjs", import.meta.url);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const linuxLink = { skip: process.platform === "win32" && "requiere el reemplazo atómico de enlaces de Linux" };

async function createPackage(root, version) {
  const buildId = sha256(version);
  const sourceFiles = new Map([
    ["package.json", JSON.stringify({ version })],
    ["dist/build-info.json", JSON.stringify({ version, buildId })],
    ["scripts/online/store.mjs", "export { ServerStore, decodeBackup } from " + JSON.stringify(storeUrl) + ";\n"],
  ]);
  if (version !== "1.2.2") sourceFiles.set("scripts/online/client-policy.mjs", "export {};\n");
  for (const [path, bytes] of sourceFiles) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), bytes);
  }
  await copyFile(verifier, join(root, "scripts", "verify-package.mjs"));
  sourceFiles.set("scripts/verify-package.mjs", await readFile(verifier));
  const files = [...sourceFiles].map(([path, bytes]) => ({
    path, bytes: Buffer.byteLength(bytes), sha256: sha256(bytes),
  }));
  await writeFile(join(root, "package-manifest.json"), JSON.stringify({
    kind: "orbit-server-package", schemaVersion: 1, version, buildId, files, digest: sha256(JSON.stringify(files)),
  }));
}

let password;
async function fixture(t) {
  const parent = resolve(tmpdir());
  const root = await mkdtemp(join(parent, "orbit-update-test-"));
  t.after(async () => {
    assert.equal(dirname(resolve(root)), parent);
    assert.ok(root.startsWith(join(parent, "orbit-update-test-")));
    await rm(root, { recursive: true, force: true });
  });
  const previous = join(root, "packages", "1.2.2");
  const data = join(root, "datos");
  const current = join(root, "current");
  await createPackage(previous, "1.2.2");
  await symlink(previous, current, "dir");
  password ??= await hashPassword("temporary-updater-test-password");
  const store = await ServerStore.open(data, {
    initialState: createInitialServerState({ alias: "admin-test", password }),
  });
  await store.close();
  const statePath = join(data, "state.json");
  const state = await readFile(statePath);
  const name = "orbit-server-1.2.3-abcdefabcdef";
  const archive = join(root, "orbit-servidor.tar.gz");
  await createPackage(join(root, name), "1.2.3");
  execFileSync("tar", ["-czf", archive, "-C", root, name]);
  const archiveBytes = await readFile(archive);
  const hash = sha256(archiveBytes);
  const hashFile = hash + "  orbit-servidor.tar.gz\n";
  await writeFile(archive + ".sha256", hashFile);
  return { root, previous, current, data, statePath, state, archive, archiveBytes, hash, hashFile };
}

function questions(answers) {
  return async () => {
    assert.ok(answers.length, "El asistente presentó una confirmación inesperada.");
    return answers.shift();
  };
}

test("el asistente remite al procedimiento manual cuando se ejecuta en Windows", {
  skip: process.platform !== "win32",
}, async () => {
  await assert.rejects(updateServer(), /requiere Linux/);
});

test("candidato cancelado, huella incorrecta y servidor activo conservan la instalación de 1.2.2", linuxLink, async (t) => {
  const f = await fixture(t);
  const opts = { root: f.root, localArchive: f.archive, print() {} };
  const cancelled = await updateServer({ ...opts, ask: questions(["s", "n", "n"]) });
  assert.equal(cancelled.status, "cancelled");
  const store = await ServerStore.open(f.data);
  try {
    await assert.rejects(updateServer({ ...opts, ask: questions([]) }), { code: "store-locked" });
  } finally { await store.close(); }
  await writeFile(f.archive + ".sha256", "0".repeat(64) + "  orbit-servidor.tar.gz\n");
  await assert.rejects(updateServer({ ...opts, ask: questions([]) }), /SHA-256.*no coincide/);
  assert.equal(await realpath(f.current), await realpath(f.previous));
  assert.deepEqual(await readFile(f.statePath), f.state);
  assert.deepEqual(await readdir(join(f.root, "packages")), ["1.2.2"]);
});

test("candidato local activa 1.2.3, conserva el estado y admite el reintento sin respaldo persistente", linuxLink, async (t) => {
  const f = await fixture(t);
  const opts = { root: f.root, localArchive: f.archive, selectedRelease: "v1.2.3", print() {} };
  const applied = await updateServer({ ...opts, ask: questions(["n", "n", "s"]) });
  assert.equal(applied.status, "installed");
  assert.equal(applied.version, "1.2.3");
  assert.equal(applied.backup, null);
  assert.equal(await readClientPolicy(await realpath(f.current)), false);
  assert.deepEqual(await readFile(f.statePath), f.state);
  assert.deepEqual(await readdir(join(f.root, "packages")), ["1.2.2", "orbit-server-1.2.3-abcdefabcdef"]);
  await assert.rejects(readdir(join(f.root, "backups")), { code: "ENOENT" });
  assert.equal((await updateServer({ ...opts, ask: questions([]) })).status, "unchanged");
});

test("una publicación fijada por etiqueta verifica ambos adjuntos y conserva el respaldo elegido", linuxLink, async (t) => {
  const f = await fixture(t);
  const urls = [];
  const applied = await updateServer({
    root: f.root,
    selectedRelease: "v1.2.3",
    ask: questions(["s", "s", "s"]),
    print() {},
    async fetchImpl(url) {
      urls.push(url);
      if (urls.length === 1) {
        assert.match(url, /api\.github\.com\/repos\/JoaquinDiazM\/ORBIT\/releases\/tags\/v1\.2\.3$/);
        return Response.json({
          tag_name: "v1.2.3", draft: false, prerelease: false,
          assets: [
            { name: "orbit-servidor.tar.gz", state: "uploaded", size: f.archiveBytes.length, digest: "sha256:" + f.hash },
            { name: "orbit-servidor.tar.gz.sha256", state: "uploaded", size: Buffer.byteLength(f.hashFile) },
          ],
        });
      }
      assert.match(url, /github\.com\/JoaquinDiazM\/ORBIT\/releases\/download\/v1\.2\.3\//);
      return new Response(url.endsWith(".sha256") ? f.hashFile : f.archiveBytes);
    },
  });
  assert.equal(applied.status, "installed");
  assert.equal(urls.length, 3);
  assert.equal(await readClientPolicy(await realpath(f.current)), true);
  assert.deepEqual(await decodeBackup(await readFile(applied.backup, "utf8")), await decodeBackup(f.state.toString()));
  assert.deepEqual(await readFile(f.statePath), f.state);
});
