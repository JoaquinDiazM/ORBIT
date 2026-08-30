import assert from "node:assert/strict";
import test from "node:test";

import {
  assertCourseRuntimeEntryAvailable,
  CourseLockError,
  courseRuntimeLockName,
  holdCourseRuntimeLock,
  prepareCourseRuntimeLock,
  supportsCourseLocks,
  withExclusiveCourseLock,
} from "../src/core/course-lock.js";
import {
  courseApplicationBackupKey,
  courseApplicationJournalKey,
  inspectCourseApplicationTransaction,
  recoverCourseApplication,
} from "../src/core/course-application.js";
import { StorageTransactionError } from "../src/core/storage.js";

class BrowserStorage {
  constructor(entries = []) {
    this.values = new Map(entries);
    this.mutations = [];
  }

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.mutations.push(["set", key, String(value)]);
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.mutations.push(["remove", key]);
    this.values.delete(key);
  }
}

function immediateLockManager() {
  const requests = [];
  return {
    requests,
    request(name, options, operation) {
      requests.push([name, options]);
      return operation({ name, mode: options.mode });
    },
  };
}

function crashedBrowserTransaction(status) {
  const courseId = "test";
  const editionKey = "orbit-course-edition:v1:test";
  const progressKey = "orbit-progress:v4:student";
  const journalKey = courseApplicationJournalKey(courseId);
  const previousRevision = `sha256:${"a".repeat(64)}`;
  const targetRevision = `sha256:${"b".repeat(64)}`;
  const backupKey = courseApplicationBackupKey(courseId, targetRevision);
  const createdAt = "2026-08-30T12:00:00.000Z";
  const editionBefore = JSON.stringify({ courseId, revision: previousRevision });
  const editionAfter = JSON.stringify({ courseId, revision: targetRevision });
  const descriptors = [{ allKeys: [progressKey] }];
  const storage = new BrowserStorage([
    [backupKey, JSON.stringify({
      kind: "orbit-storage-backup",
      schemaVersion: 1,
      id: `${courseId}:${targetRevision}`,
      createdAt,
      metadata: {
        courseId,
        previousRevision,
        targetRevision,
        resetPolicy: "full-reset-v1",
      },
      entries: [
        { key: editionKey, present: true, value: editionBefore },
        { key: progressKey, present: true, value: "progress-before" },
      ],
    })],
    [journalKey, JSON.stringify({
      kind: "orbit-storage-transaction",
      schemaVersion: 1,
      id: `${courseId}:${targetRevision}`,
      status,
      createdAt,
      backupKey,
      after: [
        { key: editionKey, present: true, value: editionAfter },
        { key: progressKey, present: false, value: null },
      ],
    })],
    [editionKey, editionAfter],
  ]);
  return {
    courseId,
    descriptors,
    editionAfter,
    editionBefore,
    editionKey,
    journalKey,
    progressKey,
    storage,
  };
}

test("el nombre del bloqueo queda acotado al curso", () => {
  assert.equal(
    courseRuntimeLockName("electromagnetism-applied"),
    "orbit-course-runtime:electromagnetism-applied",
  );
  assert.throws(() => courseRuntimeLockName("../otro"), TypeError);
});

test("ORBIT mantiene un bloqueo compartido hasta liberar la sesión", async () => {
  let callback;
  const manager = {
    request(_name, options, operation) {
      assert.deepEqual(options, { mode: "shared" });
      callback = operation;
      return operation({ name: "orbit-course-runtime:test", mode: "shared" });
    },
  };
  const handle = holdCourseRuntimeLock({ courseId: "test", lockManager: manager });
  assert.equal(await handle.acquired, true);
  let finished = false;
  handle.finished.then(() => {
    finished = true;
  });
  await Promise.resolve();
  assert.equal(finished, false);
  assert.equal(typeof callback, "function");
  handle.release();
  await handle.finished;
  assert.equal(finished, true);
});

test("la aplicación exclusiva falla cerrada sin Web Locks o con otra pestaña", async () => {
  assert.equal(supportsCourseLocks(null), false);
  await assert.rejects(
    withExclusiveCourseLock(() => true, { courseId: "test", lockManager: null }),
    (error) => error instanceof CourseLockError && error.code === "course-locks-unavailable",
  );
  const busyManager = {
    request(_name, options, operation) {
      assert.deepEqual(options, { mode: "exclusive", ifAvailable: true });
      return operation(null);
    },
  };
  await assert.rejects(
    withExclusiveCourseLock(() => true, { courseId: "test", lockManager: busyManager }),
    (error) => error instanceof CourseLockError && error.code === "course-in-use",
  );
});

test("la aplicación exclusiva ejecuta una sola operación bajo el lock", async () => {
  let calls = 0;
  const manager = {
    request(_name, _options, operation) {
      return operation({ name: "orbit-course-runtime:test", mode: "exclusive" });
    },
  };
  const result = await withExclusiveCourseLock(
    () => {
      calls += 1;
      return "aplicado";
    },
    { courseId: "test", lockManager: manager },
  );
  assert.equal(result, "aplicado");
  assert.equal(calls, 1);
});

