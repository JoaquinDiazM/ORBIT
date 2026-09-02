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

export function getEditorHistorySuccessMessage(action, result = {}) {
  const warnings = [
    ...(result.snapshot?.warnings ?? []),
    ...(result.snapshot?.validation?.warnings ?? []),
  ];
  const preservesPermanentDeletion = warnings.some(({ code } = {}) =>
    ["deleted-location-revival-blocked", "baseline-tombstone-restored"].includes(code)
  );
  if (preservesPermanentDeletion) {
    return action === "redo"
      ? "El borrado definitivo sigue vigente; se rehicieron los demás cambios disponibles."
      : "El borrado definitivo es irreversible; se deshicieron los demás cambios disponibles.";
  }
  return action === "redo" ? "Cambio rehecho." : "Cambio deshecho.";
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

export function getCreateStatus(pendingPlacement) {
  return pendingPlacement?.type === "create"
    ? "Colocación activa: haz clic dentro de una zona; Esc cancela."
    : "El nuevo ID será estable, monotónico y no se reutilizará.";
}

export function resolveEditorFormValue({
  currentValue,
  lastRenderedValue,
  modelValue,
  selectionChanged = false,
} = {}) {
  const current = String(currentValue ?? "");
  const previous = lastRenderedValue === undefined
    ? undefined
    : String(lastRenderedValue);
  const next = String(modelValue ?? "");
  const hasUnappliedInput = !selectionChanged
    && previous !== undefined
    && next === previous
    && current !== previous;
  return hasUnappliedInput ? current : next;
}

const RENDER_FOCUS_FALLBACKS = Object.freeze({
  connection: [
    "editor-connection-list",
    "editor-add-connection",
    "editor-connection-source",
    "editor-connect-location",
  ],
  inventory: ["editor-inventory-search", "editor-inventory-kind"],
  area: ["editor-tier-label-select"],
});

export function restoreEditorRenderFocus(
  snapshot,
  { root, documentRef = globalThis.document } = {},
) {
  if (!snapshot) return null;
  if (snapshot.element?.isConnected) return snapshot.element;

  let target = snapshot.id ? documentRef?.getElementById?.(snapshot.id) : null;
  if (!target && snapshot.key) {
    target = [...(root?.querySelectorAll?.("[data-editor-focus-key]") ?? [])]
      .find((candidate) => candidate.dataset.editorFocusKey === snapshot.key);
  }
  if (!target && snapshot.key) {
    const group = snapshot.key.split(":", 1)[0];
    target = (RENDER_FOCUS_FALLBACKS[group] ?? [])
      .map((id) => documentRef?.getElementById?.(id))
      .find((candidate) => candidate && !candidate.disabled);
  }
  target?.focus?.({ preventScroll: true });
  return target ?? null;
}

export function restoreInventoryDialogFocus(
  snapshot,
  {
    root,
    documentRef = globalThis.document,
    fallback = null,
  } = {},
) {
  if (snapshot?.element?.isConnected && !snapshot.element.disabled) {
    snapshot.element.focus?.({ preventScroll: true });
    return snapshot.element;
  }
  const restored = restoreEditorRenderFocus(snapshot, { root, documentRef });
  if (restored) return restored;
  if (fallback && !fallback.disabled) {
    fallback.focus?.({ preventScroll: true });
    return fallback;
  }
  return null;
}

const READ_ONLY_RESTRICTION_MESSAGES = Object.freeze({
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

function mergeIssueEntries(...collections) {
  const seen = new Set();
  const merged = [];
  for (const entries of collections) {
    for (const entry of Array.isArray(entries) ? entries : []) {
      const key = typeof entry === "string"
        ? `text:${entry}`
        : `issue:${String(entry?.code ?? "")}\u0000${String(entry?.path ?? "")}\u0000${String(entry?.message ?? "")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(entry);
    }
  }
  return merged;
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
  const warningCount = mergeIssueEntries(
    result.snapshot?.warnings,
    result.snapshot?.validation?.warnings,
  ).length;
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
  const warningCount = mergeIssueEntries(
    snapshot.warnings,
    snapshot.validation?.warnings,
  ).length;
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

const EDITABLE_LOCATION_KINDS = new Set(["lesson", "mission", "npc"]);
const PROTECTED_LOCATION_IDS = new Set(["vector-workshop", "coulomb-observatory"]);

function normalizeEdgeIds(edge) {
  return {
    sourceId: edge?.sourceId ?? edge?.sourceLocationId ?? edge?.from ?? null,
    targetId: edge?.targetId ?? edge?.targetLocationId ?? edge?.to ?? null,
  };
}

export function getInventoryLocations(snapshot = {}) {
  if (Array.isArray(snapshot.inventoryLocations)) {
    return snapshot.inventoryLocations.filter((location) => location?.lifecycle !== "deleted");
  }
  const entries = Array.isArray(snapshot.document?.locations)
    ? snapshot.document.locations
    : [];
  return entries.filter((location) =>
    ["inventory", "inventoried"].includes(location?.lifecycle ?? location?.state ?? location?.status)
  );
}

export function getEditableActiveLocations(snapshot = {}) {
  return (Array.isArray(snapshot.locations) ? snapshot.locations : []).filter((location) =>
    EDITABLE_LOCATION_KINDS.has(location?.kind)
  );
}

export function getIncidentConnectionLabels(locationId, edges = []) {
  return (Array.isArray(edges) ? edges : [])
    .map(normalizeEdgeIds)
    .filter((edge) => edge.sourceId === locationId || edge.targetId === locationId)
    .map((edge) => `${edge.sourceId} → ${edge.targetId}`)
    .sort((first, second) => first.localeCompare(second));
}

export function refreshInventoryImpact(action, impact) {
  const incidentConnections = getIncidentConnectionLabels(
    action?.locationId,
    impact?.incidentConnections,
  );
  return {
    available: Boolean(impact?.location),
    changed: JSON.stringify(incidentConnections)
      !== JSON.stringify(action?.incidentConnections ?? []),
    incidentConnections,
  };
}

export function getInventoryImpactMessages(confirmation) {
  if (!confirmation) return [];
  const kindPhrase = {
    lesson: "de la lección",
    mission: "de la misión",
    npc: "del personaje",
  }[confirmation.kind] ?? `del ${confirmation.kind ?? "nodo"}`;
  const connections = (confirmation.incidentConnections ?? []).map(
    (label) => `Se eliminará la conexión ${label}.`,
  );
  if (confirmation.type !== "delete") {
    return connections.length > 0
      ? connections
      : ["No hay conexiones incidentes que retirar."];
  }
  return [
    `El contenido ${kindPhrase} dejará definitivamente el curso activo; el ID permanecerá reservado como tombstone.`,
    ...(confirmation.grantedConceptIds ?? []).map(
      (id) => `La concesión del concepto ${id} dejará de proceder de este nodo.`,
    ),
    ...(confirmation.grantedRewardIds ?? []).map(
      (id) => `La concesión de la recompensa ${id} dejará de proceder de este nodo.`,
    ),
    ...connections,
  ];
}

function getTierLabels(snapshot = {}) {
  const defaults = [
    { tier: 1, text: "NIVEL 1", offset: { x: 0, y: 0 } },
    { tier: 2, text: "NIVEL 2", offset: { x: 0, y: 0 } },
  ];
  const entries = snapshot.tierLabels ?? snapshot.document?.tierLabels ?? [];
  return defaults.map((fallback) => {
    const entry = Array.isArray(entries)
      ? entries.find((candidate) => Number(candidate?.tier) === fallback.tier)
      : null;
    return {
      tier: fallback.tier,
      text: String(entry?.text ?? entry?.label ?? fallback.text),
      offset: {
        x: Number.isFinite(entry?.offset?.x) ? entry.offset.x : 0,
        y: Number.isFinite(entry?.offset?.y) ? entry.offset.y : 0,
      },
    };
  });
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
    this.selectedInventoryLocationId = null;
    this.pendingInventoryAction = null;
    this.inventoryDialogReturnFocus = null;
    this.lastRenderedLocationId = null;
    this.lastRenderedInventoryLocationId = null;
    this.lastRenderedAreaId = null;
    this.lastRenderedTier = null;
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
      diffRenamedAreas: query("#editor-diff-renamed-areas"),
      diffTierLabels: query("#editor-diff-tier-labels"),
      diffCreatedLocations: query("#editor-diff-created-locations"),
      diffRenamedLocations: query("#editor-diff-renamed-locations"),
      diffInventoriedLocations: query("#editor-diff-inventoried-locations"),
      diffRestoredLocations: query("#editor-diff-restored-locations"),
      diffDeletedLocations: query("#editor-diff-deleted-locations"),
      diffAddedLearningNodes: query("#editor-diff-added-learning-nodes"),
      diffRemovedLearningNodes: query("#editor-diff-removed-learning-nodes"),
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
      connectLocation: query("#editor-connect-location"),
      modifyLocation: query("#editor-modify-location"),
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
      locationId: query("#editor-location-id"),
      locationTitle: query("#editor-location-title"),
      locationShortTitle: query("#editor-location-short-title"),
      applyLocationName: query("#editor-apply-location-name"),
      createKind: query("#editor-create-kind"),
      createArea: query("#editor-create-area"),
      createX: query("#editor-create-x"),
      createY: query("#editor-create-y"),
      createLocation: query("#editor-create-location"),
      armCreateLocation: query("#editor-arm-create-location"),
      createStatus: query("#editor-create-status"),
      openCreatedModify: query("#editor-open-created-modify"),
      openCreatedMove: query("#editor-open-created-move"),
      inventorySearch: query("#editor-inventory-search"),
      inventoryKind: query("#editor-inventory-kind"),
      activeLocationList: query("#editor-active-location-list"),
      inventoryLocationList: query("#editor-inventory-location-list"),
      inventoryRestoreControls: query("#editor-inventory-restore-controls"),
      inventoryArea: query("#editor-inventory-area"),
      inventoryX: query("#editor-inventory-x"),
      inventoryY: query("#editor-inventory-y"),
      restoreLocation: query("#editor-restore-location"),
      armRestoreLocation: query("#editor-arm-restore-location"),
      deleteLocation: query("#editor-delete-location"),
      inventoryConfirmation: query("#editor-inventory-confirmation"),
      inventoryConfirmationDetail: query("#editor-inventory-confirmation-detail"),
      inventoryImpactList: query("#editor-inventory-impact-list"),
      confirmInventoryAction: query("#editor-confirm-inventory-action"),
      cancelInventoryAction: query("#editor-cancel-inventory-action"),
      inventoryStatus: query("#editor-inventory-status"),
      baseList: query("#editor-base-list"),
      ringOneList: query("#editor-ring-one-list"),
      ringTwoList: query("#editor-ring-two-list"),
      ringOneHeading: query("#editor-ring-one-heading"),
      ringTwoHeading: query("#editor-ring-two-heading"),
      selectedAreaSummary: query("#editor-selected-area-summary"),
      previousArea: query("#editor-area-previous"),
      nextArea: query("#editor-area-next"),
      areaId: query("#editor-area-id"),
      areaTitle: query("#editor-area-title"),
      areaShortTitle: query("#editor-area-short-title"),
      applyAreaName: query("#editor-apply-area-name"),
      tierLabelSelect: query("#editor-tier-label-select"),
      tierLabelText: query("#editor-tier-label-text"),
      tierLabelX: query("#editor-tier-label-x"),
      tierLabelY: query("#editor-tier-label-y"),
      applyTierLabel: query("#editor-apply-tier-label"),
      resetTierLabel: query("#editor-reset-tier-label"),
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
    this.elements.spiderButton.title = "Abrir Spider en modo consulta.";
    this.elements.beeButton.title = "Abrir Bee en modo consulta.";
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
    const consultationControlIds = new Set([
      "editor-location-select",
      "editor-connect-location",
      "editor-modify-location",
      "editor-location-id",
      "editor-inventory-search",
      "editor-inventory-kind",
      "editor-area-id",
      "editor-tier-label-select",
    ]);
    for (const panel of [this.elements.spiderPanel, this.elements.beePanel]) {
      panel.inert = false;
      panel.removeAttribute("aria-disabled");
      for (const control of panel.querySelectorAll("button, input, select")) {
        const isConsultationControl = control.hasAttribute("data-spider-view")
          || consultationControlIds.has(control.id);
        control.disabled = !isConsultationControl;
        if (isConsultationControl) control.removeAttribute("aria-disabled");
        else control.setAttribute("aria-disabled", "true");
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
      const result = this.model.undo();
      return this.#report(result, getEditorHistorySuccessMessage("undo", result));
    });
    on("#editor-redo", "click", () => {
      if (this.readOnly) return this.#announceReadOnlyRestriction("redo");
      const result = this.model.redo();
      return this.#report(result, getEditorHistorySuccessMessage("redo", result));
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

    for (const button of document.querySelectorAll("[data-spider-view]")) {
      button.addEventListener("click", () => {
        this.app.clearPendingPlacement?.();
        this.app.setSpiderMode(button.dataset.spiderView);
        this.pendingInventoryAction = null;
        this.render();
      });
    }
    this.elements.locationSelect.addEventListener("change", () =>
      this.app.selectLocation(this.elements.locationSelect.value),
    );
    this.elements.connectLocation.addEventListener("change", () =>
      this.app.selectLocation(this.elements.connectLocation.value),
    );
    this.elements.modifyLocation.addEventListener("change", () =>
      this.app.selectLocation(this.elements.modifyLocation.value),
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
    this.elements.applyLocationName.addEventListener("click", () => {
      const locationId = this.app.getState().selectedLocationId;
      this.#report(
        this.model.renameLocation(locationId, {
          title: this.elements.locationTitle.value,
          shortTitle: this.elements.locationShortTitle.value,
        }),
        "Nombres del nodo actualizados sin cambiar su ID.",
      );
    });
    this.elements.createLocation.addEventListener("click", () => {
      this.#createLocationAt({
        areaId: this.elements.createArea.value,
        offset: {
          x: Number(this.elements.createX.value),
          y: Number(this.elements.createY.value),
        },
      });
    });
    this.elements.createKind.addEventListener("change", () => {
      if (this.app.getState().pendingPlacement?.type !== "create") return;
      this.app.clearPendingPlacement?.();
      this.app.beginCreateLocation(this.elements.createKind.value);
      this.render();
    });
    this.elements.armCreateLocation.addEventListener("click", () => {
      const armed = this.app.beginCreateLocation(this.elements.createKind.value);
      if (armed) this.toast("Haz clic dentro de una zona para crear el nodo.", "info");
      this.render();
    });
    this.elements.openCreatedModify.addEventListener("click", () => {
      this.app.setSpiderMode("modify");
      this.render();
      this.elements.modifyLocation.focus({ preventScroll: false });
    });
    this.elements.openCreatedMove.addEventListener("click", () => {
      this.app.setSpiderMode("move");
      this.render();
      this.elements.locationSelect.focus({ preventScroll: false });
    });
    for (const filter of [this.elements.inventorySearch, this.elements.inventoryKind]) {
      filter.addEventListener(filter === this.elements.inventorySearch ? "input" : "change", () =>
        this.render(),
      );
    }
    this.elements.restoreLocation.addEventListener("click", () => this.#restoreInventoryLocation());
    this.elements.armRestoreLocation.addEventListener("click", () => {
      if (!this.selectedInventoryLocationId) return;
      const armed = this.app.beginRestoreLocation(this.selectedInventoryLocationId);
      if (armed) this.toast("Haz clic dentro de una zona para reinsertar el nodo.", "info");
      this.render();
    });
    this.elements.deleteLocation.addEventListener("click", () => {
      if (this.selectedInventoryLocationId) {
        this.#requestInventoryAction("delete", this.selectedInventoryLocationId);
      }
    });
    this.elements.confirmInventoryAction.addEventListener("click", () =>
      this.#confirmInventoryAction(),
    );
    this.elements.cancelInventoryAction.addEventListener("click", () => {
      this.#cancelInventoryAction();
    });
    this.elements.inventoryConfirmation.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.#cancelInventoryAction();
    });
    this.elements.previousArea.addEventListener("click", () => this.#swapSelectedArea(-1));
    this.elements.nextArea.addEventListener("click", () => this.#swapSelectedArea(1));
    this.elements.applyAreaName.addEventListener("click", () => {
      const areaId = this.app.getState().selectedAreaId;
      this.#report(
        this.model.renameArea(areaId, {
          title: this.elements.areaTitle.value,
          shortTitle: this.elements.areaShortTitle.value,
        }),
        "Nombres de la zona actualizados sin cambiar su ID.",
      );
    });
    this.elements.tierLabelSelect.addEventListener("change", () => {
      this.app.selectTierLabel(Number(this.elements.tierLabelSelect.value));
      this.render();
    });
    this.elements.applyTierLabel.addEventListener("click", () => this.#applyTierLabelForm());
    this.elements.resetTierLabel.addEventListener("click", () => {
      const tier = Number(this.elements.tierLabelSelect.value);
      this.#report(this.model.resetTierLabel(tier), `Rótulo del nivel ${tier} restaurado.`);
    });
    for (const button of document.querySelectorAll("[data-tier-label-nudge-x][data-tier-label-nudge-y]")) {
      button.addEventListener("click", (event) => {
        const multiplier = event.shiftKey ? 10 : 4;
        this.#nudgeTierLabel(
          Number(button.dataset.tierLabelNudgeX) * multiplier,
          Number(button.dataset.tierLabelNudgeY) * multiplier,
        );
      });
    }
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
    this.#report(this.model.reset(), "Borrador restaurado a la edición base.");
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
      this.elements.diffRenamedAreas.textContent = listSummary(diff.renamedAreas);
      this.elements.diffTierLabels.textContent = listSummary(
        (diff.changedTierLabels ?? []).map((tier) => `nivel ${tier}`),
      );
      this.elements.diffCreatedLocations.textContent = listSummary(diff.createdLocations);
      this.elements.diffRenamedLocations.textContent = listSummary(diff.renamedLocations);
      this.elements.diffInventoriedLocations.textContent = listSummary(diff.inventoriedLocations);
      this.elements.diffRestoredLocations.textContent = listSummary(diff.restoredLocations);
      this.elements.diffDeletedLocations.textContent = listSummary(diff.deletedLocations);
      this.elements.diffAddedLearningNodes.textContent = listSummary(diff.addedLearningNodes);
      this.elements.diffRemovedLearningNodes.textContent = listSummary(diff.removedLearningNodes);
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
    if (event.code === "Escape" && this.pendingInventoryAction) {
      event.preventDefault();
      this.#cancelInventoryAction();
      return;
    }
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
      this.#report(result, getEditorHistorySuccessMessage(historyAction, result));
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
      if (this.app.getState().selectedTierLabel) {
        const step = event.shiftKey ? 10 : 1;
        this.#nudgeTierLabel(direction[0] * step, direction[1] * step);
      } else {
        this.#swapSelectedArea(direction[0] + direction[1] < 0 ? -1 : 1);
      }
      return;
    }
    if (this.app.getState().spiderMode !== "move") return;
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

  #createLocationAt({ areaId, offset }) {
    const result = this.model.createLocation({
      kind: this.elements.createKind.value,
      areaId,
      offset,
    });
    if (this.#report(result, "Nodo creado con contenido inicial y un ID estable.")) {
      const locationId = result?.detail?.locationId
        ?? result?.locationId
        ?? result?.detail?.location?.id;
      if (locationId) this.app.selectLocation(locationId);
      this.app.clearPendingPlacement?.();
      this.render();
    }
  }

  #requestInventoryAction(type, locationId) {
    const snapshot = this.model.getSnapshot();
    const location = [
      ...getEditableActiveLocations(snapshot),
      ...getInventoryLocations(snapshot),
    ].find((entry) => entry.id === locationId);
    if (!location) return;
    if (type === "delete" && PROTECTED_LOCATION_IDS.has(locationId)) {
      this.toast(`${locationId} es un nodo académico protegido y no puede borrarse.`, "warning");
      return;
    }
    const impact = this.model.getLocationLifecycleImpact?.(locationId);
    const incidentConnections = getIncidentConnectionLabels(
      locationId,
      impact?.incidentConnections ?? this.app.getState().edges,
    );
    this.inventoryDialogReturnFocus = this.#captureRenderFocus();
    this.pendingInventoryAction = {
      type,
      locationId,
      title: location.shortTitle ?? location.title ?? location.id,
      incidentConnections,
      kind: impact?.location?.kind ?? location.kind,
      provenance: impact?.location?.provenance ?? location.provenance,
      grantedConceptIds: [...(impact?.grantedConceptIds ?? [])],
      grantedRewardIds: [...(impact?.grantedRewardIds ?? [])],
    };
    this.render();
    this.elements.inventoryConfirmation.focus({ preventScroll: false });
  }

  #cancelInventoryAction({ announce = true } = {}) {
    if (!this.pendingInventoryAction) return false;
    const returnFocus = this.inventoryDialogReturnFocus;
    this.pendingInventoryAction = null;
    this.inventoryDialogReturnFocus = null;
    if (this.elements.inventoryConfirmation.open) {
      this.elements.inventoryConfirmation.close();
    }
    if (announce) this.toast("Operación de Inventario cancelada.", "info");
    this.render();

    restoreInventoryDialogFocus(returnFocus, {
      root: this.elements.shell,
      documentRef: document,
      fallback: this.elements.inventorySearch,
    });
    return true;
  }

  #confirmInventoryAction() {
    const action = this.pendingInventoryAction;
    if (!action) return;
    const refreshed = refreshInventoryImpact(
      action,
      this.model.getLocationLifecycleImpact?.(action.locationId),
    );
    if (!refreshed.available) {
      this.pendingInventoryAction = null;
      this.inventoryDialogReturnFocus = null;
      this.toast("El nodo cambió o dejó de estar disponible; inicia nuevamente la operación.", "warning");
      this.render();
      this.elements.inventorySearch.focus({ preventScroll: false });
      return;
    }
    if (refreshed.changed) {
      this.pendingInventoryAction = {
        ...action,
        incidentConnections: refreshed.incidentConnections,
      };
      this.toast("Las conexiones cambiaron. Revisa el impacto actualizado y confirma otra vez.", "warning");
      this.render();
      this.elements.confirmInventoryAction.focus({ preventScroll: false });
      return;
    }
    this.pendingInventoryAction = null;
    this.inventoryDialogReturnFocus = null;
    const result = action.type === "delete"
      ? this.model.deleteInventoryLocation(action.locationId)
      : this.model.inventoryLocation(action.locationId);
    const accepted = this.#report(
      result,
      action.type === "delete"
        ? `${action.locationId} fue borrado definitivamente; su ID no se reutilizará.`
        : `${action.locationId} fue guardado en Inventario y sus conexiones incidentes se retiraron.`,
    );
    if (accepted) {
      this.app.reconcileLocationSelection?.();
      this.selectedInventoryLocationId = action.type === "delete" ? null : action.locationId;
      this.app.clearPendingPlacement?.();
    }
    this.render();
    this.elements.inventorySearch.focus({ preventScroll: false });
  }

  #restoreInventoryLocation() {
    if (!this.selectedInventoryLocationId) return;
    const locationId = this.selectedInventoryLocationId;
    const result = this.model.restoreLocation(locationId, {
      areaId: this.elements.inventoryArea.value,
      offset: {
        x: Number(this.elements.inventoryX.value),
        y: Number(this.elements.inventoryY.value),
      },
    });
    if (this.#report(result, `${locationId} fue reinsertado; reconecta el nodo antes de aplicar.`)) {
      this.selectedInventoryLocationId = null;
      this.app.selectLocation(locationId);
      this.app.clearPendingPlacement?.();
      this.render();
    }
  }

  #applyTierLabelForm() {
    const tier = Number(this.elements.tierLabelSelect.value);
    const changes = {
      text: this.elements.tierLabelText.value,
      offset: {
        x: Number(this.elements.tierLabelX.value),
        y: Number(this.elements.tierLabelY.value),
      },
    };
    this.app.selectTierLabel(tier);
    this.#report(
      this.model.setTierLabel(tier, changes),
      `Rótulo del nivel ${tier} actualizado.`,
    );
  }

  #nudgeTierLabel(dx, dy) {
    const snapshot = this.model.getSnapshot();
    const tier = this.app.getState().selectedTierLabel
      ?? Number(this.elements.tierLabelSelect.value);
    const label = getTierLabels(snapshot).find((entry) => entry.tier === tier);
    if (!label) return;
    this.app.selectTierLabel(tier);
    this.#report(
      this.model.setTierLabel(tier, {
        text: label.text,
        offset: { x: label.offset.x + dx, y: label.offset.y + dy },
      }),
      "Rótulo desplazado.",
      { quietSuccess: true },
    );
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
      "ring-mismatch": "Bee no permite mezclar zonas de niveles distintos.",
      "unknown-area": "La zona seleccionada no pertenece al curso.",
      "unknown-location": "El nodo seleccionado no pertenece al curso.",
      "location-outside-safe-margin": "El nodo debe permanecer dentro del margen seguro del hexágono.",
      "self-connection": "Un nodo no puede depender de sí mismo.",
      "duplicate-connection": "Esa relación ya existe en la Red de aprendizaje.",
      "learning-network-cycle": "La conexión produciría un ciclo en la Red de aprendizaje.",
      "non-learning-location": "Solo las lecciones y misiones pueden pertenecer a la Red de aprendizaje.",
      "location-not-in-learning-network": "Añade primero ambos nodos a la Red de aprendizaje.",
      "non-editable-location-kind": "Spider solo crea lecciones, misiones o personajes secundarios.",
      "location-not-editable": "Este tipo de lugar no admite autoría ni Inventario.",
      "location-not-in-inventory": "El nodo debe estar guardado en Inventario para realizar esa acción.",
      "protected-location-delete": "Ese nodo académico está protegido contra el borrado definitivo.",
      "location-deleted": "El ID fue eliminado y permanece reservado.",
      "location-sequence-exhausted": "La secuencia segura de IDs está agotada; no se creó ningún nodo.",
      "location-sequence-advance-too-large": "El borrador reserva demasiados IDs sin materializarlos; no se importó.",
      "nothing-to-undo": "No hay cambios para deshacer.",
      "nothing-to-redo": "No hay cambios para rehacer.",
      "profile-read-only": "El perfil estudiante no puede modificar el borrador editorial.",
      "invalid-area-appearance": "La apariencia debe usar presets compatibles.",
      "storage-write-failed": "No fue posible guardar el cambio en este navegador.",
    };
    return messages[reason] ?? "La operación no superó la validación del editor.";
  }

  showView(view) {
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

  #captureRenderFocus() {
    const active = document.activeElement;
    if (!active || !this.elements.shell.contains(active)) return null;
    return {
      element: active,
      id: active.id || null,
      key: active.dataset?.editorFocusKey ?? null,
    };
  }

  #restoreRenderFocus(snapshot) {
    restoreEditorRenderFocus(snapshot, {
      root: this.elements.shell,
      documentRef: document,
    });
  }

  render() {
    const renderFocus = this.#captureRenderFocus();
    const snapshot = this.model.getSnapshot();
    const appearanceSnapshot = this.bowerbird.getSnapshot();
    const appState = this.app.getState();
    this.elements.shell.dataset.tool = appState.activeTool;
    this.elements.shell.dataset.spiderMode = appState.spiderMode;
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
      String(appState.activeTool === "spider"),
    );
    this.elements.beeButton.setAttribute(
      "aria-pressed",
      String(appState.activeTool === "bee"),
    );
    this.elements.bowerbirdButton.setAttribute(
      "aria-pressed",
      String(appState.activeTool === "bowerbird"),
    );
    const spiderModeLabel = {
      move: "mover",
      connect: "conectar",
      modify: "modificar",
      create: "crear",
      inventory: "inventario",
    }[appState.spiderMode] ?? "mover";
    const activeMode = appState.activeTool === "bowerbird"
      ? this.readOnly ? "Bowerbird · personal" : "Bowerbird"
      : appState.activeTool === "bee"
        ? this.readOnly ? "Bee · consulta" : "Bee"
        : this.readOnly
          ? `Spider · consulta · ${spiderModeLabel}`
          : `Spider · ${spiderModeLabel}`;
    this.elements.activeTool.textContent = activeMode;
    for (const button of document.querySelectorAll("[data-spider-view]")) {
      const selected = button.dataset.spiderView === appState.spiderMode;
      button.setAttribute("aria-pressed", String(selected));
    }
    for (const view of document.querySelectorAll("[data-editor-spider-view]")) {
      view.hidden = view.dataset.editorSpiderView !== appState.spiderMode;
    }

    this.#renderInspectorView();
    this.#renderWarnings({
      warnings: mergeIssueEntries(
        this.courseWarnings,
        snapshot.validation?.errors,
        snapshot.validation?.warnings,
        snapshot.warnings,
        appearanceSnapshot.warnings,
      ),
    });
    this.#renderApplicationState();
    this.#renderLocationControls(snapshot, appState);
    this.#renderInventoryControls(snapshot, appState);
    this.#renderAreaControls(snapshot, appState);
    this.#renderBowerbirdControls(appearanceSnapshot, appState);
    this.#renderConnections(snapshot, appState);
    this.#restoreRenderFocus(renderFocus);
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

  #syncFormValue(control, value, { force = false } = {}) {
    const next = String(value ?? "");
    const previous = control.dataset.editorRenderedValue;
    const resolved = resolveEditorFormValue({
      currentValue: control.value,
      lastRenderedValue: previous,
      modelValue: next,
      selectionChanged: force,
    });
    control.value = resolved;
    control.dataset.editorRenderedValue = next;
    return resolved === next;
  }

  #areaGroups(snapshot) {
    const labels = getTierLabels(snapshot);
    return [
      ["Base", snapshot.areas.filter((area) => area.tier === 0)],
      [labels.find((entry) => entry.tier === 1)?.text ?? "Nivel 1", snapshot.areas.filter((area) => area.tier === 1)],
      [labels.find((entry) => entry.tier === 2)?.text ?? "Nivel 2", snapshot.areas.filter((area) => area.tier === 2)],
    ];
  }

  #renderLocationControls(snapshot, appState) {
    const selected = snapshot.locations.find(
      (location) => location.id === appState.selectedLocationId,
    ) ?? snapshot.locations[0];
    if (!selected) return;
    const locationChanged = selected.id !== this.lastRenderedLocationId;
    this.lastRenderedLocationId = selected.id;

    this.#replaceSelectOptions(this.elements.locationSelect, snapshot.locations, selected.id);
    this.#replaceSelectOptions(this.elements.connectLocation, snapshot.locations, selected.id);
    this.#replaceSelectOptions(this.elements.modifyLocation, snapshot.locations, selected.id);
    for (const option of this.elements.modifyLocation.options) {
      const location = snapshot.locations.find(({ id }) => id === option.value);
      option.disabled = !this.readOnly && !EDITABLE_LOCATION_KINDS.has(location?.kind);
    }
    const previousRenderedAreaId = this.elements.locationArea.dataset.editorRenderedValue;
    const areaCandidate = resolveEditorFormValue({
      currentValue: this.elements.locationArea.value,
      lastRenderedValue: previousRenderedAreaId,
      modelValue: selected.areaId,
      selectionChanged: locationChanged,
    });
    const displayedAreaId = snapshot.areas.some(({ id }) => id === areaCandidate)
      ? areaCandidate
      : selected.areaId;
    this.#replaceSelectOptions(this.elements.locationArea, snapshot.areas, displayedAreaId, {
      groups: this.#areaGroups(snapshot),
    });
    this.elements.locationArea.dataset.editorRenderedValue = selected.areaId;
    this.#replaceSelectOptions(this.elements.createArea, snapshot.areas, this.elements.createArea.value || selected.areaId, {
      groups: this.#areaGroups(snapshot),
    });
    this.#syncFormValue(
      this.elements.locationX,
      Math.round(selected.offset.x * 100) / 100,
      { force: locationChanged },
    );
    this.#syncFormValue(
      this.elements.locationY,
      Math.round(selected.offset.y * 100) / 100,
      { force: locationChanged },
    );
    this.elements.locationId.value = selected.id;
    this.#syncFormValue(
      this.elements.locationTitle,
      selected.title ?? selected.id,
      { force: locationChanged },
    );
    this.#syncFormValue(
      this.elements.locationShortTitle,
      selected.shortTitle ?? selected.title ?? selected.id,
      { force: locationChanged },
    );
    const editable = EDITABLE_LOCATION_KINDS.has(selected.kind);
    this.elements.locationTitle.disabled = !editable || this.readOnly;
    this.elements.locationShortTitle.disabled = !editable || this.readOnly;
    this.elements.applyLocationName.disabled = !editable || this.readOnly;

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

  #renderInventoryControls(snapshot, appState) {
    const active = getEditableActiveLocations(snapshot);
    const inventory = getInventoryLocations(snapshot);
    const term = this.elements.inventorySearch.value.trim().toLocaleLowerCase("es");
    const kind = this.elements.inventoryKind.value;
    const matches = (location) => {
      const kindMatches = kind === "all" || location.kind === kind;
      const haystack = `${location.id} ${location.title ?? ""} ${location.shortTitle ?? ""}`
        .toLocaleLowerCase("es");
      return kindMatches && (!term || haystack.includes(term));
    };

    const empty = (message) => {
      const paragraph = document.createElement("p");
      paragraph.className = "editor-inventory-empty";
      paragraph.textContent = message;
      return paragraph;
    };
    const entry = (location, actionLabel, action, selected = false, disabled = false) => {
      const row = document.createElement("article");
      row.className = "editor-inventory-entry";
      if (selected) row.setAttribute("aria-current", "true");
      const copy = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = location.shortTitle ?? location.title ?? location.id;
      const meta = document.createElement("small");
      meta.textContent = `${location.kind} · ${location.id}${
        PROTECTED_LOCATION_IDS.has(location.id) ? " · protegido contra borrado" : ""
      }`;
      copy.append(title, meta);
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = actionLabel;
      button.setAttribute(
        "aria-label",
        `${actionLabel} ${location.shortTitle ?? location.title ?? location.id} (${location.id})`,
      );
      button.disabled = disabled;
      button.dataset.editorFocusKey = `inventory:${actionLabel}:${location.id}`;
      button.addEventListener("click", action);
      row.append(copy, button);
      return row;
    };

    const activeRows = active.filter(matches).map((location) =>
      entry(
        location,
        "Guardar",
        () => this.#requestInventoryAction("inventory", location.id),
        location.id === appState.selectedLocationId && appState.spiderMode === "inventory",
        this.readOnly,
      )
    );
    this.elements.activeLocationList.replaceChildren(
      ...(activeRows.length > 0 ? activeRows : [empty("No hay nodos activos que coincidan.")]),
    );

    const inventoryRows = inventory.filter(matches).map((location) =>
      entry(
        location,
        "Seleccionar",
        () => {
          this.selectedInventoryLocationId = location.id;
          this.pendingInventoryAction = null;
          this.app.clearPendingPlacement?.();
          this.render();
        },
        location.id === this.selectedInventoryLocationId,
      )
    );
    this.elements.inventoryLocationList.replaceChildren(
      ...(inventoryRows.length > 0 ? inventoryRows : [empty("El Inventario está vacío o no hay coincidencias.")]),
    );

    const selected = inventory.find((location) => location.id === this.selectedInventoryLocationId);
    if (!selected && this.selectedInventoryLocationId) this.selectedInventoryLocationId = null;
    const inventoryLocationChanged = selected?.id !== this.lastRenderedInventoryLocationId;
    this.elements.inventoryRestoreControls.hidden = !selected;
    if (selected) {
      const areaCandidate = resolveEditorFormValue({
        currentValue: this.elements.inventoryArea.value,
        lastRenderedValue: this.elements.inventoryArea.dataset.editorRenderedValue,
        modelValue: selected.areaId,
        selectionChanged: inventoryLocationChanged,
      });
      this.#replaceSelectOptions(
        this.elements.inventoryArea,
        snapshot.areas,
        snapshot.areas.some(({ id }) => id === areaCandidate) ? areaCandidate : selected.areaId,
        { groups: this.#areaGroups(snapshot) },
      );
      this.elements.inventoryArea.dataset.editorRenderedValue = selected.areaId;
      this.#syncFormValue(
        this.elements.inventoryX,
        Number.isFinite(selected.offset?.x) ? selected.offset.x : 0,
        { force: inventoryLocationChanged },
      );
      this.#syncFormValue(
        this.elements.inventoryY,
        Number.isFinite(selected.offset?.y) ? selected.offset.y : 0,
        { force: inventoryLocationChanged },
      );
      const protectedLocation = PROTECTED_LOCATION_IDS.has(selected.id);
      this.elements.deleteLocation.disabled = this.readOnly || protectedLocation;
      this.elements.deleteLocation.title = protectedLocation
        ? "Este nodo académico canónico puede inventariarse, pero nunca borrarse."
        : "Borra la entidad y conserva su ID como tombstone no reutilizable.";
      this.elements.inventoryStatus.textContent = protectedLocation
        ? `${selected.id} está protegido: puede reinsertarse, pero no borrarse definitivamente.`
        : `${selected.id} está fuera del mapamundi y listo para reinsertarse o borrarse.`;
    } else {
      this.elements.inventoryStatus.textContent = inventory.length === 0
        ? "El Inventario está vacío."
        : "Selecciona un nodo guardado para revisar sus acciones.";
    }
    this.lastRenderedInventoryLocationId = selected?.id ?? null;

    const placement = appState.pendingPlacement;
    this.elements.armCreateLocation.setAttribute(
      "aria-pressed",
      String(placement?.type === "create"),
    );
    this.elements.armRestoreLocation.setAttribute(
      "aria-pressed",
      String(placement?.type === "restore"),
    );
    this.elements.createStatus.textContent = getCreateStatus(placement);

    const confirmation = this.pendingInventoryAction;
    if (confirmation) {
      this.elements.inventoryConfirmationDetail.textContent = confirmation.type === "delete"
        ? `Borrarás definitivamente ${confirmation.title} (${confirmation.locationId}), un ${confirmation.kind ?? "nodo"} de origen ${confirmation.provenance ?? "editorial"}. Su ID no podrá reutilizarse.`
        : `Guardarás ${confirmation.title} (${confirmation.locationId}) fuera del mapa y de la Red de aprendizaje.`;
      const impacts = getInventoryImpactMessages(confirmation);
      this.elements.inventoryImpactList.replaceChildren(...impacts.map((impact) => {
        const item = document.createElement("li");
        item.textContent = impact;
        return item;
      }));
      this.elements.confirmInventoryAction.textContent = confirmation.type === "delete"
        ? "Confirmar borrado definitivo"
        : "Confirmar envío a Inventario";
      if (!this.elements.inventoryConfirmation.open) {
        this.elements.inventoryConfirmation.showModal();
      }
    } else {
      this.elements.inventoryImpactList.replaceChildren();
      if (this.elements.inventoryConfirmation.open) {
        this.elements.inventoryConfirmation.close();
      }
    }
  }

  #renderAreaControls(snapshot, appState) {
    const tierLabels = getTierLabels(snapshot);
    this.elements.ringOneHeading.textContent = tierLabels.find((entry) => entry.tier === 1)?.text ?? "Nivel 1";
    this.elements.ringTwoHeading.textContent = tierLabels.find((entry) => entry.tier === 2)?.text ?? "Nivel 2";
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
          button.dataset.editorFocusKey = `area:${area.id}`;
          button.setAttribute("aria-pressed", String(area.id === appState.selectedAreaId));
          button.addEventListener("click", () => this.app.selectArea(area.id));
          return button;
        });
      container.replaceChildren(...buttons);
    };
    renderRing(this.elements.baseList, 0);
    renderRing(this.elements.ringOneList, 1);
    renderRing(this.elements.ringTwoList, 2);
    const selected = snapshot.areas.find((area) => area.id === appState.selectedAreaId);
    const areaChanged = selected?.id !== this.lastRenderedAreaId;
    this.lastRenderedAreaId = selected?.id ?? null;
    this.elements.selectedAreaSummary.textContent = selected
      ? `${selected.title}: nivel ${selected.tier}, hex(${selected.q}, ${selected.r}).`
      : appState.selectedTierLabel
        ? `Rótulo del nivel ${appState.selectedTierLabel} seleccionado.`
        : "Selecciona una zona de los niveles 1 o 2.";
    this.elements.previousArea.disabled = this.readOnly || !selected || selected.tier === 0;
    this.elements.nextArea.disabled = this.readOnly || !selected || selected.tier === 0;
    this.elements.areaId.value = selected?.id ?? "";
    this.#syncFormValue(this.elements.areaTitle, selected?.title ?? "", { force: areaChanged });
    this.#syncFormValue(
      this.elements.areaShortTitle,
      selected?.shortTitle ?? selected?.title ?? "",
      { force: areaChanged },
    );
    this.elements.areaTitle.disabled = this.readOnly || !selected;
    this.elements.areaShortTitle.disabled = this.readOnly || !selected;
    this.elements.applyAreaName.disabled = this.readOnly || !selected;

    const selectedTier = appState.selectedTierLabel
      ?? Number(this.elements.tierLabelSelect.value || 1);
    const selectedLabel = tierLabels.find((entry) => entry.tier === selectedTier) ?? tierLabels[0];
    const tierChanged = selectedLabel.tier !== this.lastRenderedTier;
    this.lastRenderedTier = selectedLabel.tier;
    this.elements.tierLabelSelect.value = String(selectedLabel.tier);
    this.#syncFormValue(this.elements.tierLabelText, selectedLabel.text, { force: tierChanged });
    this.#syncFormValue(this.elements.tierLabelX, selectedLabel.offset.x, { force: tierChanged });
    this.#syncFormValue(this.elements.tierLabelY, selectedLabel.offset.y, { force: tierChanged });
    this.elements.tierLabelSelect.disabled = false;
    for (const control of [
      this.elements.tierLabelText,
      this.elements.tierLabelX,
      this.elements.tierLabelY,
      this.elements.applyTierLabel,
      this.elements.resetTierLabel,
    ]) {
      control.disabled = this.readOnly;
    }
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
        groups: this.#areaGroups({
          areas: appearanceSnapshot.areas,
          tierLabels: getTierLabels(this.model.getSnapshot()),
        }),
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
      remove.dataset.editorFocusKey = `connection:${edge.sourceId}:${edge.targetId}`;
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
