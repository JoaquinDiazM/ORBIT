import assert from "node:assert/strict";
import test from "node:test";

import {
  EditorLocalServiceClient,
  EditorLocalServiceClientError,
} from "../src/editor/editor-local-service-client.js";

function response(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => structuredClone(body) };
}

const session = {
  kind: "orbit-local-service-session",
  schemaVersion: 1,
  service: "development",
  token: "a".repeat(64),
  busy: false,
  endpoints: { shutdown: "/__orbit/local/shutdown" },
};

test("el cliente invoca fetch sin convertirlo en un método propio", async () => {
  let receiver = "sin invocar";
  const client = new EditorLocalServiceClient({
    async fetchImpl() {
      receiver = this;
      return response(session);
    },
  });

  await client.connect();

  assert.equal(receiver, undefined);
});

test("el cliente negocia una sesión separada y solicita un apagado same-origin", async () => {
  const calls = [];
  const client = new EditorLocalServiceClient({
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return options.method === "GET"
        ? response(session)
        : response({ ok: true, service: "development", state: "shutting-down" }, { status: 202 });
    },
  });

  const result = await client.shutdown();

  assert.equal(result.state, "shutting-down");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "/__orbit/local/session");
  assert.equal(calls[1].url, "/__orbit/local/shutdown");
  assert.equal(calls[1].options.credentials, "same-origin");
  assert.equal(calls[1].options.headers["x-orbit-local-token"], session.token);
  assert.deepEqual(JSON.parse(calls[1].options.body), { intent: "shutdown" });
});

test("el apagado siempre renegocia la sesión y no reutiliza un token anterior", async () => {
  const calls = [];
  const client = new EditorLocalServiceClient({
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (options.method === "GET") {
        return response({ ...session, token: String(calls.length).repeat(64) });
      }
      return response({ ok: true, service: "development", state: "shutting-down" }, { status: 202 });
    },
  });

  await client.connect();
  await client.shutdown();

  assert.equal(calls.filter(({ options }) => options.method === "GET").length, 2);
  assert.equal(calls.at(-1).options.headers["x-orbit-local-token"], "2".repeat(64));
});

test("una sesión ocupada se vuelve a consultar y no envía el apagado si continúa ocupada", async () => {
  const calls = [];
  const client = new EditorLocalServiceClient({
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return response({ ...session, busy: true });
    },
  });

  await client.connect();
  await assert.rejects(
    client.shutdown(),
    (error) => error instanceof EditorLocalServiceClientError
      && error.code === "local-service-busy"
      && error.status === 409,
  );
  assert.equal(calls.length, 2);
  assert.ok(calls.every(({ options }) => options.method === "GET"));
});

test("el cliente rechaza servicios, tokens y endpoints incompatibles", async () => {
  for (const invalid of [
    { ...session, service: "unknown" },
    { ...session, token: "breve" },
    { ...session, endpoints: { shutdown: "https://example.test/collect" } },
  ]) {
    const client = new EditorLocalServiceClient({
      fetchImpl: async () => response(invalid),
    });
    await assert.rejects(
      client.connect(),
      (error) => error instanceof EditorLocalServiceClientError
        && error.code === "invalid-local-service-session",
    );
  }
});

test("el cliente conserva errores seguros y rechaza respuestas que no son JSON", async () => {
  const busyClient = new EditorLocalServiceClient({
    fetchImpl: async (_url, options) => options.method === "GET"
      ? response(session)
      : response(
          { ok: false, code: "local-service-busy", message: "Operación en curso." },
          { ok: false, status: 409 },
        ),
  });
  await assert.rejects(
    busyClient.shutdown(),
    (error) => error instanceof EditorLocalServiceClientError
      && error.code === "local-service-busy"
      && error.status === 409,
  );

  const htmlClient = new EditorLocalServiceClient({
    fetchImpl: async () => ({
      ok: false,
      status: 404,
      json: async () => {
        throw new SyntaxError("HTML");
      },
    }),
  });
  await assert.rejects(
    htmlClient.connect(),
    (error) => error instanceof EditorLocalServiceClientError
      && error.code === "invalid-local-service-response",
  );
});
