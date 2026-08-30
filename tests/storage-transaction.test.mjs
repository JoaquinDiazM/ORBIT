import assert from "node:assert/strict";
import test from "node:test";

import {
  ProgressStorage,
  StorageTransactionError,
} from "../src/core/storage.js";

class BrowserStorage {
  constructor(entries = []) {
    this.values = new Map(entries);
    this.fail = null;
  }

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    if (this.fail?.operation === "set" && this.fail.key === key) {
      throw new Error(`fallo set ${key}`);
    }
    this.values.set(key, String(value));
  }

  removeItem(key) {
    if (this.fail?.operation === "remove" && this.fail.key === key) {
      throw new Error(`fallo remove ${key}`);
    }
    this.values.delete(key);
  }
}

function driver(browserStorage) {
  return new ProgressStorage("orbit-course-edition:v1:test", browserStorage);
}

test("la transacción recuperable respalda, reemplaza y conserva el respaldo", () => {
  const browserStorage = new BrowserStorage([
    ["orbit-progress:v4:student", "student-before"],
    ["orbit-progress:v4:teacher", "teacher-before"],
    ["unrelated", "keep"],
  ]);
  const result = driver(browserStorage).applyRecoverableTransaction({
    id: "edition-1",
    journalKey: "orbit-course-apply-transaction:v1:test",
    backupKey: "orbit-course-apply-backup:v1:test:edition-1",
    writes: {
      "orbit-course-edition:v1:test": "edition-after",
    },
    removals: [
      "orbit-progress:v4:student",
      "orbit-progress:v4:teacher",
    ],
    metadata: { courseId: "test" },
    createdAt: "2026-08-30T00:00:00.000Z",
  });

  assert.equal(result.ok, true);
  assert.equal(browserStorage.getItem("orbit-course-edition:v1:test"), "edition-after");
  assert.equal(browserStorage.getItem("orbit-progress:v4:student"), null);
  assert.equal(browserStorage.getItem("orbit-progress:v4:teacher"), null);
  assert.equal(browserStorage.getItem("unrelated"), "keep");
  assert.equal(browserStorage.getItem("orbit-course-apply-transaction:v1:test"), null);
  const backup = JSON.parse(
    browserStorage.getItem("orbit-course-apply-backup:v1:test:edition-1"),
  );
  assert.equal(backup.kind, "orbit-storage-backup");
  assert.equal(backup.id, "edition-1");
  assert.deepEqual(
    new Map(backup.entries.map((entry) => [entry.key, entry.value])),
    new Map([
      ["orbit-course-edition:v1:test", null],
      ["orbit-progress:v4:student", "student-before"],
      ["orbit-progress:v4:teacher", "teacher-before"],
    ]),
  );
});

test("un fallo al confirmar restaura exactamente el estado anterior", () => {
  const browserStorage = new BrowserStorage([
    ["orbit-course-edition:v1:test", "edition-before"],
    ["orbit-progress:v4:student", "student-before"],
  ]);
  browserStorage.fail = { operation: "set", key: "orbit-course-edition:v1:test" };

  assert.throws(
    () => driver(browserStorage).applyRecoverableTransaction({
      id: "edition-2",
      journalKey: "orbit-course-apply-transaction:v1:test",
      backupKey: "orbit-course-apply-backup:v1:test:edition-2",
      writes: { "orbit-course-edition:v1:test": "edition-after" },
      removals: ["orbit-progress:v4:student"],
    }),
    (error) =>
      error instanceof StorageTransactionError
      && error.code === "transaction-rollback-failed",
  );

  // La misma inyección impide restaurar la edición; el journal queda disponible.
  assert.equal(browserStorage.getItem("orbit-progress:v4:student"), "student-before");
  assert.notEqual(browserStorage.getItem("orbit-course-apply-transaction:v1:test"), null);
  browserStorage.fail = null;
  const recovered = driver(browserStorage).recoverTransaction({
    journalKey: "orbit-course-apply-transaction:v1:test",
  });
  assert.equal(recovered.action, "rolled-back");
  assert.equal(browserStorage.getItem("orbit-course-edition:v1:test"), "edition-before");
  assert.equal(browserStorage.getItem("orbit-progress:v4:student"), "student-before");
});

test("la recuperación revierte un journal preparado interrumpido", () => {
  const journalKey = "orbit-course-apply-transaction:v1:test";
  const backupKey = "orbit-course-apply-backup:v1:test:edition-3";
  const browserStorage = new BrowserStorage([
    [backupKey, JSON.stringify({
      kind: "orbit-storage-backup",
      schemaVersion: 1,
      id: "edition-3",
      entries: [
        { key: "course", present: true, value: "before" },
        { key: "progress", present: true, value: "progress-before" },
      ],
    })],
    [journalKey, JSON.stringify({
      kind: "orbit-storage-transaction",
      schemaVersion: 1,
      id: "edition-3",
      status: "prepared",
      backupKey,
      after: [
        { key: "course", present: true, value: "after" },
        { key: "progress", present: false, value: null },
      ],
    })],
    ["course", "after"],
  ]);

  const result = driver(browserStorage).recoverTransaction({ journalKey });

  assert.equal(result.action, "rolled-back");
  assert.equal(browserStorage.getItem("course"), "before");
  assert.equal(browserStorage.getItem("progress"), "progress-before");
  assert.equal(browserStorage.getItem(journalKey), null);
});

test("la recuperación finaliza un journal ya confirmado sin deshacerlo", () => {
  const journalKey = "orbit-course-apply-transaction:v1:test";
  const backupKey = "orbit-course-apply-backup:v1:test:edition-4";
  const after = [
    { key: "course", present: true, value: "after" },
    { key: "progress", present: false, value: null },
  ];
  const browserStorage = new BrowserStorage([
    [backupKey, JSON.stringify({
      kind: "orbit-storage-backup",
      schemaVersion: 1,
      id: "edition-4",
      entries: [
        { key: "course", present: true, value: "before" },
        { key: "progress", present: false, value: null },
      ],
    })],
    [journalKey, JSON.stringify({
      kind: "orbit-storage-transaction",
      schemaVersion: 1,
      id: "edition-4",
      status: "committed",
      backupKey,
      after,
    })],
    ["course", "after"],
  ]);

  const result = driver(browserStorage).recoverTransaction({ journalKey });

  assert.equal(result.action, "finalized");
  assert.equal(browserStorage.getItem("course"), "after");
  assert.equal(browserStorage.getItem(journalKey), null);
});
