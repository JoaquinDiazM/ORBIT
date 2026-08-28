import { CONCEPTS, REWARDS, getConcept, getReward, parseRewardKey } from "../data/knowledge.js";
import { LOCATIONS } from "../data/locations.js";
import {
  CONSTANTS,
  FORMULAS,
  GLOSSARY,
  REFERENCE_VIEWS,
  SYMBOLS,
} from "../data/reference/index.js";
import { AREAS } from "../data/world.js";
import { evaluateExercise } from "../core/exercises.js";
import {
  getLocationSteps,
  markLocationStepPassed,
  normalizeLocationStepState,
  selectLocationStep,
  unlockLocationStep,
} from "../core/location-steps.js";
import { describeMissingRequirements, meetsRequirements } from "../core/requirements.js";
import { createEquationFigure, renderMath } from "./math-renderer.js";

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

export class UIController {
  constructor({ progression, audio }) {
    this.progression = progression;
    this.audio = audio;
    this.gameApi = null;
    this.openPanels = [];
    this.panelReturnFocus = new Map();
    this.locationStepStates = new Map();
    this.activeReferenceView = "symbols";
    this.secondaryPanelIds = ["knowledge-panel", "reference-panel", "help-panel"];

    this.elements = {
      area: document.querySelector("#hud-area"),
      transport: document.querySelector("#hud-transport"),
      concepts: document.querySelector("#hud-concepts"),
      mission: document.querySelector("#hud-mission"),
      profileBadge: document.querySelector("#profile-badge"),
      interactionPrompt: document.querySelector("#interaction-prompt"),
      interactionText: document.querySelector("#interaction-text"),
      lessonPanel: document.querySelector("#lesson-panel"),
      lessonEyebrow: document.querySelector("#lesson-eyebrow"),
      lessonTitle: document.querySelector("#lesson-title"),
      lessonBody: document.querySelector("#lesson-body"),
      knowledgePanel: document.querySelector("#knowledge-panel"),
      knowledgeBody: document.querySelector("#knowledge-body"),
      referencePanel: document.querySelector("#reference-panel"),
      referenceEyebrow: document.querySelector("#reference-eyebrow"),
      referenceTitle: document.querySelector("#reference-title"),
      referenceBody: document.querySelector("#reference-body"),
      helpPanel: document.querySelector("#help-panel"),
      debugPanel: document.querySelector("#debug-panel"),
      debugState: document.querySelector("#debug-state"),
      toastRegion: document.querySelector("#toast-region"),
      loadingScreen: document.querySelector("#loading-screen"),
      audioToggle: document.querySelector("#toggle-audio"),
      debugNoclip: document.querySelector("#debug-noclip"),
      debugShowIds: document.querySelector("#debug-show-ids"),
      debugShowGraph: document.querySelector("#debug-show-graph"),
      debugShowCoords: document.querySelector("#debug-show-coords"),
      debugAreaSelect: document.querySelector("#debug-area-select"),
      debugImport: document.querySelector("#debug-import"),
    };

    this.elements.profileBadge.textContent = `perfil: ${progression.profile}`;
    this.#populateDebugAreaSelect();
    this.#bindStaticControls();
    this.#updateAudioControl();
    this.progression.subscribe(() => {
      this.updateKnowledgePanel();
      this.updateReferencePanel();
      this.#updateAudioControl();
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

  #bindStaticControls() {
    document.querySelector("#open-knowledge").addEventListener("click", () => {
      this.toggleKnowledgePanel();
    });
    document.querySelector("#open-help").addEventListener("click", () => {
      this.toggleHelpPanel();
    });
    for (const button of document.querySelectorAll("[data-reference-view]")) {
      button.addEventListener("click", () => {
        this.toggleReferencePanel(button.dataset.referenceView);
      });
    }
    this.elements.audioToggle.addEventListener("click", () => {
      void this.toggleAudio();
    });

    const audioPreviews = [
      ["#debug-audio-ambience", "global_ambience", 5000],
      ["#debug-audio-transition", "hexagon_transition", undefined],
      ["#debug-audio-mission", "mission_start", undefined],
    ];
    for (const [selector, assetKey, durationMs] of audioPreviews) {
      document.querySelector(selector).addEventListener("click", () => {
        void this.#previewAudio(assetKey, durationMs);
      });
    }

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
      const concept = this.progression.grantNextConcept();
      this.toast(
        concept ? `Concepto concedido: ${concept.title}.` : "Todos los conceptos ya están concedidos.",
        concept ? "success" : "warning",
      );
    });
    document.querySelector("#debug-unlock-areas").addEventListener("click", () => {
      this.progression.unlockAllAreasForDebug();
      this.toast("Todas las zonas quedaron abiertas mediante override de depuración.", "success");
    });
    document.querySelector("#debug-complete-all").addEventListener("click", () => {
      this.progression.completeAllForDebug();
      this.toast("Progresión completa concedida al perfil actual.", "success");
    });
    document.querySelector("#debug-reset").addEventListener("click", () => {
      const accepted = window.confirm(`¿Reiniciar por completo el perfil “${this.progression.profile}”?`);
      if (!accepted) return;
      this.#clearTransientLocationState();
      this.progression.reset();
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
        console.error(error);
        this.toast("No fue posible importar el archivo JSON.", "warning");
      } finally {
        this.elements.debugImport.value = "";
      }
    });
  }

  #populateDebugAreaSelect() {
    this.elements.debugAreaSelect.replaceChildren();
    for (const area of [...AREAS].sort((a, b) => a.order - b.order)) {
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
    anchor.download = `aea-progress-${this.progression.profile}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  #clearTransientLocationState() {
    this.locationStepStates.clear();
    this.closePanel("lesson-panel");
    this.elements.lessonBody.replaceChildren();
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
    this.elements.concepts.textContent = `${snapshot.concepts.size} / ${CONCEPTS.length}`;
    this.elements.mission.textContent = snapshot.nextMission;
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
      this.openDebugPanel();
      return;
    }
    this.elements.lessonEyebrow.textContent = locationKindLabel(location.kind);
    this.elements.lessonTitle.textContent = location.title;
    const state = normalizeLocationStepState(
      location,
      this.locationStepStates.get(location.id),
      { completed: this.progression.isLocationCompleted(location.id) },
    );
    this.locationStepStates.set(location.id, state);
    this.#renderLocationBody(location);
    this.openPanel("lesson-panel");
  }

  #getLocationStepState(location) {
    const state = normalizeLocationStepState(
      location,
      this.locationStepStates.get(location.id),
      { completed: this.progression.isLocationCompleted(location.id) },
    );
    this.locationStepStates.set(location.id, state);
    return state;
  }

  #setLocationStepState(location, state) {
    this.locationStepStates.set(
      location.id,
      normalizeLocationStepState(location, state, {
        completed: this.progression.isLocationCompleted(location.id),
      }),
    );
  }

  #renderLocationBody(location) {
    const body = this.elements.lessonBody;
    body.replaceChildren();
    body.classList.add("prose");

    const steps = getLocationSteps(location);
    const state = this.#getLocationStepState(location);
    const activeStep = steps[state.activeIndex];

    const objective = element("section", { className: "lesson-section" });
    objective.append(element("h3", { text: "Objetivo de aprendizaje" }));
    appendTextParagraph(objective, location.objective);
    body.append(objective);

    if (steps.length > 1) body.append(this.#renderStepNavigation(location, steps, state));

    const stepHeading = element("section", {
      className: "lesson-step-heading",
      attributes: { tabindex: "-1" },
    });
    stepHeading.append(
      element("p", {
        className: "eyebrow",
        text: `Etapa ${state.activeIndex + 1} de ${steps.length}`,
      }),
      element("h3", { text: activeStep.title }),
    );
    body.append(stepHeading);

    for (const sectionData of activeStep.sections) {
      body.append(this.#renderLessonSection(sectionData));
    }

    const completed = this.progression.isLocationCompleted(location.id);
    if (completed) {
      body.append(this.#renderCompletionCard(location, activeStep.exercise));
    } else if (state.passedStepIds.has(activeStep.id)) {
      body.append(this.#renderStepContinue(location, activeStep, state.activeIndex, steps.length));
    } else if (activeStep.exercise?.type !== "none") {
      body.append(this.#renderExercise(location, activeStep, state.activeIndex, steps.length));
    } else if (state.activeIndex < steps.length - 1) {
      body.append(this.#renderStepContinue(location, activeStep, state.activeIndex, steps.length));
    }

    if ((location.sources ?? []).length > 0) {
      const sources = element("section", { className: "lesson-section" });
      sources.append(element("h3", { text: "Fuentes de consulta" }));
      const list = element("ul", { className: "source-list" });
      for (const source of location.sources) {
        const item = element("li");
        if (source.url) {
          const link = element("a", {
            text: source.label,
            attributes: { href: source.url, target: "_blank", rel: "noreferrer noopener" },
          });
          item.append(link);
        } else item.textContent = source.label;
        list.append(item);
      }
      sources.append(list);
      body.append(sources);
    }
  }

  #renderStepNavigation(location, steps, state) {
    const navigation = element("nav", {
      className: "lesson-step-navigation",
      attributes: { "aria-label": "Etapas del lugar" },
    });
    const progress = element("p", {
      className: "step-progress",
      text: `${state.maxUnlockedIndex + 1} de ${steps.length} etapas disponibles`,
    });
    const list = element("ol", { className: "step-list" });

    steps.forEach((step, index) => {
      const item = element("li");
      const unlocked = index <= state.maxUnlockedIndex;
      const active = index === state.activeIndex;
      const button = element("button", {
        className: `step-button ${active ? "active" : ""}`,
        attributes: {
          type: "button",
          "aria-current": active ? "step" : "false",
          "aria-label": `${step.title}: ${active ? "etapa actual" : unlocked ? "disponible" : "bloqueada"}`,
        },
      });
      button.append(
        element("span", { className: "step-number", text: String(index + 1) }),
        element("span", { className: "step-label", text: step.title }),
        element("span", {
          className: "step-state",
          text: active ? "actual" : unlocked ? "disponible" : "bloqueada",
        }),
      );
      if (!unlocked) button.disabled = true;
      button.addEventListener("click", () => {
        this.#setLocationStepState(location, selectLocationStep(state, index));
        this.#renderLocationBody(location);
        this.#focusActiveStep();
      });
      item.append(button);
      list.append(item);
    });

    navigation.append(progress, list);
    return navigation;
  }

  #renderStepContinue(location, step, stepIndex, stepCount) {
    const section = element("section", { className: "lesson-section" });
    const passed = this.#getLocationStepState(location).passedStepIds.has(step.id);
    const card = element("div", { className: "step-continue-card" });
    if (passed && step.exercise?.explanation) {
      card.append(element("p", { className: "callout", text: step.exercise.explanation }));
    } else {
      appendTextParagraph(
        card,
        passed
          ? "Actividad superada. Puedes avanzar o volver a una etapa anterior."
          : "Etapa de lectura terminada. Continúa cuando quieras abrir la siguiente.",
      );
    }
    const button = element("button", {
      text: "Continuar",
      attributes: { type: "button" },
    });
    button.addEventListener("click", () => {
      let state = this.#getLocationStepState(location);
      state = unlockLocationStep(state, stepIndex, stepCount);
      state = selectLocationStep(state, Math.min(stepIndex + 1, stepCount - 1));
      this.#setLocationStepState(location, state);
      this.#renderLocationBody(location);
      this.elements.lessonBody.scrollTo({ top: 0, behavior: "auto" });
      this.#focusActiveStep();
    });
    card.append(button);
    section.append(card);
    return section;
  }

  #renderLessonSection(sectionData) {
    const section = element("section", { className: "lesson-section" });
    section.append(element("h3", { text: sectionData.title }));
    for (const paragraph of sectionData.paragraphs ?? []) appendTextParagraph(section, paragraph);
    if (sectionData.bullets?.length) {
      const list = element("ul");
      for (const bullet of sectionData.bullets) list.append(element("li", { text: bullet }));
      section.append(list);
    }
    if (sectionData.equation) {
      section.append(createEquationFigure(sectionData.equation));
    }
    if (sectionData.callout) {
      section.append(element("p", { className: "callout", text: sectionData.callout }));
    }
    return section;
  }

  #renderExercise(location, step, stepIndex, stepCount) {
    const exercise = step.exercise;
    const isFinalStep = stepIndex === stepCount - 1;
    const section = element("section", { className: "lesson-section" });
    section.append(
      element("h3", { text: isFinalStep ? "Misión de salida" : "Actividad de etapa" }),
    );
    const card = element("div", { className: "exercise-card" });
    appendTextParagraph(card, exercise.prompt);

    const form = element("form");
    let responseReader = () => null;

    if (exercise.type === "choice") {
      const fieldset = element("fieldset");
      fieldset.append(element("legend", { className: "eyebrow", text: "Selecciona una alternativa" }));
      const inputName = `exercise-${location.id}-${step.id}`;
      exercise.choices.forEach((choice, index) => {
        const label = element("label", { className: "choice-option" });
        const input = element("input", {
          attributes: { type: "radio", name: inputName, value: index },
        });
        label.append(input, element("span", { text: choice }));
        fieldset.append(label);
      });
      responseReader = () => {
        const selected = fieldset.querySelector(`input[name="${inputName}"]:checked`);
        return selected ? selected.value : Number.NaN;
      };
      form.append(fieldset);
    } else if (exercise.type === "numeric") {
      const row = element("div", { className: "numeric-row" });
      const input = element("input", {
        attributes: {
          type: "text",
          inputmode: "decimal",
          autocomplete: "off",
          placeholder: exercise.placeholder ?? "Respuesta numérica",
          "aria-label": `Respuesta en ${exercise.unit ?? "unidades SI"}`,
        },
      });
      row.append(input, element("span", { text: exercise.unit ?? "" }));
      responseReader = () => input.value;
      form.append(row);
    } else if (exercise.type === "acknowledge") {
      responseReader = () => true;
    }

    const actions = element("div", { className: "exercise-actions" });
    const submit = element("button", {
      text:
        exercise.buttonLabel ?? (isFinalStep ? "Comprobar y completar" : "Comprobar etapa"),
      attributes: { type: "submit" },
    });
    actions.append(submit);
    form.append(actions);
    const feedback = element("p", {
      className: "exercise-feedback",
      attributes: { role: "status", "aria-live": "polite", "aria-atomic": "true" },
    });
    form.append(feedback);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const evaluation = evaluateExercise(exercise, responseReader());
      if (!evaluation.correct) {
        feedback.className = "exercise-feedback error";
        feedback.textContent =
          evaluation.reason === "invalid-number"
            ? "Ingresa un número válido; se acepta coma decimal y notación científica."
            : evaluation.reason === "missing-response"
              ? "Selecciona una alternativa antes de comprobar."
              : "La respuesta todavía no es correcta. Revisa el modelo y las unidades.";
        return;
      }

      if (!isFinalStep) {
        let state = this.#getLocationStepState(location);
        state = markLocationStepPassed(state, step.id);
        state = unlockLocationStep(state, stepIndex, stepCount);
        this.#setLocationStepState(location, state);
        this.toast("Actividad superada. La etapa siguiente ya está disponible.", "success");
        this.#renderLocationBody(location);
        this.#focusActiveStep();
        return;
      }

      this.#completeLocation(location, exercise, feedback);
    });

    card.append(form);
    section.append(card);
    return section;
  }

  #completeLocation(location, exercise, feedback) {
    const before = this.progression.getSnapshot();
    const result = this.progression.completeLocation(location.id);
    if (!result.ok) {
      feedback.className = "exercise-feedback error";
      feedback.textContent = "El lugar ya no cumple sus condiciones de acceso.";
      return;
    }
      const after = this.progression.getSnapshot();
      const newlyOpenedAreas = [...after.unlockedAreaIds].filter(
        (areaId) => !before.unlockedAreaIds.has(areaId),
      );
      const newlyVisibleLocations = [...after.visibleLocationIds].filter(
        (locationId) => !before.visibleLocationIds.has(locationId),
      );

      const messageParts = [exercise.explanation ?? "Misión completada."];
      if (newlyOpenedAreas.length) {
        const names = newlyOpenedAreas
          .map((areaId) => AREAS.find((area) => area.id === areaId)?.title ?? areaId)
          .join(", ");
        messageParts.push(`Nueva zona abierta: ${names}.`);
      }
      if (newlyVisibleLocations.length) {
        messageParts.push(`${newlyVisibleLocations.length} lugar(es) del Árbol II revelado(s).`);
      }
      this.toast(messageParts.join(" "), "success", 5200);
      this.#renderLocationBody(location);
      this.#focusActiveStep();
  }

  #focusActiveStep() {
    this.elements.lessonBody
      .querySelector(".lesson-step-heading")
      ?.focus({ preventScroll: true });
  }

  #renderCompletionCard(location, exercise) {
    const section = element("section", { className: "lesson-section" });
    section.append(element("h3", { text: "Estado" }));
    const card = element("div", { className: "completion-card" });
    appendTextParagraph(card, "Lugar completado. La solución queda disponible para revisión.");
    if (exercise?.explanation) {
      const solution = element("p", { className: "callout", text: exercise.explanation });
      card.append(solution);
    }

    const granted = [
      ...(location.grants?.concepts ?? []).map((id) => `concept:${id}`),
      ...(location.grants?.rewards ?? []),
    ];
    if (granted.length) {
      const chips = element("div", { className: "reward-list" });
      for (const key of granted) chips.append(this.#rewardChip(key));
      card.append(chips);
    }
    section.append(card);
    return section;
  }

  #rewardChip(key) {
    if (key.startsWith("concept:")) {
      const concept = getConcept(key.slice("concept:".length));
      return element("span", {
        className: "reward-chip",
        text: concept ? `Concepto: ${concept.shortTitle}` : key,
      });
    }
    const parsed = parseRewardKey(key);
    const reward = getReward(parsed.type, parsed.id);
    return element("span", {
      className: "reward-chip",
      text: reward ? reward.title : key,
    });
  }

  toggleKnowledgePanel() {
    if (!this.elements.knowledgePanel.hidden) {
      this.closePanel("knowledge-panel");
      return;
    }
    this.openPanel("knowledge-panel");
    this.updateKnowledgePanel();
  }

  updateKnowledgePanel() {
    if (this.elements.knowledgePanel.hidden && !this.openPanels.includes("knowledge-panel")) return;
    const snapshot = this.progression.getSnapshot();
    const body = this.elements.knowledgeBody;
    body.replaceChildren();

    const explanation = element("p", { className: "callout" });
    explanation.textContent =
      "Árbol I abre regiones hexagonales; Árbol II desbloquea contenido localizado y recompensas dentro de regiones disponibles. El movimiento físico sigue siendo libre.";
    body.append(explanation);

    const columns = element("div", { className: "knowledge-columns" });
    const areaColumn = element("section", { className: "knowledge-column" });
    areaColumn.append(element("h3", { text: "Árbol I · Zonas" }));
    for (const area of [...AREAS].sort((a, b) => a.order - b.order)) {
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
    contentColumn.append(element("h3", { text: "Árbol II · Lugares y recompensas" }));
    for (const location of LOCATIONS.filter((entry) => entry.kind !== "base" && entry.kind !== "debug")) {
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
      contentColumn.append(card);
    }

    columns.append(areaColumn, contentColumn);
    body.append(columns);

    const inventory = element("section", { className: "lesson-section" });
    inventory.append(element("h3", { text: "Inventario desbloqueado" }));
    const chips = element("div", { className: "reward-list" });
    for (const reward of snapshot.rewards) chips.append(this.#rewardChip(reward));
    inventory.append(chips);
    body.append(inventory);
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

  #renderSourceLine(source) {
    const text = [source?.label, source?.locator].filter(Boolean).join(", ");
    const usage = [source?.usage, source?.license].filter(Boolean).join("; ");
    const validationSource = [source?.validationLabel, source?.validationLocator]
      .filter(Boolean)
      .join("; ");
    const validation = [validationSource, source?.validationLicense].filter(Boolean).join("; ");
    const selection = [source?.selectionLabel, source?.selectionLocator]
      .filter(Boolean)
      .join(", ");
    const details = [
      text ? `Fuente: ${text}${usage ? ` (${usage})` : ""}.` : "Fuente bibliográfica pendiente.",
      validation ? `Validación abierta: ${validation}.` : "",
      selection ? `Selección nomenclatural: ${selection}.` : "",
    ]
      .filter(Boolean)
      .join(" ");
    return element("p", {
      className: "reference-source",
      text: details,
    });
  }

  #renderCollectionSources(entries, snapshot) {
    const sources = element("section", {
      className: "reference-sources",
      attributes: { "aria-label": "Fuentes de la tabla" },
    });
    const seen = new Set();
    for (const entry of entries) {
      if (!this.#isReferenceUnlocked(entry, snapshot)) continue;
      const source = entry.source;
      const key = [
        source?.citationKey,
        source?.locator,
        source?.validationCitationKey,
        source?.validationLocator,
        source?.selectionCitationKey,
        source?.selectionLocator,
      ].join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      sources.append(this.#renderSourceLine(source));
    }
    return sources;
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
    body.append(table, this.#renderCollectionSources(SYMBOLS, snapshot));
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
    body.append(table, this.#renderCollectionSources(CONSTANTS, snapshot));
  }

  #renderFormulaReference(body, snapshot) {
    this.#renderReferenceIntro(
      body,
      "El formulario crece al completar lugares y rutas del Árbol II. Cada identidad declara las condiciones bajo las que puede aplicarse.",
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
        card.append(this.#renderSourceLine(entry.source));
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
        card.append(this.#renderSourceLine(entry.source));
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
        (id) => LOCATIONS.find((location) => location.id === id)?.title ?? id,
      ),
      ...missing.concepts.map((id) => getConcept(id)?.title ?? id),
      ...missing.areas.map((id) => AREAS.find((area) => area.id === id)?.title ?? id),
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

  async toggleAudio() {
    const muted = this.progression.toggleAudioMuted();
    const result = await this.audio?.setMuted(muted);
    this.#updateAudioControl();
    this.toast(
      muted ? "Audio silenciado." : "Audio activado.",
      result?.ok === false ? "warning" : "success",
    );
    return !muted;
  }

  #updateAudioControl() {
    const muted = Boolean(this.progression.getSnapshot().state.settings.audioMuted);
    this.elements.audioToggle.setAttribute("aria-pressed", String(!muted));
    this.elements.audioToggle.firstChild.textContent = muted ? "Audio silenciado " : "Audio activo ";
  }

  async #previewAudio(assetKey, durationMs) {
    if (this.progression.getSnapshot().state.settings.audioMuted) {
      this.progression.setAudioMuted(false);
      await this.audio?.setMuted(false);
    }
    const result = await this.audio?.preview(assetKey, { durationMs });
    this.toast(
      result?.ok ? "Prueba de audio iniciada." : "No fue posible reproducir este recurso.",
      result?.ok ? "success" : "warning",
    );
  }

  openDebugPanel() {
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
    if (panelId) this.closePanel(panelId);
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
