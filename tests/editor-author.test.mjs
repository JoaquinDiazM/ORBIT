import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
  courseEditionStorageKey,
  createCourseEdition,
  materializeCourseEdition,
} from "../src/core/course-edition.js";
import { progressStorageDescriptors } from "../src/core/course-application.js";
import { createBowerbirdStorageKey } from "../src/core/bowerbird-preferences.js";
import { ProgressStorage } from "../src/core/storage.js";
import { WORLD_CONFIG } from "../src/data/world.js";
import { CourseApplicationCoordinator } from "../src/editor/course-application-coordinator.js";
import { EditorAuthorClient } from "../src/editor/editor-author-client.js";
import {
  createEditorDocument,
  EDITOR_DOCUMENT_SCHEMA_VERSION,
} from "../src/editor/editor-document.js";
import { EditorModel } from "../src/editor/editor-model.js";
import {
  EDITOR_AUTHOR_CANONICAL_PORT,
  acquireEditorAuthorLock,
  applyEditionToRepository,
  createEditorAuthorServer,
  finalizeRepositoryApplication,
  recoverRepositoryApplication,
  resolveEditorAuthorCliPort,
  rollbackRepositoryApplication,
} from "../scripts/editor-author.mjs";

async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), "orbit-editor-author-"));
  await writeFile(
    resolve(root, "package.json"),
    `${JSON.stringify({ name: "orbit-open-roadmap" }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(resolve(root, "index.html"), "ORBIT Estudiante\n", "utf8");
  await writeFile(resolve(root, "editor.html"), "ORBIT Editor\n", "utf8");
  return root;
}

async function materializeFixtureBuild(root) {
  const sourcePath = resolve(
    root,
    "public/data/courses/electromagnetism-applied.edition.json",
  );
  const dist = resolve(root, "dist");
  const builtPath = resolve(
    dist,
    "public/data/courses/electromagnetism-applied.edition.json",
  );
  await rm(dist, { recursive: true, force: true });
  let serialized;
  try {
    serialized = await readFile(sourcePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  const edition = JSON.parse(serialized);
  await mkdir(resolve(builtPath, ".."), { recursive: true });
  await writeFile(builtPath, serialized, "utf8");
  await writeFile(
    resolve(dist, "build-info.json"),
    `${JSON.stringify({
      project: "orbit-open-roadmap",
      buildType: "static-no-bundle",
      courseId: edition.courseId,
      courseRevision: edition.revision,
      courseDigest: edition.digest,
    }, null, 2)}\n`,
    "utf8",
  );
}

function successfulRunner(calls = []) {
  return async (request) => {
    calls.push(request);
    if (request.args?.some((argument) => ["check", "build"].includes(argument))) {
      await materializeFixtureBuild(request.cwd);
    }
    return { code: 0, stdout: "ok", stderr: "" };
  };
}

function deferred() {
  let resolvePromise;
  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

class FixtureBrowserStorage {
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

function rawHttpRequest(origin, {
  path = "/",
  method = "GET",
  host = new URL(origin).host,
  headers = {},
  body = null,
} = {}) {
  const target = new URL(origin);
  return new Promise((resolveResponse, rejectResponse) => {
    const request = httpRequest({
      hostname: target.hostname,
      port: target.port,
      method,
      path,
      headers: { host, ...headers },
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        resolveResponse({
          status: response.statusCode,
          headers: response.headers,
          text,
          json: () => JSON.parse(text),
        });
      });
    });
    request.once("error", rejectResponse);
    if (body !== null) request.write(body);
    request.end();
  });
}

async function createPendingReplacement(root, runner = successfulRunner()) {
  const first = await applyEditionToRepository({
    root,
    document: createEditorDocument(),
    expectedPreviousRevision: null,
    runner,
    requireClean: false,
    appliedAt: "2026-08-30T00:00:00.000Z",
  });
  await finalizeRepositoryApplication({ root, rollbackToken: first.rollbackToken });
  const target = resolve(
    root,
    "public/data/courses/electromagnetism-applied.edition.json",
  );
  const previousSource = await readFile(target, "utf8");
  const changed = createEditorDocument();
  changed.areas.find((entry) => entry.id === "electrostatics").appearance.paletteId = "aurora";
  const second = await applyEditionToRepository({
    root,
    document: changed,
    expectedPreviousRevision: first.edition.revision,
    runner,
    requireClean: false,
    appliedAt: "2026-08-31T00:00:00.000Z",
  });
  return { first, second, target, previousSource };
}

test("el helper aplica sin consultar Git y exige finalize tras la fase navegador", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const calls = [];
  const result = await applyEditionToRepository({
    root,
    document: createEditorDocument(),
    expectedPreviousRevision: null,
    runner: successfulRunner(calls),
    appliedAt: "2026-08-30T00:00:00.000Z",
  });
  const target = resolve(
    root,
    "public/data/courses/electromagnetism-applied.edition.json",
  );

  assert.equal(result.ok, true);
  assert.equal(result.protocol.next, "apply-browser-transaction");
  assert.equal(JSON.parse(await readFile(target, "utf8")).revision, result.edition.revision);
  assert.equal(calls.some((call) => call.args?.includes("check")), true);
  assert.equal(calls.some((call) => call.command === "git"), false);
  const journal = JSON.parse(
    await readFile(resolve(root, ".orbit-editor", "repository-transaction.json"), "utf8"),
  );
  assert.equal(journal.previousSourceHash, null);
  assert.match(journal.targetSourceHash, /^sha256:[a-f0-9]{64}$/);
  const finalized = await finalizeRepositoryApplication({
    root,
    rollbackToken: result.rollbackToken,
  });
  assert.equal(finalized.action, "finalized");
});

test("Aplicar conserva una copia persistente de la fuente reemplazada", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const { second, previousSource } = await createPendingReplacement(root);

  assert.match(second.sourceBackup.path, /^\.orbit-editor-backups\//);
  assert.equal(second.sourceBackup.revision, second.edition.previousRevision);
  assert.match(second.sourceBackup.sourceHash, /^sha256:[a-f0-9]{64}$/);
  assert.equal(
    await readFile(resolve(root, second.sourceBackup.path), "utf8"),
    previousSource,
  );
  await rollbackRepositoryApplication({
    root,
    rollbackToken: second.rollbackToken,
    runner: successfulRunner(),
  });
  assert.equal(
    await readFile(resolve(root, second.sourceBackup.path), "utf8"),
    previousSource,
  );
});

test("el recorrido editorial completo sincroniza fuente, dist y navegador con reset total", async (t) => {
  const root = await fixture();
  let author = null;
  t.after(async () => {
    await author?.close();
    await rm(root, { recursive: true, force: true });
  });
  const runnerCalls = [];
  const runner = successfulRunner(runnerCalls);
  const initial = await applyEditionToRepository({
    root,
    document: createEditorDocument({ updatedAt: "2026-08-29T00:00:00.000Z" }),
    expectedPreviousRevision: null,
    runner,
    requireClean: false,
    appliedAt: "2026-08-29T00:00:00.000Z",
  });
  await finalizeRepositoryApplication({ root, rollbackToken: initial.rollbackToken });

  author = await createEditorAuthorServer({
    root,
    port: 0,
    runner,
    requireClean: false,
    sessionToken: "e".repeat(64),
  });
  const authorFetch = (input, init = {}) => {
    const headers = new Headers(init.headers ?? {});
    if ((init.method ?? "GET") !== "GET") headers.set("origin", author.origin);
    return fetch(new URL(input, author.origin), { ...init, headers });
  };

  const browserStorage = new FixtureBrowserStorage();
  const editorStorageKey =
    `orbit-editor:v${EDITOR_DOCUMENT_SCHEMA_VERSION}:${initial.edition.courseId}`;
  const bowerbirdStorageKey = createBowerbirdStorageKey({
    courseId: initial.edition.courseId,
    profile: "student",
  });
  const currentCourse = await materializeCourseEdition(initial.edition);
  const documentOptions = {
    baseAreas: currentCourse.areas,
    baseLocations: currentCourse.locations,
    worldConfig: WORLD_CONFIG,
    courseId: initial.edition.courseId,
    baseDataVersion: initial.edition.document.baseDataVersion,
  };
  const editor = EditorModel.create({
    storage: new ProgressStorage(editorStorageKey, browserStorage),
    clock: () => new Date("2026-08-30T12:00:00.000Z"),
    ...documentOptions,
  });

  assert.equal(editor.swapArea("electrostatics", "magnetism").changed, true);
  const vectorPlacement = editor
    .getSnapshot()
    .document.locations.find((location) => location.id === "vector-workshop");
  assert.equal(
    editor.moveLocation("vector-workshop", {
      areaId: vectorPlacement.areaId,
      offset: { x: vectorPlacement.offset.x + 4, y: vectorPlacement.offset.y },
    }).changed,
    true,
  );
  assert.equal(
    editor.connectLocations("vector-workshop", "circuit-analysis-bench").changed,
    true,
  );
  assert.equal(
    editor.setAreaAppearance("electrostatics", {
      paletteId: "polar",
      motifId: "constellation",
      contourId: "double",
    }).changed,
    true,
  );
  assert.equal(editor.validate().valid, true);

  const teacherDraftBefore = browserStorage.getItem(editorStorageKey);
  assert.notEqual(teacherDraftBefore, null);
  assert.equal(
    JSON.parse(teacherDraftBefore).schemaVersion,
    EDITOR_DOCUMENT_SCHEMA_VERSION,
  );
  browserStorage.setItem(bowerbirdStorageKey, "keep-student-bowerbird");
  const descriptors = progressStorageDescriptors();
  for (const descriptor of descriptors) {
    for (const key of descriptor.allKeys) {
      browserStorage.setItem(
        key,
        JSON.stringify({
          profile: descriptor.profile,
          completedLocations: ["base-camp"],
          concepts: ["vectors-and-fields"],
        }),
      );
    }
  }

  const lockManager = {
    request(_name, options, callback) {
      assert.deepEqual(options, { mode: "exclusive", ifAvailable: true });
      return Promise.resolve(callback({ name: "fixture-exclusive-lock" }));
    },
  };
  const coordinator = new CourseApplicationCoordinator({
    currentEdition: initial.edition,
    authorClient: new EditorAuthorClient({ fetchImpl: authorFetch }),
    storage: browserStorage,
    lockManager,
    documentOptions,
    descriptors,
  });
  const candidate = editor.getSnapshot().document;
  const plan = await coordinator.validate(candidate, {
    appliedAt: "2026-08-30T13:00:00.000Z",
  });

  assert.deepEqual(plan.diff.movedAreas, ["electrostatics", "magnetism"]);
  assert.deepEqual(plan.diff.movedLocations, ["vector-workshop"]);
  assert.deepEqual(plan.diff.addedConnections, [
    "vector-workshop->circuit-analysis-bench",
  ]);
  assert.deepEqual(plan.diff.changedAreaAppearances, ["electrostatics"]);
  assert.deepEqual(plan.impact.resetProfiles, ["student", "teacher", "debug"]);

  const result = await coordinator.apply(candidate);
  const sourcePath = resolve(
    root,
    "public/data/courses/electromagnetism-applied.edition.json",
  );
  const builtPath = resolve(
    root,
    "dist/public/data/courses/electromagnetism-applied.edition.json",
  );
  const sourceText = await readFile(sourcePath, "utf8");
  const builtText = await readFile(builtPath, "utf8");
  const sourceEdition = JSON.parse(sourceText);
  const buildInfo = JSON.parse(await readFile(resolve(root, "dist/build-info.json"), "utf8"));

  assert.equal(sourceEdition.revision, result.edition.revision);
  assert.equal(sourceText, builtText);
  assert.equal(buildInfo.courseRevision, sourceEdition.revision);
  assert.equal(buildInfo.courseDigest, sourceEdition.digest);
  assert.equal(
    JSON.parse(browserStorage.getItem(courseEditionStorageKey())).revision,
    sourceEdition.revision,
  );
  for (const descriptor of descriptors) {
    for (const key of descriptor.allKeys) {
      assert.equal(browserStorage.getItem(key), null, key);
    }
  }
  assert.equal(browserStorage.getItem(editorStorageKey), teacherDraftBefore);
  assert.equal(browserStorage.getItem(bowerbirdStorageKey), "keep-student-bowerbird");

  const runtimeCourse = await materializeCourseEdition(sourceEdition);
  const previousMagnetism = currentCourse.areas.find((area) => area.id === "magnetism");
  const appliedElectrostatics = runtimeCourse.areas.find((area) => area.id === "electrostatics");
  assert.deepEqual(
    { q: appliedElectrostatics.q, r: appliedElectrostatics.r },
    { q: previousMagnetism.q, r: previousMagnetism.r },
  );
  assert.equal(appliedElectrostatics.appearance.paletteId, "polar");
  assert.equal(
    runtimeCourse.locations.find((location) => location.id === "vector-workshop").offset.x,
    vectorPlacement.offset.x + 4,
  );
  assert.equal(
    runtimeCourse.locations
      .find((location) => location.id === "circuit-analysis-bench")
      .requirements.completedLocations.includes("vector-workshop"),
    true,
  );
  assert.equal(runnerCalls.filter((call) => call.args?.includes("check")).length, 2);
});

test("el rollback token restaura la edición fuente previa y reconstruye", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const runner = successfulRunner();
  const target = resolve(
    root,
    "public/data/courses/electromagnetism-applied.edition.json",
  );
  await mkdir(resolve(target, ".."), { recursive: true });
  const first = await applyEditionToRepository({
    root,
    document: createEditorDocument(),
    expectedPreviousRevision: null,
    runner,
    requireClean: false,
    appliedAt: "2026-08-30T00:00:00.000Z",
  });
  await finalizeRepositoryApplication({ root, rollbackToken: first.rollbackToken });
  const before = await readFile(target, "utf8");

  const changed = createEditorDocument();
  changed.areas.find((entry) => entry.id === "electrostatics").appearance.paletteId = "aurora";
  const second = await applyEditionToRepository({
    root,
    document: changed,
    expectedPreviousRevision: first.edition.revision,
    runner,
    requireClean: false,
    appliedAt: "2026-08-31T00:00:00.000Z",
  });
  const rollback = await rollbackRepositoryApplication({
    root,
    rollbackToken: second.rollbackToken,
    runner,
  });

  assert.equal(rollback.action, "rolled-back");
  assert.equal(await readFile(target, "utf8"), before);
});

test("si check falla, el helper revierte la fuente antes de responder", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const runner = async ({ args }) => ({
    code: args?.includes("check") ? 1 : 0,
    stdout: "",
    stderr: args?.includes("check") ? "check failed" : "",
  });
  const target = resolve(
    root,
    "public/data/courses/electromagnetism-applied.edition.json",
  );

  await assert.rejects(
    applyEditionToRepository({
      root,
      document: createEditorDocument(),
      expectedPreviousRevision: null,
      runner,
      requireClean: false,
    }),
    (error) => error.code === "repository-check-failed",
  );
  await assert.rejects(readFile(target, "utf8"), /ENOENT/);
});

test("el control optimista rechaza una revisión fuente distinta del plan", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const runner = successfulRunner();
  const first = await applyEditionToRepository({
    root,
    document: createEditorDocument(),
    expectedPreviousRevision: null,
    runner,
    requireClean: false,
  });
  await finalizeRepositoryApplication({ root, rollbackToken: first.rollbackToken });
  const target = resolve(
    root,
    "public/data/courses/electromagnetism-applied.edition.json",
  );
  const before = await readFile(target, "utf8");

  await assert.rejects(
    applyEditionToRepository({
      root,
      document: createEditorDocument(),
      expectedPreviousRevision: "sha256:stale",
      runner,
      requireClean: false,
    }),
    (error) => error.code === "revision-conflict",
  );
  assert.equal(await readFile(target, "utf8"), before);
});

test("un crash tras aplicar el navegador conserva la fuente pendiente de finalize", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const runner = successfulRunner();
  const result = await applyEditionToRepository({
    root,
    document: createEditorDocument(),
    expectedPreviousRevision: null,
    runner,
    requireClean: false,
    appliedAt: "2026-08-30T00:00:00.000Z",
  });
  const target = resolve(
    root,
    "public/data/courses/electromagnetism-applied.edition.json",
  );
  const installed = await readFile(target, "utf8");

  const recovery = await recoverRepositoryApplication(root, { runner });
  assert.equal(recovery.pending, true);
  assert.equal(recovery.action, "awaiting-browser");
  assert.equal(recovery.transaction.targetRevision, result.edition.revision);
  assert.equal(await readFile(target, "utf8"), installed);
  await assert.rejects(
    applyEditionToRepository({
      root,
      document: createEditorDocument(),
      expectedPreviousRevision: result.edition.revision,
      runner,
      requireClean: false,
    }),
    (error) => error.code === "pending-browser-finalization",
  );

  const author = await createEditorAuthorServer({
    root,
    port: 0,
    runner,
    requireClean: false,
    sessionToken: "restart-session",
  });
  t.after(() => author.close());
  const session = await fetch(`${author.origin}/__orbit/author/session`).then((response) => response.json());
  assert.equal(session.pending.targetRevision, result.edition.revision);
  assert.deepEqual(session.pending.edition, result.edition);
  assert.equal(session.pending.rollbackToken, result.rollbackToken);
  await finalizeRepositoryApplication({ root, rollbackToken: result.rollbackToken });
});

test("un journal awaiting-browser malformado se rechaza sin tocar fuente ni journal", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = resolve(root, ".orbit-editor");
  const journalPath = resolve(directory, "repository-transaction.json");
  const target = resolve(
    root,
    "public/data/courses/electromagnetism-applied.edition.json",
  );
  await mkdir(resolve(target, ".."), { recursive: true });
  await mkdir(directory, { recursive: true });
  await writeFile(target, "fuente-intacta\n", "utf8");
  const malformed = {
    kind: "other-transaction",
    schemaVersion: 1,
    status: "awaiting-browser",
    rollbackToken: "0123456789abcdef",
    target: "public/data/courses/electromagnetism-applied.edition.json",
    previousExisted: false,
    previousRevision: null,
    targetRevision: `sha256:${"a".repeat(64)}`,
    createdAt: "2026-08-30T00:00:00.000Z",
  };
  const serialized = `${JSON.stringify(malformed, null, 2)}\n`;
  await writeFile(journalPath, serialized, "utf8");

  await assert.rejects(
    recoverRepositoryApplication(root, { runner: successfulRunner() }),
    (error) => error.code === "invalid-author-journal",
  );
  await assert.rejects(
    finalizeRepositoryApplication({ root, rollbackToken: malformed.rollbackToken }),
    (error) => error.code === "invalid-author-journal",
  );
  assert.equal(await readFile(journalPath, "utf8"), serialized);
  assert.equal(await readFile(target, "utf8"), "fuente-intacta\n");
});

test("el journal exige coherencia entre existencia y revisión anterior antes de tocar la fuente", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = resolve(root, ".orbit-editor");
  const journalPath = resolve(directory, "repository-transaction.json");
  const target = resolve(
    root,
    "public/data/courses/electromagnetism-applied.edition.json",
  );
  await mkdir(resolve(target, ".."), { recursive: true });
  await mkdir(directory, { recursive: true });
  await writeFile(target, "fuente-no-tocada\n", "utf8");

  for (const contradiction of [
    {
      previousExisted: false,
      previousRevision: `sha256:${"a".repeat(64)}`,
      previousSourceHash: null,
    },
    {
      previousExisted: true,
      previousRevision: null,
      previousSourceHash: `sha256:${"c".repeat(64)}`,
    },
  ]) {
    const journal = {
      kind: "orbit-editor-author-transaction",
      schemaVersion: 1,
      status: "prepared",
      courseId: "electromagnetism-applied",
      rollbackToken: "journal-contract-0000000000000000",
      target: "public/data/courses/electromagnetism-applied.edition.json",
      ...contradiction,
      targetRevision: `sha256:${"b".repeat(64)}`,
      targetSourceHash: `sha256:${"d".repeat(64)}`,
      createdAt: "2026-08-30T00:00:00.000Z",
    };
    const serialized = `${JSON.stringify(journal, null, 2)}\n`;
    await writeFile(journalPath, serialized, "utf8");

    await assert.rejects(
      recoverRepositoryApplication(root, { runner: successfulRunner() }),
      (error) => error.code === "invalid-author-journal",
    );
    assert.equal(await readFile(target, "utf8"), "fuente-no-tocada\n");
    assert.equal(await readFile(journalPath, "utf8"), serialized);
  }
});

test("rollback rechaza un backup válido de otra revisión y conserva toda la evidencia", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const runner = successfulRunner();
  const target = resolve(
    root,
    "public/data/courses/electromagnetism-applied.edition.json",
  );
  const first = await applyEditionToRepository({
    root,
    document: createEditorDocument(),
    expectedPreviousRevision: null,
    runner,
    requireClean: false,
    appliedAt: "2026-08-30T00:00:00.000Z",
  });
  await finalizeRepositoryApplication({ root, rollbackToken: first.rollbackToken });

  const changed = createEditorDocument();
  changed.areas.find((entry) => entry.id === "electrostatics").appearance.paletteId = "aurora";
  const second = await applyEditionToRepository({
    root,
    document: changed,
    expectedPreviousRevision: first.edition.revision,
    runner,
    requireClean: false,
    appliedAt: "2026-08-31T00:00:00.000Z",
  });
  const journalPath = resolve(root, ".orbit-editor", "repository-transaction.json");
  const backupPath = resolve(root, ".orbit-editor", "published-edition.backup.json");
  const targetBefore = await readFile(target, "utf8");
  const journalBefore = await readFile(journalPath, "utf8");
  await writeFile(
    backupPath,
    targetBefore,
    "utf8",
  );

  await assert.rejects(
    rollbackRepositoryApplication({
      root,
      rollbackToken: second.rollbackToken,
      runner,
    }),
    (error) => error.code === "author-backup-evidence-mismatch",
  );
  assert.equal(await readFile(target, "utf8"), targetBefore);
  assert.equal(await readFile(journalPath, "utf8"), journalBefore);
  assert.equal(await readFile(backupPath, "utf8"), targetBefore);
});

test("prepared acepta source target tras crash y completa un rollback verificable", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const runner = successfulRunner();
  const { target, previousSource } = await createPendingReplacement(root, runner);
  const journalPath = resolve(root, ".orbit-editor", "repository-transaction.json");
  const journal = JSON.parse(await readFile(journalPath, "utf8"));
  journal.status = "prepared";
  await writeFile(journalPath, `${JSON.stringify(journal, null, 2)}\n`, "utf8");

  const recovery = await recoverRepositoryApplication(root, { runner });
  assert.equal(recovery.recovered, true);
  assert.equal(recovery.action, "rolled-back");
  assert.equal(await readFile(target, "utf8"), previousSource);
  await assert.rejects(readFile(journalPath, "utf8"), /ENOENT/);
  assert.equal(
    await readFile(
      resolve(root, "dist/public/data/courses/electromagnetism-applied.edition.json"),
      "utf8",
    ),
    previousSource,
  );
});

test("source-installed con una tercera edición falla cerrado sin tocar evidencia", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const runner = successfulRunner();
  const { second, target } = await createPendingReplacement(root, runner);
  const journalPath = resolve(root, ".orbit-editor", "repository-transaction.json");
  const journal = JSON.parse(await readFile(journalPath, "utf8"));
  journal.status = "source-installed";
  const journalBefore = `${JSON.stringify(journal, null, 2)}\n`;
  await writeFile(journalPath, journalBefore, "utf8");

  const thirdDocument = createEditorDocument();
  thirdDocument.areas.find((entry) => entry.id === "electrostatics").appearance.paletteId = "violet";
  const third = await createCourseEdition(thirdDocument, {
    previousRevision: second.edition.revision,
    acceptsUnversionedProgress: false,
    appliedAt: "2026-09-01T00:00:00.000Z",
  });
  const thirdSource = `${JSON.stringify(third, null, 2)}\n`;
  await writeFile(target, thirdSource, "utf8");
  const builtPath = resolve(
    root,
    "dist/public/data/courses/electromagnetism-applied.edition.json",
  );
  const builtBefore = await readFile(builtPath, "utf8");
  let runnerCalls = 0;

  await assert.rejects(
    recoverRepositoryApplication(root, {
      runner: async () => {
        runnerCalls += 1;
        return { code: 0, stdout: "", stderr: "" };
      },
    }),
    (error) => error.code === "author-source-diverged",
  );
  assert.equal(runnerCalls, 0);
  assert.equal(await readFile(target, "utf8"), thirdSource);
  assert.equal(await readFile(builtPath, "utf8"), builtBefore);
  assert.equal(await readFile(journalPath, "utf8"), journalBefore);
});

test("restoring reanuda crashes tras restaurar source y tras construir antes de cleanup", async (t) => {
  for (const phase of ["source-restored", "build-complete"]) {
    const root = await fixture();
    t.after(() => rm(root, { recursive: true, force: true }));
    const { second, target, previousSource } = await createPendingReplacement(root);
    const journalPath = resolve(root, ".orbit-editor", "repository-transaction.json");
    const interruptedRunner = async ({ args, cwd }) => {
      if (args?.includes("build") && phase === "build-complete") {
        await materializeFixtureBuild(cwd);
      }
      throw new Error(`crash-${phase}`);
    };

    await assert.rejects(
      rollbackRepositoryApplication({
        root,
        rollbackToken: second.rollbackToken,
        runner: interruptedRunner,
      }),
      new RegExp(`crash-${phase}`),
    );
    assert.equal(await readFile(target, "utf8"), previousSource, phase);
    assert.equal(JSON.parse(await readFile(journalPath, "utf8")).status, "restoring", phase);

    const recovery = await recoverRepositoryApplication(root, { runner: successfulRunner() });
    assert.equal(recovery.recovered, true, phase);
    assert.equal(recovery.action, "rolled-back", phase);
    assert.equal(await readFile(target, "utf8"), previousSource, phase);
    await assert.rejects(readFile(journalPath, "utf8"), /ENOENT/);
  }
});

test("rollback detecta una mutación concurrente durante build y conserva el journal restoring", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const { second, target } = await createPendingReplacement(root);
  const targetEdition = await readFile(target, "utf8");
  const journalPath = resolve(root, ".orbit-editor", "repository-transaction.json");
  const backupPath = resolve(root, ".orbit-editor", "published-edition.backup.json");
  const backupBefore = await readFile(backupPath, "utf8");
  const mutatingRunner = async ({ args, cwd }) => {
    if (args?.includes("build")) {
      await materializeFixtureBuild(cwd);
      await writeFile(target, targetEdition, "utf8");
    }
    return { code: 0, stdout: "ok", stderr: "" };
  };

  await assert.rejects(
    rollbackRepositoryApplication({
      root,
      rollbackToken: second.rollbackToken,
      runner: mutatingRunner,
    }),
    (error) => error.code === "author-source-diverged",
  );
  assert.equal(await readFile(target, "utf8"), targetEdition);
  assert.equal(await readFile(backupPath, "utf8"), backupBefore);
  assert.equal(JSON.parse(await readFile(journalPath, "utf8")).status, "restoring");
});

test("recovery limpia un tombstone retirado sin confundirlo con una transacción activa", async (t) => {
  assert.match(
    await readFile(new URL("../.gitignore", import.meta.url), "utf8"),
    /^\.orbit-editor-tombstone\/$/m,
  );
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const tombstone = resolve(root, ".orbit-editor-tombstone");
  await mkdir(tombstone);
  await writeFile(resolve(tombstone, "repository-transaction.json"), "evidencia retirada\n", "utf8");

  const recovery = await recoverRepositoryApplication(root, { runner: successfulRunner() });
  assert.equal(recovery.recovered, false);
  assert.equal(recovery.action, "none");
  await assert.rejects(readFile(resolve(tombstone, "repository-transaction.json"), "utf8"), /ENOENT/);
});

test("finalize conserva la transacción si la fuente ya no coincide con targetRevision", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const result = await applyEditionToRepository({
    root,
    document: createEditorDocument(),
    expectedPreviousRevision: null,
    runner: successfulRunner(),
    requireClean: false,
  });
  const target = resolve(
    root,
    "public/data/courses/electromagnetism-applied.edition.json",
  );
  const journalPath = resolve(root, ".orbit-editor", "repository-transaction.json");
  const journalBefore = await readFile(journalPath, "utf8");
  const altered = JSON.parse(await readFile(target, "utf8"));
  altered.document.areas[0].q = 99;
  await writeFile(target, `${JSON.stringify(altered, null, 2)}\n`, "utf8");

  await assert.rejects(
    finalizeRepositoryApplication({ root, rollbackToken: result.rollbackToken }),
    (error) => error.code === "author-source-diverged",
  );
  assert.equal(await readFile(journalPath, "utf8"), journalBefore);
  assert.equal(JSON.parse(await readFile(target, "utf8")).document.areas[0].q, 99);
});

test("finalize rechaza build-info existente que no corresponde a la fuente", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const result = await applyEditionToRepository({
    root,
    document: createEditorDocument(),
    expectedPreviousRevision: null,
    runner: successfulRunner(),
    requireClean: false,
  });
  const journalPath = resolve(root, ".orbit-editor", "repository-transaction.json");
  const journalBefore = await readFile(journalPath, "utf8");
  await mkdir(resolve(root, "dist"), { recursive: true });
  await writeFile(
    resolve(root, "dist", "build-info.json"),
    `${JSON.stringify({
      project: "orbit-open-roadmap",
      courseId: result.edition.courseId,
      courseRevision: `sha256:${"b".repeat(64)}`,
      courseDigest: result.edition.digest,
    }, null, 2)}\n`,
    "utf8",
  );

  await assert.rejects(
    finalizeRepositoryApplication({ root, rollbackToken: result.rollbackToken }),
    (error) => error.code === "author-finalization-evidence-mismatch",
  );
  assert.equal(await readFile(journalPath, "utf8"), journalBefore);
  await rollbackRepositoryApplication({
    root,
    rollbackToken: result.rollbackToken,
    runner: successfulRunner(),
  });
});

test("finalize falla cerrado si dist desaparece después de check", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const result = await applyEditionToRepository({
    root,
    document: createEditorDocument(),
    expectedPreviousRevision: null,
    runner: successfulRunner(),
    requireClean: false,
  });
  const journalPath = resolve(root, ".orbit-editor", "repository-transaction.json");
  const journalBefore = await readFile(journalPath, "utf8");
  await rm(resolve(root, "dist"), { recursive: true, force: true });

  await assert.rejects(
    finalizeRepositoryApplication({ root, rollbackToken: result.rollbackToken }),
    (error) => error.code === "author-finalization-evidence-mismatch",
  );
  assert.equal(await readFile(journalPath, "utf8"), journalBefore);
  await rollbackRepositoryApplication({
    root,
    rollbackToken: result.rollbackToken,
    runner: successfulRunner(),
  });
});

test("finalize exige que el envelope completo de dist sea idéntico a la fuente", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const result = await applyEditionToRepository({
    root,
    document: createEditorDocument(),
    expectedPreviousRevision: null,
    runner: successfulRunner(),
    requireClean: false,
  });
  const builtPath = resolve(
    root,
    "dist/public/data/courses/electromagnetism-applied.edition.json",
  );
  const source = await readFile(
    resolve(root, "public/data/courses/electromagnetism-applied.edition.json"),
    "utf8",
  );
  const built = JSON.parse(await readFile(builtPath, "utf8"));
  built.acceptsUnversionedProgress = !built.acceptsUnversionedProgress;
  await writeFile(builtPath, `${JSON.stringify(built, null, 2)}\n`, "utf8");

  await assert.rejects(
    finalizeRepositoryApplication({ root, rollbackToken: result.rollbackToken }),
    (error) => error.code === "author-finalization-evidence-mismatch",
  );

  const alteredPrevious = JSON.parse(source);
  alteredPrevious.previousRevision = `sha256:${"c".repeat(64)}`;
  await writeFile(
    builtPath,
    `${JSON.stringify(alteredPrevious, null, 2)}\n`,
    "utf8",
  );
  await assert.rejects(
    finalizeRepositoryApplication({ root, rollbackToken: result.rollbackToken }),
    (error) => error.code === "author-finalization-evidence-mismatch",
  );
  await rollbackRepositoryApplication({
    root,
    rollbackToken: result.rollbackToken,
    runner: successfulRunner(),
  });
});

test("GET session durante check es observacional y no recupera el journal activo", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const checkStarted = deferred();
  const releaseCheck = deferred();
  const runner = async ({ args, cwd }) => {
    if (args?.includes("check")) {
      checkStarted.resolve();
      await releaseCheck.promise;
    }
    if (args?.some((argument) => ["check", "build"].includes(argument))) {
      await materializeFixtureBuild(cwd);
    }
    return { code: 0, stdout: "ok", stderr: "" };
  };
  const author = await createEditorAuthorServer({
    root,
    port: 0,
    runner,
    requireClean: false,
    sessionToken: "concurrency-session",
  });
  t.after(async () => {
    releaseCheck.resolve();
    await author.close();
  });
  const headers = {
    "content-type": "application/json",
    origin: author.origin,
    "x-orbit-author-token": "concurrency-session",
  };
  const applyResponsePromise = fetch(`${author.origin}/__orbit/author/apply`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      document: createEditorDocument(),
      expectedPreviousRevision: null,
    }),
  });
  await checkStarted.promise;

  const journalPath = resolve(root, ".orbit-editor", "repository-transaction.json");
  const target = resolve(
    root,
    "public/data/courses/electromagnetism-applied.edition.json",
  );
  const journalBefore = await readFile(journalPath, "utf8");
  const sourceBefore = await readFile(target, "utf8");
  assert.equal(JSON.parse(journalBefore).status, "source-installed");

  let secondRunnerCalls = 0;
  await assert.rejects(
    createEditorAuthorServer({
      root,
      port: 0,
      runner: async () => {
        secondRunnerCalls += 1;
        return { code: 0, stdout: "", stderr: "" };
      },
      requireClean: false,
      sessionToken: "second-process",
    }),
    (error) => error.code === "author-helper-already-running",
  );
  assert.equal(secondRunnerCalls, 0);
  assert.equal(await readFile(journalPath, "utf8"), journalBefore);
  assert.equal(await readFile(target, "utf8"), sourceBefore);

  const concurrentSession = await fetch(`${author.origin}/__orbit/author/session`);
  assert.equal(concurrentSession.status, 409);
  assert.equal((await concurrentSession.json()).code, "author-busy");
  const busyControlSession = await fetch(`${author.origin}/__orbit/local/session`).then(
    (response) => response.json(),
  );
  assert.equal(busyControlSession.busy, true);
  const rejectedBusyShutdown = await fetch(`${author.origin}/__orbit/local/shutdown`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: author.origin,
      "x-orbit-local-token": busyControlSession.token,
    },
    body: JSON.stringify({ intent: "shutdown" }),
  });
  assert.equal(rejectedBusyShutdown.status, 409);
  assert.equal((await rejectedBusyShutdown.json()).code, "local-service-busy");
  assert.equal(await readFile(journalPath, "utf8"), journalBefore);
  assert.equal(await readFile(target, "utf8"), sourceBefore);
  const concurrentRuntime = await fetch(`${author.origin}/`);
  assert.equal(concurrentRuntime.status, 503);
  assert.equal(
    concurrentRuntime.headers.get("x-orbit-runtime-status"),
    "maintenance",
  );
  assert.match(await concurrentRuntime.text(), /servicio local está en mantenimiento/);
  const concurrentEditor = await fetch(`${author.origin}/editor.html`);
  assert.equal(concurrentEditor.status, 200);
  assert.equal(await concurrentEditor.text(), "ORBIT Editor\n");
  assert.equal(await readFile(journalPath, "utf8"), journalBefore);

  releaseCheck.resolve();
  const applyResponse = await applyResponsePromise;
  assert.equal(applyResponse.status, 200);
  const applied = await applyResponse.json();
  assert.equal(JSON.parse(await readFile(journalPath, "utf8")).status, "awaiting-browser");
  const pendingControlSession = await fetch(`${author.origin}/__orbit/local/session`).then(
    (response) => response.json(),
  );
  assert.equal(pendingControlSession.busy, true);
  const rejectedPendingShutdown = await fetch(`${author.origin}/__orbit/local/shutdown`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: author.origin,
      "x-orbit-local-token": pendingControlSession.token,
    },
    body: JSON.stringify({ intent: "shutdown" }),
  });
  assert.equal(rejectedPendingShutdown.status, 409);
  const pendingRuntime = await fetch(`${author.origin}/index.html`);
  assert.equal(pendingRuntime.status, 503);
  assert.equal(
    pendingRuntime.headers.get("x-orbit-runtime-status"),
    "maintenance",
  );
  for (const bypass of [
    "/%69ndex.html",
    "/index%2ehtml",
    "/dist/%69ndex.html",
    "/INDEX.HTML",
    "/src/bootstrap.js",
    "/Src/Main.js",
  ]) {
    const response = await fetch(`${author.origin}${bypass}`);
    assert.equal(response.status, 503, bypass);
    assert.equal(
      response.headers.get("x-orbit-runtime-status"),
      "maintenance",
      bypass,
    );
  }
  const rollbackResponse = await fetch(`${author.origin}/__orbit/author/rollback`, {
    method: "POST",
    headers,
    body: JSON.stringify({ rollbackToken: applied.rollbackToken }),
  });
  assert.equal(rollbackResponse.status, 200);
  const recoveredRuntime = await fetch(`${author.origin}/`);
  assert.equal(recoveredRuntime.status, 503);
  assert.equal(
    recoveredRuntime.headers.get("x-orbit-runtime-status"),
    "maintenance",
  );
});

test("la autoría real no admite un origen distinto de 127.0.0.1:4173", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  assert.equal(
    resolveEditorAuthorCliPort({ environment: {}, argv: ["node", "script"] }),
    EDITOR_AUTHOR_CANONICAL_PORT,
  );
  assert.equal(
    resolveEditorAuthorCliPort({ environment: { PORT: "4173" }, argv: [] }),
    EDITOR_AUTHOR_CANONICAL_PORT,
  );
  assert.throws(
    () => resolveEditorAuthorCliPort({ environment: { PORT: "4174" }, argv: [] }),
    (error) => error.code === "noncanonical-author-origin",
  );
  assert.throws(
    () => resolveEditorAuthorCliPort({ environment: {}, argv: ["node", "script", "4174"] }),
    (error) => error.code === "noncanonical-author-origin",
  );
  await assert.rejects(
    createEditorAuthorServer({ root, port: 4174, requireClean: false }),
    (error) => error.code === "noncanonical-author-origin",
  );
  await assert.rejects(
    readFile(resolve(root, ".orbit-editor-helper-lock", "owner.json"), "utf8"),
    /ENOENT/,
  );
});

test("un lock de helper solo se recupera si su dueño muerto es verificable", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = resolve(root, ".orbit-editor-helper-lock");
  await mkdir(directory);
  await writeFile(
    resolve(directory, "owner.json"),
    `${JSON.stringify({
      kind: "orbit-editor-author-lock",
      schemaVersion: 1,
      id: "stale-owner-0000000000000000",
      pid: 2_147_483_647,
      repositoryRoot: root,
      createdAt: "2026-08-30T00:00:00.000Z",
    }, null, 2)}\n`,
    "utf8",
  );

  const acquired = await acquireEditorAuthorLock(root);
  assert.equal(acquired.owner.pid, process.pid);
  await acquired.release();
  await assert.rejects(readFile(resolve(directory, "owner.json"), "utf8"), /ENOENT/);

  await mkdir(directory);
  await writeFile(resolve(directory, "owner.json"), "{}\n", "utf8");
  await assert.rejects(
    acquireEditorAuthorLock(root),
    (error) => error.code === "invalid-author-helper-lock",
  );
  assert.equal(await readFile(resolve(directory, "owner.json"), "utf8"), "{}\n");
});

test("la API loopback exige same-origin, token y JSON", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const author = await createEditorAuthorServer({
    root,
    port: 0,
    runner: successfulRunner(),
    requireClean: false,
    sessionToken: "session-test",
  });
  t.after(() => author.close());

  const session = await fetch(`${author.origin}/__orbit/author/session`).then((response) => response.json());
  assert.equal(session.token, "session-test");
  const rejected = await fetch(`${author.origin}/__orbit/author/apply`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://example.invalid" },
    body: JSON.stringify({ document: createEditorDocument(), expectedPreviousRevision: null }),
  });
  assert.equal(rejected.status, 403);

  const accepted = await fetch(`${author.origin}/__orbit/author/apply`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: author.origin,
      "x-orbit-author-token": "session-test",
    },
    body: JSON.stringify({ document: createEditorDocument(), expectedPreviousRevision: null }),
  });
  assert.equal(accepted.status, 200);
  const body = await accepted.json();
  assert.equal(body.protocol.next, "apply-browser-transaction");
  await fetch(`${author.origin}/__orbit/author/rollback`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: author.origin,
      "x-orbit-author-token": "session-test",
    },
    body: JSON.stringify({ rollbackToken: body.rollbackToken }),
  });
});

test("el apagado local responde antes de cerrar y libera el lock del helper", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const author = await createEditorAuthorServer({
    root,
    port: 0,
    runner: successfulRunner(),
    requireClean: false,
    sessionToken: "author-session",
    localServiceToken: "l".repeat(64),
  });
  t.after(() => author.close());

  const sessionResponse = await fetch(`${author.origin}/__orbit/local/session`);
  assert.equal(sessionResponse.status, 200);
  assert.equal(sessionResponse.headers.get("cache-control"), "no-store");
  assert.equal(sessionResponse.headers.get("access-control-allow-origin"), null);
  const session = await sessionResponse.json();
  assert.equal(session.service, "editor-author");
  assert.equal(session.token, "l".repeat(64));
  assert.equal(session.busy, false);

  const rejected = await fetch(`${author.origin}/__orbit/local/shutdown`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://example.invalid",
      "x-orbit-local-token": session.token,
    },
    body: JSON.stringify({ intent: "shutdown" }),
  });
  assert.equal(rejected.status, 403);
  assert.equal(author.server.listening, true);

  const accepted = await fetch(`${author.origin}/__orbit/local/shutdown`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: author.origin,
      "x-orbit-local-token": session.token,
      "sec-fetch-site": "same-origin",
    },
    body: JSON.stringify({ intent: "shutdown" }),
  });
  assert.equal(accepted.status, 202);
  assert.equal(accepted.headers.get("connection"), "close");
  assert.equal((await accepted.json()).state, "shutting-down");

  await new Promise((resolve) => setImmediate(resolve));
  await author.close();
  assert.equal(author.server.listening, false);

  const restarted = await createEditorAuthorServer({
    root,
    port: 0,
    runner: successfulRunner(),
    requireClean: false,
    sessionToken: "restarted-session",
  });
  await restarted.close();
});

test("Host y la autoridad absolute-form deben coincidir con el origen loopback real", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const author = await createEditorAuthorServer({
    root,
    port: 0,
    runner: successfulRunner(),
    requireClean: false,
    sessionToken: "authority-session-secret",
  });
  t.after(() => author.close());

  const foreignHost = await rawHttpRequest(author.origin, {
    path: "/__orbit/author/session",
    host: "example.invalid",
  });
  assert.equal(foreignHost.status, 421);
  assert.equal(foreignHost.json().code, "noncanonical-request-authority");
  assert.doesNotMatch(foreignHost.text, /authority-session-secret/);

  const foreignStaticHost = await rawHttpRequest(author.origin, {
    path: "/editor.html",
    host: "example.invalid",
  });
  assert.equal(foreignStaticHost.status, 421);
  assert.doesNotMatch(foreignStaticHost.text, /ORBIT Editor/);

  const foreignAbsolute = await rawHttpRequest(author.origin, {
    path: "http://example.invalid/__orbit/author/session",
  });
  assert.equal(foreignAbsolute.status, 421);
  assert.equal(foreignAbsolute.json().code, "noncanonical-request-authority");
  assert.doesNotMatch(foreignAbsolute.text, /authority-session-secret/);

  for (const path of [
    "/\\evil/__orbit/local/session",
    "/%5c%5cevil/__orbit/local/session",
  ]) {
    const ambiguousAuthority = await rawHttpRequest(author.origin, { path });
    assert.equal(ambiguousAuthority.status, 421, path);
    assert.doesNotMatch(ambiguousAuthority.text, /authority-session-secret/);
  }

  const equivalentButNoncanonicalAbsolute = await rawHttpRequest(author.origin, {
    path: `http://2130706433:${new URL(author.origin).port}/__orbit/author/session`,
  });
  assert.equal(equivalentButNoncanonicalAbsolute.status, 421);
  assert.equal(
    equivalentButNoncanonicalAbsolute.json().code,
    "noncanonical-request-authority",
  );

  const canonicalAbsolute = await rawHttpRequest(author.origin, {
    path: `${author.origin}/__orbit/author/session`,
  });
  assert.equal(canonicalAbsolute.status, 200);
  assert.equal(canonicalAbsolute.json().token, "authority-session-secret");
});

