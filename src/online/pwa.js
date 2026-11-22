export async function setupInstallableApp({ windowRef = window, documentRef = document } = {}) {
  // Development/authoring retains its no-cache contract and never registers a worker.
  if (!documentRef.querySelector('meta[name="orbit-build"]')) return null;
  if (new URL(windowRef.location.href).origin === "http://127.0.0.1:4173") return null;
  const navigatorRef = windowRef.navigator;
  if (!windowRef.isSecureContext || !navigatorRef.serviceWorker) return null;

  const panel = documentRef.createElement("details");
  panel.className = "orbit-install-controls";
  const summary = documentRef.createElement("summary");
  summary.textContent = "Aplicación";
  const status = documentRef.createElement("p");
  status.setAttribute("role", "status");
  status.textContent = "Preparando los recursos para abrir ORBIT sin conexión…";
  const install = documentRef.createElement("button");
  install.type = "button";
  install.textContent = "Instalar ORBIT";
  install.hidden = true;
  const retry = documentRef.createElement("button");
  retry.type = "button";
  retry.textContent = "Reintentar preparación";
  retry.hidden = true;
  panel.append(summary, status, install, retry);
  documentRef.body.append(panel);

  let deferredPrompt = null;
  function beforeInstall(event) {
    event.preventDefault();
    deferredPrompt = event;
    install.hidden = false;
  }
  windowRef.addEventListener("beforeinstallprompt", beforeInstall);
  install.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    const prompt = deferredPrompt;
    deferredPrompt = null;
    install.hidden = true;
    try { await prompt.prompt(); await prompt.userChoice; }
    catch { status.textContent = "También puedes instalar ORBIT desde el menú de tu navegador."; }
  });

  let registration = null;
  function readyStatus() {
    const online = documentRef.querySelector('meta[name="orbit-mode"]')?.content === "online";
    status.textContent = online
      ? "Recursos de ORBIT preparados. Entra a tu curso con conexión para guardar su copia en este dispositivo. Puedes instalar la aplicación desde el menú de Edge o Chrome."
      : "ORBIT está preparado para abrirse sin conexión. Puedes instalar la aplicación desde el menú de Edge o Chrome.";
    retry.hidden = true;
  }
  function observeUpdate() {
    const worker = registration.installing;
    if (!worker) return;
    worker.addEventListener("statechange", () => {
      if (worker.state === "installed") {
        if (registration.waiting) {
          status.textContent = "Hay una actualización preparada. Cierra todas las ventanas de ORBIT y vuelve a abrir la aplicación para usarla. Tu avance se conserva.";
        } else readyStatus();
      } else if (worker.state === "redundant") {
        status.textContent = "No se pudo completar la descarga. La copia anterior, si existe, sigue disponible.";
        retry.hidden = false;
      }
    });
  }
  async function register() {
    retry.hidden = true;
    try {
      const base = new URL("../../", import.meta.url);
      registration = await navigatorRef.serviceWorker.register(new URL("sw.js", base), {
        scope: base.pathname, type: "module", updateViaCache: "none",
      });
      registration.addEventListener("updatefound", observeUpdate);
      observeUpdate();
      if (registration.waiting) {
        status.textContent = "Actualización preparada. Cierra todas las ventanas de ORBIT y vuelve a abrir la aplicación.";
      } else if (registration.active) readyStatus();
    } catch {
      status.textContent = "No se pudo preparar la aplicación sin conexión. Comprueba la conexión y el espacio disponible.";
      retry.hidden = false;
    }
  }
  retry.addEventListener("click", () => { void register(); });
  await register();
  return { panel, get registration() { return registration; } };
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  void setupInstallableApp().catch(() => {});
}
