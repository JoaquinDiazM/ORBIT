import { APP_CONFIG } from "../config.js";
import { CONCEPTS, REWARDS, getConcept, getReward, parseRewardKey } from "../data/knowledge.js";
import { LOCATIONS } from "../data/locations.js";
import {
  CONSTANTS,
  FORMULAS,
  GLOSSARY,
  REFERENCE_COLLECTIONS,
  REFERENCE_VIEWS,
  SYMBOLS,
} from "../data/reference/index.js";
import { AREAS } from "../data/world.js";
import { evaluateExercise } from "../core/exercises.js";
import {
  createExerciseSequenceState,
  isExerciseSequenceComplete,
  markExerciseSequenceItemPassed,
  normalizeExerciseSequenceState,
} from "../core/exercise-sequence.js";
import {
  getLocationSteps,
  markLocationStepPassed,
  normalizeLocationStepState,
  selectLocationStep,
  unlockLocationStep,
} from "../core/location-steps.js";
import {
  getProfileCapabilities,
  shouldAutoCompleteLocationOnInteraction,
} from "../core/profile-policy.js";
import { describeMissingRequirements, meetsRequirements } from "../core/requirements.js";
import { createEquationFigure, renderMath } from "./math-renderer.js";
import { playLocationCompletionCue } from "./audio-policy.js";
import { PointChargeField2D } from "./point-charge-field-2d.js";
import {
  VectorField2D,
  createFieldAConfig,
  createFieldBConfig,
} from "./vector-field-2d.js";

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
    this.profileCapabilities = getProfileCapabilities(progression.profile);
    this.gameApi = null;
    this.openPanels = [];
    this.panelReturnFocus = new Map();
    this.locationStepStates = new Map();
    this.exerciseStates = new Map();
    this.activeInteractiveFigures = [];
    this.activeReferenceView = "symbols";
    this.secondaryPanelIds = [
      "knowledge-panel",
      "visual-panel",
      "reference-panel",
      "sound-panel",
      "help-panel",
    ];

    this.elements = {
      area: document.querySelector("#hud-area"),
      transport: document.querySelector("#hud-transport"),
      concepts: document.querySelector("#hud-concepts"),
      mission: document.querySelector("#hud-mission"),
      versionBadge: document.querySelector("#orbit-version-badge"),
      profileSelect: document.querySelector("#profile-select"),
      editorLink: document.querySelector("#open-orbit-editor"),
      interactionPrompt: document.querySelector("#interaction-prompt"),
      interactionText: document.querySelector("#interaction-text"),
      lessonPanel: document.querySelector("#lesson-panel"),
      lessonEyebrow: document.querySelector("#lesson-eyebrow"),
      lessonTitle: document.querySelector("#lesson-title"),
      lessonBody: document.querySelector("#lesson-body"),
      knowledgePanel: document.querySelector("#knowledge-panel"),
      knowledgeBody: document.querySelector("#knowledge-body"),
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
    this.#updateVisualControls();
    this.#updateSoundControls();
    this.progression.subscribe(() => {
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
        if (input.checked) this.progression.setTreeTwoVisualizationMode(input.value);
      });
    }
    this.elements.soundAmbience.addEventListener("input", () => {
      this.progression.setAmbienceVolume(Number(this.elements.soundAmbience.value) / 100);
    });
    this.elements.soundEffects.addEventListener("input", () => {
      this.progression.setEffectsVolume(Number(this.elements.soundEffects.value) / 100);
    });

    const audioPreviews = [
      ["#debug-audio-ambience", "global_ambience", 5000],
      ["#debug-audio-transition", "hexagon_transition", undefined],
      ["#debug-audio-mission", "mission_start", undefined],
      ["#debug-audio-ui-select", "ui_select", undefined],
      ["#debug-audio-zone-unlocked", "zone_unlocked", undefined],
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
    anchor.download = `orbit-progress-${this.progression.profile}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  #clearTransientLocationState() {
    this.#destroyInteractiveFigures();
    this.locationStepStates.clear();
    this.exerciseStates.clear();
    this.closePanel("lesson-panel");
    this.elements.lessonBody.replaceChildren();
  }

  #destroyInteractiveFigures() {
    for (const figure of this.activeInteractiveFigures) figure.destroy();
    this.activeInteractiveFigures = [];
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
      if (!result.ok) {
        this.toast("La actividad ya no cumple sus condiciones de acceso.", "warning");
      }
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
    return { completionCueHandled };
  }

  willAutoCompleteLocation(location) {
    return shouldAutoCompleteLocationOnInteraction(this.progression.profile, location)
      && !this.progression.isLocationCompleted(location.id);
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
    this.#destroyInteractiveFigures();
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
    const passed = state.passedStepIds.has(activeStep.id);
    const reviewableExercise =
      activeStep.exercise?.type === "sequence"
      || activeStep.exercise?.presentation === "vector-field-cards"
      || activeStep.exercise?.presentation === "point-charge-field";
    if ((completed || passed) && reviewableExercise) {
      body.append(
        this.#renderExercise(location, activeStep, state.activeIndex, steps.length, {
          resolved: true,
        }),
      );
    }
    if (completed) {
      body.append(this.#renderCompletionCard(location, activeStep.exercise));
    } else if (passed) {
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

  #renderExercise(location, step, stepIndex, stepCount, { resolved = false } = {}) {
    if (step.exercise.presentation === "vector-field-cards") {
      return this.#renderVectorFieldExercise(location, step, stepIndex, stepCount, { resolved });
    }
    if (step.exercise.presentation === "point-charge-field") {
      return this.#renderPointChargeExercise(location, step, stepIndex, stepCount, { resolved });
    }
    if (step.exercise.type === "sequence") {
      return this.#renderSequenceExercise(location, step, stepIndex, stepCount, { resolved });
    }
    return this.#renderAtomicExercise(location, step, stepIndex, stepCount);
  }

  #exerciseStateKey(location, step) {
    return `${location.id}:${step.id}`;
  }

  #choiceLabel(choice) {
    if (typeof choice === "string") return choice;
    return choice?.label ?? choice?.text ?? choice?.id ?? "Alternativa";
  }

  #appendAtomicExerciseControl(form, exercise, inputName) {
    if (exercise.type === "choice") {
      const fieldset = element("fieldset");
      fieldset.append(
        element("legend", { className: "eyebrow", text: "Selecciona una alternativa" }),
      );
      exercise.choices.forEach((choice, index) => {
        const label = element("label", { className: "choice-option" });
        const value = typeof choice === "string" ? String(index) : choice.id ?? String(index);
        const input = element("input", {
          attributes: { type: "radio", name: inputName, value },
        });
        label.append(input, element("span", { text: this.#choiceLabel(choice) }));
        fieldset.append(label);
      });
      form.append(fieldset);
      return () => {
        const selected = fieldset.querySelector(`input[name="${inputName}"]:checked`);
        return selected ? selected.value : Number.NaN;
      };
    }

    if (exercise.type === "numeric" || exercise.type === "expression") {
      const row = element("div", {
        className: exercise.type === "expression" ? "math-input-row" : "numeric-row",
      });
      if (exercise.promptPrefix) {
        row.append(this.#renderInlineMath(exercise.promptPrefix, "Expresión a completar"));
      }
      const input = element("input", {
        className: exercise.type === "expression" ? "text-input" : "",
        attributes: {
          type: "text",
          inputmode: exercise.type === "numeric" ? "decimal" : "text",
          autocomplete: "off",
          autocapitalize: "off",
          spellcheck: "false",
          placeholder:
            exercise.placeholder
            ?? (exercise.type === "expression" ? "Escribe una expresión" : "Respuesta numérica"),
          "aria-label":
            exercise.inputLabel
            ?? (exercise.type === "expression"
              ? "Expresión matemática"
              : `Respuesta en ${exercise.unit ?? "unidades SI"}`),
        },
      });
      row.append(input);
      if (exercise.type === "numeric") row.append(element("span", { text: exercise.unit ?? "" }));
      form.append(row);
      return () => input.value;
    }

    if (exercise.type === "acknowledge") return () => true;
    return () => null;
  }

  #renderFeedback() {
    return element("p", {
      className: "exercise-feedback",
      attributes: { role: "status", "aria-live": "polite", "aria-atomic": "true" },
    });
  }

  #showEvaluationError(feedback, evaluation, options = {}) {
    feedback.className = "exercise-feedback error";
    feedback.textContent =
      evaluation.reason === "invalid-number"
        ? "Ingresa un número válido; se acepta coma decimal y notación científica."
        : evaluation.reason === "missing-response"
          ? "Selecciona una alternativa antes de comprobar."
          : options.retryExplanation
            ? options.retryExplanation
            : options.feedbackMode === "binary"
              ? "Respuesta no válida. Puedes corregirla y volver a comprobar."
              : evaluation.message
                ?? "La respuesta todavía no es correcta. Revisa el planteamiento y vuelve a intentarlo.";
  }

  #playInteractionCue(specificAssetKey) {
    void this.audio?.playInteractionCue?.(
      specificAssetKey ? { specificAssetKey } : undefined,
    );
  }

  #passStepOrComplete(location, step, stepIndex, stepCount, exercise, feedback) {
    if (stepIndex < stepCount - 1) {
      let state = this.#getLocationStepState(location);
      state = markLocationStepPassed(state, step.id);
      state = unlockLocationStep(state, stepIndex, stepCount);
      this.#setLocationStepState(location, state);
      this.#playInteractionCue();
      this.toast("Actividad superada. La etapa siguiente ya está disponible.", "success");
      this.#renderLocationBody(location);
      this.#focusActiveStep();
      return;
    }
    this.#completeLocation(location, exercise, feedback);
  }

  #renderAtomicExercise(location, step, stepIndex, stepCount) {
    const exercise = step.exercise;
    const isFinalStep = stepIndex === stepCount - 1;
    const section = element("section", { className: "lesson-section" });
    section.append(
      element("h3", { text: isFinalStep ? "Misión de salida" : "Actividad de etapa" }),
    );
    const card = element("div", { className: "exercise-card" });
    appendTextParagraph(card, exercise.prompt);

    const form = element("form");
    const inputName = `exercise-${location.id}-${step.id}`;
    const responseReader = this.#appendAtomicExerciseControl(form, exercise, inputName);
    const actions = element("div", { className: "exercise-actions" });
    actions.append(
      element("button", {
        text:
          exercise.buttonLabel ?? (isFinalStep ? "Comprobar y completar" : "Comprobar etapa"),
        attributes: { type: "submit", "data-audio-cue": "deferred" },
      }),
    );
    form.append(actions);
    const feedback = this.#renderFeedback();
    form.append(feedback);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const evaluation = evaluateExercise(exercise, responseReader());
      if (!evaluation.correct) {
        this.#showEvaluationError(feedback, evaluation);
        this.#playInteractionCue();
        return;
      }
      this.#passStepOrComplete(location, step, stepIndex, stepCount, exercise, feedback);
    });

    card.append(form);
    section.append(card);
    return section;
  }

  #vectorFieldConfig(location, step, choice, state, resolved) {
    const figure = choice.figure;
    const parameter = figure.parameter;
    const factory = figure.fieldId === "radial-linear" ? createFieldAConfig : createFieldBConfig;
    const currentValue = state.parameters[parameter.id] ?? parameter.nominal;
    return factory({
      id: `${location.id}-${step.id}-${choice.id}`,
      title: choice.label,
      domain: figure.domain,
      samples: figure.samplesPerAxis,
      scale: figure.visualScale,
      parameters: {
        [parameter.id]: {
          label: parameter.id,
          min: parameter.min,
          max: parameter.max,
          step: parameter.step,
          nominal: parameter.nominal,
        },
      },
      params: { [parameter.id]: currentValue },
      integralCurves: false,
      showParameters: resolved,
      onParametersChange: ({ params }) => {
        state.parameters = { ...state.parameters, ...params };
        this.exerciseStates.set(this.#exerciseStateKey(location, step), state);
      },
    });
  }

  #appendRevealSections(parent, sections) {
    for (const sectionData of sections ?? []) parent.append(this.#renderLessonSection(sectionData));
  }

  #renderVectorFieldExercise(location, step, stepIndex, stepCount, { resolved }) {
    const exercise = step.exercise;
    const key = this.#exerciseStateKey(location, step);
    const state = this.exerciseStates.get(key) ?? { selectedId: null, parameters: {} };
    if (resolved) state.selectedId = exercise.answerId;
    this.exerciseStates.set(key, state);

    const section = element("section", { className: "lesson-section vector-field-exercise" });
    section.append(element("h3", { text: resolved ? "Comparación resuelta" : "Actividad visual" }));
    const card = element("div", { className: "exercise-card" });
    appendTextParagraph(card, exercise.prompt);
    const form = element("form");
    const fieldset = element("fieldset", { className: "vector-field-choice-set" });
    fieldset.append(
      element("legend", {
        className: "eyebrow",
        text: resolved ? "Campos comparados" : "Selecciona el campo que admite potencial escalar",
      }),
    );
    const grid = element("div", { className: "vector-field-card-grid" });
    const selectableCards = [];

    const selectChoice = (choiceId) => {
      if (resolved) return;
      state.selectedId = choiceId;
      this.exerciseStates.set(key, state);
      for (const entry of selectableCards) {
        const selected = entry.choiceId === choiceId;
        entry.card.classList.toggle("selected", selected);
        entry.card.setAttribute("aria-checked", String(selected));
      }
    };

    for (const choice of exercise.choices) {
      const resultClass = resolved
        ? choice.id === exercise.answerId
          ? "correct"
          : "incorrect"
        : "";
      const fieldCard = element("article", {
        className:
          `vector-field-choice ${state.selectedId === choice.id ? "selected" : ""} ${resultClass}`.trim(),
        attributes: resolved
          ? { "data-choice-id": choice.id }
          : {
              role: "radio",
              tabindex: "0",
              "aria-checked": String(state.selectedId === choice.id),
              "aria-label": `Seleccionar ${choice.label}`,
              "data-choice-id": choice.id,
            },
      });
      if (!resolved) {
        selectableCards.push({ card: fieldCard, choiceId: choice.id });
        fieldCard.addEventListener("click", () => selectChoice(choice.id));
        fieldCard.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          selectChoice(choice.id);
          this.#playInteractionCue();
        });
      }
      const figureMount = element("div", { className: "vector-field-mount" });
      fieldCard.append(figureMount);
      const vectorField = new VectorField2D({
        container: figureMount,
        ...this.#vectorFieldConfig(location, step, choice, state, resolved),
      });
      this.activeInteractiveFigures.push(vectorField);
      if (resolved) {
        fieldCard.append(
          element("p", {
            className: "vector-field-result",
            text:
              choice.id === exercise.answerId
                ? "Resultado: admite potencial escalar."
                : "Resultado: no admite potencial escalar.",
          }),
        );
        const reveal = element("div", { className: "vector-field-reveal" });
        this.#appendRevealSections(reveal, choice.reveal?.sections);
        fieldCard.append(reveal);
      }
      grid.append(fieldCard);
    }
    fieldset.append(grid);
    form.append(fieldset);

    if (!resolved) {
      const actions = element("div", { className: "exercise-actions" });
      actions.append(
        element("button", {
          text: "Comprobar comparación",
          attributes: { type: "submit", "data-audio-cue": "deferred" },
        }),
      );
      form.append(actions);
      const feedback = this.#renderFeedback();
      form.append(feedback);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const evaluation = evaluateExercise(exercise, state.selectedId);
        if (!evaluation.correct) {
          this.#showEvaluationError(feedback, evaluation, {
            retryExplanation: exercise.retryExplanation,
          });
          this.#playInteractionCue();
          return;
        }
        state.selectedId = exercise.answerId;
        this.exerciseStates.set(key, state);
        this.#passStepOrComplete(location, step, stepIndex, stepCount, exercise, feedback);
      });
    }

    card.append(form);
    section.append(card);
    return section;
  }

  #renderPointChargeExercise(location, step, stepIndex, stepCount, { resolved }) {
    const exercise = step.exercise;
    const figureDefinition = exercise.figure;
    const key = this.#exerciseStateKey(location, step);
    const state = this.exerciseStates.get(key) ?? {
      charges: figureDefinition.charges.map((charge) => ({ ...charge })),
    };
    this.exerciseStates.set(key, state);

    const section = element("section", { className: "lesson-section point-charge-exercise" });
    section.append(
      element("h3", { text: resolved ? "Laboratorio revisable" : "Laboratorio de superposición" }),
    );
    const figureMount = element("div", { className: "point-charge-mount" });
    section.append(figureMount);
    const pointChargeField = new PointChargeField2D({
      container: figureMount,
      id: `${location.id}-${step.id}`,
      title: figureDefinition.title,
      description: figureDefinition.description,
      caption: figureDefinition.caption,
      domain: figureDefinition.domain,
      probe: figureDefinition.probe,
      chargeRange: figureDefinition.chargeRange,
      keyboardStep: figureDefinition.keyboardStep,
      singularityRadius: figureDefinition.singularityRadius,
      charges: state.charges,
      onStateChange: ({ charges }) => {
        state.charges = charges.map((charge) => ({ ...charge }));
        this.exerciseStates.set(key, state);
      },
      onInteraction: () => this.#playInteractionCue(),
    });
    this.activeInteractiveFigures.push(pointChargeField);

    const card = element("div", { className: "exercise-card" });
    appendTextParagraph(card, exercise.prompt);
    if (resolved) {
      card.append(
        element("p", {
          className: "callout",
          text:
            exercise.explanation
            ?? "Actividad validada; la figura permanece disponible para explorar.",
        }),
      );
      section.append(card);
      return section;
    }

    const form = element("form");
    const responseReader = this.#appendAtomicExerciseControl(
      form,
      exercise,
      `exercise-${location.id}-${step.id}`,
    );
    const actions = element("div", { className: "exercise-actions" });
    actions.append(
      element("button", {
        text: "Comprobar exploración",
        attributes: { type: "submit", "data-audio-cue": "deferred" },
      }),
    );
    form.append(actions);
    const feedback = this.#renderFeedback();
    form.append(feedback);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const evaluation = evaluateExercise(exercise, responseReader());
      if (!evaluation.correct) {
        this.#showEvaluationError(feedback, evaluation, {
          retryExplanation: exercise.retryExplanation,
        });
        this.#playInteractionCue();
        return;
      }
      this.#passStepOrComplete(location, step, stepIndex, stepCount, exercise, feedback);
    });
    card.append(form);
    section.append(card);
    return section;
  }

  #renderSequenceSuccess(parent, item) {
    const successSections = item.successSections ?? item.reveal?.sections ?? [];
    if (item.explanation) {
      parent.append(element("p", { className: "callout", text: item.explanation }));
    }
    if (successSections.length > 0) this.#appendRevealSections(parent, successSections);
    else if (!item.explanation) {
      parent.append(element("p", { className: "sequence-success", text: "Intervención validada." }));
    }
  }

  #renderSequenceExercise(location, step, stepIndex, stepCount, { resolved }) {
    const exercise = step.exercise;
    const key = this.#exerciseStateKey(location, step);
    const sequenceState = normalizeExerciseSequenceState(
      exercise,
      this.exerciseStates.get(key) ?? createExerciseSequenceState(exercise),
      { completed: resolved },
    );
    this.exerciseStates.set(key, sequenceState);

    const section = element("section", { className: "lesson-section sequence-exercise" });
    section.append(
      element("h3", {
        text: resolved
          ? "Resolución por intervenciones"
          : exercise.feedback === "binary"
            ? "Evaluación independiente"
            : "Actividad guiada",
      }),
    );
    const card = element("div", { className: "exercise-card" });
    if (exercise.prompt) appendTextParagraph(card, exercise.prompt);
    const list = element("ol", { className: "exercise-sequence-list" });

    exercise.items.forEach((item, index) => {
      const completed = resolved || sequenceState.completedItemIds.has(item.id);
      const current = !resolved && index === sequenceState.activeItemIndex && !completed;
      const entry = element("li", {
        className: `sequence-item ${completed ? "completed" : current ? "current" : "pending"}`,
        attributes: current ? { tabindex: "-1", "data-sequence-current": "true" } : {},
      });
      entry.append(
        element("p", {
          className: "sequence-item-state",
          text: `Intervención ${index + 1} de ${exercise.items.length} · ${completed ? "validada" : current ? "actual" : "pendiente"}`,
        }),
      );

      if (completed || current) {
        entry.append(element("h4", { text: item.title ?? `Intervención ${index + 1}` }));
        appendTextParagraph(entry, item.prompt);
      }

      if (completed) {
        this.#renderSequenceSuccess(entry, item);
      } else if (current) {
        const form = element("form");
        const responseReader = this.#appendAtomicExerciseControl(
          form,
          item,
          `exercise-${location.id}-${step.id}-${item.id}`,
        );
        const actions = element("div", { className: "exercise-actions" });
        actions.append(
          element("button", {
            text: item.buttonLabel ?? "Comprobar intervención",
            attributes: { type: "submit", "data-audio-cue": "deferred" },
          }),
        );
        form.append(actions);
        const feedback = this.#renderFeedback();
        form.append(feedback);
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          const evaluation = evaluateExercise(item, responseReader());
          if (!evaluation.correct) {
            this.#showEvaluationError(feedback, evaluation, {
              feedbackMode: exercise.feedback,
            });
            this.#playInteractionCue();
            return;
          }

          const nextState = markExerciseSequenceItemPassed(exercise, sequenceState, item.id);
          this.exerciseStates.set(key, nextState);
          if (isExerciseSequenceComplete(exercise, nextState)) {
            this.#passStepOrComplete(location, step, stepIndex, stepCount, exercise, feedback);
          } else {
            this.#playInteractionCue();
            this.#renderLocationBody(location);
            this.#focusSequenceItem();
          }
        });
        entry.append(form);
      } else {
        entry.append(element("p", { text: "Se habilita al validar la intervención anterior." }));
      }
      list.append(entry);
    });

    card.append(list);
    section.append(card);
    return section;
  }

  #focusSequenceItem() {
    this.elements.lessonBody
      .querySelector("[data-sequence-current='true']")
      ?.focus();
  }

  #completeLocationProgress(location, exercise, { completionMessage } = {}) {
    const before = this.progression.getSnapshot();
    const result = this.progression.completeLocation(location.id);
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
        .map((areaId) => AREAS.find((area) => area.id === areaId)?.title ?? areaId)
        .join(", ");
      messageParts.push(`Nueva zona abierta: ${names}.`);
    }
    if (newlyVisibleLocations.length) {
      messageParts.push(`${newlyVisibleLocations.length} lugar(es) del Árbol II revelado(s).`);
    }
    if (citationLabels.length) {
      messageParts.push(`Referencia del contenido desbloqueado: ${citationLabels.join("; ")}.`);
    }
    this.toast(messageParts.join(" "), "success", 6400);
    return result;
  }

  #completeLocation(location, exercise, feedback) {
    const result = this.#completeLocationProgress(location, exercise);
    if (!result.ok) {
      feedback.className = "exercise-feedback error";
      feedback.textContent = "El lugar ya no cumple sus condiciones de acceso.";
      this.#playInteractionCue();
      return;
    }
    this.#renderLocationBody(location);
    this.#focusActiveStep();
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
