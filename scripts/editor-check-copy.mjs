import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, relative, resolve } from "node:path";

// Only repository inputs participate: no Git, sessions, backups, caches or existing build.
const CHECK_INPUTS = [
  "src", "scripts", "tests", "docs", "public", "asset_sources", ".github", "node_modules/katex",
  "AGENTS.md", "README.md", "ORBIT_UPDATES.md", "CHANGELOG.md", "CONTRIBUTING.md",
  "LICENSE", "LICENSE-CONTENT.md", "package.json", "package-lock.json", "index.html", "editor.html",
  ".editorconfig", ".gitattributes", ".gitignore",
];

async function visitInputs(root, receive) {
  async function visit(path) {
    let entry;
    try { entry = await lstat(resolve(root, path)); }
    catch (error) { if (error.code === "ENOENT") return; throw error; }
    if (entry.isSymbolicLink()) {
      throw new Error(`La comprobación aislada no sigue enlaces simbólicos: ${path}.`);
    }
    if (entry.isDirectory()) {
      for (const child of (await readdir(resolve(root, path))).sort()) await visit(`${path}/${child}`);
    } else if (entry.isFile()) await receive(path, await readFile(resolve(root, path)));
  }
  for (const path of CHECK_INPUTS) await visit(path);
}

async function fingerprintInputs(root, receive = async () => {}) {
  const hash = createHash("sha256");
  await visitInputs(root, async (path, bytes) => {
    hash.update(`${Buffer.byteLength(path)}:${path}:${bytes.length}:`).update(bytes);
    await receive(path, bytes);
  });
  return hash.digest("hex");
}

export async function withEditorCheckCopy(root, check) {
  const temporaryParent = resolve(tmpdir());
  const copyRoot = await mkdtemp(resolve(temporaryParent, "orbit-editor-check-"));
  try {
    const fingerprint = await fingerprintInputs(root, async (path, bytes) => {
      const target = resolve(copyRoot, path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, bytes);
    });
    const result = await check(copyRoot);
    if (await fingerprintInputs(root) !== fingerprint) {
      const error = new Error("El repositorio cambió durante la comprobación; vuelve a comprobar el borrador antes de aplicar.");
      error.code = "repository-changed-during-check";
      throw error;
    }
    return { ...result, repositoryFingerprint: fingerprint };
  } finally {
    const contained = relative(temporaryParent, copyRoot);
    if (!contained || isAbsolute(contained) || contained.startsWith("..") || !contained.startsWith("orbit-editor-check-")) {
      throw new Error("La raíz temporal no pertenece al espacio de comprobación esperado.");
    }
    await rm(copyRoot, { recursive: true, force: true });
  }
}