test("el helper sirve solo la aplicación estática y excluye archivos del checkout", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const allowedFiles = new Map([
    ["src/editor/editor-main.js", "export const editorAsset = true;\n"],
    ["src/core/hex.js", "export const coreAsset = true;\n"],
    ["public/data/courses/course.json", "{\"course\":true}\n"],
    ["public/favicon.svg", "<svg></svg>\n"],
  ]);
  for (const [relativePath, content] of allowedFiles) {
    const path = resolve(root, relativePath);
    await mkdir(resolve(path, ".."), { recursive: true });
    await writeFile(path, content, "utf8");
  }
  const forbiddenFiles = new Map([
    ["ORBIT_UPDATES.md", "updates-secret\n"],
    ["scripts/private.mjs", "script-secret\n"],
    ["tests/private.test.mjs", "test-secret\n"],
    ["docs/private.md", "docs-secret\n"],
    ["src/AGENTS.md", "source-instructions-secret\n"],
    ["public/assets/README.md", "public-not-runtime-secret\n"],
    [".env", "environment-secret\n"],
  ]);
  for (const [relativePath, content] of forbiddenFiles) {
    const path = resolve(root, relativePath);
    await mkdir(resolve(path, ".."), { recursive: true });
    await writeFile(path, content, "utf8");
  }

  const author = await createEditorAuthorServer({
    root,
    port: 0,
    runner: successfulRunner(),
    requireClean: false,
    sessionToken: "static-session",
  });
  t.after(() => author.close());

  for (const [path, expected] of [
    ["/editor.html", "ORBIT Editor\n"],
    ["/src/editor/editor-main.js", allowedFiles.get("src/editor/editor-main.js")],
    ["/src/core/hex.js", allowedFiles.get("src/core/hex.js")],
    ["/public/data/courses/course.json", allowedFiles.get("public/data/courses/course.json")],
    ["/public/favicon.svg", allowedFiles.get("public/favicon.svg")],
  ]) {
    const response = await fetch(`${author.origin}${path}`);
    assert.equal(response.status, 200, path);
    assert.equal(await response.text(), expected, path);
  }

  for (const { method, path, expectedLocation } of [
    {
      method: "GET",
      path: "/editor.html/?profile=teacher&panel=overview",
      expectedLocation: "/editor.html?profile=teacher&panel=overview",
    },
    {
      method: "HEAD",
      path: "/editor.html/?profile=student",
      expectedLocation: "/editor.html?profile=student",
    },
  ]) {
    const response = await fetch(`${author.origin}${path}`, {
      method,
      redirect: "manual",
    });
    assert.equal(response.status, 307, `${method} ${path}`);
    assert.equal(response.headers.get("location"), expectedLocation, path);
    assert.equal(response.headers.get("cache-control"), "no-store", path);
    if (method === "HEAD") assert.equal(await response.text(), "", path);
    else assert.match(await response.text(), /entrada canónica de ORBIT Editor/, path);
  }

  for (const path of [
    "/",
    "/index.html",
    "/index.html?profile=teacher",
    "/index.html?debug=1",
    "/%69ndex.html",
    "/index%2ehtml",
    "/dist/%69ndex.html",
    "/INDEX.HTML",
    "/Src/Main.js",
  ]) {
    const response = await fetch(`${author.origin}${path}`);
    assert.equal(response.status, 503, path);
    assert.equal(response.headers.get("x-orbit-runtime-status"), "maintenance", path);
    assert.match(await response.text(), /ORBIT está cerrado temporalmente/, path);
  }

  for (const path of [
    "/ORBIT_UPDATES.md",
    "/package.json",
    "/scripts/private.mjs",
    "/tests/private.test.mjs",
    "/docs/private.md",
    "/src/AGENTS.md",
    "/public/assets/README.md",
    "/.env",
    "/dist/build-info.json",
  ]) {
    const response = await fetch(`${author.origin}${path}`);
    assert.equal(response.status, 404, path);
  }
});

