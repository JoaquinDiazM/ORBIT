import { createHash, randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { mkdir, open, readFile, readdir, rename, unlink, lstat, realpath } from "node:fs/promises";
import { materializeCourseEdition } from "../../src/core/course-edition.js";
import { apiError, normalizeAlias, validPasswordRecord } from "./auth.mjs";

const MAX_STATE_BYTES = 64 * 1024 * 1024;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const text = (value) => typeof value === "string" && value.length > 0;
const unique = (values) => new Set(values).size === values.length;
const record = (value) => value && typeof value === "object" && !Array.isArray(value);
function invalid(message) { throw apiError(400, "invalid-store", message); }

export async function validateServerState(state) {
  if (!record(state) || state.kind !== "orbit-server-state" || state.schemaVersion !== 1
    || !UUID.test(state.serverId) || !UUID.test(state.epoch)
    || !Array.isArray(state.users) || !Array.isArray(state.courses) || !Array.isArray(state.progress)
    || state.users.length > 1000 || state.courses.length > 50 || state.progress.length > 1000
    || !state.users.every(record) || !state.courses.every(record) || !state.progress.every(record)
    || !unique(state.users.map((user) => user.id)) || !unique(state.users.map((user) => user.alias))
    || !unique(state.courses.map((course) => course.id))) invalid("Formato de servidor inválido.");
  const users = new Map(state.users.map((user) => [user.id, user]));
  const courses = new Map(state.courses.map((course) => [course.id, course]));
  for (const user of state.users) {
    if (!UUID.test(user.id) || normalizeAlias(user.alias) !== user.alias
      || !["admin", "teacher", "student"].includes(user.role) || !validPasswordRecord(user.password)
      || !Number.isSafeInteger(user.sessionVersion) || user.sessionVersion < 1
      || !UUID.test(user.generation)
      || (user.role === "student" ? !courses.has(user.courseId) : user.courseId !== null)) {
      invalid("Cuenta inválida o fuera de su curso.");
    }
  }
  if (!state.users.some((user) => user.role === "admin")) invalid("Falta la cuenta administradora.");
  const materialized = new Map();
  for (const course of state.courses) {
    if (!UUID.test(course.id) || !text(course.title) || course.title.length > 160
      || typeof course.maintenance !== "boolean" || !Array.isArray(course.teacherIds)
      || !unique(course.teacherIds) || course.teacherIds.some((id) => users.get(id)?.role !== "teacher")
      || !Array.isArray(course.compatibility) || course.compatibility.length > 1000) {
      invalid("Curso inválido.");
    }
    const loaded = await materializeCourseEdition(course.edition);
    materialized.set(course.id, loaded);
    const revisions = new Set();
    for (const [index, step] of course.compatibility.entries()) {
      if (!record(step) || !/^sha256:[a-f0-9]{64}$/.test(step.fromRevision)
        || !/^sha256:[a-f0-9]{64}$/.test(step.toRevision)
        || step.fromRevision === step.toRevision || revisions.has(step.fromRevision) || revisions.has(step.toRevision)
        || !Array.isArray(step.invalidatedLocationIds) || step.invalidatedLocationIds.length > 10000
        || !step.invalidatedLocationIds.every(text) || !unique(step.invalidatedLocationIds)
        || (index && course.compatibility[index - 1].toRevision !== step.fromRevision)) {
        invalid("Historial de compatibilidad inválido.");
      }
      revisions.add(step.fromRevision);
    }
    if (course.compatibility.length
      && course.compatibility.at(-1).toRevision !== course.edition.revision) invalid("Historial incompleto.");
  }
  const seen = new Set();
  for (const progress of state.progress) {
    const user = users.get(progress.userId);
    const course = courses.get(progress.courseId);
    const allowed = new Set((materialized.get(progress.courseId)?.locations ?? [])
      .filter((location) => !["base", "debug"].includes(location.kind)).map(({ id }) => id));
    if (!user || user.role !== "student" || user.courseId !== progress.courseId
      || seen.has(progress.userId) || !course || progress.revision !== course.edition.revision
      || !Array.isArray(progress.completedLocations) || !unique(progress.completedLocations)
      || progress.completedLocations.some((id) => !allowed.has(id))) invalid("Avance inválido.");
    seen.add(progress.userId);
  }
  if (state.users.some((user) => user.role === "student" && !seen.has(user.id))) invalid("Cuenta sin avance.");
  return state;
}

export function encodeBackup(state) {
  const payload = JSON.stringify(state);
  const bytes = `${JSON.stringify({ kind: "orbit-server-backup", schemaVersion: 1,
    digest: createHash("sha256").update(payload).digest("hex"), state })}\n`;
  if (Buffer.byteLength(bytes) > MAX_STATE_BYTES) invalid("El archivo supera el límite de 64 MiB.");
  return bytes;
}

export async function decodeBackup(bytes) {
  if (Buffer.byteLength(bytes) > MAX_STATE_BYTES) invalid("El archivo supera el límite de 64 MiB.");
  let envelope;
  try { envelope = JSON.parse(bytes); } catch { invalid("El archivo no contiene JSON válido."); }
  if (envelope?.kind !== "orbit-server-backup" || envelope.schemaVersion !== 1 || !record(envelope.state)
    || envelope.digest !== createHash("sha256").update(JSON.stringify(envelope.state)).digest("hex")) {
    invalid("La copia no coincide con su digest.");
  }
  await validateServerState(envelope.state);
  return envelope.state;
}

async function readVerifiedBackup(path) {
  const handle = await open(path, "r");
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > MAX_STATE_BYTES) invalid("Se requiere un archivo de estado de hasta 64 MiB.");
    return await decodeBackup(await handle.readFile("utf8"));
  } finally { await handle.close(); }
}

