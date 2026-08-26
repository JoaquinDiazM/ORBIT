import("./main.js").catch((error) => {
  console.error("ATLAS no pudo cargar el módulo principal.", error);
  const message = error instanceof Error ? error.message : String(error ?? "error desconocido");
  window.AtlasStartup?.fail(`Falló un módulo necesario: ${message}.`);
});