test("el helper revalida la whitelist tras resolver enlaces simbólicos", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const privatePath = resolve(root, "private.js");
  const linkPath = resolve(root, "src/leak.js");
  await mkdir(resolve(linkPath, ".."), { recursive: true });
  await writeFile(privatePath, "helper-private-content\n", "utf8");
  try {
    await symlink(privatePath, linkPath, "file");
  } catch (error) {
    if (["EPERM", "EACCES", "ENOSYS"].includes(error?.code)) {
      t.skip(`symlink no disponible en esta plataforma: ${error.code}`);
      return;
    }
    throw error;
  }

  const author = await createEditorAuthorServer({
    root,
    port: 0,
    runner: successfulRunner(),
    requireClean: false,
    sessionToken: "symlink-session",
  });
  t.after(() => author.close());

  const response = await fetch(`${author.origin}/src/leak.js`);
  assert.equal(response.status, 404);
  assert.doesNotMatch(await response.text(), /helper-private-content/);
});

test("la API limita el borrador y no sirve archivos privados del checkout", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(resolve(root, ".git"), { recursive: true });
  await writeFile(resolve(root, ".git", "config"), "private", "utf8");
  const author = await createEditorAuthorServer({
    root,
    port: 0,
    runner: successfulRunner(),
    requireClean: false,
    sessionToken: "payload-session",
  });
  t.after(() => author.close());

  const privateResponse = await fetch(`${author.origin}/.git/config`);
  assert.equal(privateResponse.status, 404);

  const oversized = await fetch(`${author.origin}/__orbit/author/apply`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: author.origin,
      "x-orbit-author-token": "payload-session",
    },
    body: JSON.stringify({ document: "x".repeat(1_048_576) }),
  });
  assert.equal(oversized.status, 413);
  assert.equal((await oversized.json()).code, "payload-too-large");
});