async function syncDirectory(path) {
  if (process.platform === "win32") return;
  const handle = await open(path, "r");
  try { await handle.sync(); } finally { await handle.close(); }
}

export async function atomicWrite(path, bytes) {
  const temp = `${path}.${randomUUID()}.tmp`;
  let handle;
  try {
    handle = await open(temp, "wx", 0o600);
    await handle.writeFile(bytes, "utf8");
    await handle.sync();
    await handle.close();
    handle = null;
    await rename(temp, path);
    await syncDirectory(dirname(path));
  } finally {
    await handle?.close();
    await unlink(temp).catch((error) => { if (error.code !== "ENOENT") throw error; });
  }
}

export async function acquireDataLock(directory) {
  const target = resolve(directory);
  await mkdir(target, { recursive: true, mode: 0o700 });
  if (!(await lstat(target)).isDirectory() || (await lstat(target)).isSymbolicLink()) {
    throw apiError(400, "invalid-data-directory", "Los datos requieren un directorio real.");
  }
  const root = await realpath(target);
  const path = join(root, "server.lock");
  const token = randomUUID();
  let handle;
  try { handle = await open(path, "wx", 0o600); }
  catch (error) {
    if (error.code === "EEXIST") throw apiError(409, "store-locked", "El directorio está bloqueado. Detén su servidor antes de continuar; un lock interrumpido requiere comprobar su propietario.");
    throw error;
  }
  try {
    await handle.writeFile(JSON.stringify({ pid: process.pid, hostname: hostname(), token,
      createdAt: new Date().toISOString() }));
    await handle.sync();
  } finally { await handle.close(); }
  return { root, async release() {
    const owner = JSON.parse(await readFile(path, "utf8"));
    if (owner.token !== token) throw new Error("La identidad del lock cambió; no se retira.");
    await unlink(path);
  } };
}

async function readLock(directory) {
  const root = await realpath(resolve(directory));
  const path = join(root, "server.lock");
  let info;
  try { info = await lstat(path); }
  catch (error) { if (error.code === "ENOENT") return { root, path, owner: null }; throw error; }
  if (!info.isFile() || info.isSymbolicLink() || info.size > 4096) {
    throw apiError(409, "ambiguous-lock", "El lock no es un archivo de propietario válido. No se modifica.");
  }
  const bytes = await readFile(path, "utf8");
  let owner;
  try { owner = JSON.parse(bytes); } catch { /* Rejected below; never remove an incomplete lock. */ }
  if (!record(owner) || !Number.isSafeInteger(owner.pid) || owner.pid <= 0
    || typeof owner.hostname !== "string" || !UUID.test(owner.token)
    || typeof owner.createdAt !== "string" || !Number.isFinite(Date.parse(owner.createdAt))) {
    throw apiError(409, "ambiguous-lock", "El propietario del lock es ambiguo. No se modifica.");
  }
  return { root, path, owner, bytes, info };
}

function ownerStatus(owner) {
  if (!owner) return "absent";
  if (owner.hostname !== hostname()) return "foreign-host";
  try { process.kill(owner.pid, 0); return "live"; }
  catch (error) { return error.code === "ESRCH" ? "stale" : "ambiguous"; }
}

export async function diagnoseDataLock(directory) {
  const { root, owner } = await readLock(directory);
  return { directory: root, status: ownerStatus(owner), owner };
}

export async function recoverDataLock(directory, token) {
  if (!UUID.test(token)) throw apiError(400, "invalid-lock-token", "Indica el token exacto mostrado por diagnose-lock.");
  const before = await readLock(directory);
  if (!before.owner || before.owner.token !== token) throw apiError(409, "lock-token-mismatch", "La identidad del lock no coincide. No se modifica.");
  if (ownerStatus(before.owner) !== "stale") {
    throw apiError(409, "lock-not-stale", "Solo se recupera un lock del mismo equipo cuyo PID ya no existe. No se detiene ningún proceso.");
  }
  // Recheck both owner and file identity immediately before removing the stale lock.
  const current = await readLock(directory);
  if (current.bytes !== before.bytes || current.info?.ino !== before.info.ino
    || current.info?.birthtimeMs !== before.info.birthtimeMs || ownerStatus(current.owner) !== "stale") {
    throw apiError(409, "lock-token-mismatch", "El lock cambió durante la comprobación. No se modifica.");
  }
  await unlink(current.path);
  await syncDirectory(current.root);
  return { recovered: true, token };
}

