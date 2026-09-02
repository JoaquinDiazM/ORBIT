import { createHash, randomBytes } from "node:crypto";
import {
  access,
  mkdir,
  open,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:http";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { isDeepStrictEqual } from "node:util";

import {
  COURSE_EDITION_SOURCE_URL,
  createCourseEdition,
  materializeCourseEdition,
} from "../src/core/course-edition.js";
import { applyEditorDocument } from "../src/editor/editor-document.js";
import {
  sendEditorEntryRedirect,
  sendRuntimeEntryUnavailable,
  shouldBlockRuntimeEntry,
} from "./repository-runtime-gate.mjs";
import {
  createLocalServiceControl,
  createLocalServiceToken,
} from "./local-service-control.mjs";

const SOURCE_RELATIVE_PATH = COURSE_EDITION_SOURCE_URL.replace(/^\.\//, "");
const AUTHOR_STATE_DIRECTORY = ".orbit-editor";
const AUTHOR_SAFETY_BACKUP_DIRECTORY = ".orbit-editor-backups";
const AUTHOR_TOMBSTONE_DIRECTORY = ".orbit-editor-tombstone";
const AUTHOR_HELPER_LOCK_DIRECTORY = ".orbit-editor-helper-lock";
const AUTHOR_HELPER_LOCK_OWNER = "owner.json";
const AUTHOR_JOURNAL = "repository-transaction.json";
const AUTHOR_BACKUP = "published-edition.backup.json";
const AUTHOR_COURSE_ID = "electromagnetism-applied";
const MAX_REQUEST_BYTES = 1_048_576;
const AUTHOR_JOURNAL_STATUSES = Object.freeze([
  "prepared",
  "source-installed",
  "awaiting-browser",
  "restoring",
]);
const COURSE_REVISION_PATTERN = /^sha256:[a-f0-9]{64}$/;
const SOURCE_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
export const EDITOR_AUTHOR_CANONICAL_PORT = 4173;
export const EDITOR_AUTHOR_CANONICAL_ORIGIN =
  `http://127.0.0.1:${EDITOR_AUTHOR_CANONICAL_PORT}`;

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".ogg", "audio/ogg"],
  [".woff2", "font/woff2"],
  [".woff", "font/woff"],
  [".ttf", "font/ttf"],
]);

const STATIC_ROOT_FILES = new Set(["editor.html", "index.html"]);
const STATIC_SOURCE_EXTENSIONS = new Set([".css", ".js"]);
const STATIC_PUBLIC_EXTENSIONS = new Set([".json", ".ogg", ".svg", ".webmanifest"]);
const STATIC_KATEX_FILES = new Set([
  "node_modules/katex/dist/katex.mjs",
  "node_modules/katex/dist/katex.min.css",
]);
const STATIC_KATEX_FONT_PREFIX = "node_modules/katex/dist/fonts/";

function token() {
  return randomBytes(32).toString("hex");
}

function helperLockPaths(root, ownerId = token()) {
  const directory = resolve(root, AUTHOR_HELPER_LOCK_DIRECTORY);
  return {
    directory,
    owner: resolve(directory, AUTHOR_HELPER_LOCK_OWNER),
    candidate: resolve(root, `${AUTHOR_HELPER_LOCK_DIRECTORY}.${process.pid}.${ownerId}`),
  };
}

function validHelperLockOwner(owner, root) {
  return Boolean(
    owner?.kind === "orbit-editor-author-lock"
    && owner?.schemaVersion === 1
    && typeof owner?.id === "string"
    && owner.id.length >= 16
    && Number.isSafeInteger(owner?.pid)
    && owner.pid > 0
    && owner?.repositoryRoot === root
    && typeof owner?.createdAt === "string"
    && !Number.isNaN(Date.parse(owner.createdAt)),
  );
}

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code !== "ESRCH";
  }
}

async function readHelperLockOwner(paths, root) {
  let owner;
  try {
    owner = JSON.parse(await readFile(paths.owner, "utf8"));
  } catch (error) {
    throw new EditorAuthorError(
      "invalid-author-helper-lock",
      "El checkout contiene un lock de autoría sin identidad verificable; no se tocará.",
      { cause: error },
    );
  }
  if (!validHelperLockOwner(owner, root)) {
    throw new EditorAuthorError(
      "invalid-author-helper-lock",
      "El lock de autoría no cumple el contrato vigente; no se tocará.",
    );
  }
  return owner;
}

