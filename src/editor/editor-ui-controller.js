import {
  AREA_APPEARANCE_CONTOURS,
  AREA_APPEARANCE_MOTIFS,
  AREA_APPEARANCE_PALETTES,
  DEFAULT_AREA_APPEARANCE,
} from "../core/area-appearance.js";
import { EditorServiceMonitor } from "./editor-service-monitor.js";

const EDITOR_AUTHOR_ORIGIN = "http://127.0.0.1:4173";
const SERVICE_STOPPED_ACTION_MESSAGE =
  "Servidor detenido: aplicar permanece bloqueado hasta verificar el próximo servicio local.";

export function shouldRetryEditorService({
  origin,
  session,
  mode,
  authorReady,
  pendingResolution,
} = {}) {
  if (origin !== EDITOR_AUTHOR_ORIGIN) return false;
  return !session || (
    mode === "editor-author"
    && !authorReady
    && !pendingResolution
  );
}

function query(selector, root = document) {
  const node = root.querySelector(selector);
  if (!node) throw new Error(`Falta el control requerido del editor: ${selector}`);
  return node;
}

function isTextEntry(target) {
  return Boolean(target?.closest?.("input, textarea, select, [contenteditable='true']"));
}

export function getEditorHistoryAction(event) {
  if (isTextEntry(event?.target)) return null;
  const modifier = Boolean(event?.ctrlKey || event?.metaKey);
  if (!modifier) return null;
  if (event.code === "KeyZ") return event.shiftKey ? "redo" : "undo";
  if (event.code === "KeyY") return "redo";
  return null;
}

export function getReadOnlyCameraPan(event) {
  const directions = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  };
  const direction = directions[event?.code];
  if (!direction) return null;
  const step = event.shiftKey ? 96 : 32;
  return {
    dx: direction[0] === 0 ? 0 : -direction[0] * step,
    dy: direction[1] === 0 ? 0 : -direction[1] * step,
  };
}

const READ_ONLY_RESTRICTION_MESSAGES = Object.freeze({
  spider: "Spider requiere el perfil Docente.",
  bee: "Bee requiere el perfil Docente.",
  undo: "Deshacer cambios requiere el perfil Docente.",
  redo: "Rehacer cambios requiere el perfil Docente.",
  export: "Exportar el borrador requiere el perfil Docente.",
  import: "Importar borradores requiere el perfil Docente.",
  reset: "Restaurar el borrador requiere el perfil Docente.",
});

export function getReadOnlyRestrictionMessage(action) {
  return READ_ONLY_RESTRICTION_MESSAGES[action]
    ?? "Esta función requiere el perfil Docente.";
}

export function fitEditorWorld({ app, inspector, canvas }) {
  inspector.hidden = true;
  canvas.focus({ preventScroll: true });
  return app.fitWorld();
}

