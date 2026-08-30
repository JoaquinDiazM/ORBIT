import { APP_CONFIG } from "../config.js";
import {
  getProfileCapabilities,
  getProfileLabel,
  resolveEditorProfile,
} from "../core/profile-policy.js";
import { ProgressStorage } from "../core/storage.js";
import {
  BowerbirdPreferencesModel,
  createBowerbirdStorageKey,
} from "../core/bowerbird-preferences.js";
import {
  inspectCourseApplicationTransaction,
  recoverCourseApplication,
} from "../core/course-application.js";
import { loadCourseEdition } from "../core/course-edition.js";
import { withExclusiveCourseLock } from "../core/course-lock.js";
import { validateProjectData } from "../core/validator.js";
import { CourseApplicationCoordinator } from "./course-application-coordinator.js";
import { EditorAuthorClient } from "./editor-author-client.js";
import { EditorLocalServiceClient } from "./editor-local-service-client.js";
import { EDITOR_DOCUMENT_SCHEMA_VERSION } from "./editor-document.js";
import { EditorApp } from "./editor-app.js";
import { EditorBowerbirdSession } from "./bowerbird-session.js";
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
      draftBadge.textContent = "apariencia personal";
      draftBadge.title = "Bowerbird guarda una apariencia local separada del curso.";
    }
    canvas?.setAttribute(
      "aria-label",
      "Mapa de ORBIT Editor con Bowerbird personal. Selecciona zonas para decorarlas; Spider y Bee están bloqueados.",
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
  const startupTransaction = inspectCourseApplicationTransaction({
    courseId: APP_CONFIG.activeCourseId,
  });
  const browserRecovery = startupTransaction.pending
    ? await withExclusiveCourseLock(
        () => recoverCourseApplication({ courseId: APP_CONFIG.activeCourseId }),
        { courseId: APP_CONFIG.activeCourseId },
      )
    : { ok: true, recovered: false, action: "none" };
  if (browserRecovery.recovered) {
    console.info(`Se recuperó el journal local del curso: ${browserRecovery.action}.`);
  }
  const course = await loadCourseEdition();
  const validation = validateProjectData({
    areas: course.areas,
    locations: course.locations,
  });
  if (validation.errors.length > 0) {
    console.error("La edición activa del curso contiene errores:", validation.errors);
    throw new Error("ORBIT Editor no puede abrir un curso cuya cartografía es inválida.");
  }
  const courseWarnings = [...course.warnings];
  if (courseWarnings.length > 0) {
    console.warn("Advertencias de la edición activa:", courseWarnings);
  }

  const canvas = document.querySelector("#world-canvas");
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("No se encontró el canvas principal de ORBIT Editor.");
  }

  const storageKey = `orbit-editor:v${EDITOR_DOCUMENT_SCHEMA_VERSION}:${course.courseId}`;
  const editorStorage = new ProgressStorage(
    storageKey,
    undefined,
    [`orbit-editor:v1:${course.courseId}`],
  );
  const documentOptions = {
    baseAreas: course.areas,
    baseLocations: course.locations,
    courseId: course.courseId,
    baseDataVersion: course.edition.document.baseDataVersion,
  };
  const model = EditorModel.create({
    storage: editorStorage,
    readOnly: editorAccess === "read-only",
    ...documentOptions,
  });
  const modelValidation = model.validate();
  if (!modelValidation.valid) {
    console.error("El borrador editorial no superó la validación:", modelValidation.errors);
    throw new Error("El borrador editorial no pudo materializarse de forma segura.");
  }

  const personalPreferences = editorAccess === "read-only"
    ? new BowerbirdPreferencesModel({
        storageKey: createBowerbirdStorageKey({ courseId: course.courseId, profile }),
        baseAreas: course.areas,
        courseId: course.courseId,
      })
    : null;
  const applicationCoordinator = editorAccess === "full"
    ? new CourseApplicationCoordinator({
        currentEdition: course.edition,
        authorClient: new EditorAuthorClient(),
        documentOptions,
      })
    : null;
  const localServiceClient = editorAccess === "full"
    ? new EditorLocalServiceClient()
    : null;
  const bowerbird = new EditorBowerbirdSession({
    editorModel: model,
    personalPreferences,
    publishedAreas: course.areas,
  });
  const renderer = new EditorRenderer(canvas);
  const app = new EditorApp({ canvas, model, renderer, bowerbird });
  const ui = new EditorUIController({
    model,
    app,
    bowerbird,
    applicationCoordinator,
    localServiceClient,
    courseEdition: course,
    courseWarnings,
  });
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
        courseId: course.courseId,
        courseRevision: course.courseRevision,
        courseSource: course.source,
        methods: editorAccess === "full"
          ? [
              "snapshot()",
              "validate()",
              "selectTool('spider' | 'bee' | 'bowerbird')",
              "setAreaAppearance(areaId, appearance)",
              "resetAreaAppearance(areaId)",
              "moveLocation(id, placement)",
              "swapAreas(firstId, secondId)",
              "connect(sourceId, targetId)",
              "disconnect(sourceId, targetId)",
              "undo()",
              "redo()",
              "reset()",
              "exportDocument()",
              "importDocument(object)",
              "courseEdition()",
            ]
          : [
              "snapshot()",
              "validate()",
              "appearanceSnapshot()",
              "selectBowerbird()",
              "setAreaAppearance(areaId, appearance)",
              "resetAreaAppearance(areaId)",
              "exportPersonalPreferences()",
              "courseEdition()",
            ],
      };
    },
    snapshot: () => ({
      editor: app.getState(),
      course: model.getSnapshot(),
      bowerbird: bowerbird.getSnapshot(),
    }),
    validate: () => model.validate(),
    courseEdition: () => ({
      courseId: course.courseId,
      revision: applicationCoordinator?.getSnapshot().currentEdition.revision
        ?? course.courseRevision,
      source: course.source,
    }),
    appearanceSnapshot: () => bowerbird.getSnapshot(),
    selectBowerbird: () => app.setActiveTool("bowerbird"),
    setAreaAppearance: (areaId, appearance) => bowerbird.setAreaAppearance(areaId, appearance),
    resetAreaAppearance: (areaId) => bowerbird.resetAreaAppearance(areaId),
    exportPersonalPreferences: () => bowerbird.exportPersonalPreferences(),
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
          exportDocument: () => model.exportDocument(),
          importDocument: (candidate) => model.importDocument(candidate),
        }
      : safeApi,
  );

  console.info(
    `%c${APP_CONFIG.appName} Editor ${APP_CONFIG.version}%c\nPerfil local: ${getProfileLabel(profile)} · acceso ${editorAccess} · edición ${course.courseRevision} (${course.source}).`,
    "color:#78e3ff;font-weight:700;font-size:14px",
    "color:#a9bfd0",
  );

  let editorDestroyed = false;
  window.addEventListener("pagehide", (event) => {
    if (event.persisted || editorDestroyed) return;
    editorDestroyed = true;
    ui.destroy();
    app.destroy();
    bowerbird.destroy();
    model.destroy();
  });
}