export class ServerStore {
  constructor(lock, state, write) { this.lock = lock; this.state = state; this.write = write; this.queue = Promise.resolve(); this.closed = false; this.failed = false; }
  static async open(directory, { initialState, write = atomicWrite } = {}) {
    const lock = await acquireDataLock(directory);
    try {
      const path = join(lock.root, "state.json");
      let state;
      if (initialState) {
        try { await lstat(path); throw apiError(409, "already-initialized", "El directorio ya contiene un servidor."); }
        catch (error) { if (error.code !== "ENOENT") throw error; }
        await validateServerState(initialState);
        await write(path, encodeBackup(initialState));
        state = structuredClone(initialState);
      } else state = await readVerifiedBackup(path);
      return new ServerStore(lock, state, write);
    } catch (error) { await lock.release(); throw error; }
  }
  assertAvailable() {
    if (this.closed) throw apiError(503, "store-unavailable", "El almacenamiento está cerrado.");
    if (this.failed) throw apiError(503, "store-unavailable", "Falló una escritura. Detén el servidor y vuelve a abrirlo para verificar el estado en disco.");
  }
  snapshot() { this.assertAvailable(); return structuredClone(this.state); }
  transact(operation, { purgeHistory = false } = {}) {
    const result = this.queue.then(async () => {
      this.assertAvailable();
      const draft = this.snapshot();
      const value = await operation(draft);
      draft.updatedAt = new Date().toISOString();
      await validateServerState(draft);
      // Bound the exact serialized envelope before touching either committed file.
      const nextBytes = encodeBackup(draft);
      const previousBytes = encodeBackup(this.state);
      const previous = join(this.lock.root, "previous.json");
      try {
        if (purgeHistory) {
          await unlink(previous).catch((error) => { if (error.code !== "ENOENT") throw error; });
          await syncDirectory(this.lock.root);
        } else await this.write(previous, previousBytes);
        await this.write(join(this.lock.root, "state.json"), nextBytes);
      } catch {
        // An fsync error may follow a successful rename. Never keep serving stale memory.
        this.failed = true;
        this.assertAvailable();
      }
      this.state = draft;
      return value;
    });
    this.queue = result.catch(() => {});
    return result;
  }
  async backup(destination) {
    await this.queue;
    this.assertAvailable();
    const target = resolve(destination);
    if (target === join(this.lock.root, "state.json") || target === join(this.lock.root, "server.lock")
      || target === join(this.lock.root, "previous.json")) throw apiError(400, "invalid-backup-path", "La copia debe tener una ruta propia.");
    const handle = await open(target, "wx", 0o600);
    try { await handle.writeFile(encodeBackup(this.state)); await handle.sync(); }
    finally { await handle.close(); }
  }
  async close() { await this.queue; if (!this.closed) { this.closed = true; await this.lock.release(); } }
}

export async function restoreServerBackup(directory, source) {
  const lock = await acquireDataLock(directory);
  try {
    const sourcePath = await realpath(source);
    const previousPath = join(lock.root, "previous.json");
    if (relative(previousPath, sourcePath) === "") {
      throw apiError(400, "invalid-backup-path", "Restaura esa copia interna en un directorio vacío o cópiala primero a otro archivo privado.");
    }
    const recovered = await readVerifiedBackup(sourcePath);
    recovered.epoch = randomUUID();
    recovered.updatedAt = new Date().toISOString();
    const nextBytes = encodeBackup(recovered);
    const statePath = join(lock.root, "state.json");
    let previous;
    try { previous = await readVerifiedBackup(statePath); }
    catch (error) {
      if (error.code !== "ENOENT") throw apiError(400, "invalid-restore-target", "El estado de destino no se pudo verificar. Restaura la copia en un directorio vacío y conserva el anterior.");
      if ((await readdir(lock.root)).some((name) => name !== "server.lock")) {
        throw apiError(400, "invalid-restore-target", "El destino necesita un estado válido o un directorio vacío.");
      }
    }
    if (previous) await atomicWrite(previousPath, encodeBackup(previous));
    await atomicWrite(statePath, nextBytes);
    return { replaced: Boolean(previous) };
  } finally { await lock.release(); }
}

export function createInitialServerState(admin) {
  return { kind: "orbit-server-state", schemaVersion: 1, serverId: randomUUID(), epoch: randomUUID(),
    users: [{ id: randomUUID(), alias: admin.alias, role: "admin", courseId: null,
      generation: randomUUID(), sessionVersion: 1, password: admin.password }],
    courses: [], progress: [], updatedAt: new Date().toISOString() };
}
