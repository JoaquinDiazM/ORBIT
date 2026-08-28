(() => {
  const loadingScreen = document.querySelector("#loading-screen");
  const eyebrow = document.querySelector("#loading-eyebrow");
  const title = document.querySelector("#loading-title");
  const detail = document.querySelector("#loading-detail");

  if (!loadingScreen || !eyebrow || !title || !detail) return;

  let finished = false;

  function showFailure(reason) {
    if (finished) return;
    finished = true;
    window.clearTimeout(timeoutId);
    eyebrow.textContent = "No se pudo iniciar ORBIT";
    title.textContent = "El mundo no terminó de cargar.";
    detail.textContent = `${reason} Ejecuta npm install, reinicia npm run dev y abre la URL exacta indicada por la terminal.`;
    detail.hidden = false;
    loadingScreen.classList.add("has-error");
  }

  function handleError(event) {
    const failedElement = event.target;
    if (failedElement?.tagName === "SCRIPT" || failedElement?.tagName === "LINK") {
      const resource = failedElement.src || failedElement.href || "un recurso de inicio";
      showFailure(`No se pudo cargar ${new URL(resource, window.location.href).pathname}.`);
      return;
    }
    showFailure(event.message ? `Error de inicio: ${event.message}.` : "Ocurrió un error durante el inicio.");
  }

  function handleRejection(event) {
    const message = event.reason instanceof Error ? event.reason.message : String(event.reason ?? "desconocido");
    showFailure(`Una tarea de inicio falló: ${message}.`);
  }

  window.addEventListener("error", handleError, true);
  window.addEventListener("unhandledrejection", handleRejection);

  const timeoutId = window.setTimeout(() => {
    showFailure("El inicio superó el tiempo esperado.");
  }, 8_000);

  window.OrbitStartup = Object.freeze({
    ready() {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeoutId);
      window.removeEventListener("error", handleError, true);
      window.removeEventListener("unhandledrejection", handleRejection);
    },
    fail(reason) {
      showFailure(String(reason || "Ocurrió un error durante el inicio."));
    },
  });
})();
