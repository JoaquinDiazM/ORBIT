import assert from "node:assert/strict";
import test from "node:test";

import { EditorServiceMonitor } from "../src/editor/editor-service-monitor.js";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  async dispatch(type, event = {}) {
    const listeners = [...(this.listeners.get(type) ?? [])];
    await Promise.all(listeners.map((listener) => listener(event)));
  }

  listenerCount(type) {
    return this.listeners.get(type)?.size ?? 0;
  }
}

function fakeTimers() {
  let nextId = 1;
  const pending = new Map();
  return {
    cancel(id) {
      pending.delete(id);
    },
    count() {
      return pending.size;
    },
    async runNext() {
      const [id, task] = pending.entries().next().value ?? [];
      if (id === undefined) throw new Error("No hay un reintento pendiente.");
      pending.delete(id);
      await task.callback();
    },
    schedule(callback, delay) {
      const id = nextId;
      nextId += 1;
      pending.set(id, { callback, delay });
      return id;
    },
    values() {
      return [...pending.values()];
    },
  };
}

test("serializa sondeos y agrupa despertares concurrentes en un único sondeo posterior", async () => {
  const first = deferred();
  const second = deferred();
  const responses = [first, second];
  let calls = 0;
  let active = 0;
  let maximumActive = 0;
  const monitor = new EditorServiceMonitor({
    async probe() {
      const response = responses[calls];
      calls += 1;
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      try {
        return await response.promise;
      } finally {
        active -= 1;
      }
    },
    shouldRetry: () => false,
  });

  const initial = monitor.start();
  const concurrentA = monitor.refresh();
  const concurrentB = monitor.refresh();
  assert.equal(calls, 1);
  assert.strictEqual(concurrentA, initial);
  assert.strictEqual(concurrentB, initial);

  first.resolve({ mode: "unknown" });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 2);
  second.resolve({ mode: "editor-author" });

  assert.deepEqual(await initial, { mode: "editor-author" });
  assert.equal(calls, 2);
  assert.equal(maximumActive, 1);
  monitor.destroy();
});

test("reintenta solo mientras la política considera transitorio el último resultado", async () => {
  const timers = fakeTimers();
  const results = [
    { mode: "unknown", transient: true },
    { mode: "editor-author", transient: false },
  ];
  let calls = 0;
  const monitor = new EditorServiceMonitor({
    probe: async () => results[calls++],
    retryDelayMs: 750,
    schedule: timers.schedule,
    cancelSchedule: timers.cancel,
  });

  assert.deepEqual(await monitor.start(), results[0]);
  assert.equal(timers.count(), 1);
  assert.equal(timers.values()[0].delay, 750);

  await timers.runNext();
  assert.equal(calls, 2);
  assert.equal(timers.count(), 0);
  monitor.destroy();
});

test("un error transitorio programa reconexión sin producir rechazos no observados", async () => {
  const timers = fakeTimers();
  const unavailable = new Error("servidor temporalmente cerrado");
  let calls = 0;
  const monitor = new EditorServiceMonitor({
    probe: async () => {
      calls += 1;
      if (calls === 1) throw unavailable;
      return { mode: "editor-author" };
    },
    shouldRetry: ({ error }) => Boolean(error),
    schedule: timers.schedule,
    cancelSchedule: timers.cancel,
  });

  await assert.rejects(monitor.start(), unavailable);
  assert.equal(timers.count(), 1);
  await timers.runNext();
  assert.equal(calls, 2);
  assert.equal(timers.count(), 0);
  monitor.destroy();
});

test("focus, pageshow y visibilidad restaurada despiertan el monitor", async () => {
  const windowTarget = new FakeEventTarget();
  const documentTarget = new FakeEventTarget();
  documentTarget.visibilityState = "visible";
  let calls = 0;
  const monitor = new EditorServiceMonitor({
    probe: async () => ({ call: ++calls }),
    shouldRetry: () => false,
    windowTarget,
    documentTarget,
  });

  await monitor.start();
  await windowTarget.dispatch("focus");
  await windowTarget.dispatch("pageshow", { persisted: true });
  documentTarget.visibilityState = "hidden";
  await documentTarget.dispatch("visibilitychange");
  documentTarget.visibilityState = "visible";
  await documentTarget.dispatch("visibilitychange");

  assert.equal(calls, 4);
  monitor.destroy();
});

test("destroy cancela temporizadores, listeners y cualquier sondeo posterior agrupado", async () => {
  const timers = fakeTimers();
  const windowTarget = new FakeEventTarget();
  const documentTarget = new FakeEventTarget();
  documentTarget.visibilityState = "visible";
  const pendingProbe = deferred();
  let calls = 0;
  const monitor = new EditorServiceMonitor({
    probe: async () => {
      calls += 1;
      return pendingProbe.promise;
    },
    shouldRetry: () => true,
    windowTarget,
    documentTarget,
    schedule: timers.schedule,
    cancelSchedule: timers.cancel,
  });

  const active = monitor.start();
  const queued = monitor.refresh();
  assert.equal(windowTarget.listenerCount("focus"), 1);
  assert.equal(windowTarget.listenerCount("pageshow"), 1);
  assert.equal(documentTarget.listenerCount("visibilitychange"), 1);

  monitor.destroy();
  pendingProbe.resolve({ mode: "unknown" });
  await active;
  await queued;
  await windowTarget.dispatch("focus");
  await windowTarget.dispatch("pageshow");
  await documentTarget.dispatch("visibilitychange");

  assert.equal(calls, 1);
  assert.equal(timers.count(), 0);
  assert.equal(windowTarget.listenerCount("focus"), 0);
  assert.equal(windowTarget.listenerCount("pageshow"), 0);
  assert.equal(documentTarget.listenerCount("visibilitychange"), 0);
});

test("destroy elimina también un reintento que ya estaba programado", async () => {
  const timers = fakeTimers();
  const monitor = new EditorServiceMonitor({
    probe: async () => ({ transient: true }),
    schedule: timers.schedule,
    cancelSchedule: timers.cancel,
  });

  await monitor.start();
  assert.equal(timers.count(), 1);
  monitor.destroy();
  assert.equal(timers.count(), 0);
});