export async function acquireEditorAuthorLock(root) {
  const repositoryRoot = resolve(root ?? process.cwd());
  const ownerId = token();
  const paths = helperLockPaths(repositoryRoot, ownerId);
  const owner = {
    kind: "orbit-editor-author-lock",
    schemaVersion: 1,
    id: ownerId,
    pid: process.pid,
    repositoryRoot,
    createdAt: new Date().toISOString(),
  };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await mkdir(paths.candidate);
    await writeFile(
      resolve(paths.candidate, AUTHOR_HELPER_LOCK_OWNER),
      `${JSON.stringify(owner, null, 2)}\n`,
      { encoding: "utf8", flag: "wx" },
    );
    try {
      await rename(paths.candidate, paths.directory);
      let released = false;
      return {
        owner: structuredClone(owner),
        async release() {
          if (released) return;
          if (!(await exists(paths.directory))) {
            released = true;
            return;
          }
          const activeOwner = await readHelperLockOwner(paths, repositoryRoot);
          if (activeOwner.id !== ownerId) {
            throw new EditorAuthorError(
              "author-helper-lock-changed",
              "El lock activo ya no pertenece a este helper; no se eliminará.",
            );
          }
          await rm(paths.directory, { recursive: true, force: true });
          released = true;
        },
      };
    } catch (error) {
      await rm(paths.candidate, { recursive: true, force: true });
      if (!["EEXIST", "ENOTEMPTY", "EPERM"].includes(error?.code)) throw error;
    }

    const activeOwner = await readHelperLockOwner(paths, repositoryRoot);
    if (processIsAlive(activeOwner.pid)) {
      throw new EditorAuthorError(
        "author-helper-already-running",
        `Otro helper de autoría mantiene reservado este checkout (PID ${activeOwner.pid}).`,
      );
    }

    const stalePath = `${paths.directory}.stale.${ownerId}.${attempt}`;
    try {
      await rename(paths.directory, stalePath);
    } catch (error) {
      if (["ENOENT", "EEXIST", "ENOTEMPTY", "EPERM"].includes(error?.code)) continue;
      throw error;
    }
    await rm(stalePath, { recursive: true, force: true });
  }

  throw new EditorAuthorError(
    "author-helper-lock-contention",
    "El lock de autoría cambió repetidamente; vuelve a intentarlo sin tocar el checkout.",
  );
}

function transactionPaths(root) {
  const directory = resolve(root, AUTHOR_STATE_DIRECTORY);
  return {
    directory,
    journal: resolve(directory, AUTHOR_JOURNAL),
    backup: resolve(directory, AUTHOR_BACKUP),
    target: resolve(root, SOURCE_RELATIVE_PATH),
  };
}

function transactionTombstonePath(root) {
  return resolve(root, AUTHOR_TOMBSTONE_DIRECTORY);
}

async function discardTransactionTombstone(root) {
  await rm(transactionTombstonePath(root), { recursive: true, force: true });
}

