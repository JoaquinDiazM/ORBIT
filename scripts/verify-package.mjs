import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export async function verifyPackage(root = process.cwd()) {
  const canonicalRoot = await realpath(root);
  const manifest = JSON.parse(await readFile(resolve(root, "package-manifest.json"), "utf8"));
  const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
  if (manifest.kind !== "orbit-server-package" || manifest.schemaVersion !== 1 || !Array.isArray(manifest.files)
    || hash(JSON.stringify(manifest.files)) !== manifest.digest) throw new Error("Manifiesto del paquete no válido.");
  const seen = new Set();
  for (const entry of manifest.files) {
    const file = resolve(root, entry.path);
    const within = relative(resolve(root), file);
    if (!within || within.startsWith("..") || isAbsolute(within) || seen.has(entry.path)
      || (await lstat(file)).isSymbolicLink()) throw new Error("Ruta no válida en el manifiesto.");
    const realWithin = relative(canonicalRoot, await realpath(file));
    if (!realWithin || realWithin.startsWith("..") || isAbsolute(realWithin)) {
      throw new Error("El paquete contiene una ruta fuera de su directorio.");
    }
    seen.add(entry.path);
    const bytes = await readFile(file);
    if (bytes.length !== entry.bytes || hash(bytes) !== entry.sha256) throw new Error(`El paquete está incompleto o fue modificado: ${entry.path}`);
  }
  return { version: manifest.version, buildId: manifest.buildId, files: manifest.files.length, digest: manifest.digest };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await verifyPackage();
    console.log(`Paquete verificado: ${result.files} archivos; versión ${result.version}; build ${result.buildId}.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
