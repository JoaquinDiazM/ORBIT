import assert from "node:assert/strict";
import test from "node:test";

import {
  OrbitMaintenanceMonitor,
  probeLocalServiceMode,
} from "../src/core/local-service-mode.js";

function response(service, { ok = true } = {}) {
  return {
    ok,
    json: async () => ({
      kind: "orbit-local-service-session",
      schemaVersion: 1,
      service,
    }),
  };
}

test("el sondeo acepta únicamente una sesión local conocida", async () => {
  assert.equal(
    await probeLocalServiceMode({ fetchImpl: async () => response("development") }),
    "development",
  );
  assert.equal(
    await probeLocalServiceMode({ fetchImpl: async () => response("editor-author") }),
    "editor-author",
  );
  assert.equal(
    await probeLocalServiceMode({ fetchImpl: async () => response("unknown") }),
    null,
  );
  assert.equal(
    await probeLocalServiceMode({ fetchImpl: async () => ({ ok: true, json: async () => { throw new SyntaxError("HTML"); } }) }),
    null,
  );
  assert.equal(
    await probeLocalServiceMode({ fetchImpl: async () => { throw new Error("offline"); } }),
    null,
  );
});

test("una página iniciada en dev tolera la pausa y se congela una sola vez al entrar en mantenimiento", async () => {
  const scheduled = [];
  const services = [
    response("development"),
    new Error("servidor detenido"),
    response("editor-author"),
  ];
  let transitions = 0;
  const monitor = new OrbitMaintenanceMonitor({
    fetchImpl: async () => {
      const next = services.shift();
      if (next instanceof Error) throw next;
      return next;
    },
    schedule: (callback) => {
      scheduled.push(callback);
      return scheduled.length;
    },
    cancel: () => {},
    onMaintenance: async () => {
      transitions += 1;
    },
  });

  assert.deepEqual(await monitor.start(), {
    monitoring: true,
    maintenance: false,
    service: "development",
  });
  assert.equal(scheduled.length, 1);
  await scheduled.shift()();
  assert.equal(transitions, 0);
  assert.equal(scheduled.length, 1);
  await scheduled.shift()();
  assert.equal(transitions, 1);
  assert.equal(monitor.active, false);
  assert.equal(scheduled.length, 0);
  assert.deepEqual(await monitor.start(), { monitoring: false, maintenance: true });
  assert.equal(transitions, 1);
});

test("una página que ya detecta autoría entra inmediatamente en mantenimiento", async () => {
  let transitions = 0;
  const monitor = new OrbitMaintenanceMonitor({
    fetchImpl: async () => response("editor-author"),
    schedule: () => {
      throw new Error("no debe programar sondeos");
    },
    cancel: () => {},
    onMaintenance: () => {
      transitions += 1;
    },
  });

  assert.deepEqual(await monitor.start(), {
    monitoring: false,
    maintenance: true,
    service: "editor-author",
  });
  assert.equal(transitions, 1);
});

test("el origen loopback reintenta si el primer sondeo coincide con el apagado de dev", async () => {
  const scheduled = [];
  const services = [new Error("dev se está deteniendo"), response("editor-author")];
  let transitions = 0;
  const monitor = new OrbitMaintenanceMonitor({
    origin: "http://127.0.0.1:4173",
    fetchImpl: async () => {
      const next = services.shift();
      if (next instanceof Error) throw next;
      return next;
    },
    schedule: (callback) => {
      scheduled.push(callback);
      return scheduled.length;
    },
    cancel: () => {},
    onMaintenance: () => {
      transitions += 1;
    },
  });

  assert.deepEqual(await monitor.start(), {
    monitoring: true,
    maintenance: false,
    service: null,
  });
  assert.equal(scheduled.length, 1);
  await scheduled.shift()();
  assert.equal(transitions, 1);
  assert.equal(monitor.active, false);
});

test("un hosting sin protocolo local no sondea indefinidamente", async () => {
  let scheduled = 0;
  const monitor = new OrbitMaintenanceMonitor({
    origin: "https://example.test",
    fetchImpl: async () => ({ ok: false }),
    schedule: () => {
      scheduled += 1;
      return scheduled;
    },
    cancel: () => {},
    onMaintenance: () => {},
  });

  assert.deepEqual(await monitor.start(), {
    monitoring: false,
    maintenance: false,
    service: null,
  });
  assert.equal(scheduled, 0);
});
