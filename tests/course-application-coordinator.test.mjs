import assert from "node:assert/strict";
import test from "node:test";

import {
  CourseApplicationCoordinator,
  CourseApplicationCoordinatorError,
} from "../src/editor/course-application-coordinator.js";
import { createEditorDocument } from "../src/editor/editor-document.js";
import {
  courseApplicationJournalKey,
  progressStorageDescriptors,
} from "../src/core/course-application.js";
import {
  courseEditionStorageKey,
  createCourseEdition,
} from "../src/core/course-edition.js";

class BrowserStorage {
  constructor(entries = []) {
    this.values = new Map(entries);
  }

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

const lockManager = {
  request(_name, _options, operation) {
    return operation({ mode: "exclusive" });
  },
};

async function edition(document = createEditorDocument(), options = {}) {
  return createCourseEdition(document, {
    appliedAt: "2026-08-30T00:00:00.000Z",
    acceptsUnversionedProgress: true,
    ...options,
  });
}

function pendingFor(previous, target) {
  return {
    status: "awaiting-browser",
    rollbackToken: "rollback-token",
    previousRevision: previous.revision,
    targetRevision: target.revision,
    createdAt: "2026-08-30T00:01:00.000Z",
    edition: structuredClone(target),
  };
}

test("aplicar exige plan vigente, instala navegador y finaliza el helper", async () => {
  const current = await edition();
  const candidate = createEditorDocument();
  candidate.areas.find((area) => area.id === "electrostatics").appearance.paletteId = "polar";
  const calls = [];
  const authorClient = {
    async connect() {
      calls.push("connect");
      return { courseId: "electromagnetism-applied", pending: null };
    },
    async apply({ document, expectedPreviousRevision }) {
      calls.push(["apply", expectedPreviousRevision]);
      return {
        rollbackToken: "rollback-token",
        edition: await edition(document, {
          previousRevision: expectedPreviousRevision,
          acceptsUnversionedProgress: false,
          appliedAt: "2026-08-31T00:00:00.000Z",
        }),
        check: { code: 0 },
      };
    },
    async finalize(token) {
      calls.push(["finalize", token]);
      return { ok: true };
    },
    async rollback(token) {
      calls.push(["rollback", token]);
      return { ok: true };
    },
  };
  const storage = new BrowserStorage();
  const coordinator = new CourseApplicationCoordinator({
    currentEdition: current,
    authorClient,
    storage,
    lockManager,
  });

  await assert.rejects(
    coordinator.apply(candidate),
    (error) => error instanceof CourseApplicationCoordinatorError
      && error.code === "application-plan-required",
  );
  const plan = await coordinator.validate(candidate, {
    appliedAt: "2026-08-31T00:00:00.000Z",
  });
  const result = await coordinator.apply(candidate);

  assert.equal(result.edition.revision, plan.targetRevision);
  assert.equal(result.repository.checkPassed, true);
  assert.equal(
    JSON.parse(storage.getItem(courseEditionStorageKey())).revision,
    plan.targetRevision,
  );
  assert.deepEqual(calls, [
    "connect",
    ["apply", current.revision],
    ["finalize", "rollback-token"],
  ]);
  assert.equal(coordinator.getSnapshot().plan, null);
});

test("un cambio posterior a validar invalida el plan antes de llamar al helper", async () => {
  const current = await edition();
  const candidate = createEditorDocument();
  candidate.areas.find((area) => area.id === "electrostatics").appearance.paletteId = "polar";
  let connected = false;
  const coordinator = new CourseApplicationCoordinator({
    currentEdition: current,
    storage: new BrowserStorage(),
    lockManager,
    authorClient: {
      async connect() {
        connected = true;
        return { courseId: "electromagnetism-applied", pending: null };
      },
    },
  });
  await coordinator.validate(candidate);
  candidate.areas.find((area) => area.id === "electrostatics").appearance.contourId = "double";

  await assert.rejects(
    coordinator.apply(candidate),
    (error) => error instanceof CourseApplicationCoordinatorError
      && error.code === "application-plan-stale",
  );
  assert.equal(connected, false);
  assert.equal(coordinator.getSnapshot().plan, null);
});

test("un plan sin diferencias termina como no-op sin contactar ni bloquear el helper", async () => {
  const current = await edition();
  let helperCalls = 0;
  let lockCalls = 0;
  const coordinator = new CourseApplicationCoordinator({
    currentEdition: current,
    storage: new BrowserStorage(),
    lockManager: {
      request() {
        lockCalls += 1;
        throw new Error("no debe adquirir lock");
      },
    },
    authorClient: {
      async connect() {
        helperCalls += 1;
        return { courseId: "electromagnetism-applied", pending: null };
      },
    },
  });
  const candidate = createEditorDocument();
  const plan = await coordinator.validate(candidate);
  assert.equal(plan.changed, false);

  const result = await coordinator.apply(candidate);
  assert.equal(result.changed, false);
  assert.equal(helperCalls, 0);
  assert.equal(lockCalls, 0);
});

test("una sesión de otro curso falla cerrada en apply, inspección y recuperación", async () => {
  const current = await edition();
  const candidate = createEditorDocument();
  candidate.areas.find((area) => area.id === "electrostatics").appearance.paletteId = "polar";
  let mutations = 0;
  const coordinator = new CourseApplicationCoordinator({
    currentEdition: current,
    storage: new BrowserStorage(),
    lockManager,
    authorClient: {
      async connect() {
        return { courseId: "another-course", pending: null };
      },
      async apply() {
        mutations += 1;
      },
      async finalize() {
        mutations += 1;
      },
      async rollback() {
        mutations += 1;
      },
    },
  });
  await coordinator.validate(candidate);
  for (const operation of [
    () => coordinator.apply(candidate),
    () => coordinator.inspectPending(),
    () => coordinator.recoverPending(),
  ]) {
    await assert.rejects(
      operation(),
      (error) => error instanceof CourseApplicationCoordinatorError
        && error.code === "wrong-author-course",
    );
  }
  assert.equal(mutations, 0);
});

test("un rollback local no verificable conserva recovery-required aunque la fuente revierta", async () => {
  const current = await edition();
  const candidate = createEditorDocument();
  candidate.areas.find((area) => area.id === "electrostatics").appearance.paletteId = "polar";
  const editionKey = courseEditionStorageKey();
  class AmbiguousStorage extends BrowserStorage {
    setItem(key, value) {
      if (key === editionKey) throw new Error("fallo al escribir edición");
      super.setItem(key, value);
    }

    removeItem(key) {
      if (key === editionKey) throw new Error("fallo al restaurar edición");
      super.removeItem(key);
    }
  }
  let repositoryRollbacks = 0;
  const authorClient = {
    async connect() {
      return { courseId: "electromagnetism-applied", pending: null };
    },
    async apply({ document, expectedPreviousRevision }) {
      return {
        rollbackToken: "rollback-token",
        edition: await edition(document, {
          previousRevision: expectedPreviousRevision,
          acceptsUnversionedProgress: false,
        }),
        check: { code: 0 },
      };
    },
    async rollback() {
      repositoryRollbacks += 1;
    },
  };
  const storage = new AmbiguousStorage();
  const coordinator = new CourseApplicationCoordinator({
    currentEdition: current,
    authorClient,
    storage,
    lockManager,
  });
  await coordinator.validate(candidate);

  await assert.rejects(
    coordinator.apply(candidate),
    (error) => error instanceof CourseApplicationCoordinatorError
      && error.code === "course-application-recovery-required",
  );
  assert.equal(repositoryRollbacks, 1);
  assert.equal(coordinator.getSnapshot().reloadRequired, true);
});

test("pending con la revisión objetivo en el navegador solo finaliza", async () => {
  const current = await edition();
  const document = createEditorDocument();
  document.areas.find((area) => area.id === "electrostatics").appearance.contourId = "double";
  const target = await edition(document, {
    previousRevision: current.revision,
    acceptsUnversionedProgress: false,
  });
  const storage = new BrowserStorage([
    [courseEditionStorageKey(), JSON.stringify(target)],
  ]);
  const calls = [];
  const pending = pendingFor(current, target);
  const coordinator = new CourseApplicationCoordinator({
    currentEdition: current,
    storage,
    lockManager,
    authorClient: {
      async connect() {
        return { courseId: "electromagnetism-applied", pending };
      },
      async finalize(token) {
        calls.push(["finalize", token]);
      },
      async rollback(token) {
        calls.push(["rollback", token]);
      },
    },
  });

  const inspected = await coordinator.inspectPending();
  assert.equal(inspected.action, "finalize");
  const result = await coordinator.recoverPending();
  assert.equal(result.action, "finalized");
  assert.equal(result.reloadRequired, false);
  assert.deepEqual(calls, [["finalize", "rollback-token"]]);
  assert.equal(coordinator.getSnapshot().currentEdition.revision, target.revision);
});

test("pending sin la revisión objetivo restaura fuente y exige recargar", async () => {
  const current = await edition();
  const document = createEditorDocument();
  document.areas.find((area) => area.id === "electrostatics").appearance.contourId = "double";
  const target = await edition(document, {
    previousRevision: current.revision,
    acceptsUnversionedProgress: false,
  });
  const calls = [];
  const pending = pendingFor(current, target);
  const coordinator = new CourseApplicationCoordinator({
    currentEdition: current,
    storage: new BrowserStorage(),
    lockManager,
    authorClient: {
      async connect() {
        return { courseId: "electromagnetism-applied", pending };
      },
      async finalize(token) {
        calls.push(["finalize", token]);
      },
      async rollback(token) {
        calls.push(["rollback", token]);
      },
    },
  });

  assert.equal((await coordinator.inspectPending()).action, "rollback");
  const result = await coordinator.recoverPending();
  assert.equal(result.action, "rolled-back");
  assert.equal(result.reloadRequired, true);
  assert.deepEqual(calls, [["rollback", "rollback-token"]]);
  await assert.rejects(
    coordinator.validate(createEditorDocument()),
    (error) => error.code === "editor-reload-required",
  );
});

test("pending con una tercera revisión queda bloqueado sin finalize ni rollback", async () => {
  const current = await edition();
  const targetDocument = createEditorDocument();
  targetDocument.areas.find((area) => area.id === "electrostatics").appearance.contourId = "double";
  const target = await edition(targetDocument, { previousRevision: current.revision });
  const otherDocument = createEditorDocument();
  otherDocument.areas.find((area) => area.id === "electrostatics").appearance.paletteId = "polar";
  const other = await edition(otherDocument, { previousRevision: current.revision });
  const storage = new BrowserStorage([
    [courseEditionStorageKey(), JSON.stringify(other)],
  ]);
  let mutations = 0;
  const coordinator = new CourseApplicationCoordinator({
    currentEdition: current,
    storage,
    lockManager,
    authorClient: {
      async connect() {
        return {
          courseId: "electromagnetism-applied",
          pending: pendingFor(current, target),
        };
      },
      async finalize() {
        mutations += 1;
      },
      async rollback() {
        mutations += 1;
      },
    },
  });

  await assert.rejects(
    coordinator.recoverPending(),
    (error) => error instanceof CourseApplicationCoordinatorError
      && error.code === "pending-browser-state-ambiguous",
  );
  assert.equal(mutations, 0);
});

test("pending objetivo no finaliza si reaparece progreso o diverge el envelope", async (context) => {
  const current = await edition();
  const document = createEditorDocument();
  document.areas.find((area) => area.id === "electrostatics").appearance.contourId = "double";
  const target = await edition(document, {
    previousRevision: current.revision,
    acceptsUnversionedProgress: false,
  });
  const progressKey = progressStorageDescriptors()[0].currentKey;
  const variants = [
    {
      label: "progreso resucitado",
      storedEdition: target,
      extraEntries: [[progressKey, JSON.stringify({ schemaVersion: 4 })]],
    },
    {
      label: "envelope alterado",
      storedEdition: { ...target, acceptsUnversionedProgress: true },
      extraEntries: [],
    },
  ];

  for (const variant of variants) {
    await context.test(variant.label, async () => {
      const storage = new BrowserStorage([
        [courseEditionStorageKey(), JSON.stringify(variant.storedEdition)],
        ...variant.extraEntries,
      ]);
      let mutations = 0;
      const coordinator = new CourseApplicationCoordinator({
        currentEdition: current,
        storage,
        lockManager,
        authorClient: {
          async connect() {
            return {
              courseId: "electromagnetism-applied",
              pending: pendingFor(current, target),
            };
          },
          async finalize() {
            mutations += 1;
          },
          async rollback() {
            mutations += 1;
          },
        },
      });
      await assert.rejects(
        coordinator.recoverPending(),
        (error) => error instanceof CourseApplicationCoordinatorError
          && error.code === "pending-browser-state-ambiguous",
      );
      assert.equal(mutations, 0);
      assert.equal(storage.getItem(courseEditionStorageKey()), JSON.stringify(variant.storedEdition));
    });
  }
});

test("un journal de navegador fuera de alcance exige recuperación tras restaurar fuente", async () => {
  const current = await edition();
  const candidate = createEditorDocument();
  candidate.areas.find((area) => area.id === "electrostatics").appearance.paletteId = "polar";
  const journalKey = courseApplicationJournalKey();
  const backupKey = "orbit-course-apply-backup:v1:electromagnetism-applied:tampered";
  const transactionId = "electromagnetism-applied:tampered";
  const storage = new BrowserStorage([
    [backupKey, JSON.stringify({
      kind: "orbit-storage-backup",
      schemaVersion: 1,
      id: transactionId,
      entries: [{ key: "unrelated", present: true, value: "keep" }],
    })],
    [journalKey, JSON.stringify({
      kind: "orbit-storage-transaction",
      schemaVersion: 1,
      id: transactionId,
      status: "prepared",
      backupKey,
      after: [{ key: "unrelated", present: false, value: null }],
    })],
    ["unrelated", "keep"],
  ]);
  let rollbacks = 0;
  const coordinator = new CourseApplicationCoordinator({
    currentEdition: current,
    storage,
    lockManager,
    authorClient: {
      async connect() {
        return { courseId: "electromagnetism-applied", pending: null };
      },
      async apply({ document: editorDocument, expectedPreviousRevision }) {
        return {
          rollbackToken: "rollback-token",
          edition: await edition(editorDocument, {
            previousRevision: expectedPreviousRevision,
            acceptsUnversionedProgress: false,
          }),
          check: { code: 0 },
        };
      },
      async rollback() {
        rollbacks += 1;
      },
    },
  });
  await coordinator.validate(candidate);
  await assert.rejects(
    coordinator.apply(candidate),
    (error) => error instanceof CourseApplicationCoordinatorError
      && error.code === "course-application-recovery-required",
  );
  assert.equal(rollbacks, 1);
  assert.equal(coordinator.getSnapshot().reloadRequired, true);
  assert.equal(storage.getItem("unrelated"), "keep");
  assert.notEqual(storage.getItem(journalKey), null);
});
