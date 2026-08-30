import { APP_CONFIG } from "../config.js";

export function courseRuntimeLockName(courseId = APP_CONFIG.activeCourseId) {
  const normalized = String(courseId ?? "").trim();
  if (!normalized || !/^[a-z0-9-]+$/.test(normalized)) {
    throw new TypeError("El bloqueo de curso requiere un courseId estable en kebab-case.");
  }
  return `orbit-course-runtime:${normalized}`;
}

export function supportsCourseLocks(lockManager = globalThis.navigator?.locks) {
  return Boolean(lockManager && typeof lockManager.request === "function");
}

export class CourseLockError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CourseLockError";
    this.code = code;
  }
}

export function holdCourseRuntimeLock({
  courseId = APP_CONFIG.activeCourseId,
  lockManager = globalThis.navigator?.locks,
} = {}) {
  if (!supportsCourseLocks(lockManager)) {
    return Object.freeze({
      supported: false,
      acquired: Promise.resolve(false),
      release() {},
      finished: Promise.resolve(),
    });
  }

  let releaseLock;
  let resolveAcquired;
  let acquiredSettled = false;
  const releaseSignal = new Promise((resolve) => {
    releaseLock = resolve;
  });
  const acquired = new Promise((resolve) => {
    resolveAcquired = resolve;
  });
  const finished = lockManager.request(
    courseRuntimeLockName(courseId),
    { mode: "shared" },
    async (lock) => {
      acquiredSettled = true;
      resolveAcquired(Boolean(lock));
      if (!lock) return;
      await releaseSignal;
    },
  ).catch((error) => {
    if (!acquiredSettled) resolveAcquired(false);
    throw error;
  });

  let released = false;
  return Object.freeze({
    supported: true,
    acquired,
    release() {
      if (released) return;
      released = true;
      releaseLock();
    },
    finished,
  });
}

async function assertRuntimeLockAcquired(runtimeLock) {
  const acquired = await runtimeLock.acquired;
  if (runtimeLock.supported && !acquired) {
    throw new CourseLockError(
      "course-runtime-lock-failed",
      "No fue posible proteger la edición activa del curso.",
    );
  }
}

export async function prepareCourseRuntimeLock({
  courseId = APP_CONFIG.activeCourseId,
  lockManager = globalThis.navigator?.locks,
  inspectTransaction,
  recoverTransaction,
} = {}) {
  if (typeof inspectTransaction !== "function" || typeof recoverTransaction !== "function") {
    throw new TypeError("Preparar el runtime requiere inspección y recuperación transaccionales.");
  }

  let runtimeLock = holdCourseRuntimeLock({ courseId, lockManager });
  try {
    await assertRuntimeLockAcquired(runtimeLock);
    const inspection = await inspectTransaction();
    if (!inspection?.pending) {
      return {
        runtimeLock,
        recovery: { ok: true, recovered: false, action: "none" },
        reloadRequired: false,
      };
    }

    runtimeLock.release();
    await runtimeLock.finished;
    runtimeLock = null;

    if (!supportsCourseLocks(lockManager)) {
      const recovery = await recoverTransaction();
      return {
        runtimeLock: null,
        recovery,
        reloadRequired: recovery?.action === "rolled-back",
      };
    }

    let replacementLock = null;
    const recovery = await withExclusiveCourseLock(
      async () => {
        const current = await inspectTransaction();
        const result = current?.pending
          ? await recoverTransaction()
          : { ok: true, recovered: false, action: "none" };
        if (result?.action !== "rolled-back") {
          // Encolar el nuevo shared antes de soltar el exclusive evita una ventana
          // en que una aplicación pueda intercalarse entre recuperación y arranque.
          replacementLock = holdCourseRuntimeLock({ courseId, lockManager });
        }
        return result;
      },
      { courseId, lockManager },
    );

    if (recovery?.action === "rolled-back") {
      return { runtimeLock: null, recovery, reloadRequired: true };
    }
    if (!replacementLock) {
      throw new CourseLockError(
        "course-runtime-lock-failed",
        "La recuperación terminó sin restablecer el bloqueo compartido.",
      );
    }
    runtimeLock = replacementLock;
    await assertRuntimeLockAcquired(runtimeLock);
    const verified = await inspectTransaction();
    if (verified?.pending) {
      throw new CourseLockError(
        "course-transaction-still-pending",
        "La transacción local reapareció durante el arranque; ORBIT no cargará progreso.",
      );
    }
    return { runtimeLock, recovery, reloadRequired: false };
  } catch (error) {
    runtimeLock?.release();
    throw error;
  }
}

export async function assertCourseRuntimeEntryAvailable({
  fetchImpl = globalThis.fetch,
  entryUrl = "./index.html",
} = {}) {
  if (typeof fetchImpl !== "function") return;
  const response = await fetchImpl(entryUrl, { method: "HEAD", cache: "no-store" });
  if (
    response?.status === 503
    && response.headers?.get?.("x-orbit-runtime-status") === "repository-transaction-pending"
  ) {
    throw new CourseLockError(
      "repository-transaction-pending",
      "ORBIT Estudiante está bloqueado mientras el Editor recupera una aplicación pendiente. Abre editor.html y completa la recuperación antes de recargar.",
    );
  }
}

export async function withExclusiveCourseLock(
  callback,
  {
    courseId = APP_CONFIG.activeCourseId,
    lockManager = globalThis.navigator?.locks,
  } = {},
) {
  if (typeof callback !== "function") {
    throw new TypeError("La aplicación exclusiva requiere una operación.");
  }
  if (!supportsCourseLocks(lockManager)) {
    throw new CourseLockError(
      "course-locks-unavailable",
      "Este navegador no ofrece Web Locks; ORBIT no puede garantizar una aplicación segura.",
    );
  }
  return lockManager.request(
    courseRuntimeLockName(courseId),
    { mode: "exclusive", ifAvailable: true },
    async (lock) => {
      if (!lock) {
        throw new CourseLockError(
          "course-in-use",
          "Cierra las demás pestañas de ORBIT antes de aplicar la edición.",
        );
      }
      return callback(lock);
    },
  );
}
