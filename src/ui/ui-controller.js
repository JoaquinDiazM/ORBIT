import { APP_CONFIG } from "../config.js";
import { CONCEPTS, REWARDS, getConcept, getReward, parseRewardKey } from "../data/knowledge.js";
import {
  CONSTANTS,
  FORMULAS,
  GLOSSARY,
  REFERENCE_COLLECTIONS,
  REFERENCE_VIEWS,
  SYMBOLS,
} from "../data/reference/index.js";
import { getLocationSteps } from "../core/location-steps.js";
import {
  getProfileCapabilities,
  shouldAutoCompleteLocationOnInteraction,
} from "../core/profile-policy.js";
import { describeMissingRequirements, meetsRequirements } from "../core/requirements.js";
import { StoragePersistenceError } from "../core/storage.js";
import { renderMath } from "./math-renderer.js";
import { playLocationCompletionCue } from "./audio-policy.js";
import { GadgetHub } from "./gadget-hub.js";
import { ContentView } from "./content-view.js";

function element(tagName, options = {}) {
  const node = document.createElement(tagName);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.attributes) {
    for (const [name, value] of Object.entries(options.attributes)) {
      node.setAttribute(name, String(value));
    }
  }
  return node;
}

function appendTextParagraph(parent, text) {
  parent.append(element("p", { text }));
}

function locationKindLabel(kind) {
  const labels = {
    base: "Orientación",
    lesson: "Lugar de aprendizaje",
    gadget: "Gadget",
    npc: "Personaje secundario",
    transport: "Transporte",
    mission: "Misión",
    debug: "Herramienta de desarrollo",
  };
  return labels[kind] ?? kind;
}

function isAcademicLocation(location) {
  return ["lesson", "mission"].includes(location?.kind);
}

export class UIController {
  constructor({
    progression,
    audio,
    areas = progression?.areas,
    locations = progression?.locations,
  }) {
    if (!Array.isArray(areas) || !Array.isArray(locations)) {
      throw new TypeError("UIController requiere la cartografía materializada del curso.");
    }
    this.progression = progression;
    this.audio = audio;
    this.areas = areas;
    this.locations = locations;
    this.profileCapabilities = getProfileCapabilities(progression.profile);
    this.gameApi = null;
    this.openPanels = [];
    this.panelReturnFocus = new Map();
    this.persistenceFailureReported = false;
    this.activeReferenceView = "symbols";
    this.settingsPanelIds = ["visual-panel", "sound-panel", "help-panel"];
    this.secondaryPanelIds = [
      "knowledge-panel",
      "gadgets-panel",
      "visual-panel",
      "reference-panel",
      "sound-panel",
      "help-panel",
    ];

    this.elements = {
      area: document.querySelector("#hud-area"),
      transport: document.querySelector("#hud-transport"),
      progress: document.querySelector("#hud-progress"),
      progressValue: document.querySelector("#hud-progress-value"),
      mission: document.querySelector("#hud-mission"),
      versionBadge: document.querySelector("#orbit-version-badge"),
      profileSelect: document.querySelector("#profile-select"),
      editorLink: document.querySelector("#open-orbit-editor"),
      settingsButton: document.querySelector("#open-settings"),
      settingsTools: document.querySelector("#settings-tools"),
      interactionPrompt: document.querySelector("#interaction-prompt"),
      interactionText: document.querySelector("#interaction-text"),
      lessonPanel: document.querySelector("#lesson-panel"),
      lessonEyebrow: document.querySelector("#lesson-eyebrow"),
      lessonTitle: document.querySelector("#lesson-title"),
      lessonBody: document.querySelector("#lesson-body"),
      knowledgePanel: document.querySelector("#knowledge-panel"),
      knowledgeBody: document.querySelector("#knowledge-body"),
      gadgetsPanel: document.querySelector("#gadgets-panel"),
      gadgetsBody: document.querySelector("#gadgets-body"),
      visualPanel: document.querySelector("#visual-panel"),
      visualModeInputs: [...document.querySelectorAll(
        'input[name="tree-two-visualization"]',
      )],
      referencePanel: document.querySelector("#reference-panel"),
      referenceEyebrow: document.querySelector("#reference-eyebrow"),
      referenceTitle: document.querySelector("#reference-title"),
      referenceBody: document.querySelector("#reference-body"),
      soundPanel: document.querySelector("#sound-panel"),
      soundAmbience: document.querySelector("#sound-ambience"),
      soundAmbienceOutput: document.querySelector("#sound-ambience-output"),
      soundEffects: document.querySelector("#sound-effects"),
      soundEffectsOutput: document.querySelector("#sound-effects-output"),
      helpPanel: document.querySelector("#help-panel"),
      debugPanel: document.querySelector("#debug-panel"),
      debugState: document.querySelector("#debug-state"),
      toastRegion: document.querySelector("#toast-region"),
      loadingScreen: document.querySelector("#loading-screen"),
      debugNoclip: document.querySelector("#debug-noclip"),
      debugShowIds: document.querySelector("#debug-show-ids"),
      debugShowGraph: document.querySelector("#debug-show-graph"),
      debugShowCoords: document.querySelector("#debug-show-coords"),
      debugAreaSelect: document.querySelector("#debug-area-select"),
      debugImport: document.querySelector("#debug-import"),
    };

    this.contentView = new ContentView({
      container: this.elements.lessonBody,
      isCompleted: (id) => this.progression.isLocationCompleted(id),
      onComplete: (location, exercise) => this.#completeLocationProgress(location, exercise),
      playInteractionCue: (key) => this.#playInteractionCue(key),
      toast: (...args) => this.toast(...args),
    });

    const versionLabel = `Versión actual de ${APP_CONFIG.appName}: ${APP_CONFIG.version}`;
    this.elements.versionBadge.textContent = `v${APP_CONFIG.version}`;
    this.elements.versionBadge.setAttribute("aria-label", versionLabel);
    this.elements.versionBadge.title = versionLabel;
    this.elements.profileSelect.value = progression.profile;
    for (const element of document.querySelectorAll("[data-debug-only]")) {
      element.hidden = !this.profileCapabilities.canUseDebugger;
    }
    const editorUrl = new URL(
      "./editor.html",
      document.baseURI ?? globalThis.location?.href ?? "http://localhost/",
    );
    editorUrl.search = "";
    editorUrl.searchParams.set("profile", progression.profile);
    this.elements.editorLink.href = editorUrl.href;
    if (this.profileCapabilities.editorAccess === "blocked") {
      this.elements.editorLink.title = "El perfil debug no puede iniciar ORBIT Editor.";
      this.elements.editorLink.setAttribute(
        "aria-label",
        "Abrir ORBIT Editor; acceso bloqueado para el perfil debug",
      );
    }
    this.#populateDebugAreaSelect();
    this.#bindStaticControls();
    this.gadgetHub = new GadgetHub({
      container: this.elements.gadgetsBody,
      progression: this.progression,
    });
    this.#updateVisualControls();
    this.#updateSoundControls();
    this.#updateConceptProgress(this.progression.getSnapshot());
    this.progression.subscribe((event) => {
      this.#updateConceptProgress(event.snapshot);
      this.gadgetHub.refresh(event.snapshot);
      this.updateKnowledgePanel();
      this.updateReferencePanel();
      this.#updateVisualControls();
      this.#updateSoundControls();
    });
  }

