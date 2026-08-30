import assert from "node:assert/strict";
import test from "node:test";

import {
  EditorAuthorClient,
  EditorAuthorClientError,
} from "../src/editor/editor-author-client.js";

function response(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => structuredClone(body) };
}

const session = {
  kind: "orbit-editor-author-session",
  schemaVersion: 1,
  token: "s".repeat(64),
  courseId: "electromagnetism-applied",
  endpoints: {
    apply: "/__orbit/author/apply",
    finalize: "/__orbit/author/finalize",
    rollback: "/__orbit/author/rollback",
  },
  pending: null,
};

test("el cliente negocia sesión y envía revisión optimista con token same-origin", async () => {
  const calls = [];
  const client = new EditorAuthorClient({
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (options.method === "GET") return response(session);
      return response({ ok: true, edition: { revision: "sha256:nueva" } });
    },
  });
  const result = await client.apply({
    document: { kind: "orbit-editor-project" },
    expectedPreviousRevision: "sha256:anterior",
  });
  assert.equal(result.edition.revision, "sha256:nueva");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "/__orbit/author/session");
  assert.equal(calls[0].options.credentials, "same-origin");
  assert.equal(calls[1].url, "/__orbit/author/apply");
  assert.equal(calls[1].options.credentials, "same-origin");
  assert.equal(calls[1].options.headers["x-orbit-author-token"], "s".repeat(64));
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    document: { kind: "orbit-editor-project" },
    expectedPreviousRevision: "sha256:anterior",
  });
});

test("el cliente conserva el código seguro de un conflicto del helper", async () => {
  const client = new EditorAuthorClient({
    fetchImpl: async (_url, options) => options.method === "GET"
      ? response(session)
      : response(
          { ok: false, code: "revision-conflict", message: "La fuente cambió." },
          { ok: false, status: 400 },
        ),
  });
  await assert.rejects(
    client.apply({ document: {}, expectedPreviousRevision: "vieja" }),
    (error) => error instanceof EditorAuthorClientError
      && error.code === "revision-conflict"
      && error.status === 400,
  );
});

test("una URL ajena en la sesión se rechaza antes de enviar el documento", async () => {
  const client = new EditorAuthorClient({
    fetchImpl: async () => response({
      ...session,
      endpoints: { ...session.endpoints, apply: "https://example.test/collect" },
    }),
  });
  await assert.rejects(
    client.apply({ document: {}, expectedPreviousRevision: null }),
    (error) => error instanceof EditorAuthorClientError
      && error.code === "invalid-author-session",
  );
});

test("el cliente rechaza tokens, cursos y tablas de endpoints incompletos", async () => {
  for (const invalid of [
    { ...session, token: "breve" },
    { ...session, courseId: "" },
    { ...session, endpoints: { ...session.endpoints, finalize: "/__orbit/author/otro" } },
  ]) {
    const client = new EditorAuthorClient({ fetchImpl: async () => response(invalid) });
    await assert.rejects(
      client.connect(),
      (error) => error instanceof EditorAuthorClientError
        && error.code === "invalid-author-session",
    );
  }
});