function downloadJson(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function timestampLabel(value) {
  const date = new Date(value ?? "");
  if (Number.isNaN(date.getTime())) return "Guardado localmente";
  return `Guardado · ${new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)}`;
}

export function getEditorMutationNotice(
  result,
  successMessage,
  { quietSuccess = false, fallbackMessage = "La operación no superó la validación del editor." } = {},
) {
  if (!result?.ok) {
    return {
      accepted: false,
      message: result?.errors?.[0]?.message ?? fallbackMessage,
      level: "error",
    };
  }
  if (result.changed && !quietSuccess) {
    return { accepted: true, message: successMessage, level: "success" };
  }
  return { accepted: true, message: null, level: null };
}

function entryCount(entries) {
  return Array.isArray(entries) ? entries.length : 0;
}

function issueCountLabel(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function getEditorImportFeedback(result) {
  if (!result?.ok) {
    return {
      publishable: false,
      errorCount: 0,
      warningCount: 0,
      message: null,
      level: null,
    };
  }

  const errorCount = entryCount(result.snapshot?.validation?.errors);
  const warningCount = entryCount(result.snapshot?.warnings);
  if (errorCount > 0) {
    return {
      publishable: false,
      errorCount,
      warningCount,
      message: `Borrador importado como editable, pero no es publicable: la validación académica detectó ${issueCountLabel(errorCount, "error", "errores")}. Revisa el Resumen.`,
      level: "warning",
    };
  }
  if (warningCount > 0) {
    return {
      publishable: true,
      errorCount,
      warningCount,
      message: `Borrador importado y publicable con ${issueCountLabel(warningCount, "advertencia", "advertencias")}. Revisa el Resumen.`,
      level: "warning",
    };
  }
  return {
    publishable: true,
    errorCount,
    warningCount,
    message: "Borrador importado y publicable.",
    level: "success",
  };
}

export function getEditorDraftBadge({
  readOnly = false,
  snapshot = {},
  appearanceSnapshot = {},
} = {}) {
  if (readOnly) {
    const warningCount = entryCount(appearanceSnapshot.warnings);
    return {
      text: warningCount > 0
        ? issueCountLabel(warningCount, "advertencia", "advertencias")
        : "apariencia personal",
      title: "Bowerbird guarda una apariencia local separada del borrador Docente.",
    };
  }

  const errorCount = entryCount(snapshot.validation?.errors);
  const warningCount = entryCount(snapshot.warnings);
  if (errorCount > 0) {
    const warningDetail = warningCount > 0
      ? ` También hay ${issueCountLabel(warningCount, "advertencia", "advertencias")}.`
      : "";
    return {
      text: `${issueCountLabel(errorCount, "error", "errores")} · no publicable`,
      title: `La validación académica bloquea la publicación. Abre Resumen para revisar los errores del borrador.${warningDetail}`,
    };
  }
  if (warningCount > 0) {
    return {
      text: issueCountLabel(warningCount, "advertencia", "advertencias"),
      title: "Abre Resumen para revisar las advertencias del borrador.",
    };
  }
  return {
    text: "borrador local",
    title: "Borrador editorial guardado localmente.",
  };
}

function edgeKindsLabel(requirementKinds = []) {
  if (requirementKinds.length === 0) return "dependencia explícita de aprendizaje";
  const labels = {
    completedLocations: "dependencia explícita de aprendizaje",
  };
  return requirementKinds.map((kind) => labels[kind] ?? kind).join(" + ");
}

function isAcademicLocation(location) {
  return ["lesson", "mission"].includes(location?.kind);
}

function listSummary(entries = []) {
  return entries.length > 0 ? `${entries.length} · ${entries.join(", ")}` : "0";
}

function courseSourceLabel(source) {
  const labels = {
    published: "archivo publicado validado",
    browser: "edición local validada del navegador",
    applied: "fuente, build y navegador sincronizados",
  };
  return labels[source] ?? String(source ?? "desconocida");
}

function profileLabel(profile) {
  const labels = { student: "Estudiante", teacher: "Docente", debug: "Debug" };
  return labels[profile] ?? String(profile ?? "—");
}

export class EditorUIController {
  constructor({
    model,
    app,
    bowerbird,
    applicationCoordinator = null,
    localServiceClient = null,
    courseEdition = null,
    courseWarnings = [],
  }) {
    this.model = model;
    this.app = app;
    this.bowerbird = bowerbird;
    this.applicationCoordinator = applicationCoordinator;
    this.localServiceClient = localServiceClient;
    this.courseEdition = courseEdition;
    this.courseWarnings = structuredClone(courseWarnings);
    this.readOnly = Boolean(model.getSnapshot().readOnly);
    this.currentView = this.readOnly ? "bowerbird" : "spider";
    this.toastTimer = null;
    this.resetConfirmationTimer = null;
    this.resetArmed = false;
    this.shutdownConfirmationTimer = null;
    this.shutdownArmed = false;
    this.shutdownBusy = false;
    this.applicationPlan = null;
    this.applicationBusy = false;
    this.applicationGeneration = 0;
    this.applicationProbeStarted = false;
    this.applicationProbeRunning = false;
    this.localServiceMode = "unknown";
    this.localServiceDiagnostic = null;
    this.authorSessionReady = false;
    this.applicationActionMessage = null;
    this.pendingResolution = null;
    this.applicationEvidence = null;
    this.reloadRequired = false;
    this.helperStatusText = "Sin comprobar";
    this.destroyed = false;

    this.elements = {
      shell: query("#app"),
      canvas: query("#world-canvas"),
      generalDock: query("#editor-general-dock"),
      toolsDock: query("#editor-tools-dock"),
      generalCollapse: query("#editor-general-collapse"),
      toolsCollapse: query("#editor-tools-collapse"),
      inspector: query("#editor-inspector"),
      inspectorTitle: query("#editor-inspector-title"),
      inspectorEyebrow: query("#editor-inspector-eyebrow"),
      spiderPanel: query("#editor-spider-panel"),
      beePanel: query("#editor-bee-panel"),
      bowerbirdPanel: query("#editor-bowerbird-panel"),
      overviewPanel: query("#editor-overview-panel"),
      warningSummary: query("#editor-warning-summary"),
      warningList: query("#editor-warning-list"),
      courseApplication: query("#editor-course-application"),
      currentRevision: query("#editor-current-revision"),
      currentSource: query("#editor-current-source"),
      helperStatus: query("#editor-author-helper-status"),
      serviceModeStatus: query("#editor-service-mode-status"),
      validateApplication: query("#editor-validate-application"),
      retryService: query("#editor-retry-service"),
      applicationStatus: query("#editor-application-status"),
      pendingApplication: query("#editor-pending-application"),
      pendingDetail: query("#editor-pending-detail"),
      recoverApplication: query("#editor-recover-application"),
      applicationPlan: query("#editor-application-plan"),
      diffAreas: query("#editor-diff-areas"),
      diffLocations: query("#editor-diff-locations"),
      diffAppearances: query("#editor-diff-appearances"),
      diffAddedConnections: query("#editor-diff-added-connections"),
      diffRemovedConnections: query("#editor-diff-removed-connections"),
      validationReachability: query("#editor-validation-reachability"),
      applicationImpact: query("#editor-application-impact"),
      confirmApplication: query("#editor-confirm-application"),
      applyReadiness: query("#editor-apply-readiness"),
      applyCourse: query("#editor-apply-course"),
      applicationEvidence: query("#editor-application-evidence"),
      appliedRevision: query("#editor-applied-revision"),
      appliedDigest: query("#editor-applied-digest"),
      appliedBuild: query("#editor-applied-build"),
      appliedProfiles: query("#editor-applied-profiles"),
      appliedPreserved: query("#editor-applied-preserved"),
      appliedNextStep: query("#editor-applied-next-step"),
      helpPanel: query("#editor-help-panel"),
      spiderButton: query("#editor-open-spider"),
      beeButton: query("#editor-open-bee"),
      bowerbirdButton: query("#editor-open-bowerbird"),
      locationSelect: query("#editor-location-select"),
      locationArea: query("#editor-location-area"),
      locationX: query("#editor-location-x"),
      locationY: query("#editor-location-y"),
      applyLocation: query("#editor-apply-location"),
      networkMembership: query("#editor-network-membership"),
      toggleNetworkLocation: query("#editor-toggle-network-location"),
      sourceSelect: query("#editor-connection-source"),
      targetSelect: query("#editor-connection-target"),
      addConnection: query("#editor-add-connection"),
      connectionList: query("#editor-connection-list"),
      ringOneList: query("#editor-ring-one-list"),
      ringTwoList: query("#editor-ring-two-list"),
      selectedAreaSummary: query("#editor-selected-area-summary"),
      previousArea: query("#editor-area-previous"),
      nextArea: query("#editor-area-next"),
      bowerbirdArea: query("#editor-bowerbird-area"),
      bowerbirdPalette: query("#editor-bowerbird-palette"),
      bowerbirdMotif: query("#editor-bowerbird-motif"),
      bowerbirdContour: query("#editor-bowerbird-contour"),
      bowerbirdPaletteDescription: query("#editor-bowerbird-palette-description"),
      bowerbirdMotifDescription: query("#editor-bowerbird-motif-description"),
      bowerbirdContourDescription: query("#editor-bowerbird-contour-description"),
      bowerbirdReset: query("#editor-bowerbird-reset"),
      bowerbirdScope: query("#editor-bowerbird-scope"),
      undo: query("#editor-undo"),
      redo: query("#editor-redo"),
      reset: query("#editor-reset"),
      shutdownButton: query("#editor-shutdown-local"),
      exportButton: query("#editor-export"),
      activeTool: query("#editor-active-tool"),
      areaCount: query("#editor-area-count"),
      locationCount: query("#editor-location-count"),
      saveStatus: query("#editor-save-status"),
      draftBadge: query("#editor-draft-badge"),
      importControl: query("#editor-import-control"),
      importInput: query("#editor-import"),
      toastRegion: query("#toast-region"),
    };

    if (this.readOnly) this.#applyReadOnlyControls();
    this.elements.courseApplication.hidden = !this.applicationCoordinator;
    this.elements.shutdownButton.hidden = true;
    this.serviceMonitor = this.localServiceClient
      ? new EditorServiceMonitor({
          probe: () => this.#refreshApplicationCapability({ announceReady: false }),
          shouldRetry: ({ result }) => Boolean(result?.transient),
        })
      : null;

    this.#bindEvents();
    this.unsubscribeModel = this.model.subscribe(() => {
      this.#invalidateApplicationPlan("El borrador cambió; vuelve a validar su impacto.");
      this.render();
    });
    this.unsubscribeBowerbird = this.bowerbird.subscribe(() => this.render());
    this.unsubscribeApp = this.app.subscribe((event) => {
      if (event?.message) this.toast(event.message, event.level ?? "info");
      this.render();
    });
    this.render();
    if (this.serviceMonitor) void this.serviceMonitor.start();
  }

  destroy() {
    this.destroyed = true;
    this.unsubscribeModel?.();
    this.unsubscribeBowerbird?.();
    this.unsubscribeApp?.();
    this.serviceMonitor?.destroy();
    window.removeEventListener("keydown", this.onKeyDown);
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
    if (this.resetConfirmationTimer !== null) {
      window.clearTimeout(this.resetConfirmationTimer);
    }
    if (this.shutdownConfirmationTimer !== null) {
      window.clearTimeout(this.shutdownConfirmationTimer);
    }
  }

  #applyReadOnlyControls() {
    for (const [button, action] of [
      [this.elements.spiderButton, "spider"],
      [this.elements.beeButton, "bee"],
    ]) {
      button.setAttribute("aria-disabled", "true");
      button.disabled = false;
      button.title = getReadOnlyRestrictionMessage(action);
    }
    for (const [button, action] of [
      [this.elements.undo, "undo"],
      [this.elements.redo, "redo"],
      [this.elements.reset, "reset"],
      [this.elements.exportButton, "export"],
    ]) {
      button.setAttribute("aria-disabled", "true");
      button.disabled = false;
      button.title = getReadOnlyRestrictionMessage(action);
    }
    this.elements.importInput.disabled = true;
    this.elements.importControl.classList.add("is-disabled");
    this.elements.importControl.setAttribute("aria-disabled", "true");
    this.elements.importControl.setAttribute("role", "button");
    this.elements.importControl.setAttribute("tabindex", "0");
    this.elements.importControl.title = getReadOnlyRestrictionMessage("import");
    for (const panel of [this.elements.spiderPanel, this.elements.beePanel]) {
      panel.inert = true;
      panel.setAttribute("aria-disabled", "true");
      for (const control of panel.querySelectorAll("button, input, select")) {
        control.disabled = true;
      }
    }
  }

  #bindEvents() {
    const on = (selector, type, handler) => query(selector).addEventListener(type, handler);

    this.elements.generalCollapse.addEventListener("click", () =>
      this.#toggleDock(this.elements.generalDock, this.elements.generalCollapse, "menú general"),
    );
    this.elements.toolsCollapse.addEventListener("click", () =>
      this.#toggleDock(this.elements.toolsDock, this.elements.toolsCollapse, "menú editorial"),
    );
    on("#editor-open-spider", "click", () => this.showView("spider"));
    on("#editor-open-bee", "click", () => this.showView("bee"));
    on("#editor-open-bowerbird", "click", () => this.showView("bowerbird"));
    on("#editor-open-overview", "click", () => this.showView("overview"));
    on("#editor-open-help", "click", () => this.showView("help"));
    on("#editor-close-inspector", "click", () => {
      this.elements.inspector.hidden = true;
      this.elements.canvas.focus({ preventScroll: true });
    });
    on("#editor-fit-world", "click", () =>
      fitEditorWorld({
        app: this.app,
        inspector: this.elements.inspector,
        canvas: this.elements.canvas,
      }),
    );
    on("#editor-undo", "click", () => {
      if (this.readOnly) return this.#announceReadOnlyRestriction("undo");
      return this.#report(this.model.undo(), "Cambio deshecho.");
    });
    on("#editor-redo", "click", () => {
      if (this.readOnly) return this.#announceReadOnlyRestriction("redo");
      return this.#report(this.model.redo(), "Cambio rehecho.");
    });
    on("#editor-export", "click", () => {
      if (this.readOnly) {
        this.#announceReadOnlyRestriction("export");
        return;
      }
      const date = new Date().toISOString().slice(0, 10);
      downloadJson(`orbit-editor-electromagnetismo-${date}.json`, this.model.exportDocument());
      this.toast("Borrador editorial exportado.", "success");
    });
    on("#editor-reset", "click", () => this.#requestDraftReset());
    on("#editor-shutdown-local", "click", () => {
      void this.#requestLocalShutdown();
    });

    this.elements.importControl.addEventListener("click", (event) => {
      if (!this.readOnly) return;
      event.preventDefault();
      this.#announceReadOnlyRestriction("import");
    });
    this.elements.importControl.addEventListener("keydown", (event) => {
      if (!this.readOnly || !["Enter", "Space"].includes(event.code)) return;
      event.preventDefault();
      this.#announceReadOnlyRestriction("import");
    });

    this.elements.importInput.addEventListener("change", async () => {
      const [file] = this.elements.importInput.files ?? [];
      this.elements.importInput.value = "";
      if (!file) return;
      try {
        const candidate = JSON.parse(await file.text());
        const result = this.model.importDocument(candidate);
        const feedback = getEditorImportFeedback(result);
        const accepted = this.#report(
          result,
          feedback.message ?? "Borrador importado.",
          { quietSuccess: feedback.level === "warning" },
        );
        if (accepted && feedback.level === "warning") {
          this.showView("overview");
          this.toast(feedback.message, feedback.level, 7000);
        }
      } catch (error) {
        this.toast(`No fue posible importar el JSON: ${error.message}`, "error");
      }
    });

    for (const radio of document.querySelectorAll('input[name="editor-spider-mode"]')) {
      radio.addEventListener("change", () => {
        if (radio.checked) this.app.setSpiderMode(radio.value);
      });
    }
    this.elements.locationSelect.addEventListener("change", () =>
      this.app.selectLocation(this.elements.locationSelect.value),
    );
    this.elements.sourceSelect.addEventListener("change", () =>
      this.app.selectLocation(this.elements.sourceSelect.value),
    );
    this.elements.applyLocation.addEventListener("click", () => this.#applyLocationForm());
    this.elements.toggleNetworkLocation.addEventListener("click", () => {
      const snapshot = this.model.getSnapshot();
      const locationId = this.app.getState().selectedLocationId;
      const location = snapshot.locations.find((entry) => entry.id === locationId);
      if (!isAcademicLocation(location)) return;
      const memberIds = new Set(snapshot.learningNetworkLocationIds ?? []);
      const removing = memberIds.has(locationId);
      const result = removing
        ? this.model.removeLocationFromLearningNetwork(locationId)
        : this.model.addLocationToLearningNetwork(locationId);
      this.#report(
        result,
        removing
          ? "Nodo retirado de la Red de aprendizaje."
          : "Nodo añadido a la Red de aprendizaje.",
      );
    });
    for (const button of document.querySelectorAll("[data-nudge-x][data-nudge-y]")) {
      button.addEventListener("click", (event) => {
        const multiplier = event.shiftKey ? 10 : 4;
        this.#nudgeSelected(
          Number(button.dataset.nudgeX) * multiplier,
          Number(button.dataset.nudgeY) * multiplier,
        );
      });
    }
    this.elements.addConnection.addEventListener("click", () => {
      const result = this.model.connectLocations(
        this.elements.sourceSelect.value,
        this.elements.targetSelect.value,
      );
      this.#report(result, "Conexión Spider añadida.");
    });
    this.elements.previousArea.addEventListener("click", () => this.#swapSelectedArea(-1));
    this.elements.nextArea.addEventListener("click", () => this.#swapSelectedArea(1));
    this.elements.bowerbirdArea.addEventListener("change", () => {
      this.app.selectArea(this.elements.bowerbirdArea.value);
      this.render();
    });
    for (const select of [
      this.elements.bowerbirdPalette,
      this.elements.bowerbirdMotif,
      this.elements.bowerbirdContour,
    ]) {
      select.addEventListener("change", () => this.#applyBowerbirdAppearance());
    }
    this.elements.bowerbirdReset.addEventListener("click", () => {
      const areaId = this.app.getState().selectedAreaId;
      if (!areaId) return;
      this.#report(
        this.bowerbird.resetAreaAppearance(areaId),
        this.readOnly
          ? "La zona vuelve a heredar la apariencia del curso."
          : "Apariencia canónica restaurada en el borrador.",
      );
    });
    this.elements.validateApplication.addEventListener("click", () => {
      void this.#validateCourseApplication();
    });
    this.elements.retryService.addEventListener("click", () => {
      void this.#retryServiceDetection();
    });
    this.elements.confirmApplication.addEventListener("change", () => {
      this.#renderApplicationState();
    });
    this.elements.applyCourse.addEventListener("click", () => {
      void this.#applyCourseEdition();
    });
    this.elements.recoverApplication.addEventListener("click", () => {
      if (this.reloadRequired) {
        window.location.reload();
        return;
      }
      void this.#recoverPendingApplication();
    });

    this.onKeyDown = (event) => this.#handleKeyDown(event);
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
  }

  #toggleDock(dock, button, label) {
    const collapsed = dock.classList.toggle("is-collapsed");
    button.setAttribute("aria-expanded", String(!collapsed));
    button.setAttribute("aria-label", `${collapsed ? "Expandir" : "Minimizar"} ${label}`);
    button.title = `${collapsed ? "Expandir" : "Minimizar"} ${label}`;
  }

  #requestDraftReset() {
    if (this.readOnly) {
      this.#announceReadOnlyRestriction("reset");
      return;
    }
    if (!this.resetArmed) {
      this.resetArmed = true;
      this.elements.reset.textContent = "Confirmar restauración";
      this.elements.reset.setAttribute("aria-pressed", "true");
      this.toast(
        "Pulsa «Confirmar restauración» para iniciar un nuevo historial editorial.",
        "warning",
        7000,
      );
      if (this.resetConfirmationTimer !== null) {
        window.clearTimeout(this.resetConfirmationTimer);
      }
      this.resetConfirmationTimer = window.setTimeout(() => this.#disarmDraftReset(), 8000);
      return;
    }
    this.#disarmDraftReset();
    this.#report(this.model.reset(), "Borrador restaurado a la cartografía canónica.");
  }

  #disarmDraftReset() {
    this.resetArmed = false;
    this.elements.reset.textContent = "Restaurar";
    this.elements.reset.setAttribute("aria-pressed", "false");
    if (this.resetConfirmationTimer !== null) {
      window.clearTimeout(this.resetConfirmationTimer);
      this.resetConfirmationTimer = null;
    }
  }

  async #probeLocalServiceControl() {
    try {
      const session = await this.localServiceClient.connect();
      if (this.destroyed) return;
      this.localServiceMode = session.service;
      this.localServiceDiagnostic = null;
      if (this.shutdownBusy) {
        this.shutdownBusy = false;
        this.#disarmLocalShutdown();
        this.elements.shutdownButton.setAttribute("aria-busy", "false");
      }
      if (this.applicationActionMessage === SERVICE_STOPPED_ACTION_MESSAGE) {
        this.applicationActionMessage = null;
      }
      this.elements.shutdownButton.hidden = false;
      this.elements.shutdownButton.disabled = false;
      this.elements.shutdownButton.title = session.busy
        ? "Hay una aplicación pendiente o en curso; resuélvela antes de apagar."
        : "Detiene únicamente el servidor ORBIT que sirve esta página.";
      if (session.service === "development") {
        this.authorSessionReady = false;
        this.helperStatusText = "Modo normal · aplicación bloqueada";
      } else if (!this.authorSessionReady) {
        this.helperStatusText = "Mantenimiento · comprobación pendiente";
      }
      return session;
    } catch (error) {
      if (!this.destroyed) {
        this.localServiceMode = "unknown";
        this.localServiceDiagnostic = [
          error?.code ?? "local-service-unavailable",
          Number.isInteger(error?.status) ? `HTTP ${error.status}` : null,
        ].filter(Boolean).join(" · ");
        this.authorSessionReady = false;
        this.helperStatusText = window.location.origin === EDITOR_AUTHOR_ORIGIN
          ? "Reconectando con el servicio local…"
          : "No disponible en este origen";
        this.elements.shutdownButton.hidden = true;
      }
      return null;
    } finally {
      if (!this.destroyed) this.#renderApplicationState();
    }
  }

  async #refreshApplicationCapability({ announceReady = true } = {}) {
    if (!this.localServiceClient || this.destroyed) {
      return { mode: "unknown", authorReady: false, transient: false };
    }
    const session = await this.#probeLocalServiceControl();
    if (this.localServiceMode === "editor-author") {
      await this.#probeAuthorHelper({ announceReady });
    }
    return {
      mode: this.localServiceMode,
      authorReady: this.authorSessionReady,
      transient: shouldRetryEditorService({
        origin: window.location.origin,
        session,
        mode: this.localServiceMode,
        authorReady: this.authorSessionReady,
        pendingResolution: this.pendingResolution,
      }),
    };
  }

  async #retryServiceDetection() {
    if (!this.serviceMonitor || this.applicationBusy || this.destroyed) return;
    this.applicationActionMessage = null;
    this.#setApplicationStatus("Comprobando de nuevo el servicio local…", "info");
    const result = await this.serviceMonitor.refresh();
    if (this.destroyed) return;
    if (result?.mode === "editor-author" && result.authorReady) {
      this.#setApplicationStatus(
        this.applicationPlan
          ? "Modo mantenimiento verificado. El plan validado sigue vigente; ya puedes confirmar."
          : "Modo mantenimiento verificado. Valida la edición para calcular el plan aplicable.",
        "success",
      );
    } else if (result?.mode === "development") {
      this.#setApplicationStatus(
        "Modo normal detectado. Puedes validar, pero aplicar requiere iniciar mantenimiento.",
        "info",
      );
    } else {
      this.#setApplicationStatus(
        "El servicio todavía no responde. El Editor seguirá intentando mientras esta pestaña permanezca abierta.",
        "warning",
      );
    }
    this.#renderApplicationState();
  }

  async #requestLocalShutdown() {
    if (!this.localServiceClient || this.shutdownBusy || this.applicationBusy) return;
    if (!this.shutdownArmed) {
      this.shutdownArmed = true;
      this.elements.shutdownButton.textContent = "Confirmar apagado";
      this.elements.shutdownButton.setAttribute("aria-pressed", "true");
      this.toast(
        "Vuelve a pulsar «Confirmar apagado» para detener este servidor ORBIT.",
        "warning",
        7000,
      );
      if (this.shutdownConfirmationTimer !== null) {
        window.clearTimeout(this.shutdownConfirmationTimer);
      }
      this.shutdownConfirmationTimer = window.setTimeout(
        () => this.#disarmLocalShutdown(),
        8000,
      );
      return;
    }

    this.#disarmLocalShutdown();
    this.shutdownBusy = true;
    this.elements.shutdownButton.disabled = true;
    this.elements.shutdownButton.setAttribute("aria-busy", "true");
    this.elements.shutdownButton.textContent = "Apagando…";
    try {
      await this.localServiceClient.shutdown();
      if (this.destroyed) return;
      this.localServiceMode = "unknown";
      this.authorSessionReady = false;
      this.applicationProbeStarted = false;
      this.applicationActionMessage = SERVICE_STOPPED_ACTION_MESSAGE;
      this.elements.shutdownButton.textContent = "Servidor detenido";
      this.elements.shutdownButton.title = "El servidor local se detuvo; puedes cerrar esta pestaña.";
      this.#renderApplicationState();
      void this.serviceMonitor?.refresh();
      this.toast(
        "Servidor local detenido. Puedes cerrar esta pestaña; reinicia el comando para volver a abrir ORBIT.",
        "success",
        7000,
      );
    } catch (error) {
      if (this.destroyed) return;
      this.shutdownBusy = false;
      this.elements.shutdownButton.disabled = false;
      this.elements.shutdownButton.textContent = "Detener servidor";
      const message = error?.code === "local-service-busy"
        ? "No se apagó: termina o recupera la aplicación pendiente y vuelve a intentarlo."
        : [
            "local-service-unavailable",
            "invalid-local-service-response",
            "invalid-local-service-session",
          ].includes(error?.code)
          ? "Este servidor ya no admite apagado controlado; usa Ctrl+C en su terminal."
          : error?.message ?? "No fue posible detener el servidor local.";
      this.toast(message, "error", 7000);
    } finally {
      if (!this.destroyed) this.elements.shutdownButton.setAttribute("aria-busy", "false");
    }
  }

  #disarmLocalShutdown() {
    this.shutdownArmed = false;
    this.elements.shutdownButton.textContent = "Detener servidor";
    this.elements.shutdownButton.setAttribute("aria-pressed", "false");
    if (this.shutdownConfirmationTimer !== null) {
      window.clearTimeout(this.shutdownConfirmationTimer);
      this.shutdownConfirmationTimer = null;
    }
  }

  #setApplicationStatus(message, level = "info") {
    this.elements.applicationStatus.textContent = message;
    this.elements.applicationStatus.dataset.level = level;
  }

  #setApplicationBusy(busy) {
    this.applicationBusy = Boolean(busy);
    this.elements.shell.dataset.applying = String(this.applicationBusy);
    this.elements.shell.setAttribute("aria-busy", String(this.applicationBusy));
    this.elements.inspector.inert = this.applicationBusy;
    this.elements.generalDock.inert = this.applicationBusy;
    this.elements.toolsDock.inert = this.applicationBusy;
    this.elements.canvas.inert = this.applicationBusy;
    this.#renderApplicationState();
  }

  #invalidateApplicationPlan(message = null) {
    this.applicationGeneration += 1;
    this.applicationCoordinator?.invalidate();
    this.applicationPlan = null;
    this.applicationActionMessage = null;
    this.elements.confirmApplication.checked = false;
    if (message && !this.applicationBusy) this.#setApplicationStatus(message, "warning");
    this.#renderApplicationState();
  }

  #applicationErrorMessage(error) {
    const helperErrors = new Set([
      "author-helper-unavailable",
      "invalid-author-response",
      "invalid-author-session",
      "invalid-author-endpoint",
      "author-request-failed",
    ]);
    if (helperErrors.has(error?.code)) {
      return "El helper local no está disponible o no es compatible. Ejecuta `npm run editor:author` y abre la URL que indique.";
    }
    if (error?.code === "revision-conflict") {
      return "La fuente cambió desde la validación. Recarga el Editor y vuelve a validar el borrador.";
    }
    if (error?.code === "application-plan-stale") {
      return "El borrador cambió después de validarse; vuelve a validar el Resumen.";
    }
    if (error?.code === "course-in-use") {
      return "Otra pestaña de ORBIT usa el curso. Ciérrala antes de aplicar la edición.";
    }
    if (error?.code === "course-locks-unavailable") {
      return "Este navegador no ofrece Web Locks; la aplicación segura queda bloqueada.";
    }
    return error?.message ?? "La operación local no pudo completarse de forma verificable.";
  }

  async #probeAuthorHelper({ announceReady = true } = {}) {
    if (!this.applicationCoordinator || this.applicationProbeRunning || this.destroyed) return;
    this.applicationProbeStarted = true;
    this.applicationProbeRunning = true;
    this.authorSessionReady = false;
    this.helperStatusText = "Comprobando sesión local…";
    this.#renderApplicationState();
    try {
      const resolution = await this.applicationCoordinator.inspectPending();
      if (this.destroyed) return;
      this.localServiceMode = "editor-author";
      this.authorSessionReady = true;
      this.pendingResolution = resolution.action === "none" ? null : resolution;
      if (this.pendingResolution) {
        this.helperStatusText = "Transacción pendiente detectada";
        this.#setApplicationStatus(
          this.pendingResolution.action === "finalize"
            ? "El navegador ya usa la revisión objetivo: la recuperación solo cerrará el journal del helper."
            : "El navegador no usa la revisión objetivo: la recuperación restaurará la fuente y el build anteriores.",
          "warning",
        );
      } else {
        this.helperStatusText = "Mantenimiento conectado · protocolo local v1";
        if (announceReady && !this.applicationPlan) {
          this.#setApplicationStatus(
            "Helper listo. Valida la edición y revisa el impacto antes de confirmar.",
            "success",
          );
        }
      }
    } catch (error) {
      if (this.destroyed) return;
      this.authorSessionReady = false;
      this.helperStatusText = error?.code === "pending-browser-state-ambiguous"
        ? "Pendiente bloqueada por estado ambiguo"
        : error?.code === "course-in-use"
          ? "Mantenimiento conectado · otra pestaña usa el curso"
          : "No disponible";
      this.pendingResolution = error?.code === "pending-browser-state-ambiguous"
        ? { action: "ambiguous", error }
        : null;
      if (error?.code !== "pending-browser-state-ambiguous") {
        this.applicationProbeStarted = false;
      }
      this.#setApplicationStatus(this.#applicationErrorMessage(error), "error");
    } finally {
      this.applicationProbeRunning = false;
      if (!this.destroyed) this.#renderApplicationState();
    }
  }

  async #validateCourseApplication() {
    if (!this.applicationCoordinator || this.applicationBusy || this.reloadRequired) return;
    const candidate = this.model.getSnapshot().document;
    const generation = this.applicationGeneration;
    this.#setApplicationBusy(true);
    this.#setApplicationStatus(
      "Validando cartografía, progresión, diferencias e impacto local…",
      "info",
    );
    try {
      await this.serviceMonitor?.refresh();
      const plan = await this.applicationCoordinator.validate(candidate);
      if (generation !== this.applicationGeneration) {
        this.applicationCoordinator.invalidate();
        this.applicationPlan = null;
        this.#setApplicationStatus(
          "El borrador cambió durante la validación; repite el análisis.",
          "warning",
        );
        return;
      }
      this.applicationPlan = plan;
      this.applicationActionMessage = null;
      this.elements.confirmApplication.checked = false;
      const warningCount = plan.validation.warnings.length;
      this.#setApplicationStatus(
        plan.changed
          ? `Plan válido${warningCount ? ` con ${warningCount} advertencia${warningCount === 1 ? "" : "s"}` : ""}. Revisa el impacto y confirma explícitamente.`
          : "La revisión calculada coincide con la edición activa; no hay nada que aplicar.",
        plan.changed ? (warningCount ? "warning" : "success") : "info",
      );
    } catch (error) {
      this.applicationPlan = null;
      this.elements.confirmApplication.checked = false;
      this.#setApplicationStatus(this.#applicationErrorMessage(error), "error");
    } finally {
      this.#setApplicationBusy(false);
    }
  }

  async #applyCourseEdition() {
    if (
      !this.applicationCoordinator
      || this.applicationBusy
      || !this.applicationPlan?.changed
      || !this.elements.confirmApplication.checked
      || this.pendingResolution
      || this.reloadRequired
    ) return;
    this.applicationActionMessage = null;
    this.#setApplicationBusy(true);
    this.#setApplicationStatus("Comprobando el modo mantenimiento antes de aplicar…", "info");
    await this.serviceMonitor?.refresh();
    if (this.pendingResolution || this.reloadRequired) {
      this.#setApplicationBusy(false);
      return;
    }
    if (this.localServiceMode !== "editor-author" || !this.authorSessionReady) {
      const message = this.localServiceMode === "development"
        ? "Aplicar está bloqueado en modo normal. Detén `dev`, inicia `npm run editor:author` y vuelve a validar la sesión."
        : "No hay una sesión de mantenimiento verificada. Inicia `npm run editor:author` y cierra las demás pestañas de ORBIT.";
      this.applicationActionMessage = message;
      this.#setApplicationStatus(message, "warning");
      this.toast(message, "warning", 7000);
      this.#setApplicationBusy(false);
      this.#renderApplicationState();
      return;
    }
    const candidate = this.model.getSnapshot().document;
    const confirmedPlan = structuredClone(this.applicationPlan);
    this.#setApplicationStatus(
      "Aplicando fuente, ejecutando `npm run check`, construyendo dist y reiniciando el progreso local…",
      "warning",
    );
    try {
      const result = await this.applicationCoordinator.apply(candidate);
      this.applicationPlan = null;
      this.pendingResolution = null;
      this.elements.confirmApplication.checked = false;
      this.courseEdition = {
        ...this.courseEdition,
        edition: structuredClone(result.edition),
        courseRevision: result.edition.revision,
        source: "applied",
      };
      this.applicationEvidence = {
        revision: result.edition.revision,
        digest: result.edition.digest,
        build: result.repository.checkPassed
          ? "Fuente y dist verificados por npm run check (incluye build)."
          : "Fuente y navegador aplicados; el helper no informó evidencia completa del check.",
        profiles: confirmedPlan.impact.resetProfiles.map(profileLabel).join(", "),
        preserved: [
          "Borrador Docente y preferencias Bowerbird personales de Estudiante.",
          result.repository.sourceBackup?.path
            ? `Fuente previa respaldada en ${result.repository.sourceBackup.path}.`
            : null,
        ].filter(Boolean).join(" "),
        nextStep: "Detén el modo mantenimiento e inicia `npm run dev` para revisar ORBIT con la edición nueva.",
      };
      this.helperStatusText = "Mantenimiento conectado · transacción finalizada";
      this.applicationActionMessage = this.applicationEvidence.nextStep;
      this.#setApplicationStatus(
        `Edición aplicada y verificada: ${result.edition.revision}. ${this.applicationEvidence.nextStep}`,
        "success",
      );
      this.toast(
        "Edición local aplicada. Detén mantenimiento e inicia `npm run dev` para revisar ORBIT.",
        "success",
        7000,
      );
    } catch (error) {
      if (["revision-conflict", "application-plan-stale"].includes(error?.code)) {
        this.#invalidateApplicationPlan();
      }
      if (error?.code === "course-application-recovery-required") {
        this.reloadRequired = true;
      }
      const message = this.#applicationErrorMessage(error);
      this.applicationActionMessage = message;
      this.#setApplicationStatus(message, "error");
      this.toast(message, "error", 7000);
      if ([
        "author-helper-unavailable",
        "invalid-author-response",
        "invalid-author-session",
        "invalid-author-endpoint",
        "author-request-failed",
        "course-in-use",
      ].includes(error?.code)) {
        this.authorSessionReady = false;
        this.applicationProbeStarted = false;
      }
      if (["pending-course-application", "course-finalization-pending", "pending-browser-finalization"].includes(error?.code)) {
        this.applicationProbeStarted = false;
      }
    } finally {
      this.#setApplicationBusy(false);
      if (!this.applicationProbeStarted) void this.serviceMonitor?.refresh();
    }
  }

  async #recoverPendingApplication() {
    if (!this.applicationCoordinator || this.applicationBusy || this.reloadRequired) return;
    this.#setApplicationBusy(true);
    this.#setApplicationStatus("Verificando la revisión local antes de recuperar…", "warning");
    try {
      const result = await this.applicationCoordinator.recoverPending();
      this.pendingResolution = null;
      this.applicationPlan = null;
      this.elements.confirmApplication.checked = false;
      if (result.action === "finalized") {
        this.courseEdition = {
          ...this.courseEdition,
          edition: structuredClone(result.edition),
          courseRevision: result.edition.revision,
          source: "applied",
        };
        this.applicationEvidence = {
          revision: result.edition.revision,
          digest: result.edition.digest,
          build: "Fuente y build ya verificados; journal del helper finalizado sin repetir el reset.",
          profiles: "Estudiante, Docente y Debug",
          preserved: "Borrador Docente y preferencias Bowerbird personales de Estudiante.",
          nextStep: "Detén el modo mantenimiento e inicia `npm run dev` para revisar ORBIT con la edición recuperada.",
        };
        this.helperStatusText = "Conectado · recuperación finalizada";
        this.#setApplicationStatus(
          "La edición objetivo ya estaba en el navegador; se finalizó el helper sin reiniciar de nuevo.",
          "success",
        );
      } else {
        this.reloadRequired = true;
        this.helperStatusText = "Fuente anterior restaurada · recarga requerida";
        this.#setApplicationStatus(
          "La revisión objetivo no estaba instalada: se restauraron fuente y build anteriores. Recarga el Editor para continuar.",
          "warning",
        );
      }
    } catch (error) {
      this.#setApplicationStatus(this.#applicationErrorMessage(error), "error");
      if (error?.code === "pending-browser-state-ambiguous") {
        this.pendingResolution = { action: "ambiguous", error };
      }
    } finally {
      this.#setApplicationBusy(false);
    }
  }

  #renderApplicationState() {
    if (!this.applicationCoordinator) {
      this.elements.courseApplication.hidden = true;
      return;
    }
    this.elements.courseApplication.hidden = false;
    const coordinator = this.applicationCoordinator.getSnapshot();
    this.elements.currentRevision.textContent = coordinator.currentEdition.revision;
    this.elements.currentSource.textContent = courseSourceLabel(this.courseEdition?.source);
    this.elements.helperStatus.textContent = this.helperStatusText;
    const maintenanceReady = this.localServiceMode === "editor-author"
      && this.authorSessionReady;
    const modeDescriptions = {
      development: {
        level: "info",
        text: "Modo normal: puedes editar y validar, pero aplicar está bloqueado. Para integrar el borrador, detén `dev` e inicia `npm run editor:author`.",
      },
      "editor-author": {
        level: maintenanceReady ? "success" : "warning",
        text: maintenanceReady
          ? "Modo mantenimiento verificado: ORBIT está cerrado y la aplicación local puede continuar."
          : "Modo mantenimiento detectado: comprueba el helper y cierra las demás pestañas de ORBIT antes de aplicar.",
      },
      unknown: {
        level: "warning",
        text: `Servicio local no identificado en ${window.location.origin}${
          this.localServiceDiagnostic ? ` (${this.localServiceDiagnostic})` : ""
        }: puedes editar y validar, pero aplicar permanece bloqueado. ${
          window.location.origin === EDITOR_AUTHOR_ORIGIN
            ? "El Editor reintentará automáticamente; también puedes usar «Volver a comprobar servicio»."
            : "Usa la URL local que imprime `npm run editor:author` o «Volver a comprobar servicio»."
        }`,
      },
    };
    const modeDescription = modeDescriptions[this.localServiceMode] ?? modeDescriptions.unknown;
    this.elements.serviceModeStatus.textContent = modeDescription.text;
    this.elements.serviceModeStatus.dataset.level = modeDescription.level;

    const pending = this.pendingResolution;
    this.elements.pendingApplication.hidden = !pending && !this.reloadRequired;
    if (this.reloadRequired) {
      this.elements.pendingDetail.textContent = "La fuente anterior ya fue restaurada. Recarga para descartar la edición objetivo que esta pestaña tenía en memoria.";
      this.elements.recoverApplication.textContent = "Recargar ORBIT Editor";
      this.elements.recoverApplication.disabled = this.applicationBusy;
    } else if (pending) {
      const descriptions = {
        finalize: "El navegador contiene exactamente la revisión objetivo. Se puede finalizar el journal sin repetir el reinicio.",
        rollback: "El navegador conserva la revisión anterior o ninguna edición local. Se puede restaurar fuente y build sin tocar el progreso.",
        ambiguous: "La revisión del navegador no coincide con los extremos del journal. La recuperación automática queda bloqueada sin modificar nada.",
      };
      this.elements.pendingDetail.textContent = descriptions[pending.action] ?? "La transacción pendiente requiere revisión.";
      this.elements.recoverApplication.textContent = pending.action === "finalize"
        ? "Finalizar journal pendiente"
        : pending.action === "rollback"
          ? "Restaurar fuente anterior"
          : "Recuperación bloqueada";
      this.elements.recoverApplication.disabled = this.applicationBusy || pending.action === "ambiguous";
    }

    this.elements.validateApplication.disabled = this.applicationBusy || Boolean(pending) || this.reloadRequired;
    this.elements.retryService.disabled = this.applicationBusy || this.shutdownBusy;
    this.elements.applicationPlan.hidden = !this.applicationPlan;
    if (this.applicationPlan) {
      const { diff, impact, validation } = this.applicationPlan;
      this.elements.diffAreas.textContent = listSummary(diff.movedAreas);
      this.elements.diffLocations.textContent = listSummary(diff.movedLocations);
      this.elements.diffAppearances.textContent = listSummary(diff.changedAreaAppearances);
      this.elements.diffAddedConnections.textContent = listSummary(diff.addedConnections);
      this.elements.diffRemovedConnections.textContent = listSummary(diff.removedConnections);
      this.elements.validationReachability.textContent = `${validation.reachableAreas} zonas · ${validation.reachableLocations} lugares · ${validation.reachableConcepts} conceptos`;
      const rows = impact.profiles.map((entry) => {
        const row = document.createElement("tr");
        const values = [
          profileLabel(entry.profile),
          entry.found ? "Sí" : "No",
          entry.readable ? `${entry.completedLocations}/${impact.totalLocations}` : "—",
          entry.readable ? `${entry.concepts}/${impact.totalConcepts}` : "—",
          entry.found ? (entry.readable ? "Legible" : "No legible") : "Sin guardado",
        ];
        for (const value of values) {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.append(cell);
        }
        return row;
      });
      this.elements.applicationImpact.replaceChildren(...rows);
    } else {
      this.elements.applicationImpact.replaceChildren();
    }
    this.elements.confirmApplication.disabled = this.applicationBusy
      || !this.applicationPlan?.changed
      || !maintenanceReady
      || Boolean(pending)
      || this.reloadRequired;
    this.elements.applyCourse.disabled = this.applicationBusy
      || !this.applicationPlan?.changed
      || !this.elements.confirmApplication.checked
      || !maintenanceReady
      || Boolean(pending)
      || this.reloadRequired;
    const readinessMessage = this.applicationActionMessage
      ?? (pending
        ? "Resuelve primero la aplicación pendiente."
        : this.reloadRequired
          ? "Recarga ORBIT Editor antes de iniciar otra aplicación."
          : this.localServiceMode === "development"
            ? "Modo normal: aplicar está bloqueado. Detén `dev`, inicia `npm run editor:author` y vuelve a validar."
            : !maintenanceReady
              ? "Aplicar permanece bloqueado hasta verificar el helper de mantenimiento y liberar el curso."
              : !this.applicationPlan
                ? "Mantenimiento listo: valida la edición para calcular un plan aplicable."
                : !this.applicationPlan.changed
                  ? "La edición coincide con la revisión activa; no hay cambios que aplicar."
                  : this.elements.confirmApplication.checked
                    ? "Confirmación registrada: puedes aplicar esta revisión local."
                    : "Mantenimiento listo: marca la confirmación para habilitar la aplicación.");
    this.elements.applyReadiness.textContent = readinessMessage;
    this.elements.applyReadiness.dataset.level = this.applicationActionMessage
      ? "warning"
      : maintenanceReady
        ? "success"
        : "warning";

    this.elements.applicationEvidence.hidden = !this.applicationEvidence;
    if (this.applicationEvidence) {
      this.elements.appliedRevision.textContent = this.applicationEvidence.revision;
      this.elements.appliedDigest.textContent = this.applicationEvidence.digest;
      this.elements.appliedBuild.textContent = this.applicationEvidence.build;
      this.elements.appliedProfiles.textContent = this.applicationEvidence.profiles;
      this.elements.appliedPreserved.textContent = this.applicationEvidence.preserved;
      this.elements.appliedNextStep.textContent = this.applicationEvidence.nextStep;
    }
  }

  #handleKeyDown(event) {
    if (this.applicationBusy) return;
    if (event.code === "Escape") {
      if (this.app.cancelGesture()) event.preventDefault();
      return;
    }
    const historyAction = getEditorHistoryAction(event);
    if (historyAction) {
      event.preventDefault();
      if (this.readOnly) {
        this.#announceReadOnlyRestriction(historyAction);
        return;
      }
      const result = historyAction === "redo" ? this.model.redo() : this.model.undo();
      this.#report(result, historyAction === "redo" ? "Cambio rehecho." : "Cambio deshecho.");
      return;
    }
    if (isTextEntry(event.target) || document.activeElement !== this.elements.canvas) return;
    const directions = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const direction = directions[event.code];
    if (!direction) return;
    event.preventDefault();
    if (this.readOnly) {
      const pan = getReadOnlyCameraPan(event);
      this.app.panCameraByScreen(pan.dx, pan.dy);
      return;
    }
    if (this.app.getState().activeTool === "bee") {
      this.#swapSelectedArea(direction[0] + direction[1] < 0 ? -1 : 1);
      return;
    }
    const step = event.shiftKey ? 10 : 1;
    this.#nudgeSelected(direction[0] * step, direction[1] * step);
  }

  #applyLocationForm() {
    const locationId = this.app.getState().selectedLocationId;
    if (!locationId) return;
    const result = this.model.moveLocation(locationId, {
      areaId: this.elements.locationArea.value,
      offset: {
        x: Number(this.elements.locationX.value),
        y: Number(this.elements.locationY.value),
      },
    });
    this.#report(result, "Posición del nodo actualizada.");
  }

  #nudgeSelected(dx, dy) {
    const appState = this.app.getState();
    const snapshot = this.model.getSnapshot();
    const location = snapshot.locations.find(
      (candidate) => candidate.id === appState.selectedLocationId,
    );
    if (!location) return;
    const result = this.model.moveLocation(location.id, {
      areaId: location.areaId,
      offset: {
        x: location.offset.x + dx,
        y: location.offset.y + dy,
      },
    });
    this.#report(result, "Nodo desplazado.", { quietSuccess: true });
  }

  #applyBowerbirdAppearance() {
    const areaId = this.app.getState().selectedAreaId;
    if (!areaId) return;
    this.#report(
      this.bowerbird.setAreaAppearance(areaId, {
        paletteId: this.elements.bowerbirdPalette.value,
        motifId: this.elements.bowerbirdMotif.value,
        contourId: this.elements.bowerbirdContour.value,
      }),
      this.readOnly
        ? "Apariencia personal guardada."
        : "Apariencia Bowerbird guardada en el borrador.",
    );
  }

  #swapSelectedArea(direction) {
    const selectedAreaId = this.app.getState().selectedAreaId;
    const snapshot = this.model.getSnapshot();
    const selected = snapshot.areas.find((area) => area.id === selectedAreaId);
    if (!selected || selected.tier === 0) {
      this.toast("Selecciona una zona de los anillos 1 o 2.", "warning");
      return;
    }
    const ring = snapshot.areas
      .filter((area) => area.tier === selected.tier)
      .sort((first, second) => (first.order ?? 0) - (second.order ?? 0));
    const currentIndex = ring.findIndex((area) => area.id === selected.id);
    const target = ring[(currentIndex + direction + ring.length) % ring.length];
    this.#report(
      this.model.swapArea(selected.id, target.id),
      `Zonas intercambiadas dentro del anillo ${selected.tier}.`,
    );
  }

  #report(result, successMessage, { quietSuccess = false } = {}) {
    const notice = getEditorMutationNotice(result, successMessage, {
      quietSuccess,
      fallbackMessage: this.#reasonMessage(result?.reason),
    });
    if (notice.message) this.toast(notice.message, notice.level);
    if (!notice.accepted) this.render();
    return notice.accepted;
  }

  #announceReadOnlyRestriction(action) {
    this.toast(getReadOnlyRestrictionMessage(action), "warning");
  }

  #reasonMessage(reason) {
    const messages = {
      "same-area": "La zona ya ocupa esa posición.",
      "origin-fixed": "Campamento Base permanece fijo en el centro.",
      "ring-mismatch": "Bee no permite mezclar el anillo teórico con el de aplicaciones.",
      "unknown-area": "La zona seleccionada no pertenece al curso.",
      "unknown-location": "El nodo seleccionado no pertenece al curso.",
      "location-outside-safe-margin": "El nodo debe permanecer dentro del margen seguro del hexágono.",
      "self-connection": "Un nodo no puede depender de sí mismo.",
      "duplicate-connection": "Esa relación ya existe en la Red de aprendizaje.",
      "learning-network-cycle": "La conexión produciría un ciclo en la Red de aprendizaje.",
      "non-learning-location": "Solo las lecciones y misiones pueden pertenecer a la Red de aprendizaje.",
      "location-not-in-learning-network": "Añade primero ambos nodos a la Red de aprendizaje.",
      "nothing-to-undo": "No hay cambios para deshacer.",
      "nothing-to-redo": "No hay cambios para rehacer.",
      "profile-read-only": "El perfil estudiante no puede modificar el borrador editorial.",
      "invalid-area-appearance": "La apariencia debe usar presets compatibles.",
      "storage-write-failed": "No fue posible guardar el cambio en este navegador.",
    };
    return messages[reason] ?? "La operación no superó la validación del editor.";
  }

  showView(view) {
    if (this.readOnly && (view === "spider" || view === "bee")) {
      this.#announceReadOnlyRestriction(view);
      return;
    }
    this.currentView = view;
    this.elements.inspector.hidden = false;
    if (["spider", "bee", "bowerbird"].includes(view)) this.app.setActiveTool(view);
    this.render();
    if (
      view === "overview"
      && this.serviceMonitor
    ) {
      void this.serviceMonitor.refresh();
    }
  }

  render() {
    const snapshot = this.model.getSnapshot();
    const appearanceSnapshot = this.bowerbird.getSnapshot();
    const appState = this.app.getState();
    this.elements.shell.dataset.tool = appState.activeTool;
    this.elements.shell.dataset.dragging = String(Boolean(appState.gesture));
    this.elements.areaCount.textContent = String(snapshot.areas.length);
    this.elements.locationCount.textContent = String(snapshot.locations.length);
    this.elements.saveStatus.textContent = timestampLabel(appearanceSnapshot.updatedAt);
    const draftBadge = getEditorDraftBadge({
      readOnly: this.readOnly,
      snapshot,
      appearanceSnapshot,
    });
    this.elements.draftBadge.textContent = draftBadge.text;
    this.elements.draftBadge.title = draftBadge.title;
    this.elements.undo.disabled = !this.readOnly && !snapshot.canUndo;
    this.elements.redo.disabled = !this.readOnly && !snapshot.canRedo;

    this.elements.spiderButton.setAttribute(
      "aria-pressed",
      String(!this.readOnly && appState.activeTool === "spider"),
    );
    this.elements.beeButton.setAttribute(
      "aria-pressed",
      String(!this.readOnly && appState.activeTool === "bee"),
    );
    this.elements.bowerbirdButton.setAttribute(
      "aria-pressed",
      String(appState.activeTool === "bowerbird"),
    );
    const activeMode = this.readOnly
      ? "Bowerbird · personal"
      : appState.activeTool === "bowerbird"
        ? "Bowerbird"
        : appState.activeTool === "bee"
        ? "Bee"
        : `Spider · ${appState.spiderMode === "connect" ? "conectar" : "mover"}`;
    this.elements.activeTool.textContent = activeMode;
    for (const radio of document.querySelectorAll('input[name="editor-spider-mode"]')) {
      radio.checked = radio.value === appState.spiderMode;
    }

    this.#renderInspectorView();
    this.#renderWarnings({
      warnings: [
        ...this.courseWarnings,
        ...(snapshot.validation?.errors ?? []),
        ...(snapshot.validation?.warnings ?? []),
        ...snapshot.warnings,
        ...appearanceSnapshot.warnings,
      ],
    });
    this.#renderApplicationState();
    this.#renderLocationControls(snapshot, appState);
    this.#renderAreaControls(snapshot, appState);
    this.#renderBowerbirdControls(appearanceSnapshot, appState);
    this.#renderConnections(snapshot, appState);
  }

  #renderInspectorView() {
    const views = {
      spider: {
        panel: this.elements.spiderPanel,
        title: "Spider",
        eyebrow: "Red de aprendizaje · nodos",
      },
      bee: {
        panel: this.elements.beePanel,
        title: "Bee",
        eyebrow: "Zonas · cartografía",
      },
      bowerbird: {
        panel: this.elements.bowerbirdPanel,
        title: "Bowerbird",
        eyebrow: "Apariencia · zonas",
      },
      overview: {
        panel: this.elements.overviewPanel,
        title: "ORBIT Editor",
        eyebrow: "Borrador local",
      },
      help: {
        panel: this.elements.helpPanel,
        title: "Ayuda del editor",
        eyebrow: "Ratón y teclado",
      },
    };
    const selected = views[this.currentView] ?? views.bowerbird;
    for (const view of Object.values(views)) view.panel.hidden = view !== selected;
    this.elements.inspectorTitle.textContent = selected.title;
    this.elements.inspectorEyebrow.textContent = selected.eyebrow;
  }

  #renderWarnings(snapshot) {
    const warnings = snapshot.warnings ?? [];
    this.elements.warningSummary.hidden = warnings.length === 0;
    const items = warnings.map((warning) => {
      const item = document.createElement("li");
      const code = document.createElement("code");
      code.textContent = warning.code ?? "advertencia";
      const message = document.createElement("span");
      message.textContent = warning.message ?? "El borrador requiere revisión.";
      item.append(code, message);
      return item;
    });
    this.elements.warningList.replaceChildren(...items);
  }

  #replaceSelectOptions(select, entries, selectedId, { groups = null } = {}) {
    const fragment = document.createDocumentFragment();
    if (groups) {
      for (const [groupLabel, groupEntries] of groups) {
        const group = document.createElement("optgroup");
        group.label = groupLabel;
        for (const entry of groupEntries) group.append(this.#option(entry, selectedId));
        fragment.append(group);
      }
    } else {
      for (const entry of entries) fragment.append(this.#option(entry, selectedId));
    }
    select.replaceChildren(fragment);
  }

  #option(entry, selectedId) {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = `${entry.shortTitle ?? entry.title} · ${entry.id}`;
    option.selected = entry.id === selectedId;
    return option;
  }

  #renderLocationControls(snapshot, appState) {
    const selected = snapshot.locations.find(
      (location) => location.id === appState.selectedLocationId,
    ) ?? snapshot.locations[0];
    if (!selected) return;
    if (selected.id !== appState.selectedLocationId) this.app.selectLocation(selected.id);

    this.#replaceSelectOptions(this.elements.locationSelect, snapshot.locations, selected.id);
    this.#replaceSelectOptions(this.elements.locationArea, snapshot.areas, selected.areaId, {
      groups: [
        ["Base", snapshot.areas.filter((area) => area.tier === 0)],
        ["Anillo 1 · teoría", snapshot.areas.filter((area) => area.tier === 1)],
        ["Anillo 2 · aplicaciones", snapshot.areas.filter((area) => area.tier === 2)],
      ],
    });
    this.elements.locationX.value = String(Math.round(selected.offset.x * 100) / 100);
    this.elements.locationY.value = String(Math.round(selected.offset.y * 100) / 100);

    const memberIds = new Set(snapshot.learningNetworkLocationIds ?? []);
    const academic = isAcademicLocation(selected);
    const isMember = memberIds.has(selected.id);
    this.elements.networkMembership.textContent = academic
      ? isMember
        ? "Este nodo pertenece a la Red de aprendizaje. Al retirarlo también se eliminan sus conexiones incidentes."
        : "Esta lección o misión está fuera de la Red de aprendizaje y no puede conectarse hasta reincorporarla."
      : "Este lugar está fuera de la Red: se habilita al abrir su zona y no puede pertenecer a la Red de aprendizaje.";
    this.elements.toggleNetworkLocation.hidden = !academic;
    this.elements.toggleNetworkLocation.disabled = this.readOnly;
    this.elements.toggleNetworkLocation.textContent = isMember
      ? "Retirar de la red"
      : "Añadir a la red";

    const connectable = snapshot.locations.filter(
      (location) => isAcademicLocation(location) && memberIds.has(location.id),
    );
    const sourceId = connectable.some((location) => location.id === appState.selectedLocationId)
      ? appState.selectedLocationId
      : connectable[0]?.id;
    const currentTarget = this.elements.targetSelect.value;
    const targetId = connectable.some((location) => location.id === currentTarget && location.id !== sourceId)
      ? currentTarget
      : connectable.find((location) => location.id !== sourceId)?.id;
    this.#replaceSelectOptions(this.elements.sourceSelect, connectable, sourceId);
    this.#replaceSelectOptions(this.elements.targetSelect, connectable, targetId);
    this.elements.sourceSelect.disabled = connectable.length < 2 || this.readOnly;
    this.elements.targetSelect.disabled = connectable.length < 2 || this.readOnly;
    this.elements.addConnection.disabled = connectable.length < 2 || this.readOnly;
  }

  #renderAreaControls(snapshot, appState) {
    const renderRing = (container, tier) => {
      const buttons = snapshot.areas
        .filter((area) => area.tier === tier)
        .sort((first, second) => (first.order ?? 0) - (second.order ?? 0))
        .map((area) => {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = area.shortTitle ?? area.title;
          button.title = `${area.title} · hex(${area.q}, ${area.r})`;
          button.dataset.areaId = area.id;
          button.disabled = this.readOnly;
          button.setAttribute("aria-pressed", String(area.id === appState.selectedAreaId));
          button.addEventListener("click", () => this.app.selectArea(area.id));
          return button;
        });
      container.replaceChildren(...buttons);
    };
    renderRing(this.elements.ringOneList, 1);
    renderRing(this.elements.ringTwoList, 2);
    const selected = snapshot.areas.find((area) => area.id === appState.selectedAreaId);
    this.elements.selectedAreaSummary.textContent = selected
      ? `${selected.title}: anillo ${selected.tier}, hex(${selected.q}, ${selected.r}).`
      : "Selecciona una zona del anillo 1 o 2.";
    this.elements.previousArea.disabled = this.readOnly || !selected || selected.tier === 0;
    this.elements.nextArea.disabled = this.readOnly || !selected || selected.tier === 0;
  }

  #renderBowerbirdControls(appearanceSnapshot, appState) {
    const selected = appearanceSnapshot.areas.find(
      (area) => area.id === appState.selectedAreaId,
    ) ?? appearanceSnapshot.areas[0];
    if (!selected) return;
    if (selected.id !== appState.selectedAreaId) this.app.selectArea(selected.id);

    this.#replaceSelectOptions(
      this.elements.bowerbirdArea,
      appearanceSnapshot.areas,
      selected.id,
      {
        groups: [
          ["Base", appearanceSnapshot.areas.filter((area) => area.tier === 0)],
          ["Anillo 1 · teoría", appearanceSnapshot.areas.filter((area) => area.tier === 1)],
          ["Anillo 2 · aplicaciones", appearanceSnapshot.areas.filter((area) => area.tier === 2)],
        ],
      },
    );

    const appearance = selected.appearance ?? DEFAULT_AREA_APPEARANCE;
    const renderPresetSelect = (select, entries, selectedId) => {
      const options = entries.map((entry) => {
        const option = document.createElement("option");
        option.value = entry.id;
        option.textContent = entry.label;
        option.title = entry.description;
        option.selected = entry.id === selectedId;
        return option;
      });
      select.replaceChildren(...options);
    };
    renderPresetSelect(
      this.elements.bowerbirdPalette,
      AREA_APPEARANCE_PALETTES,
      appearance.paletteId,
    );
    renderPresetSelect(
      this.elements.bowerbirdMotif,
      AREA_APPEARANCE_MOTIFS,
      appearance.motifId,
    );
    renderPresetSelect(
      this.elements.bowerbirdContour,
      AREA_APPEARANCE_CONTOURS,
      appearance.contourId,
    );

    const describe = (entries, id) => entries.find((entry) => entry.id === id)?.description ?? "";
    this.elements.bowerbirdPaletteDescription.textContent = describe(
      AREA_APPEARANCE_PALETTES,
      appearance.paletteId,
    );
    this.elements.bowerbirdMotifDescription.textContent = describe(
      AREA_APPEARANCE_MOTIFS,
      appearance.motifId,
    );
    this.elements.bowerbirdContourDescription.textContent = describe(
      AREA_APPEARANCE_CONTOURS,
      appearance.contourId,
    );
    this.elements.bowerbirdReset.textContent = this.readOnly
      ? "Heredar apariencia del curso"
      : "Restaurar apariencia canónica";
    this.elements.bowerbirdScope.textContent = this.readOnly
      ? "Alcance: preferencia personal de Estudiante; no modifica ni se exporta con el borrador Docente."
      : "Alcance: borrador común Docente; el cambio participa en historial, importación y exportación.";
  }

  #renderConnections(snapshot, appState) {
    const locationById = new Map(snapshot.locations.map((location) => [location.id, location]));
    const edges = appState.edges.filter(
      (edge) =>
        !appState.selectedLocationId ||
        edge.sourceId === appState.selectedLocationId ||
        edge.targetId === appState.selectedLocationId,
    );
    if (edges.length === 0) {
      const empty = document.createElement("li");
      empty.textContent = "El nodo seleccionado no participa todavía en una conexión visible.";
      this.elements.connectionList.replaceChildren(empty);
      return;
    }
    const items = edges.map((edge) => {
      const item = document.createElement("li");
      const description = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = `${locationById.get(edge.sourceId)?.shortTitle ?? edge.sourceId} → ${locationById.get(edge.targetId)?.shortTitle ?? edge.targetId}`;
      const meta = document.createElement("small");
      meta.textContent = edgeKindsLabel(edge.requirementKinds);
      description.append(title, meta);
      item.append(description);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Quitar conexión";
      remove.disabled = this.readOnly;
      remove.addEventListener("click", () => {
        this.#report(
          this.model.disconnectLocations(edge.sourceId, edge.targetId),
          "Conexión de aprendizaje eliminada.",
        );
      });
      item.append(remove);
      return item;
    });
    this.elements.connectionList.replaceChildren(...items);
  }

  toast(message, level = "info", durationMs = 3600) {
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
    const toast = document.createElement("div");
    toast.className = `toast ${level}`;
    toast.textContent = message;
    this.elements.toastRegion.replaceChildren(toast);
    this.toastTimer = window.setTimeout(() => {
      if (toast.isConnected) toast.remove();
      this.toastTimer = null;
    }, durationMs);
  }
}
