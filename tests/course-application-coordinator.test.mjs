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

function authorSession(current, overrides = {}) {
  return { token: "s".repeat(64), courseId: current.courseId, currentRevision: current.revision, pending: null, ...overrides };
}

function checkingClient(current) {
  return {
    async check({ document, expectedPreviousRevision }) {
      const target = await edition(document);
      return {
        ok: true, kind: "orbit-editor-author-check", schemaVersion: 1,
        courseId: current.courseId, currentRevision: expectedPreviousRevision,
        targetRevision: target.revision, checkedAt: "2026-09-10T00:00:00.000Z", check: { code: 0 },
      };
    },
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

async function checkFixture() {
  const current = await edition();
  const candidate = createEditorDocument();
  candidate.areas.find((area) => area.id === "electrostatics").appearance.paletteId = "polar";
  const storage = new BrowserStorage([["progress", "preserved"]]);
  let session = authorSession(current);
  let posts = 0;
  let applies = 0;
  const successfulCheck = checkingClient(current).check;
  const client = {
    async connect() { return structuredClone(session); },
    async check(payload) { posts += 1; return successfulCheck(payload); },
    async apply() { applies += 1; throw new Error("No debe escribir fuente"); },
  };
  const coordinator = new CourseApplicationCoordinator({ currentEdition: current, authorClient: client, storage, lockManager });
  return { current, candidate, storage, client, coordinator, successfulCheck,
    session: (next) => { session = next; }, posts: () => posts, applies: () => applies };
}

test("check crea el plan sin Validar previo, conserva todos los perfiles y sondeos no repiten check", async () => {
  const fixture = await checkFixture();
  const before = [...fixture.storage.values];
  const result = await fixture.coordinator.check(fixture.candidate);
  assert.equal(result.plan.changed, true);
  assert.equal(result.repositoryCheck.targetRevision, result.plan.targetRevision);
  assert.deepEqual([...fixture.storage.values], before);
  await fixture.coordinator.inspectPending();
  await fixture.coordinator.inspectPending();
  assert.equal(fixture.posts(), 1);
  assert.deepEqual(fixture.coordinator.getSnapshot().repositoryCheck, result.repositoryCheck);
});

test("fallo de check conserva plan y diagnóstico pero bloquea Apply sin escribir", async () => {
  const fixture = await checkFixture();
  fixture.client.check = async () => { throw Object.assign(new Error("stdout: prueba de registro fallida"), { code: "repository-check-failed" }); };
  await assert.rejects(fixture.coordinator.check(fixture.candidate), (error) => error.code === "repository-check-failed" && error.message.includes("registro"));
  assert.equal(fixture.coordinator.getSnapshot().plan.changed, true);
  assert.equal(fixture.coordinator.getSnapshot().repositoryCheck, null);
  await assert.rejects(fixture.coordinator.apply(fixture.candidate), { code: "repository-check-required" });
  assert.equal(fixture.applies(), 0);
  assert.deepEqual([...fixture.storage.values], [["progress", "preserved"]]);
});

test("check rechaza éxito para otro curso, revisión o resultado incompleto", async (context) => {
  for (const variant of [
    { courseId: "otro" }, { currentRevision: "otra" }, { targetRevision: "otra" },
    { check: { code: 1 } }, { checkedAt: "ayer" }, { kind: "otra" }, { ok: false }, { schemaVersion: 2 },
  ]) {
    await context.test(JSON.stringify(variant), async () => {
      const fixture = await checkFixture();
      fixture.client.check = async (payload) => ({ ...await fixture.successfulCheck(payload), ...variant });
      await assert.rejects(fixture.coordinator.check(fixture.candidate), { code: "invalid-repository-check" });
      assert.equal(fixture.coordinator.getSnapshot().repositoryCheck, null);
    });
  }
});

test("edición, reinicio, desconexión y otra revisión invalidan check antes de aplicar", async (context) => {
  for (const variant of ["edit", "restart", "disconnect", "revision", "pending"]) {
    await context.test(variant, async () => {
      const fixture = await checkFixture();
      await fixture.coordinator.check(fixture.candidate);
      if (variant === "edit") fixture.coordinator.invalidate();
      if (variant === "disconnect") fixture.coordinator.disconnect();
      if (variant === "restart") fixture.session(authorSession(fixture.current, { token: "new-token" }));
      if (variant === "revision") fixture.session(authorSession(fixture.current, { currentRevision: "sha256:new" }));
      if (variant === "pending") fixture.session(authorSession(fixture.current, { pending: {} }));
      await assert.rejects(fixture.coordinator.apply(fixture.candidate), (error) => [
        "application-plan-required", "repository-check-required", "pending-course-application",
      ].includes(error.code));
      assert.equal(fixture.coordinator.getSnapshot().repositoryCheck, null);
      assert.equal(fixture.applies(), 0);
    });
  }
});

test("check bloquea fuente distinta o journal pendiente antes de POST y sin recuperación local", async (context) => {
  for (const variant of [{ currentRevision: "otra" }, { pending: { status: "awaiting-browser" } }]) {
    await context.test(JSON.stringify(variant), async () => {
      const fixture = await checkFixture();
      fixture.session(authorSession(fixture.current, variant));
      await assert.rejects(fixture.coordinator.check(fixture.candidate), (error) => ["revision-conflict", "pending-course-application"].includes(error.code));
      assert.equal(fixture.posts(), 0);
      assert.deepEqual([...fixture.storage.values], [["progress", "preserved"]]);
    });
  }
});

test("respuesta tardía de check tras editar o desconectar no revalida evidencia", async (context) => {
  for (const variant of ["invalidate", "disconnect"]) {
    await context.test(variant, async () => {
      const fixture = await checkFixture();
      const entered = deferred();
      const completed = deferred();
      fixture.client.check = async (payload) => { entered.resolve(); await completed.promise; return fixture.successfulCheck(payload); };
      const checking = fixture.coordinator.check(fixture.candidate);
      await entered.promise;
      fixture.coordinator[variant]();
      completed.resolve();
      await assert.rejects(checking, (error) => ["application-plan-stale", "repository-check-stale"].includes(error.code));
      assert.equal(fixture.coordinator.getSnapshot().repositoryCheck, null);
    });
  }
});

test("respuesta de un check anterior no reemplaza la evidencia de un borrador posterior", async () => {
  const fixture = await checkFixture();
  const entered = deferred();
  const completed = deferred();
  let call = 0;
  fixture.client.check = async (payload) => {
    if (++call === 1) { entered.resolve(); await completed.promise; }
    return fixture.successfulCheck(payload);
  };
  const first = fixture.coordinator.check(fixture.candidate);
  await entered.promise;
  const next = structuredClone(fixture.candidate);
  next.areas.find((area) => area.id === "electrostatics").appearance.contourId = "double";
  const second = await fixture.coordinator.check(next);
  completed.resolve();
  await assert.rejects(first, { code: "application-plan-stale" });
  assert.deepEqual(fixture.coordinator.getSnapshot().repositoryCheck, second.repositoryCheck);
});

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
    ...checkingClient(current),
    async connect() {
      calls.push("connect");
      return authorSession(current);
    },
    async apply({ document, expectedPreviousRevision }) {
      calls.push(["apply", expectedPreviousRevision]);
      return {
        rollbackToken: "rollback-token",
        sourceBackup: {
          path: ".orbit-editor-backups/previous.edition.json",
          revision: expectedPreviousRevision,
          sourceHash: `sha256:${"a".repeat(64)}`,
          savedAt: "2026-08-31T00:00:00.000Z",
        },
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
  await coordinator.check(candidate);
  const result = await coordinator.apply(candidate);

  assert.equal(result.edition.revision, plan.targetRevision);
  assert.equal(result.repository.checkPassed, true);
  assert.equal(
    result.repository.sourceBackup.path,
    ".orbit-editor-backups/previous.edition.json",
  );
  assert.equal(
    JSON.parse(storage.getItem(courseEditionStorageKey())).revision,
    plan.targetRevision,
  );
  assert.deepEqual(calls, [
    "connect",
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
      ...checkingClient(current),
      async connect() {
        connected = true;
        return authorSession(current);
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
      ...checkingClient(current),
      async connect() {
        helperCalls += 1;
        return authorSession(current);
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
      ...checkingClient(current),
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
    ...checkingClient(current),
    async connect() {
      return authorSession(current);
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
  await coordinator.check(candidate);

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
      ...checkingClient(current),
      async connect() {
        return { ...authorSession(current), pending };
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
      ...checkingClient(current),
      async connect() {
        return { ...authorSession(current), pending };
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
      ...checkingClient(current),
      async connect() {
        return {
          ...authorSession(current),
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
      ...checkingClient(current),
          async connect() {
            return {
              ...authorSession(current),
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
      ...checkingClient(current),
      async connect() {
        return authorSession(current);
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
  await coordinator.check(candidate);
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