async function retireTransactionDirectory(root, paths) {
  const tombstone = transactionTombstonePath(root);
  await rm(tombstone, { recursive: true, force: true });
  try {
    await rename(paths.directory, tombstone);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  await rm(tombstone, { recursive: true, force: true });
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readOptionalBytes(path) {
  try {
    return await readFile(path);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function sourceBytesHash(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

async function preserveSourceSafetyBackup(root, sourceBytes, { appliedAt, revision }) {
  if (sourceBytes === null) return null;
  const directory = resolve(root, AUTHOR_SAFETY_BACKUP_DIRECTORY);
  const timestamp = appliedAt.replace(/[^0-9A-Za-z-]/g, "-");
  const sourceHash = sourceBytesHash(sourceBytes);
  const revisionSlug = revision?.replace(/^sha256:/, "").slice(0, 12) ?? "unversioned";
  const filename = `${timestamp}-${revisionSlug}-${token().slice(0, 8)}.edition.json`;
  const path = resolve(directory, filename);
  await mkdir(directory, { recursive: true });
  await atomicWrite(path, sourceBytes.toString("utf8"));
  return {
    path: relative(root, path).split(sep).join("/"),
    revision,
    sourceHash,
    savedAt: appliedAt,
  };
}

async function atomicWrite(path, text) {
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`;
  const handle = await open(temporary, "wx");
  try {
    await handle.writeFile(text, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

async function defaultRunner({ command, args, cwd }) {
  return new Promise((resolveResult) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      windowsHide: true,
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", (error) => {
      resolveResult({ code: 1, stdout, stderr: `${stderr}${error.message}` });
    });
    child.once("close", (code) => {
      resolveResult({ code: code ?? 1, stdout, stderr });
    });
  });
}

function npmInvocation(script) {
  if (process.env.npm_execpath) {
    return {
      command: process.execPath,
      args: [process.env.npm_execpath, "run", script],
    };
  }
  return {
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["run", script],
  };
}

async function runNpmScript(root, script, runner) {
  const invocation = npmInvocation(script);
  return runner({ ...invocation, cwd: root });
}

async function assertRepositoryRoot(root) {
  const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  if (packageJson.name !== "orbit-open-roadmap") {
    throw new EditorAuthorError(
      "wrong-repository",
      "La herramienta de autoría solo puede operar en la raíz del repositorio ORBIT.",
    );
  }
}

async function readCurrentEdition(target) {
  if (!(await exists(target))) return null;
  const candidate = JSON.parse(await readFile(target, "utf8"));
  return materializeCourseEdition(candidate);
}

function validateAuthorJournal(journal) {
  const previousRevisionValid = journal?.previousRevision === null
    || (
      typeof journal?.previousRevision === "string"
      && COURSE_REVISION_PATTERN.test(journal.previousRevision)
    );
  const previousSourceHashValid = journal?.previousSourceHash === null
    || (
      typeof journal?.previousSourceHash === "string"
      && SOURCE_HASH_PATTERN.test(journal.previousSourceHash)
    );
  if (
    journal?.kind !== "orbit-editor-author-transaction"
    || journal?.schemaVersion !== 1
    || !AUTHOR_JOURNAL_STATUSES.includes(journal?.status)
    || journal?.target !== SOURCE_RELATIVE_PATH
    || journal?.courseId !== AUTHOR_COURSE_ID
    || typeof journal?.rollbackToken !== "string"
    || journal.rollbackToken.length < 16
    || typeof journal?.previousExisted !== "boolean"
    || !previousRevisionValid
    || journal.previousExisted !== (journal.previousRevision !== null)
    || !previousSourceHashValid
    || journal.previousExisted !== (journal.previousSourceHash !== null)
    || typeof journal?.targetSourceHash !== "string"
    || !SOURCE_HASH_PATTERN.test(journal.targetSourceHash)
    || typeof journal?.targetRevision !== "string"
    || !COURSE_REVISION_PATTERN.test(journal.targetRevision)
    || typeof journal?.createdAt !== "string"
    || Number.isNaN(Date.parse(journal.createdAt))
  ) {
    throw new EditorAuthorError(
      "invalid-author-journal",
      "El journal del helper local no cumple el contrato de transacción vigente.",
    );
  }
  return journal;
}

async function readAuthorJournalFile(path) {
  let journal;
  try {
    journal = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new EditorAuthorError(
      "invalid-author-journal",
      "El journal del helper local no contiene JSON válido.",
      { cause: error },
    );
  }
  return validateAuthorJournal(journal);
}

async function assertExpectedTransactionSource(paths, journal) {
  const sourceBytes = await readOptionalBytes(paths.target);
  const canContainEitherVersion = ["prepared", "restoring"].includes(journal.status);
  const expectedHashes = canContainEitherVersion
    ? [journal.previousSourceHash, journal.targetSourceHash]
    : [journal.targetSourceHash];
  const actualHash = sourceBytes === null ? null : sourceBytesHash(sourceBytes);
  if (!expectedHashes.includes(actualHash)) {
    throw new EditorAuthorError(
      "author-source-diverged",
      "La fuente cambió fuera de la transacción de autoría; no se tocarán fuente, build ni journal.",
    );
  }
  return sourceBytes;
}

async function verifyFinalizationArtifacts(root, paths, journal) {
  await assertExpectedTransactionSource(paths, journal);
  let source;
  try {
    source = await readCurrentEdition(paths.target);
  } catch (error) {
    throw new EditorAuthorError(
      "author-finalization-evidence-mismatch",
      "La fuente instalada no es una edición válida; se conservó el journal pendiente.",
      { cause: error },
    );
  }
  if (
    !source
    || source.edition.courseId !== journal.courseId
    || source.edition.revision !== journal.targetRevision
    || source.edition.previousRevision !== journal.previousRevision
  ) {
    throw new EditorAuthorError(
      "author-finalization-evidence-mismatch",
      "La fuente instalada no coincide con targetRevision y previousRevision del journal.",
    );
  }

  const buildInfoPath = resolve(root, "dist", "build-info.json");
  if (!(await exists(buildInfoPath))) {
    throw new EditorAuthorError(
      "author-finalization-evidence-mismatch",
      "Falta dist/build-info.json; no se puede confirmar que el build corresponda a la fuente pendiente.",
    );
  }
  let buildInfo;
  try {
    buildInfo = JSON.parse(await readFile(buildInfoPath, "utf8"));
  } catch (error) {
    throw new EditorAuthorError(
      "author-finalization-evidence-mismatch",
      "dist/build-info.json no contiene evidencia interpretable; se conservó el journal.",
      { cause: error },
    );
  }
  if (
    buildInfo?.project !== "orbit-open-roadmap"
    || buildInfo?.courseId !== source.edition.courseId
    || buildInfo?.courseRevision !== journal.targetRevision
    || buildInfo?.courseDigest !== source.edition.digest
  ) {
    throw new EditorAuthorError(
      "author-finalization-evidence-mismatch",
      "La evidencia de build no coincide con la edición fuente pendiente.",
    );
  }
  const builtTarget = resolve(root, "dist", SOURCE_RELATIVE_PATH);
  let built;
  try {
    built = await readCurrentEdition(builtTarget);
  } catch (error) {
    throw new EditorAuthorError(
      "author-finalization-evidence-mismatch",
      "El artefacto de curso en dist no es válido; se conservó el journal.",
      { cause: error },
    );
  }
  if (
    !built
    || built.edition.revision !== journal.targetRevision
    || !isDeepStrictEqual(built.edition, source.edition)
  ) {
    throw new EditorAuthorError(
      "author-finalization-evidence-mismatch",
      "El artefacto de curso en dist no coincide íntegramente con la edición fuente pendiente.",
    );
  }
  return source;
}

async function verifyRestoredRepositoryArtifacts(root, paths, journal) {
  const buildInfoPath = resolve(root, "dist", "build-info.json");
  const builtTarget = resolve(root, "dist", SOURCE_RELATIVE_PATH);
  const sourceBytes = await readOptionalBytes(paths.target);

  if (!journal.previousExisted) {
    if (sourceBytes !== null) {
      throw new EditorAuthorError(
        "author-source-diverged",
        "La fuente reapareció durante el build de rollback; se conservará la evidencia.",
      );
    }
    if ((await exists(buildInfoPath)) || (await exists(builtTarget))) {
      throw new EditorAuthorError(
        "author-restored-build-evidence-mismatch",
        "El build conserva una edición aunque el estado anterior no tenía fuente.",
      );
    }
    return;
  }

  const backupBytes = await readOptionalBytes(paths.backup);
  if (
    sourceBytes === null
    || backupBytes === null
    || sourceBytesHash(sourceBytes) !== journal.previousSourceHash
    || !sourceBytes.equals(backupBytes)
  ) {
    throw new EditorAuthorError(
      "author-source-diverged",
      "La fuente restaurada cambió durante el build de rollback; se conservará la evidencia.",
    );
  }

  let source;
  let buildInfo;
  let built;
  try {
    source = await materializeCourseEdition(JSON.parse(sourceBytes.toString("utf8")));
    buildInfo = JSON.parse(await readFile(buildInfoPath, "utf8"));
    built = await readCurrentEdition(builtTarget);
  } catch (error) {
    throw new EditorAuthorError(
      "author-restored-build-evidence-mismatch",
      "El build restaurado no contiene evidencia verificable de la revisión anterior.",
      { cause: error },
    );
  }
  if (
    !built
    || source.edition.courseId !== journal.courseId
    || source.edition.revision !== journal.previousRevision
    || buildInfo?.project !== "orbit-open-roadmap"
    || buildInfo?.courseId !== journal.courseId
    || buildInfo?.courseRevision !== journal.previousRevision
    || buildInfo?.courseDigest !== source.edition.digest
    || !isDeepStrictEqual(built.edition, source.edition)
  ) {
    throw new EditorAuthorError(
      "author-restored-build-evidence-mismatch",
      "La fuente, build-info y edición construida no coinciden con la revisión anterior.",
    );
  }
}

async function restoreRepositoryTransaction(root, journal, { runner = defaultRunner } = {}) {
  const paths = transactionPaths(root);
  validateAuthorJournal(journal);
  await assertExpectedTransactionSource(paths, journal);
  let validatedBackupText = null;
  if (journal.previousExisted) {
    if (!(await exists(paths.backup))) {
      throw new EditorAuthorError(
        "missing-author-backup",
        "Falta el respaldo de la fuente anterior.",
      );
    }
    let backupBytes;
    let backupText;
    let backup;
    try {
      backupBytes = await readFile(paths.backup);
      if (sourceBytesHash(backupBytes) !== journal.previousSourceHash) {
        throw new EditorAuthorError(
          "author-backup-evidence-mismatch",
          "Los bytes del respaldo no coinciden con el hash anterior declarado por el journal.",
        );
      }
      backupText = backupBytes.toString("utf8");
      backup = await materializeCourseEdition(JSON.parse(backupText));
    } catch (error) {
      if (error?.code === "author-backup-evidence-mismatch") throw error;
      throw new EditorAuthorError(
        "invalid-author-backup",
        "El respaldo no contiene una edición de curso verificable; no se tocará la fuente.",
        { cause: error },
      );
    }
    if (
      backup.edition.courseId !== journal.courseId
      || backup.edition.revision !== journal.previousRevision
    ) {
      throw new EditorAuthorError(
        "author-backup-evidence-mismatch",
        "El respaldo no coincide con el curso y la revisión anterior declarados por el journal; no se tocará la fuente.",
      );
    }
    validatedBackupText = backupText;
  }
  const restoringJournal = journal.status === "restoring"
    ? journal
    : { ...journal, status: "restoring" };
  if (journal.status !== "restoring") {
    await atomicWrite(paths.journal, `${JSON.stringify(restoringJournal, null, 2)}\n`);
  }
  if (restoringJournal.previousExisted) {
    await atomicWrite(paths.target, validatedBackupText);
  } else {
    await rm(paths.target, { force: true });
  }
  const build = await runNpmScript(root, "build", runner);
  if (build.code !== 0) {
    throw new EditorAuthorError(
      "rollback-build-failed",
      `La fuente se restauró, pero no fue posible reconstruir dist. ${build.stderr.trim()}`,
    );
  }
  await verifyRestoredRepositoryArtifacts(root, paths, restoringJournal);
  await retireTransactionDirectory(root, paths);
  return { ok: true, action: "rolled-back", build };
}

export async function recoverRepositoryApplication(root, { runner = defaultRunner } = {}) {
  await discardTransactionTombstone(root);
  const paths = transactionPaths(root);
  if (!(await exists(paths.journal))) {
    return { ok: true, recovered: false, pending: false, action: "none" };
  }
  const journal = await readAuthorJournalFile(paths.journal);
  await assertExpectedTransactionSource(paths, journal);
  if (journal.status === "awaiting-browser") {
    return {
      ok: true,
      recovered: false,
      pending: true,
      action: "awaiting-browser",
      transaction: {
        status: journal.status,
        rollbackToken: journal.rollbackToken,
        previousRevision: journal.previousRevision,
        targetRevision: journal.targetRevision,
        createdAt: journal.createdAt,
      },
    };
  }
  const result = await restoreRepositoryTransaction(root, journal, { runner });
  return { ...result, recovered: true, pending: false };
}

async function inspectRepositoryApplication(root) {
  await discardTransactionTombstone(root);
  const paths = transactionPaths(root);
  if (!(await exists(paths.journal))) {
    return { pending: false, incomplete: false, action: "none", transaction: null };
  }
  const journal = await readAuthorJournalFile(paths.journal);
  await assertExpectedTransactionSource(paths, journal);
  const source = journal.status === "awaiting-browser"
    ? await verifyFinalizationArtifacts(root, paths, journal)
    : null;
  const transaction = {
    status: journal.status,
    rollbackToken: journal.rollbackToken,
    previousRevision: journal.previousRevision,
    targetRevision: journal.targetRevision,
    createdAt: journal.createdAt,
    ...(source ? { edition: source.edition } : {}),
  };
  return journal.status === "awaiting-browser"
    ? { pending: true, incomplete: false, action: "awaiting-browser", transaction }
    : { pending: false, incomplete: true, action: journal.status, transaction };
}

export async function applyEditionToRepository({
  root,
  document,
  expectedPreviousRevision,
  runner = defaultRunner,
  appliedAt = new Date().toISOString(),
} = {}) {
  const repositoryRoot = resolve(root ?? process.cwd());
  await assertRepositoryRoot(repositoryRoot);
  const recovery = await recoverRepositoryApplication(repositoryRoot, { runner });
  if (recovery.pending) {
    throw new EditorAuthorError(
      "pending-browser-finalization",
      "Existe una edición aplicada a fuentes que espera finalizar o revertir su transacción del navegador.",
    );
  }
  const paths = transactionPaths(repositoryRoot);
  const previousSourceBytes = await readOptionalBytes(paths.target);
  const current = previousSourceBytes === null
    ? null
    : await materializeCourseEdition(JSON.parse(previousSourceBytes.toString("utf8")));
  const currentRevision = current?.edition.revision ?? null;
  if (expectedPreviousRevision === undefined) {
    throw new EditorAuthorError(
      "missing-expected-previous-revision",
      "La aplicación debe declarar la revisión fuente usada para construir el plan.",
    );
  }
  if (expectedPreviousRevision !== currentRevision) {
    throw new EditorAuthorError(
      "revision-conflict",
      `La fuente cambió desde el plan: se esperaba ${String(expectedPreviousRevision)} y existe ${String(currentRevision)}.`,
    );
  }
  let normalizedDocument;
  try {
    normalizedDocument = applyEditorDocument(document, {
      baseDocument: current?.editorDocument,
    }).document;
  } catch (cause) {
    throw new EditorAuthorError(
      "invalid-editor-document",
      "La edición enviada no supera el contrato editorial vigente.",
      { cause },
    );
  }
  if (!isDeepStrictEqual(document, normalizedDocument)) {
    throw new EditorAuthorError(
      "noncanonical-editor-document",
      "La edición enviada omite o altera estado editorial publicado. Recarga el Editor antes de volver a validar.",
    );
  }
  const edition = await createCourseEdition(normalizedDocument, {
    previousRevision: currentRevision,
    acceptsUnversionedProgress: false,
    appliedAt,
    baseDocument: current?.editorDocument,
  });
  const targetText = `${JSON.stringify(edition, null, 2)}\n`;
  const targetSourceBytes = Buffer.from(targetText, "utf8");
  const rollbackToken = token();
  const previousExisted = previousSourceBytes !== null;
  const sourceBackup = await preserveSourceSafetyBackup(
    repositoryRoot,
    previousSourceBytes,
    { appliedAt, revision: currentRevision },
  );
  await mkdir(paths.directory, { recursive: true });
  if (previousExisted) {
    await atomicWrite(paths.backup, previousSourceBytes.toString("utf8"));
  }
  const journal = {
    kind: "orbit-editor-author-transaction",
    schemaVersion: 1,
    status: "prepared",
    courseId: edition.courseId,
    rollbackToken,
    target: SOURCE_RELATIVE_PATH,
    previousExisted,
    previousRevision: currentRevision,
    previousSourceHash: previousExisted ? sourceBytesHash(previousSourceBytes) : null,
    targetRevision: edition.revision,
    targetSourceHash: sourceBytesHash(targetSourceBytes),
    createdAt: appliedAt,
  };
  await atomicWrite(paths.journal, `${JSON.stringify(journal, null, 2)}\n`);

  try {
    await mkdir(resolve(paths.target, ".."), { recursive: true });
    await atomicWrite(paths.target, targetText);
    await atomicWrite(
      paths.journal,
      `${JSON.stringify({ ...journal, status: "source-installed" }, null, 2)}\n`,
    );
    const check = await runNpmScript(repositoryRoot, "check", runner);
    if (check.code !== 0) {
      throw new EditorAuthorError(
        "repository-check-failed",
        `La edición no superó npm run check. ${check.stderr.trim()}`,
      );
    }
    await atomicWrite(
      paths.journal,
      `${JSON.stringify({ ...journal, status: "awaiting-browser" }, null, 2)}\n`,
    );
    return {
      ok: true,
      edition,
      rollbackToken,
      sourceBackup,
      protocol: {
        next: "apply-browser-transaction",
        success: "finalize",
        failure: "rollback",
      },
      check,
    };
  } catch (error) {
    const activeJournal = await readAuthorJournalFile(paths.journal);
    try {
      await restoreRepositoryTransaction(repositoryRoot, activeJournal, { runner });
    } catch (rollbackError) {
      throw new EditorAuthorError(
        "repository-rollback-failed",
        "La aplicación falló y el helper no pudo verificar su rollback.",
        { cause: error, rollbackError },
      );
    }
    throw error;
  }
}

async function readAuthorJournal(root, rollbackToken) {
  const paths = transactionPaths(root);
  if (!(await exists(paths.journal))) {
    throw new EditorAuthorError("no-pending-author-transaction", "No existe una aplicación pendiente.");
  }
  const journal = await readAuthorJournalFile(paths.journal);
  if (journal.rollbackToken !== rollbackToken) {
    throw new EditorAuthorError("invalid-rollback-token", "El token de rollback no coincide.");
  }
  return { paths, journal };
}

export async function finalizeRepositoryApplication({ root, rollbackToken } = {}) {
  const repositoryRoot = resolve(root ?? process.cwd());
  const { paths, journal } = await readAuthorJournal(repositoryRoot, rollbackToken);
  if (journal.status !== "awaiting-browser") {
    throw new EditorAuthorError("author-transaction-not-ready", "La aplicación todavía no puede finalizarse.");
  }
  await verifyFinalizationArtifacts(repositoryRoot, paths, journal);
  await retireTransactionDirectory(repositoryRoot, paths);
  return { ok: true, revision: journal.targetRevision, action: "finalized" };
}

export async function rollbackRepositoryApplication({
  root,
  rollbackToken,
  runner = defaultRunner,
} = {}) {
  const repositoryRoot = resolve(root ?? process.cwd());
  const { journal } = await readAuthorJournal(repositoryRoot, rollbackToken);
  return restoreRepositoryTransaction(repositoryRoot, journal, { runner });
}

function isAllowedStaticApplicationPath(relativePath) {
  return STATIC_ROOT_FILES.has(relativePath)
    || (
      relativePath.startsWith("src/")
      && STATIC_SOURCE_EXTENSIONS.has(extname(relativePath).toLowerCase())
    )
    || (
      relativePath.startsWith("public/")
      && STATIC_PUBLIC_EXTENSIONS.has(extname(relativePath).toLowerCase())
    )
    || STATIC_KATEX_FILES.has(relativePath)
    || relativePath.startsWith(STATIC_KATEX_FONT_PREFIX);
}

async function safeStaticPath(root, requestUrl) {
  const parsed = new URL(requestUrl, "http://127.0.0.1");
  const relativePath = decodeURIComponent(parsed.pathname).replace(/^[/\\]+/, "") || "index.html";
  const segments = relativePath.split(/[/\\]+/);
  if (segments.some((segment) => segment.startsWith("."))) return null;
  const candidate = resolve(root, relativePath);
  const relativeCandidate = relative(root, candidate);
  if (
    isAbsolute(relativeCandidate)
    || relativeCandidate === ".."
    || relativeCandidate.startsWith(`..${sep}`)
  ) {
    return null;
  }
  const normalizedRelative = relativeCandidate.split(sep).join("/");
  if (!isAllowedStaticApplicationPath(normalizedRelative)) return null;

  try {
    const [realRoot, realCandidate] = await Promise.all([
      realpath(root),
      realpath(candidate),
    ]);
    const realRelative = relative(realRoot, realCandidate);
    if (
      isAbsolute(realRelative)
      || realRelative === ".."
      || realRelative.startsWith(`..${sep}`)
    ) {
      return null;
    }
    const normalizedRealRelative = realRelative.split(sep).join("/");
    if (!isAllowedStaticApplicationPath(normalizedRealRelative)) return null;
    return realCandidate;
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function sendJson(response, status, value) {
  const body = `${JSON.stringify(value)}\n`;
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(body);
}

async function readJsonBody(request) {
  const declaredLength = Number(request.headers["content-length"] ?? 0);
  if (declaredLength > MAX_REQUEST_BYTES) {
    throw new EditorAuthorError("payload-too-large", "El borrador excede 1 MiB.");
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_REQUEST_BYTES) {
      throw new EditorAuthorError("payload-too-large", "El borrador excede 1 MiB.");
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    throw new EditorAuthorError("invalid-request-json", "La solicitud no contiene JSON válido.", { cause: error });
  }
}

function canonicalRequestContext(request, server) {
  const address = server.address();
  if (!address || typeof address === "string") return null;
  const authority = `127.0.0.1:${address.port}`;
  const origin = `http://${authority}`;
  if (request.headers.host !== authority) return null;

  const requestTarget = request.url ?? "";
  let url;
  try {
    const absoluteForm = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)/i.exec(requestTarget);
    if (absoluteForm) {
      if (absoluteForm[1] !== "http" || absoluteForm[2] !== authority) return null;
      url = new URL(requestTarget);
      if (
        url.origin !== origin
        || url.username !== ""
        || url.password !== ""
      ) {
        return null;
      }
    } else {
      if (!requestTarget.startsWith("/") || requestTarget.startsWith("//")) return null;
      url = new URL(requestTarget, origin);
    }
  } catch {
    return null;
  }
  if (
    url.origin !== origin
    || url.username !== ""
    || url.password !== ""
  ) return null;
  try {
    if (decodeURIComponent(url.pathname).replaceAll("\\", "/").startsWith("//")) {
      return null;
    }
  } catch {
    return null;
  }
  return { authority, origin, url };
}

export async function createEditorAuthorServer({
  root = process.cwd(),
  port = EDITOR_AUTHOR_CANONICAL_PORT,
  runner = defaultRunner,
  sessionToken = token(),
  localServiceToken = createLocalServiceToken(),
} = {}) {
  if (port !== 0 && port !== EDITOR_AUTHOR_CANONICAL_PORT) {
    throw new EditorAuthorError(
      "noncanonical-author-origin",
      `La autoría debe ejecutarse en ${EDITOR_AUTHOR_CANONICAL_ORIGIN} para compartir locks y progreso con ORBIT Estudiante.`,
    );
  }
  const repositoryRoot = resolve(root);
  await assertRepositoryRoot(repositoryRoot);
  const helperLock = await acquireEditorAuthorLock(repositoryRoot);
  try {
    await recoverRepositoryApplication(repositoryRoot, { runner });
  } catch (error) {
    await helperLock.release();
    throw error;
  }
  let origin = null;
  let busy = false;
  let server = null;
  let closePromise = null;
  const close = () => {
    if (closePromise) return closePromise;
    closePromise = (async () => {
      if (server?.listening) {
        const closed = new Promise((resolveClose, rejectClose) => {
          server.close((error) => (error ? rejectClose(error) : resolveClose()));
        });
        server.closeIdleConnections?.();
        await closed;
      }
      await helperLock.release();
    })();
    return closePromise;
  };
  const shutdownBlocked = async () => {
    if (busy) return true;
    try {
      const pending = await inspectRepositoryApplication(repositoryRoot);
      return busy || pending.pending || pending.incomplete;
    } catch {
      return true;
    }
  };
  const localServiceControl = createLocalServiceControl({
    service: "editor-author",
    token: localServiceToken,
    isBusy: shutdownBlocked,
    shutdown: close,
  });

  server = createServer(async (request, response) => {
    try {
      const requestContext = canonicalRequestContext(request, server);
      if (!requestContext) {
        sendJson(response, 421, {
          ok: false,
          code: "noncanonical-request-authority",
          message: "El helper solo acepta la autoridad loopback exacta que anunció al iniciarse.",
        });
        return;
      }
      const { origin: requestOrigin, url } = requestContext;
      if (await localServiceControl.handle({ request, response, requestOrigin, url })) return;
      if (localServiceControl.shutdownPending) {
        sendJson(response, 503, {
          ok: false,
          code: "local-service-shutdown-pending",
          message: "El helper local se está apagando.",
        });
        return;
      }
      if (url.pathname === "/__orbit/author/session" && request.method === "GET") {
        if (busy) {
          sendJson(response, 409, {
            ok: false,
            code: "author-busy",
            message: "El helper está aplicando una edición; la sesión no inspeccionará su journal hasta que termine.",
          });
          return;
        }
        const pending = await inspectRepositoryApplication(repositoryRoot);
        if (busy) {
          sendJson(response, 409, {
            ok: false,
            code: "author-busy",
            message: "El helper comenzó una aplicación durante la inspección; vuelve a consultar al finalizar.",
          });
          return;
        }
        if (pending.incomplete) {
          sendJson(response, 409, {
            ok: false,
            code: "author-recovery-required",
            message: "Existe un journal incompleto fuera de una operación activa; reinicia el helper para recuperarlo.",
          });
          return;
        }
        sendJson(response, 200, {
          kind: "orbit-editor-author-session",
          schemaVersion: 1,
          token: sessionToken,
          courseId: "electromagnetism-applied",
          endpoints: {
            apply: "/__orbit/author/apply",
            finalize: "/__orbit/author/finalize",
            rollback: "/__orbit/author/rollback",
          },
          pending: pending.pending ? pending.transaction : null,
        });
        return;
      }
      if (url.pathname.startsWith("/__orbit/author/")) {
        if (request.method !== "POST") {
          sendJson(response, 405, { ok: false, code: "method-not-allowed" });
          return;
        }
        if (
          request.headers.origin !== requestOrigin
          || request.headers["x-orbit-author-token"] !== sessionToken
          || !String(request.headers["content-type"] ?? "").toLowerCase().startsWith("application/json")
        ) {
          sendJson(response, 403, { ok: false, code: "author-request-rejected" });
          return;
        }
        if (busy) {
          sendJson(response, 409, { ok: false, code: "author-busy" });
          return;
        }
        busy = true;
        try {
          const body = await readJsonBody(request);
          let result;
          if (url.pathname === "/__orbit/author/apply") {
            result = await applyEditionToRepository({
              root: repositoryRoot,
              document: body.document,
              expectedPreviousRevision: body.expectedPreviousRevision,
              runner,
            });
          } else if (url.pathname === "/__orbit/author/finalize") {
            result = await finalizeRepositoryApplication({
              root: repositoryRoot,
              rollbackToken: body.rollbackToken,
            });
          } else if (url.pathname === "/__orbit/author/rollback") {
            result = await rollbackRepositoryApplication({
              root: repositoryRoot,
              rollbackToken: body.rollbackToken,
              runner,
            });
          } else {
            sendJson(response, 404, { ok: false, code: "unknown-author-endpoint" });
            return;
          }
          sendJson(response, 200, result);
        } finally {
          busy = false;
        }
        return;
      }

      if (!request.url || !["GET", "HEAD"].includes(request.method ?? "")) {
        response.writeHead(405, { "content-type": "text/plain; charset=utf-8" });
        response.end("Método no permitido");
        return;
      }
      if (sendEditorEntryRedirect(response, request.url, {
        head: request.method === "HEAD",
      })) return;
      if (shouldBlockRuntimeEntry(repositoryRoot, request.url, {
        busy,
        maintenance: true,
      })) {
        sendRuntimeEntryUnavailable(response, { maintenance: true });
        return;
      }
      const filePath = await safeStaticPath(repositoryRoot, request.url);
      if (!filePath) {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Recurso no encontrado");
        return;
      }
      if ((await stat(filePath)).isDirectory()) {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Recurso no encontrado");
        return;
      }
      if (shouldBlockRuntimeEntry(repositoryRoot, request.url, {
        busy,
        maintenance: true,
      })) {
        sendRuntimeEntryUnavailable(response, { maintenance: true });
        return;
      }
      const body = request.method === "HEAD" ? null : await readFile(filePath);
      response.writeHead(200, {
        "content-type": MIME_TYPES.get(extname(filePath).toLowerCase()) ?? "application/octet-stream",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      });
      response.end(body);
    } catch (error) {
      const status = error?.code === "payload-too-large"
        ? 413
        : ["pending-browser-finalization", "revision-conflict"].includes(error?.code)
          ? 409
          : 400;
      sendJson(response, status, {
        ok: false,
        code: error?.code ?? "author-error",
        message: error?.message ?? String(error),
      });
    }
  });

  try {
    await new Promise((resolveListen, rejectListen) => {
      server.once("error", rejectListen);
      server.listen(port, "127.0.0.1", resolveListen);
    });
  } catch (error) {
    await helperLock.release();
    throw error;
  }
  const address = server.address();
  origin = `http://127.0.0.1:${address.port}`;
  return {
    server,
    origin,
    token: sessionToken,
    close,
  };
}

export class EditorAuthorError extends Error {
  constructor(code, message, { cause, rollbackError } = {}) {
    super(message, { ...(cause === undefined ? {} : { cause }) });
    this.name = "EditorAuthorError";
    this.code = code;
    if (rollbackError !== undefined) this.rollbackError = rollbackError;
  }
}

export function resolveEditorAuthorCliPort({
  environment = process.env,
  argv = process.argv,
} = {}) {
  const explicit = environment?.PORT ?? argv?.[2];
  if (
    explicit !== undefined
    && String(explicit).trim() !== String(EDITOR_AUTHOR_CANONICAL_PORT)
  ) {
    throw new EditorAuthorError(
      "noncanonical-author-origin",
      `No se admite cambiar el puerto de autoría: usa ${EDITOR_AUTHOR_CANONICAL_ORIGIN}. Detén antes cualquier npm run dev que ocupe ese origen.`,
    );
  }
  return EDITOR_AUTHOR_CANONICAL_PORT;
}

const invokedDirectly = process.argv[1]
  && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  try {
    const port = resolveEditorAuthorCliPort();
    const author = await createEditorAuthorServer({ port });
    console.log(`ORBIT Editor · autoría local canónica: ${author.origin}/editor.html`);
    console.log("Modo mantenimiento: las entradas de ORBIT permanecen bloqueadas hasta volver a iniciar npm run dev.");
    console.log("La API de aplicación solo acepta solicitudes same-origin con token de sesión.");
    console.log("Presiona Ctrl+C para detener el helper.");
    const shutdown = () => author.close().finally(() => process.exit(0));
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error(error?.message ?? String(error));
    process.exitCode = 1;
  }
}
