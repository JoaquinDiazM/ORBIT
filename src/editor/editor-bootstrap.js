import("./editor-main.js").catch((error) => {
  console.error("ORBIT Editor no pudo cargar el módulo principal.", error);
  const message = error instanceof Error ? error.message : String(error ?? "error desconocido");
  window.OrbitStartup?.fail(`Falló un módulo necesario del editor: ${message}.`);
});
