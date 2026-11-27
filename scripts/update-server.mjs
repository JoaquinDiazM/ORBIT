import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { copyFile, lstat, mkdir, mkdtemp, readFile, realpath, rename, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";
import { parseArgs, promisify } from "node:util";

const REPOSITORY = "JoaquinDiazM/ORBIT";
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const MAX_ARCHIVE_BYTES = 2 * 1024 ** 3 - 1;
const PACKAGE_NAME = /^orbit-server-([0-9]+\.[0-9]+\.[0-9]+)-(?:preview-)?[a-f0-9]{12}$/;
const POLICY_FILENAME = "client-policy.json";
const run = promisify(execFile);

async function fileInfo(path) {
  try { return await lstat(path); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

async function requireDirectory(path) {
  if (!(await fileInfo(path))?.isDirectory()) {
    throw new Error("Se requiere un directorio real: " + path);
  }
  return path;
}

function releaseTag(value) {
  if (value === "latest" || (typeof value === "string" && value.startsWith("v") && VERSION.test(value.slice(1)))) return value;
  throw new Error("Elige latest o una etiqueta como v1.2.3.");
}

function compareVersions(first, second) {
  if (!VERSION.test(first) || !VERSION.test(second)) throw new Error("Versión de paquete inválida.");
  const left = first.split(".").map(BigInt);
  const right = second.split(".").map(BigInt);
  for (const [index, part] of left.entries()) {
    if (part !== right[index]) return part > right[index] ? 1 : -1;
  }
  return 0;
}

async function checksum(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

async function readChecksum(path, expectedName) {
  const info = await fileInfo(path);
  if (!info?.isFile() || info.size > 1024) throw new Error("Falta el archivo de huella SHA-256.");
  const [hash, name, ...extra] = (await readFile(path, "utf8")).trim().split(/\s+/);
  if (!/^[a-f0-9]{64}$/.test(hash) || name?.replace(/^\*/, "") !== expectedName || extra.length) {
    throw new Error("La huella SHA-256 no identifica el archivo seleccionado.");
  }
  return hash;
}

async function copyLocalArchive(source, workspace) {
  const info = await fileInfo(source);
  if (!info?.isFile() || info.size < 1 || info.size > MAX_ARCHIVE_BYTES) {
    throw new Error("El candidato local debe ser un archivo .tar.gz válido.");
  }
  const expectedHash = await readChecksum(source + ".sha256", basename(source));
  const archive = join(workspace, "candidate.tar.gz");
  await copyFile(source, archive);
  return { archive, expectedHash };
}

async function get(url, fetchImpl, signal) {
  const response = await fetchImpl(url, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "ORBIT-server-updater" },
    signal: AbortSignal.any([signal, AbortSignal.timeout(120000)]),
  });
  if (!response.ok) throw new Error("GitHub devolvió HTTP " + response.status + ".");
  return response;
}

async function downloadAsset(tag, asset, path, fetchImpl, signal) {
  const url = "https://github.com/" + REPOSITORY + "/releases/download/" + tag + "/" + asset.name;
  const response = await get(url, fetchImpl, signal);
  let transferred = 0;
  const limit = new Transform({
    transform(chunk, _encoding, callback) {
      transferred += chunk.length;
      callback(transferred > asset.size ? new Error("El archivo supera el tamaño anunciado.") : null, chunk);
    },
  });
  await pipeline(Readable.fromWeb(response.body), limit, createWriteStream(path, { flags: "wx", mode: 0o600 }), { signal });
  if (transferred !== asset.size) throw new Error("La descarga está incompleta.");
}

async function downloadRelease(selected, workspace, fetchImpl, signal) {
  const endpoint = "https://api.github.com/repos/" + REPOSITORY + "/releases/" +
    (selected === "latest" ? "latest" : "tags/" + selected);
  const release = await (await get(endpoint, fetchImpl, signal)).json();
  const tag = releaseTag(release.tag_name);
  if (tag === "latest" || release.draft !== false || release.prerelease !== false ||
    (selected !== "latest" && selected !== tag) || !Array.isArray(release.assets)) {
    throw new Error("La publicación de GitHub no coincide con el release elegido.");
  }
  const assetOf = (name, maxBytes) => {
    const matches = release.assets.filter((asset) => asset.name === name && asset.state === "uploaded");
    const asset = matches[0];
    if (matches.length !== 1 || !Number.isSafeInteger(asset.size) || asset.size < 1 || asset.size > maxBytes) {
      throw new Error("El release todavía no tiene un archivo válido: " + name);
    }
    return asset;
  };
  const asset = assetOf("orbit-servidor.tar.gz", MAX_ARCHIVE_BYTES);
  const hashAsset = assetOf("orbit-servidor.tar.gz.sha256", 1024);
  const archive = join(workspace, asset.name);
  const hashPath = join(workspace, hashAsset.name);
  await downloadAsset(tag, asset, archive, fetchImpl, signal);
  await downloadAsset(tag, hashAsset, hashPath, fetchImpl, signal);
  const expectedHash = await readChecksum(hashPath, asset.name);
  if (asset.digest && asset.digest !== "sha256:" + expectedHash) {
    throw new Error("El digest de GitHub y el archivo SHA-256 no coinciden.");
  }
  return { archive, expectedHash, version: tag.slice(1) };
}

async function extractPackage({ archive, expectedHash }, workspace, signal) {
  if (await checksum(archive) !== expectedHash) throw new Error("La huella SHA-256 del paquete no coincide.");
  const tarOptions = { signal, maxBuffer: 8 * 1024 ** 2, env: { ...process.env, TAR_OPTIONS: "", LC_ALL: "C" } };
  const paths = (await run("tar", ["-tzf", archive], tarOptions)).stdout.trimEnd().split(/\r?\n/);
  const header = (await run("tar", ["-tvzf", archive], tarOptions)).stdout.trimEnd().split(/\r?\n/);
  const name = paths[0].split("/")[0];
  const version = name.match(PACKAGE_NAME)?.[1];
  if (!version || paths.length !== header.length || header.some((line) => !/^[d-]/.test(line))) {
    throw new Error("El paquete debe tener una sola raíz y contener archivos y directorios.");
  }
  const files = new Set();
  for (const [index, path] of paths.entries()) {
    const entry = path.replace(/\/$/, "");
    const parts = entry.split("/");
    if (parts[0] !== name || parts.some((part) => !/^[A-Za-z0-9._-]+$/.test(part) || part === "." || part === "..")) {
      throw new Error("El paquete contiene una ruta inesperada.");
    }
    if (header[index].startsWith("-")) {
      if (files.has(entry)) throw new Error("El paquete repite un archivo.");
      files.add(entry);
    }
  }
  await run("tar", ["-xzf", archive, "-C", workspace, "--no-same-owner", "--no-same-permissions"], tarOptions);
  const directory = join(workspace, name);
  return { name, directory, version, files };
}

async function verifyCandidate(candidate, verifyPackage) {
  const result = await verifyPackage(candidate.directory);
  const manifest = JSON.parse(await readFile(join(candidate.directory, "package-manifest.json"), "utf8"));
  const expected = new Set(manifest.files.map(({ path }) => candidate.name + "/" + path));
  expected.add(candidate.name + "/package-manifest.json");
  const pkg = JSON.parse(await readFile(join(candidate.directory, "package.json"), "utf8"));
  const build = JSON.parse(await readFile(join(candidate.directory, "dist", "build-info.json"), "utf8"));
  if (pkg.version !== candidate.version || result.version !== candidate.version ||
    build.version !== candidate.version || build.buildId !== result.buildId ||
    candidate.files.size !== expected.size || [...candidate.files].some((path) => !expected.has(path))) {
    throw new Error("El archivo, el manifiesto y la versión del build no coinciden.");
  }
  return result;
}

async function askYes(ask, prompt, fallback) {
  for (;;) {
    const answer = (await ask(prompt + (fallback ? " [S/n] " : " [s/N] "))).trim().toLowerCase();
    if (!answer) return fallback;
    if (["s", "si", "sí"].includes(answer)) return true;
    if (["n", "no"].includes(answer)) return false;
  }
}

export async function updateServer({
  root = process.cwd(),
  selectedRelease,
  localArchive,
  ask,
  print = console.log,
  fetchImpl = globalThis.fetch,
  signal = new AbortController().signal,
} = {}) {
  if (process.platform === "win32") {
    throw new Error("El cambio atómico de current requiere Linux. Para un servidor Windows, usa la actualización manual.");
  }
  if (typeof ask !== "function") throw new TypeError("El asistente requiere una terminal interactiva.");
  if (localArchive) localArchive = resolve(localArchive);
  root = await realpath(root);
  const packages = await requireDirectory(join(root, "packages"));
  const current = join(root, "current");
  if (!(await fileInfo(current))?.isSymbolicLink()) throw new Error("current debe ser un enlace en la instancia.");
  const previous = await realpath(current);
  if (dirname(previous) !== packages) throw new Error("current debe apuntar a un paquete dentro de packages/.");
  const data = await requireDirectory(join(root, "datos"));
  const installedModule = (path) => import(pathToFileURL(join(previous, path)).href);
  const { verifyPackage } = await installedModule("scripts/verify-package.mjs");
  const installed = await verifyPackage(previous);
  const { ServerStore } = await installedModule("scripts/online/store.mjs");
  const store = await ServerStore.open(data);
  let workspace;
  try {
    if (await realpath(current) !== previous) throw new Error("El paquete cambió mientras se adquiría el lock.");
    print("Versión instalada: " + installed.version);
    const requested = selectedRelease
      ? releaseTag(selectedRelease)
      : localArchive ? null : releaseTag((await ask("Release de destino [latest] ")).trim() || "latest");
    workspace = await mkdtemp(join(packages, ".orbit-update-"));
    const downloaded = localArchive
      ? await copyLocalArchive(localArchive, workspace)
      : await downloadRelease(requested, workspace, fetchImpl, signal);
    const candidate = await extractPackage(downloaded, workspace, signal);
    if ((downloaded.version && downloaded.version !== candidate.version) ||
      (requested && requested !== "latest" && requested.slice(1) !== candidate.version)) {
      throw new Error("El paquete es de una versión distinta de la solicitada.");
    }
    const verified = await verifyCandidate(candidate, verifyPackage);
    const order = compareVersions(candidate.version, installed.version);
    if (order < 0) throw new Error("El asistente instala versiones posteriores. Usa la recuperación documentada para volver atrás.");
    if (!order) {
      if (verified.digest !== installed.digest) throw new Error("La versión ya instalada tiene un manifiesto distinto.");
      print("La versión " + installed.version + " ya está instalada.");
      return { status: "unchanged", version: installed.version };
    }

    const keepBackup = await askYes(ask, "¿Conservar el respaldo de la instancia?", true);
    const supportsPolicy = candidate.files.has(candidate.name + "/scripts/online/client-policy.mjs");
    const allowCompatibleClients = !supportsPolicy ||
      await askYes(ask, "¿Admitir clientes compatibles de otras versiones?", true);
    print("Plan: " + installed.version + " → " + candidate.version + ". Cursos, cuentas y avances se conservan.");
    print("Respaldo: " + (keepBackup ? "persistente" : "durante la operación") + ". Clientes: " +
      (allowCompatibleClients ? "compatibles según el contrato vigente." : "versión web y versión Windows identificada iguales al servidor."));
    if (!supportsPolicy) print("El destino usa su política de compatibilidad publicada.");
    if (!await askYes(ask, "¿Aplicar este plan?", false)) {
      print("Actualización cancelada. El paquete activo sigue en " + installed.version + ".");
      return { status: "cancelled", version: installed.version };
    }
    signal.throwIfAborted();

    let backup = join(workspace, "safety-backup.json");
    if (keepBackup) {
      const backups = join(root, "backups");
      await mkdir(backups, { recursive: true, mode: 0o700 });
      await requireDirectory(backups);
      backup = join(backups, "orbit-" + installed.version + "-" + randomUUID() + ".json");
    }
    await store.backup(backup);
    const { decodeBackup } = await import(pathToFileURL(join(candidate.directory, "scripts/online/store.mjs")).href);
    await decodeBackup(await readFile(backup, "utf8"));

    const destination = join(packages, candidate.name);
    if (!(await fileInfo(destination))) await rename(candidate.directory, destination);
    else {
      await requireDirectory(destination);
      const existing = await verifyPackage(destination);
      if (existing.digest !== verified.digest) throw new Error("La carpeta de destino contiene otro paquete.");
    }
    if (supportsPolicy) {
      const policy = JSON.stringify({ allowCompatibleClients }) + "\n";
      const policyTemp = join(workspace, POLICY_FILENAME);
      await writeFile(policyTemp, policy, { flag: "wx", mode: 0o600 });
      await rename(policyTemp, join(destination, POLICY_FILENAME));
    }
    if (await realpath(current) !== previous) throw new Error("El enlace current cambió durante la actualización.");
    signal.throwIfAborted();
    const next = join(root, ".orbit-current-" + randomUUID());
    await symlink(relative(root, destination), next, "dir");
    try { await rename(next, current); }
    finally { await unlink(next).catch((error) => { if (error.code !== "ENOENT") throw error; }); }
    print("Paquete activo: ORBIT " + candidate.version + ". Verifica e inicia tu instancia.");
    if (keepBackup) print("Respaldo: " + backup);
    return { status: "installed", version: candidate.version, backup: keepBackup ? backup : null, previous };
  } finally {
    try {
      if (workspace && dirname(workspace) === packages && basename(workspace).startsWith(".orbit-update-") && isAbsolute(workspace)) {
        await rm(workspace, { recursive: true, force: true });
      }
    } finally { await store.close(); }
  }
}

async function main() {
  const { values } = parseArgs({ options: {
    root: { type: "string" }, release: { type: "string" }, archive: { type: "string" }, help: { type: "boolean" },
  } });
  if (values.help) {
    console.log("node update-server.mjs [--root INSTANCIA] [--release vX.Y.Z|latest] [--archive CANDIDATO.tar.gz]");
    return;
  }
  if (!process.stdin.isTTY) throw new Error("Ejecuta el asistente en una terminal interactiva.");
  const controller = new AbortController();
  const abort = () => controller.abort();
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  process.on("SIGINT", abort);
  process.on("SIGTERM", abort);
  readline.on("SIGINT", abort);
  try {
    await updateServer({
      root: values.root,
      selectedRelease: values.release,
      localArchive: values.archive,
      ask: (prompt) => readline.question(prompt, { signal: controller.signal }),
      signal: controller.signal,
    });
  } finally {
    readline.close();
    process.off("SIGINT", abort);
    process.off("SIGTERM", abort);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.name === "AbortError" ? "Operación interrumpida." : error.message);
    process.exitCode = 1;
  });
}
