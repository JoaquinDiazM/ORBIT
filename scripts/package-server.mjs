import { createHash } from "node:crypto";
import { cp, lstat, mkdir, mkdtemp, open, readFile, readdir, rename, rm, unlink, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const SOURCE_PATHS = [
  "dist", "src", "node_modules/katex", "scripts/online", "scripts/orbit-server.mjs",
  "scripts/orbit-offline.mjs", "scripts/check-online-pilot.mjs", "scripts/serve.mjs", "scripts/repository-runtime-gate.mjs",
  "scripts/local-service-control.mjs", "scripts/verify-package.mjs", "LICENSE", "LICENSE-CONTENT.md",
];

export async function packageServer({ root = process.cwd(), output = resolve(root, "artifacts"), archive = true, releaseTag = null } = {}) {
  const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  if (releaseTag !== null && releaseTag !== `v${pkg.version}`) throw new Error("La etiqueta de release no coincide con la versión del paquete.");
  const buildInfo = JSON.parse(await readFile(resolve(root, "dist/build-info.json"), "utf8"));
  if (!/^[a-f0-9]{64}$/.test(buildInfo.buildId ?? "")) throw new Error("Construye ORBIT antes de empaquetar.");
  if (buildInfo.version !== pkg.version) {
    throw new Error("El build no corresponde a la versión del paquete. Vuelve a construir ORBIT.");
  }
  const [sourceConfig, builtConfig] = await Promise.all([
    readFile(resolve(root, "src/config.js")), readFile(resolve(root, "dist/src/config.js")),
  ]);
  if (!sourceConfig.equals(builtConfig)) {
    throw new Error("La configuración del build difiere de la fuente. Vuelve a construir ORBIT.");
  }
  await mkdir(output, { recursive: true });
  const staging = await mkdtemp(join(output, ".orbit-package-"));
  let moved = false;
  try {
    for (const path of SOURCE_PATHS) {
      // Server and browser must validate the same curricular engine, even when packaging a build.
      await cp(resolve(root, path === "src" ? "dist/src" : path), join(staging, path), {
        recursive: true,
        async filter(source) {
          if ((await lstat(source)).isSymbolicLink()) throw new Error("El paquete no admite enlaces simbólicos.");
          return !source.endsWith("AGENTS.md");
        },
      });
    }
    await cp(resolve(root, "docs/SERVER_GUIDE.md"), join(staging, "LEEME.md"));
    await writeFile(join(staging, "package.json"), `${JSON.stringify({
      name: pkg.name, version: pkg.version, private: true, type: "module", engines: pkg.engines,
      license: pkg.license,
      scripts: { server: "node scripts/orbit-server.mjs", offline: "node scripts/orbit-offline.mjs", verify: "node scripts/verify-package.mjs" },
    }, null, 2)}\n`);
    const files = [];
    async function visit(path = "") {
      for (const entry of (await readdir(join(staging, path), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
        const name = path ? `${path}/${entry.name}` : entry.name;
        if (entry.isDirectory()) await visit(name);
        else {
          const bytes = await readFile(join(staging, name));
          files.push({ path: name, bytes: bytes.length, sha256: sha256(bytes) });
        }
      }
    }
    await visit();
    const digest = sha256(JSON.stringify(files));
    await writeFile(join(staging, "package-manifest.json"), `${JSON.stringify({
      kind: "orbit-server-package", schemaVersion: 1, version: pkg.version,
      buildId: buildInfo.buildId, digest, files,
    }, null, 2)}\n`);
    const name = `orbit-server-${pkg.version}-${releaseTag ? "" : "preview-"}${digest.slice(0, 12)}`;
    const destination = join(output, name);
    await rename(staging, destination);
    moved = true;
    let archivePath = null;
    if (archive) {
      archivePath = releaseTag ? join(output, "orbit-servidor.tar.gz") : `${destination}.tar.gz`;
      const reserved = await open(archivePath, "wx");
      await reserved.close();
      try { await new Promise((fulfill, reject) => {
        const child = spawn("tar", ["-czf", archivePath, "-C", output, name], { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
        let diagnostic = "";
        child.stderr.on("data", (chunk) => { if (diagnostic.length < 4000) diagnostic += chunk; });
        child.once("error", reject);
        child.once("exit", (code) => code === 0 ? fulfill() : reject(new Error(`No se pudo crear el archivo portable: ${diagnostic}`)));
      }); } catch (error) { await unlink(archivePath); throw error; }
      const archiveDigest = sha256(await readFile(archivePath));
      await writeFile(`${archivePath}.sha256`, `${archiveDigest}  ${basename(archivePath)}\n`, { flag: "wx" });
    }
    return { directory: destination, archive: archivePath, digest, files: files.length, buildId: buildInfo.buildId };
  } finally {
    if (!moved) {
      const contained = relative(resolve(output), resolve(staging));
      if (!contained.startsWith(".orbit-package-") || contained.startsWith("..") || isAbsolute(contained)) {
        throw new Error("La carpeta temporal no pertenece al empaquetador.");
      }
      await rm(staging, { recursive: true, force: true });
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== "--release-tag")) throw new Error("Uso: package-server.mjs [--release-tag vX.Y.Z]");
  console.log(JSON.stringify(await packageServer({ releaseTag: args[1] ?? null }), null, 2));
}
