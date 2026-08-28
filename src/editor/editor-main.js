import { APP_CONFIG } from "../config.js";
import { validateProjectData } from "../core/validator.js";
import { EDITOR_COURSE_ID, EDITOR_DOCUMENT_SCHEMA_VERSION } from "./editor-document.js";
import { EditorApp } from "./editor-app.js";
import { EditorModel } from "./editor-model.js";
import { EditorRenderer } from "./editor-renderer.js";
import { EditorUIController } from "./editor-ui-controller.js";

const validation = validateProjectData();
if (validation.errors.length > 0) {
  console.error("La definición canónica del curso contiene errores:", validation.errors);
  throw new Error("ORBIT Editor no puede abrir un curso cuya cartografía es inválida.");
}
if (validation.warnings.length > 0) {
  console.warn("Advertencias de la cartografía canónica:", validation.warnings);
}

const canvas = document.querySelector("#world-canvas");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("No se encontró el canvas principal de ORBIT Editor.");
}

const storageKey = `orbit-editor:v${EDITOR_DOCUMENT_SCHEMA_VERSION}:${EDITOR_COURSE_ID}`;
const model = EditorModel.create({ storageKey });
const modelValidation = model.validate();
if (!modelValidation.valid) {
  console.error("El borrador editorial no superó la validación:", modelValidation.errors);
  throw new Error("El borrador editorial no pudo materializarse de forma segura.");
}

const renderer = new EditorRenderer(canvas);
const app = new EditorApp({ canvas, model, renderer });
const ui = new EditorUIController({ model, app });
app.start();

requestAnimationFrame(() => {
  const loadingScreen = document.querySelector("#loading-screen");
  loadingScreen?.classList.add("is-hidden");
  window.setTimeout(() => {
    if (loadingScreen) loadingScreen.hidden = true;
  }, 320);
  window.OrbitStartup?.ready();
});

window.OrbitEditor = Object.freeze({
  help() {
    return {
      mode: "ORBIT Editor",
      version: APP_CONFIG.version,
      storageKey,
      methods: [
        "snapshot()",
        "validate()",
        "selectTool('spider' | 'bee')",
        "moveLocation(id, placement)",
        "swapAreas(firstId, secondId)",
        "connect(sourceId, targetId)",
        "disconnect(sourceId, targetId)",
        "undo()",
        "redo()",
        "reset()",
        "exportDocument()",
        "importDocument(object)",
      ],
    };
  },
  snapshot: () => ({ editor: app.getState(), course: model.getSnapshot() }),
  validate: () => model.validate(),
  selectTool: (tool) => app.setActiveTool(tool),
  moveLocation: (id, placement) => model.moveLocation(id, placement),
  swapAreas: (firstId, secondId) => model.swapArea(firstId, secondId),
  connect: (sourceId, targetId) => model.connectLocations(sourceId, targetId),
  disconnect: (sourceId, targetId) => model.disconnectLocations(sourceId, targetId),
  undo: () => model.undo(),
  redo: () => model.redo(),
  reset: () => model.reset(),
  exportDocument: () => model.exportDocument(),
  importDocument: (candidate) => model.importDocument(candidate),
});

console.info(
  `%c${APP_CONFIG.appName} Editor ${APP_CONFIG.version}%c\nBorrador separado del progreso estudiantil. Ejecuta OrbitEditor.help().`,
  "color:#78e3ff;font-weight:700;font-size:14px",
  "color:#a9bfd0",
);

let editorDestroyed = false;
window.addEventListener("pagehide", (event) => {
  if (event.persisted || editorDestroyed) return;
  editorDestroyed = true;
  ui.destroy();
  app.destroy();
  model.destroy();
});