  bindGameApi(gameApi) {
    this.gameApi = gameApi;
    const debug = gameApi.getDebugState();
    this.elements.debugNoclip.checked = debug.noclip;
    this.elements.debugShowIds.checked = debug.showIds;
    this.elements.debugShowGraph.checked = debug.showGraph;
    this.elements.debugShowCoords.checked = debug.showCoords;
  }

  destroy() {
    this.contentView.destroy();
  }

  #bindStaticControls() {
    this.elements.profileSelect.addEventListener("change", () => {
      const destination = new URL(globalThis.location?.href ?? document.baseURI);
      const profile = this.elements.profileSelect.value;
      destination.searchParams.set("profile", profile);
      destination.searchParams.delete("debug");
      if (profile === "debug") destination.searchParams.set("debug", "1");
      globalThis.location.assign(destination.href);
    });
    document.querySelector("#open-knowledge").addEventListener("click", () => {
      this.toggleKnowledgePanel();
    });
    document.querySelector("#open-gadgets").addEventListener("click", () => {
      this.toggleGadgetsPanel();
    });
    this.elements.settingsButton.addEventListener("click", () => {
      this.toggleSettingsMenu();
    });
    document.querySelector("#open-visual").addEventListener("click", () => {
      this.toggleVisualPanel();
    });
    for (const button of document.querySelectorAll("[data-reference-view]")) {
      button.addEventListener("click", () => {
        this.toggleReferencePanel(button.dataset.referenceView);
      });
    }
    document.querySelector("#open-help").addEventListener("click", () => {
      this.toggleHelpPanel();
    });
    document.querySelector("#open-sound").addEventListener("click", () => {
      this.toggleSoundPanel();
    });
    for (const input of this.elements.visualModeInputs) {
      input.addEventListener("change", () => {
        if (!input.checked) return;
        const result = this.#runPersistenceAction(() =>
          this.progression.setTreeTwoVisualizationMode(input.value));
        if (!result.ok) this.#updateVisualControls();
      });
    }
    this.elements.soundAmbience.addEventListener("input", () => {
      const result = this.#runPersistenceAction(() =>
        this.progression.setAmbienceVolume(Number(this.elements.soundAmbience.value) / 100));
      if (!result.ok) this.#updateSoundControls();
    });
    this.elements.soundEffects.addEventListener("input", () => {
      const result = this.#runPersistenceAction(() =>
        this.progression.setEffectsVolume(Number(this.elements.soundEffects.value) / 100));
      if (!result.ok) this.#updateSoundControls();
    });

    const audioPreviews = [
      ["#debug-audio-ambience", "global_ambience", 5000],
      ["#debug-audio-transition", "hexagon_transition", undefined],
      ["#debug-audio-mission", "mission_start", undefined],
      ["#debug-audio-ui-select", "ui_select", undefined],
      ["#debug-audio-zone-unlocked", "zone_unlocked", undefined],
      ["#debug-audio-teleport", "teleport", undefined],
    ];
    for (const [selector, assetKey, durationMs] of audioPreviews) {
      document.querySelector(selector).addEventListener("click", () => {
        void this.#previewAudio(assetKey, durationMs);
      });
    }

    document.addEventListener("click", (event) => {
      const control = event.target?.closest?.(
        "button, [role='button'], [role='radio'], input[type='radio'], input[type='checkbox']",
      );
      if (
        !control
        || control.disabled
        || control.getAttribute?.("aria-disabled") === "true"
        || ["none", "deferred"].includes(control.dataset?.audioCue)
      ) {
        return;
      }
      this.#playInteractionCue();
    });
    document.addEventListener("change", (event) => {
      const control = event.target?.closest?.("select, input[type='range']");
      if (
        !control
        || control.disabled
        || control.getAttribute?.("aria-disabled") === "true"
        || control.dataset?.audioCue === "none"
      ) {
        return;
      }
      this.#playInteractionCue();
    });

    document.querySelectorAll("[data-close-panel]").forEach((button) => {
      button.addEventListener("click", () => this.closePanel(button.dataset.closePanel));
    });
    document.addEventListener("keydown", (event) => this.#trapFocusInCompactPanel(event));

    const debugOptionMap = [
      [this.elements.debugNoclip, "noclip"],
      [this.elements.debugShowIds, "showIds"],
      [this.elements.debugShowGraph, "showGraph"],
      [this.elements.debugShowCoords, "showCoords"],
    ];
    for (const [input, option] of debugOptionMap) {
      input.addEventListener("change", () => {
        this.gameApi?.setDebugOption(option, input.checked);
      });
    }

    document.querySelector("#debug-teleport").addEventListener("click", () => {
      const areaId = this.elements.debugAreaSelect.value;
      this.gameApi?.teleportToArea(areaId);
    });
    document.querySelector("#debug-spawn").addEventListener("click", () => {
      this.gameApi?.teleportToArea("origin");
    });
    document.querySelector("#debug-complete-nearby").addEventListener("click", () => {
      const result = this.gameApi?.completeNearby();
      this.toast(result?.message ?? "No hay un lugar progresivo cercano.", result?.ok ? "success" : "warning");
    });
    document.querySelector("#debug-unlock-next").addEventListener("click", () => {
      const action = this.#runPersistenceAction(() => this.progression.grantNextConcept());
      if (!action.ok) return;
      const concept = action.value;
      this.toast(
        concept ? `Concepto concedido: ${concept.title}.` : "Todos los conceptos ya están concedidos.",
        concept ? "success" : "warning",
      );
    });
    document.querySelector("#debug-unlock-areas").addEventListener("click", () => {
      const action = this.#runPersistenceAction(() => this.progression.unlockAllAreasForDebug());
      if (!action.ok) return;
      this.toast("Todas las zonas quedaron abiertas mediante override de depuración.", "success");
    });
    document.querySelector("#debug-complete-all").addEventListener("click", () => {
      const action = this.#runPersistenceAction(() => this.progression.completeAllForDebug());
      if (!action.ok) return;
      this.toast("Progresión completa concedida al perfil actual.", "success");
    });
    document.querySelector("#debug-reset").addEventListener("click", () => {
      const accepted = window.confirm(`¿Reiniciar por completo el perfil “${this.progression.profile}”?`);
      if (!accepted) return;
      const action = this.#runPersistenceAction(() => this.progression.reset());
      if (!action.ok) return;
      this.#clearTransientLocationState();
      this.gameApi?.syncPlayerFromProgress();
      this.toast("Perfil reiniciado.", "warning");
    });
    document.querySelector("#debug-export").addEventListener("click", () => {
      this.#downloadProgress();
    });
    this.elements.debugImport.addEventListener("change", async () => {
      const [file] = this.elements.debugImport.files ?? [];
      if (!file) return;
      try {
        const candidate = JSON.parse(await file.text());
        this.#clearTransientLocationState();
        this.progression.importState(candidate);
        this.gameApi?.syncPlayerFromProgress();
        this.toast("Progreso importado y saneado correctamente.", "success");
      } catch (error) {
        if (!(error instanceof StoragePersistenceError)) {
          console.error(error);
          this.toast("No fue posible importar el archivo JSON.", "warning");
        } else {
          this.reportPersistenceError(error);
        }
      } finally {
        this.elements.debugImport.value = "";
      }
    });
  }

  #populateDebugAreaSelect() {
    this.elements.debugAreaSelect.replaceChildren();
    for (const area of [...this.areas].sort((a, b) => a.order - b.order)) {
      const option = element("option", { text: `${area.shortTitle} [${area.id}]` });
      option.value = area.id;
      this.elements.debugAreaSelect.append(option);
    }
  }

  #downloadProgress() {
    const blob = new Blob([this.progression.exportState()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `orbit-progress-${this.progression.profile}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  #clearTransientLocationState() {
    this.contentView.reset();
    this.closePanel("lesson-panel");
    this.elements.lessonBody.replaceChildren();
  }

  #destroyInteractiveFigures() {
    this.contentView.destroy();
  }

  hideLoadingScreen() {
    this.elements.loadingScreen.classList.add("is-hidden");
    window.setTimeout(() => {
      this.elements.loadingScreen.hidden = true;
    }, 320);
  }

  updateHUD({ area, snapshot }) {
    this.elements.area.textContent = area?.title ?? "Fuera de la cartografía";
    this.elements.transport.textContent = snapshot.activeTransport.title;
    this.elements.mission.textContent = snapshot.nextMission;
  }

  #updateConceptProgress(snapshot) {
    const total = CONCEPTS.length;
    const acquired = Math.min(total, Math.max(0, snapshot.concepts.size));
    const percentage = total === 0 ? 0 : Math.round((acquired / total) * 100);
    const percentageLabel = `${percentage}%`;
    const accessibleLabel = `${percentageLabel}; ${acquired} de ${total} conceptos adquiridos`;

    this.elements.progress.max = 100;
    this.elements.progress.value = percentage;
    this.elements.progress.textContent = accessibleLabel;
    this.elements.progress.setAttribute("aria-valuetext", accessibleLabel);
    this.elements.progressValue.textContent = percentageLabel;
  }

  setInteraction(location) {
    if (!location) {
      this.elements.interactionPrompt.hidden = true;
      return;
    }
    this.elements.interactionText.textContent = `${locationKindLabel(location.kind)}: ${location.shortTitle}`;
    this.elements.interactionPrompt.hidden = false;
  }

  openLocation(location) {
    if (location.exercise?.type === "action" && location.exercise.action === "open-debug") {
      if (this.profileCapabilities.canUseDebugger) this.openDebugPanel();
      else this.toast("El debugger solo está disponible en el perfil debug.", "warning");
      return { completionCueHandled: false };
    }
    let completionCueHandled = false;
    if (this.willAutoCompleteLocation(location)) {
      const finalExercise = getLocationSteps(location).at(-1)?.exercise;
      const result = this.#completeLocationProgress(location, finalExercise, {
        completionMessage: "Perfil docente: actividad autocompletada al interactuar.",
      });
      completionCueHandled = result.ok;
      if (!result.ok && result.reason !== "storage-write-failed") {
        this.toast("La actividad ya no cumple sus condiciones de acceso.", "warning");
      }
    }
    this.elements.lessonEyebrow.textContent = locationKindLabel(location.kind);
    this.elements.lessonTitle.textContent = location.title;
    this.#renderLocationBody(location);
    this.openPanel("lesson-panel");
    return { completionCueHandled };
  }

  willAutoCompleteLocation(location) {
    return shouldAutoCompleteLocationOnInteraction(this.progression.profile, location)
      && !this.progression.isLocationCompleted(location.id);
  }

  #renderLocationBody(location) {
    this.contentView.render(location);
  }

  #playInteractionCue(specificAssetKey) {
    void this.audio?.playInteractionCue?.(specificAssetKey ? { specificAssetKey } : undefined);
  }

  #completeLocationProgress(location, exercise, { completionMessage } = {}) {
    const before = this.progression.getSnapshot();
    const action = this.#runPersistenceAction(() =>
      this.progression.completeLocation(location.id));
    if (!action.ok) return { ok: false, reason: "storage-write-failed" };
    const result = action.value;
    if (!result.ok) return result;
    const after = this.progression.getSnapshot();
    const newlyOpenedAreas = result.newlyUnlockedAreaIds ?? [];
    const newlyVisibleLocations = [...after.visibleLocationIds].filter(
      (locationId) => !before.visibleLocationIds.has(locationId),
    );
    const citationLabels = this.#newlyUnlockedCitationLabels(before, after);
    void playLocationCompletionCue(this.audio, result);

    const messageParts = [
      completionMessage ?? exercise?.explanation ?? "Misión completada.",
    ];
    if (newlyOpenedAreas.length) {
      const names = newlyOpenedAreas
        .map((areaId) => this.areas.find((area) => area.id === areaId)?.title ?? areaId)
        .join(", ");
      messageParts.push(`Nueva zona abierta: ${names}.`);
    }
    if (newlyVisibleLocations.length) {
      messageParts.push(`${newlyVisibleLocations.length} lugar(es) habilitado(s).`);
    }
    if (citationLabels.length) {
      messageParts.push(`Referencia del contenido desbloqueado: ${citationLabels.join("; ")}.`);
    }
    this.toast(messageParts.join(" "), "success", 6400);
    return result;
  }

  #newlyUnlockedCitationLabels(before, after) {
    const labels = new Set();
    for (const entries of Object.values(REFERENCE_COLLECTIONS)) {
      for (const entry of entries) {
        if (!entry.source) continue;
        const wasUnlocked = this.#isReferenceUnlocked(entry, before);
        const isUnlocked = this.#isReferenceUnlocked(entry, after);
        if (!wasUnlocked && isUnlocked) labels.add(entry.source.label);
      }
    }
    return [...labels];
  }

  toggleKnowledgePanel() {
    if (!this.elements.knowledgePanel.hidden) {
      this.closePanel("knowledge-panel");
      return;
    }
    this.openPanel("knowledge-panel");
    this.updateKnowledgePanel();
  }

  toggleGadgetsPanel() {
    if (!this.elements.gadgetsPanel.hidden) this.closePanel("gadgets-panel");
    else this.openPanel("gadgets-panel");
  }

  toggleSettingsMenu() {
    if (this.elements.settingsTools.hidden) {
      this.elements.settingsTools.hidden = false;
      this.#syncPanelControls();
      return;
    }
    this.#closeSettingsMenu();
  }

  #closeSettingsMenu() {
    for (const panelId of this.settingsPanelIds) {
      this.closePanel(panelId, { restoreFocus: false });
    }
    for (const [panelId, returnTarget] of this.panelReturnFocus) {
      if (this.elements.settingsTools.contains(returnTarget)) {
        this.panelReturnFocus.set(panelId, this.elements.settingsButton);
      }
    }
    this.elements.settingsTools.hidden = true;
    this.#syncPanelControls();
    this.elements.settingsButton.focus({ preventScroll: true });
  }

  updateKnowledgePanel() {
    if (this.elements.knowledgePanel.hidden && !this.openPanels.includes("knowledge-panel")) return;
    const snapshot = this.progression.getSnapshot();
    const body = this.elements.knowledgeBody;
    body.replaceChildren();

    const explanation = element("p", { className: "callout" });
    explanation.textContent =
      "La Red de aprendizaje conecta únicamente lecciones y misiones. Una zona vecina se abre cuando contiene al menos un nodo académicamente elegible; sus personajes, gadgets y transportes quedan disponibles para interactuar. El movimiento físico sigue siendo libre.";
    body.append(explanation);

    const columns = element("div", { className: "knowledge-columns" });
    const areaColumn = element("section", { className: "knowledge-column" });
    areaColumn.append(element("h3", { text: "Zonas" }));
    for (const area of [...this.areas].sort((a, b) => a.order - b.order)) {
      const unlocked = snapshot.unlockedAreaIds.has(area.id);
      const card = element("article", {
        className: `knowledge-card ${unlocked ? "unlocked" : "locked"}`,
      });
      card.append(element("h4", { text: area.title }));
      card.append(
        element("span", {
          className: "state-chip",
          text: unlocked ? "abierta" : "bloqueada",
        }),
      );
      appendTextParagraph(card, area.subtitle);
      appendTextParagraph(card, area.unlockHint);
      areaColumn.append(card);
    }

    const contentColumn = element("section", { className: "knowledge-column" });
    contentColumn.append(element("h3", { text: "Red de aprendizaje" }));
    const renderLocationCard = (location) => {
      const visible = snapshot.visibleLocationIds.has(location.id);
      const accessible = snapshot.accessibleLocationIds.has(location.id);
      const completed = snapshot.completedLocationIds.has(location.id);
      const title = visible ? location.title : "Lugar aún no revelado";
      const state = completed ? "completado" : accessible ? "disponible" : visible ? "bloqueado" : "oculto";
      const card = element("article", {
        className: `knowledge-card ${completed ? "completed" : accessible ? "unlocked" : "locked"}`,
      });
      card.append(element("h4", { text: title }));
      card.append(element("span", { className: "state-chip", text: state }));
      if (visible) {
        appendTextParagraph(card, `${locationKindLabel(location.kind)} · ${location.objective}`);
      } else {
        appendTextParagraph(card, "Se revelará cuando se satisfagan sus prerrequisitos.");
      }
      return card;
    };
    for (const location of this.locations.filter(isAcademicLocation)) {
      contentColumn.append(renderLocationCard(location));
    }

    columns.append(areaColumn, contentColumn);
    body.append(columns);

    const lateral = element("section", { className: "lesson-section" });
    lateral.append(element("h3", { text: "Exploración lateral" }));
    appendTextParagraph(
      lateral,
      "Personajes, gadgets y transportes no forman parte de la Red de aprendizaje: se habilitan al abrir su zona y conservan su interacción propia.",
    );
    for (const location of this.locations.filter(
      (entry) => !isAcademicLocation(entry) && !["base", "debug"].includes(entry.kind),
    )) {
      lateral.append(renderLocationCard(location));
    }
    body.append(lateral);

    const inventory = element("section", { className: "lesson-section" });
    inventory.append(element("h3", { text: "Inventario desbloqueado" }));
    const chips = element("div", { className: "reward-list" });
    for (const reward of snapshot.rewards) chips.append(this.contentView.renderRewardChip(reward));
    inventory.append(chips);
    body.append(inventory);
  }

  toggleVisualPanel() {
    if (!this.elements.visualPanel.hidden) this.closePanel("visual-panel");
    else this.openPanel("visual-panel");
  }

  #updateVisualControls() {
    const mode = this.progression.getSnapshot().state.settings.treeTwoVisualizationMode
      ?? "hidden";
    for (const input of this.elements.visualModeInputs) {
      input.checked = input.value === mode;
    }
  }

  toggleReferencePanel(viewId) {
    if (!REFERENCE_VIEWS[viewId]) return;
    if (!this.elements.referencePanel.hidden && this.activeReferenceView === viewId) {
      this.closePanel("reference-panel");
      return;
    }
    this.activeReferenceView = viewId;
    this.openPanel("reference-panel");
    this.updateReferencePanel();
  }

  updateReferencePanel() {
    if (!this.elements.referencePanel) return;
    if (
      this.elements.referencePanel.hidden &&
      !this.openPanels.includes("reference-panel")
    ) {
      return;
    }
    const view = REFERENCE_VIEWS[this.activeReferenceView];
    if (!view) return;

    this.elements.referenceEyebrow.textContent = view.eyebrow;
    this.elements.referenceTitle.textContent = view.title;
    const body = this.elements.referenceBody;
    body.replaceChildren();
    body.classList.add("prose");
    const snapshot = this.progression.getSnapshot();

    if (view.id === "symbols") this.#renderSymbolReference(body, snapshot);
    else if (view.id === "constants") this.#renderConstantReference(body, snapshot);
    else if (view.id === "formulas") this.#renderFormulaReference(body, snapshot);
    else if (view.id === "glossary") this.#renderGlossaryReference(body, snapshot);
    this.#syncPanelControls();
  }

  #requirementContext(snapshot) {
    return {
      concepts: snapshot.concepts,
      completedLocations: snapshot.completedLocationIds,
      rewards: snapshot.rewards,
      unlockedAreas: snapshot.unlockedAreaIds,
    };
  }

  #isReferenceUnlocked(entry, snapshot) {
    return meetsRequirements(entry.requirements, this.#requirementContext(snapshot));
  }

  #referenceSummary(entries, snapshot) {
    const unlocked = entries.filter((entry) => this.#isReferenceUnlocked(entry, snapshot)).length;
    return `${unlocked} de ${entries.length} entradas disponibles`;
  }

  #renderReferenceIntro(parent, text, entries, snapshot) {
    const intro = element("section", { className: "reference-intro" });
    appendTextParagraph(intro, text);
    intro.append(
      element("p", {
        className: "reference-count",
        text: this.#referenceSummary(entries, snapshot),
        attributes: { "aria-live": "polite" },
      }),
    );
    parent.append(intro);
  }

  #renderInlineMath(tex, label) {
    const node = element("span", {
      className: "inline-math",
      attributes: { "aria-label": label },
    });
    renderMath(node, tex, { displayMode: false });
    return node;
  }

  #renderSymbolReference(body, snapshot) {
    this.#renderReferenceIntro(
      body,
      "Convención inicial de magnitudes y operadores. Las letras en negrita representan vectores; las unidades se expresan en SI.",
      SYMBOLS,
      snapshot,
    );
    const table = element("table", { className: "reference-table" });
    const head = element("thead");
    const headRow = element("tr");
    for (const label of ["Símbolo", "Magnitud", "Unidad SI"]) {
      headRow.append(element("th", { text: label, attributes: { scope: "col" } }));
    }
    head.append(headRow);
    const tbody = element("tbody");
    for (const entry of SYMBOLS) {
      if (!this.#isReferenceUnlocked(entry, snapshot)) continue;
      const row = element("tr");
      const symbolCell = element("td");
      symbolCell.append(this.#renderInlineMath(entry.tex, entry.symbol));
      const nameCell = element("td");
      nameCell.append(element("strong", { text: entry.name }));
      nameCell.append(element("span", { className: "reference-category", text: entry.category }));
      if (entry.note) nameCell.append(element("span", { className: "reference-note", text: entry.note }));
      row.append(symbolCell, nameCell, element("td", { text: entry.unit }));
      tbody.append(row);
    }
    table.append(head, tbody);
    body.append(table);
  }

  #renderConstantReference(body, snapshot) {
    this.#renderReferenceIntro(
      body,
      "Valores de consulta en SI. El símbolo ≈ identifica cifras redondeadas; las evaluaciones pueden declarar su propio redondeo.",
      CONSTANTS,
      snapshot,
    );
    const table = element("table", { className: "reference-table constants-table" });
    const head = element("thead");
    const headRow = element("tr");
    for (const label of ["Símbolo", "Constante", "Valor", "Unidad SI"]) {
      headRow.append(element("th", { text: label, attributes: { scope: "col" } }));
    }
    head.append(headRow);
    const tbody = element("tbody");
    for (const entry of CONSTANTS) {
      if (!this.#isReferenceUnlocked(entry, snapshot)) continue;
      const row = element("tr");
      const symbolCell = element("td");
      symbolCell.append(this.#renderInlineMath(entry.tex, entry.symbol));
      const nameCell = element("td");
      nameCell.append(element("strong", { text: entry.name }));
      if (entry.note) nameCell.append(element("span", { className: "reference-note", text: entry.note }));
      row.append(
        symbolCell,
        nameCell,
        element("td", { text: entry.value }),
        element("td", { text: entry.unit }),
      );
      tbody.append(row);
    }
    table.append(head, tbody);
    body.append(table);
  }

  #renderFormulaReference(body, snapshot) {
    this.#renderReferenceIntro(
      body,
      "El formulario crece al completar lugares y recorridos de aprendizaje. Cada identidad declara las condiciones bajo las que puede aplicarse.",
      FORMULAS,
      snapshot,
    );
    const list = element("div", { className: "reference-card-list" });
    for (const entry of FORMULAS) {
      const unlocked = this.#isReferenceUnlocked(entry, snapshot);
      const card = element("article", {
        className: `reference-card ${unlocked ? "unlocked" : "locked"}`,
      });
      card.append(element("h3", { text: unlocked ? entry.title : "Fórmula bloqueada" }));
      card.append(
        element("span", {
          className: "state-chip",
          text: unlocked ? "disponible" : "bloqueada",
        }),
      );
      if (unlocked) {
        card.append(createEquationFigure(entry.equation));
        appendTextParagraph(card, `Condiciones: ${entry.conditions}`);
      } else appendTextParagraph(card, this.#referenceUnlockHint(entry, snapshot));
      list.append(card);
    }
    body.append(list);
  }

  #renderGlossaryReference(body, snapshot) {
    this.#renderReferenceIntro(
      body,
      "Definiciones, propiedades y teoremas se mantienen separados de las fórmulas para dejar visibles sus hipótesis.",
      GLOSSARY,
      snapshot,
    );
    const list = element("div", { className: "reference-card-list" });
    for (const entry of GLOSSARY) {
      const unlocked = this.#isReferenceUnlocked(entry, snapshot);
      const card = element("article", {
        className: `reference-card ${unlocked ? "unlocked" : "locked"}`,
      });
      card.append(element("h3", { text: unlocked ? entry.term : "Entrada bloqueada" }));
      card.append(
        element("span", {
          className: "state-chip",
          text: unlocked ? entry.kind : "bloqueada",
        }),
      );
      if (unlocked) {
        appendTextParagraph(card, entry.statement);
        card.append(this.#renderInlineMath(entry.notation, `Notación de ${entry.term}`));
      } else appendTextParagraph(card, this.#referenceUnlockHint(entry, snapshot));
      list.append(card);
    }
    body.append(list);
  }

  #referenceUnlockHint(entry, snapshot) {
    const missing = describeMissingRequirements(
      entry.requirements,
      this.#requirementContext(snapshot),
    );
    const labels = [
      ...missing.completedLocations.map(
        (id) => this.locations.find((location) => location.id === id)?.title ?? id,
      ),
      ...missing.concepts.map((id) => getConcept(id)?.title ?? id),
      ...missing.areas.map((id) => this.areas.find((area) => area.id === id)?.title ?? id),
      ...missing.rewards.map((id) => {
        const reward = parseRewardKey(id);
        return getReward(reward.type, reward.id)?.title ?? id;
      }),
    ];
    return labels.length > 0
      ? `Se desbloquea al completar o adquirir: ${labels.join(", ")}.`
      : "Esta entrada todavía no está disponible.";
  }

  toggleHelpPanel() {
    if (!this.elements.helpPanel.hidden) this.closePanel("help-panel");
    else this.openPanel("help-panel");
  }

  toggleSoundPanel() {
    if (!this.elements.soundPanel.hidden) this.closePanel("sound-panel");
    else this.openPanel("sound-panel");
  }

  #updateSoundControls() {
    const settings = this.progression.getSnapshot().state.settings;
    const ambience = Math.round((settings.ambienceVolume ?? 1) * 100);
    const effects = Math.round((settings.effectsVolume ?? 1) * 100);
    this.elements.soundAmbience.value = String(ambience);
    this.elements.soundAmbienceOutput.textContent = `${ambience}%`;
    this.elements.soundEffects.value = String(effects);
    this.elements.soundEffectsOutput.textContent = `${effects}%`;
  }

  async #previewAudio(assetKey, durationMs) {
    const result = await this.audio?.preview(assetKey, { durationMs });
    const message =
      result?.reason === "category-silent"
        ? "La categoría está en cero; sube su barra en Sonido para escucharla."
        : result?.ok
          ? "Prueba de audio iniciada."
          : "No fue posible reproducir este recurso.";
    this.toast(
      message,
      result?.ok ? "success" : "warning",
    );
  }

  openDebugPanel() {
    if (!this.profileCapabilities.canUseDebugger) {
      this.toast("El debugger solo está disponible en el perfil debug.", "warning");
      return;
    }
    this.gameApi?.setDebugOption("enabled", true);
    this.openPanel("debug-panel");
  }

  toggleDebugPanel() {
    if (this.elements.debugPanel.hidden) this.openDebugPanel();
    else this.closePanel("debug-panel");
  }

  openPanel(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    let returnTarget = document.activeElement;
    if (this.secondaryPanelIds.includes(panelId)) {
      for (const secondaryPanelId of this.secondaryPanelIds) {
        if (secondaryPanelId === panelId) continue;
        const secondaryPanel = document.getElementById(secondaryPanelId);
        if (secondaryPanel?.contains(returnTarget)) {
          returnTarget = this.panelReturnFocus.get(secondaryPanelId) ?? returnTarget;
        }
        this.closePanel(secondaryPanelId, { restoreFocus: false });
      }
    }
    if (
      returnTarget &&
      !panel.contains(returnTarget) &&
      typeof returnTarget.focus === "function"
    ) {
      this.panelReturnFocus.set(panelId, returnTarget);
    }
    panel.hidden = false;
    this.openPanels = this.openPanels.filter((id) => id !== panelId);
    this.openPanels.push(panelId);
    this.#syncPanelControls();
    panel.querySelector("[data-close-panel]")?.focus({ preventScroll: true });
  }

  #usesCompactPanelLayout() {
    return (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 760px)").matches
    );
  }

  #trapFocusInCompactPanel(event) {
    if (event.key !== "Tab" || !this.#usesCompactPanelLayout()) return;
    const panelId = this.openPanels.at(-1);
    const panel = panelId ? document.getElementById(panelId) : null;
    if (!panel || panel.hidden) return;
    const controls = [...panel.querySelectorAll(
      "button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])",
    )].filter((control) => control.getAttribute("aria-hidden") !== "true");
    if (controls.length === 0) return;
    const first = controls[0];
    const last = controls.at(-1);
    const focusIsOutside = !panel.contains(document.activeElement);
    if (focusIsOutside || (event.shiftKey && document.activeElement === first)) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  closePanel(panelId, { restoreFocus = true } = {}) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    const wasOpen = !panel.hidden;
    if (panelId === "debug-panel") this.gameApi?.setDebugOption("enabled", false);
    panel.hidden = true;
    this.openPanels = this.openPanels.filter((id) => id !== panelId);
    this.#syncPanelControls();
    const returnTarget = this.panelReturnFocus.get(panelId);
    this.panelReturnFocus.delete(panelId);
    const compactTopPanelId = this.#usesCompactPanelLayout() ? this.openPanels.at(-1) : null;
    const compactTopPanel = compactTopPanelId
      ? document.getElementById(compactTopPanelId)
      : null;
    if (wasOpen && restoreFocus && compactTopPanel && !compactTopPanel.hidden) {
      compactTopPanel
        .querySelector("[data-close-panel]")
        ?.focus({ preventScroll: true });
    } else if (
      wasOpen &&
      restoreFocus &&
      returnTarget?.isConnected !== false &&
      typeof returnTarget?.focus === "function"
    ) {
      returnTarget.focus({ preventScroll: true });
    }
  }

  #syncPanelControls() {
    const compactTopPanelId = this.#usesCompactPanelLayout() ? this.openPanels.at(-1) : null;
    for (const panelId of ["lesson-panel", ...this.secondaryPanelIds, "debug-panel"]) {
      document
        .getElementById(panelId)
        ?.setAttribute("data-compact-top", String(panelId === compactTopPanelId));
    }
    for (const button of document.querySelectorAll("[aria-controls]")) {
      const panelId = button.getAttribute("aria-controls");
      const panel = panelId ? document.getElementById(panelId) : null;
      let expanded = Boolean(panel && !panel.hidden);
      if (expanded && panelId === "reference-panel" && button.dataset.referenceView) {
        expanded = button.dataset.referenceView === this.activeReferenceView;
      }
      button.setAttribute("aria-expanded", String(expanded));
      if (button.dataset.referenceView) {
        button.setAttribute("aria-current", expanded ? "true" : "false");
      }
    }
  }

  closeTopPanel() {
    const panelId = this.openPanels.at(-1);
    if (panelId) {
      this.closePanel(panelId);
      return;
    }
    if (!this.elements.settingsTools.hidden) this.#closeSettingsMenu();
  }

  isBlockingModalOpen() {
    return ["lesson-panel", ...this.secondaryPanelIds].some(
      (panelId) => !document.getElementById(panelId).hidden,
    );
  }

  updateDebugState(debugSnapshot) {
    if (this.elements.debugPanel.hidden) return;
    this.elements.debugState.textContent = JSON.stringify(debugSnapshot, null, 2);
  }

  #runPersistenceAction(action) {
    try {
      return { ok: true, value: action() };
    } catch (error) {
      if (!(error instanceof StoragePersistenceError)) throw error;
      this.reportPersistenceError(error);
      return { ok: false, error };
    }
  }

  reportPersistenceError(error) {
    if (!(error instanceof StoragePersistenceError)) throw error;
    if (this.persistenceFailureReported) return false;
    this.persistenceFailureReported = true;
    console.error("ORBIT no pudo persistir el estado local.", error);
    this.toast(
      "No fue posible guardar los cambios. ORBIT mantuvo el último estado confirmado; libera espacio o habilita el almacenamiento antes de volver a intentarlo.",
      "warning",
      8000,
    );
    return true;
  }

  toast(message, type = "info", durationMs = 3600) {
    const toast = element("div", { className: `toast ${type}`, text: message });
    this.elements.toastRegion.append(toast);
    window.setTimeout(() => toast.remove(), durationMs);
  }

  requirementSummary(location) {
    const snapshot = this.progression.getSnapshot();
    return describeMissingRequirements(location.requirements, {
      concepts: snapshot.concepts,
      completedLocations: snapshot.completedLocationIds,
      rewards: snapshot.rewards,
      unlockedAreas: snapshot.unlockedAreaIds,
    });
  }
}
