export async function acquireOnlineRuntimeLock(scope, { lockManager = globalThis.navigator?.locks } = {}) {
  if (!lockManager?.request) {
    throw new Error("Este navegador no ofrece Web Locks. Usa Edge o Chrome en un origen seguro para conservar el avance online.");
  }
  let signalAcquired;
  let release;
  const acquired = new Promise((resolve) => { signalAcquired = resolve; });
  const releaseSignal = new Promise((resolve) => { release = resolve; });
  const finished = lockManager.request(`orbit-online-runtime:${scope}`, { mode: "exclusive", ifAvailable: true }, async (lock) => {
    signalAcquired(Boolean(lock));
    if (lock) await releaseSignal;
  }).catch((error) => { signalAcquired(false); throw error; });
  // Observe errors immediately, including failure before acquired settles.
  void finished.catch(() => {});
  if (!await acquired) {
    const error = new Error("Cierra la otra ventana de ORBIT de esta cuenta antes de continuar. Su avance se conserva.");
    error.code = "online-account-in-use";
    throw error;
  }
  return { release, finished };
}