test("un crash prepared se revierte bajo exclusive y no recrea progreso antes de recargar", async () => {
  const crash = crashedBrowserTransaction("prepared");
  const lockManager = immediateLockManager();
  const session = await prepareCourseRuntimeLock({
    courseId: crash.courseId,
    lockManager,
    inspectTransaction: () => inspectCourseApplicationTransaction({
      courseId: crash.courseId,
      storage: crash.storage,
      descriptors: crash.descriptors,
    }),
    recoverTransaction: () => recoverCourseApplication({
      courseId: crash.courseId,
      storage: crash.storage,
      descriptors: crash.descriptors,
    }),
  });

  if (!session.reloadRequired) {
    crash.storage.setItem(crash.progressKey, "runtime-created");
  }
  assert.equal(session.recovery.action, "rolled-back");
  assert.equal(session.reloadRequired, true);
  assert.equal(crash.storage.getItem(crash.editionKey), crash.editionBefore);
  assert.equal(crash.storage.getItem(crash.progressKey), "progress-before");
  assert.equal(
    crash.storage.mutations.some((entry) => entry[2] === "runtime-created"),
    false,
  );
  assert.deepEqual(
    lockManager.requests.map(([, options]) => options.mode),
    ["shared", "exclusive"],
  );
});

test("un crash committed se finaliza antes de permitir que el runtime cree progreso", async () => {
  const crash = crashedBrowserTransaction("committed");
  const lockManager = immediateLockManager();
  const session = await prepareCourseRuntimeLock({
    courseId: crash.courseId,
    lockManager,
    inspectTransaction: () => inspectCourseApplicationTransaction({
      courseId: crash.courseId,
      storage: crash.storage,
      descriptors: crash.descriptors,
    }),
    recoverTransaction: () => recoverCourseApplication({
      courseId: crash.courseId,
      storage: crash.storage,
      descriptors: crash.descriptors,
    }),
  });

  assert.equal(session.recovery.action, "finalized");
  assert.equal(session.reloadRequired, false);
  assert.equal(crash.storage.getItem(crash.journalKey), null);
  crash.storage.setItem(crash.progressKey, "runtime-created");
  const journalRemoval = crash.storage.mutations.findIndex(
    ([operation, key]) => operation === "remove" && key === crash.journalKey,
  );
  const progressCreation = crash.storage.mutations.findIndex(
    ([operation, key, value]) =>
      operation === "set" && key === crash.progressKey && value === "runtime-created",
  );
  assert.ok(journalRemoval >= 0 && journalRemoval < progressCreation);
  session.runtimeLock.release();
  await session.runtimeLock.finished;
});

test("un segundo Editor no recupera el journal mientras otra pestaña aplica bajo exclusive", async () => {
  const crash = crashedBrowserTransaction("prepared");
  const journalBefore = crash.storage.getItem(crash.journalKey);
  const editionBefore = crash.storage.getItem(crash.editionKey);
  let recoveryCalls = 0;
  const applyingManager = {
    request(_name, options, operation) {
      assert.deepEqual(options, { mode: "exclusive", ifAvailable: true });
      return operation(null);
    },
  };

  await assert.rejects(
    withExclusiveCourseLock(
      () => {
        recoveryCalls += 1;
        return recoverCourseApplication({
          courseId: crash.courseId,
          storage: crash.storage,
          descriptors: crash.descriptors,
        });
      },
      { courseId: crash.courseId, lockManager: applyingManager },
    ),
    (error) => error instanceof CourseLockError && error.code === "course-in-use",
  );
  assert.equal(recoveryCalls, 0);
  assert.equal(crash.storage.getItem(crash.journalKey), journalBefore);
  assert.equal(crash.storage.getItem(crash.editionKey), editionBefore);
  assert.equal(crash.storage.getItem(crash.progressKey), null);
});

test("un journal que incorpora una clave ajena falla cerrado sin tocarla", () => {
  const crash = crashedBrowserTransaction("prepared");
  const journal = JSON.parse(crash.storage.getItem(crash.journalKey));
  const backup = JSON.parse(crash.storage.getItem(journal.backupKey));
  journal.after.push({ key: "unrelated", present: false, value: null });
  backup.entries.push({ key: "unrelated", present: true, value: "keep" });
  crash.storage.setItem(crash.journalKey, JSON.stringify(journal));
  crash.storage.setItem(journal.backupKey, JSON.stringify(backup));
  crash.storage.setItem("unrelated", "keep");
  const mutationCount = crash.storage.mutations.length;

  const inspection = inspectCourseApplicationTransaction({
    courseId: crash.courseId,
    storage: crash.storage,
    descriptors: crash.descriptors,
  });
  assert.equal(inspection.valid, false);
  assert.throws(
    () => recoverCourseApplication({
      courseId: crash.courseId,
      storage: crash.storage,
      descriptors: crash.descriptors,
    }),
    (error) => error instanceof StorageTransactionError
      && error.code === "invalid-transaction-scope",
  );
  assert.equal(crash.storage.getItem("unrelated"), "keep");
  assert.equal(crash.storage.getItem(crash.journalKey), JSON.stringify(journal));
  assert.equal(crash.storage.mutations.length, mutationCount);
});

test("el sondeo de entrada falla cerrado ante el 503 transaccional", async () => {
  await assert.rejects(
    assertCourseRuntimeEntryAvailable({
      fetchImpl: async () => ({
        status: 503,
        headers: { get: (name) => name === "x-orbit-runtime-status"
          ? "repository-transaction-pending"
          : null },
      }),
    }),
    (error) => error instanceof CourseLockError
      && error.code === "repository-transaction-pending",
  );
});

test("el sondeo de entrada no crea progreso durante mantenimiento local", async () => {
  await assert.rejects(
    assertCourseRuntimeEntryAvailable({
      fetchImpl: async () => ({
        status: 503,
        headers: { get: (name) => name === "x-orbit-runtime-status"
          ? "maintenance"
          : null },
      }),
    }),
    (error) => error instanceof CourseLockError
      && error.code === "local-maintenance",
  );
});
