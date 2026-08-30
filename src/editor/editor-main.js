import { APP_CONFIG } from "../config.js";
import {
  getProfileCapabilities,
  getProfileLabel,
  resolveEditorProfile,
} from "../core/profile-policy.js";
import { validateProjectData } from "../core/validator.js";
import { EDITOR_COURSE_ID, EDITOR_DOCUMENT_SCHEMA_VERSION } from "./editor-document.js";
import { EditorApp } from "./editor-app.js";
import { EditorModel } from "./editor-model.js";
import { EditorRenderer } from "./editor-renderer.js";
import { EditorUIController } from "./editor-ui-controller.js";

function finishStartup() {
  requestAnimationFrame(() => {
    const loadingScreen = document.querySelector("#loading-screen");
    loadingScreen?.classList.add("is-hidden");
    window.setTimeout(() => {
      if (loadingScreen) loadingScreen.hidden = true;
    }, 320);
    window.OrbitStartup?.ready();
  });
}

function configureProfileShell(profile, editorAccess) {
  const shell = document.querySelector("#app");
  const notice = document.querySelector("#editor-access-notice");
  const noticeTitle = document.querySelector("#editor-access-title");
  const noticeDetail = document.querySelector("#editor-access-detail");
  const draftBadge = document.querySelector("#editor-draft-badge");
  const returnLink = document.querySelector("#editor-return-link");
  const canvas = document.querySelector("#world-canvas");
  if (shell) shell.dataset.access = editorAccess;

  const orbitUrl = new URL("./index.html", window.location.href);
  orbitUrl.search = "";
  orbitUrl.searchParams.set("profile", profile);
  if (profile === APP_CONFIG.debugProfile) orbitUrl.searchParams.set("debug", "1");
  if (returnLink) returnLink.href = orbitUrl.href;

  if (editorAccess === "read-only") {
    if (draftBadge) {
      draftBadge.textContent = "solo lectura";
      draftBadge.title = "Consulta local sin permisos de edición.";
    }
    notice.hidden = false;
    noticeTitle.textContent = "Perfil estudiante · solo lectura";
    noticeDetail.textContent = "Spider y Bee están bloqueados. Puedes consultar, encuadrar y recorrer el mapa; esta limitación local no es autenticación.";
    canvas?.setAttribute(
      "aria-label",
      "Mapa de ORBIT Editor en consulta. Usa arrastre, rueda o flechas para recorrerlo; Spider y Bee están bloqueados.",
    );
  } else if (editorAccess === "blocked") {
    if (draftBadge) {
      draftBadge.textContent = "acceso bloqueado";
      draftBadge.title = "El perfil debug no inicia el modelo editorial.";
    }
    notice.hidden = false;
    noticeTitle.textContent = "ORBIT Editor no está disponible en el perfil debug";
    noticeDetail.textContent = "Vuelve a ORBIT o cambia a un perfil estudiante o docente. Este bloqueo local no es autenticación.";
    notice.setAttribute("tabindex", "-1");
    notice.focus({ preventScroll: true });
  }
}

const url = new URL(window.location.href);
const profile = resolveEditorProfile({ requestedProfile: url.searchParams.get("profile") });
const profileCapabilities = getProfileCapabilities(profile);
const editorAccess = profileCapabilities.editorAccess;
configureProfileShell(profile, editorAccess);

if (editorAccess === "blocked") {
  window.OrbitEditor = Object.freeze({
    help: () => ({
      mode: "ORBIT Editor",
      profile,
      access: editorAccess,
      message: "El perfil debug no inicia el modelo editorial.",
    }),
  });
  finishStartup();
  console.info(
    `%c${APP_CONFIG.appName} Editor ${APP_CONFIG.version}%c\nAcceso local bloqueado para el perfil ${getProfileLabel(profile)}.`,
    "color:#78e3ff;font-weight:700;font-size:14px",
    "color:#a9bfd0",
  );
} else {
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
  const model = EditorModel.create({
    storageKey,
    readOnly: editorAccess === "read-only",
  });
  const modelValidation = model.validate();
  if (!modelValidation.valid) {
    console.error("El borrador editorial no superó la validación:", modelValidation.errors);
    throw new Error("El borrador editorial no pudo materializarse de forma segura.");
  }

  const renderer = new EditorRenderer(canvas);
  const app = new EditorApp({ canvas, model, renderer });
  const ui = new EditorUIController({ model, app });
  app.start();
  finishStartup();

  const safeApi = {
    help() {
      return {
        mode: "ORBIT Editor",
        version: APP_CONFIG.version,
        profile,
        access: editorAccess,
        storageKey,
        methods: editorAccess === "full"
          ? [
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
            ]
          : ["snapshot()", "validate()", "exportDocument()"],
      };
    },
    snapshot: () => ({ editor: app.getState(), course: model.getSnapshot() }),
    validate: () => model.validate(),
    exportDocument: () => model.exportDocument(),
  };
  window.OrbitEditor = Object.freeze(
    editorAccess === "full"
      ? {
          ...safeApi,
          selectTool: (tool) => app.setActiveTool(tool),
          moveLocation: (id, placement) => model.moveLocation(id, placement),
          swapAreas: (firstId, secondId) => model.swapArea(firstId, secondId),
          connect: (sourceId, targetId) => model.connectLocations(sourceId, targetId),
          disconnect: (sourceId, targetId) => model.disconnectLocations(sourceId, targetId),
          undo: () => model.undo(),
          redo: () => model.redo(),
          reset: () => model.reset(),
          importDocument: (candidate) => model.importDocument(candidate),
        }
      : safeApi,
  );

  console.info(
    `%c${APP_CONFIG.appName} Editor ${APP_CONFIG.version}%c\nPerfil local: ${getProfileLabel(profile)} · acceso ${editorAccess}.`,
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
}
