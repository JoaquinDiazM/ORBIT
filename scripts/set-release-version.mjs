import { randomUUID } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const CONFIG_VERSION = /^([ \t]*version:[ \t]*")([^"\r\n]+)(",[ \t]*)$/gm;
const serialize = (value) => JSON.stringify(value, null, 2) + "\n";

export async function setReleaseVersion(version, { root = process.cwd() } = {}) {
  if (typeof version !== "string" || !VERSION.test(version)) {
    throw new Error("Indica una versión de release con el formato X.Y.Z.");
  }

  const paths = ["package.json", "package-lock.json", "src/config.js"].map((path) => resolve(root, path));
  const original = await Promise.all(paths.map((path) => readFile(path, "utf8")));
  const [packageText, lockText, config] = original;
  const pkg = JSON.parse(packageText);
  const lock = JSON.parse(lockText);
  if (!lock.packages?.[""] || [...config.matchAll(CONFIG_VERSION)].length !== 1) {
    throw new Error("No se encontró la versión raíz del lockfile o de APP_CONFIG.");
  }

  pkg.version = version;
  lock.version = version;
  lock.packages[""].version = version;
  const next = [
    serialize(pkg),
    serialize(lock),
    config.replace(CONFIG_VERSION, (_match, prefix, _current, suffix) => prefix + version + suffix),
  ];
  const id = randomUUID();
  const changes = paths.map((path, index) => ({
    path, original: original[index], next: next[index], temporary: `${path}.${id}.tmp`,
  })).filter((file) => file.original !== file.next);
  const installed = [];
  try {
    for (const file of changes) await writeFile(file.temporary, file.next, { flag: "wx" });
    for (const file of changes) {
      if (await readFile(file.path, "utf8") !== file.original) {
        throw new Error(`El archivo cambió durante el versionado: ${file.path}.`);
      }
      await rename(file.temporary, file.path);
      installed.push(file);
    }
  } catch (error) {
    const rollback = await Promise.allSettled(installed.map(async (file) => {
      if (await readFile(file.path, "utf8") !== file.next) {
        throw new Error(`El archivo cambió durante la recuperación: ${file.path}.`);
      }
      await writeFile(file.path, file.original);
    }));
    if (rollback.some((result) => result.status === "rejected")) {
      throw new AggregateError([error, ...rollback.filter((result) => result.status === "rejected").map((result) => result.reason)],
        "El versionado quedó incompleto. Comprueba los archivos antes de publicar.");
    }
    throw error;
  } finally {
    for (const file of changes) await rm(file.temporary, { force: true });
  }
  return changes.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 3) throw new Error("Uso: node scripts/set-release-version.mjs X.Y.Z");
    const version = process.argv[2];
    const changed = await setReleaseVersion(version);
    console.log(`Versión ${version} sincronizada (${changed} archivos actualizados).`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
