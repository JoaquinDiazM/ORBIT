import { getConcept, getReward, parseRewardKey } from "../data/knowledge.js";
import { evaluateExercise } from "../core/exercises.js";
import { createExerciseSequenceState, isExerciseSequenceComplete, markExerciseSequenceItemPassed, normalizeExerciseSequenceState } from "../core/exercise-sequence.js";
import { getLocationSteps, markLocationStepPassed, normalizeLocationStepState, selectLocationStep, unlockLocationStep } from "../core/location-steps.js";
import { createEquationFigure, renderMath } from "./math-renderer.js";
import { appendAcademicText } from "./academic-text.js";
import { PointChargeField2D } from "./point-charge-field-2d.js";
import { VectorField2D, createFieldAConfig, createFieldBConfig } from "./vector-field-2d.js";

function element(tagName, options = {}) {
  const node = document.createElement(tagName);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) appendAcademicText(node, options.text);
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

/** Shared runtime/editor renderer. Its exercise session is transient; only callbacks can persist progress. */
export class ContentView {
  constructor({ container, isCompleted, onComplete, playInteractionCue = () => {}, toast = () => {} }) {
    this.container = container;
    this.completedIds = new Set();
    this.isCompleted = isCompleted ?? ((id) => this.completedIds.has(id));
    this.onComplete = onComplete ?? ((location) => { this.completedIds.add(location.id); return { ok: true }; });
    this.playInteractionCue = playInteractionCue;
    this.toast = toast;
    this.locationStepStates = new Map();
    this.exerciseStates = new Map();
    this.activeInteractiveFigures = [];
  }

  reset() {
    this.destroy();
    this.completedIds.clear();
    this.locationStepStates.clear();
    this.exerciseStates.clear();
  }

  destroy() {
    this.#destroyInteractiveFigures();
  }

  #destroyInteractiveFigures() {
    for (const figure of this.activeInteractiveFigures) figure.destroy();
    this.activeInteractiveFigures = [];
  }

  #typesetFigureText(figure) {
    const { heading, description } = figure.elements ?? {};
    const caption = figure.elements?.figure?.querySelector(".interactive-figure-caption");
    const chargeLabels = figure.figure?.querySelectorAll(".point-charge-caption h4, .point-charge-caption p") ?? [];
    for (const node of [heading, description, caption, ...chargeLabels]) {
      if (!node) continue;
      const text = node.textContent;
      node.replaceChildren();
      appendAcademicText(node, text);
    }
  }

  #getLocationStepState(location) {
    const state = normalizeLocationStepState(
      location,
      this.locationStepStates.get(location.id),
      { completed: this.isCompleted(location.id) },
    );
    this.locationStepStates.set(location.id, state);
    return state;
  }

  #setLocationStepState(location, state) {
    this.locationStepStates.set(
      location.id,
      normalizeLocationStepState(location, state, {
        completed: this.isCompleted(location.id),
      }),
    );
  }

  render(location) {
    const body = this.container;
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

    const completed = this.isCompleted(location.id);
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
        this.render(location);
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
      this.render(location);
      this.container.scrollTo({ top: 0, behavior: "auto" });
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
      section.append(createEquationFigure(sectionData.equation, { renderCaption: appendAcademicText }));
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
    const message =
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
    feedback.replaceChildren();
    appendAcademicText(feedback, message);
  }

  #playInteractionCue(specificAssetKey) {
    this.playInteractionCue(specificAssetKey);
  }

  #passStepOrComplete(location, step, stepIndex, stepCount, exercise, feedback) {
    if (stepIndex < stepCount - 1) {
      let state = this.#getLocationStepState(location);
      state = markLocationStepPassed(state, step.id);
      state = unlockLocationStep(state, stepIndex, stepCount);
      this.#setLocationStepState(location, state);
      this.#playInteractionCue();
      this.toast("Actividad superada. La etapa siguiente ya está disponible.", "success");
      this.render(location);
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
      this.#typesetFigureText(vectorField);
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
    this.#typesetFigureText(pointChargeField);

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
            this.render(location);
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
    this.container
      .querySelector("[data-sequence-current='true']")
      ?.focus();
  }

  #completeLocation(location, exercise, feedback) {
    const result = this.onComplete(location, exercise);
    if (!result.ok) {
      feedback.className = "exercise-feedback error";
      feedback.textContent = result.reason === "storage-write-failed"
        ? "No fue posible guardar el progreso. El lugar no se completó; libera espacio o habilita el almacenamiento y vuelve a intentarlo."
        : "El lugar ya no cumple sus condiciones de acceso.";
      this.#playInteractionCue();
      return;
    }
    this.render(location);
    this.#focusActiveStep();
  }

  #focusActiveStep() {
    this.container
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
      for (const key of granted) chips.append(this.renderRewardChip(key));
      card.append(chips);
    }
    section.append(card);
    return section;
  }

  renderRewardChip(key) {
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

  #renderInlineMath(tex, label) {
    const node = element("span", {
      className: "inline-math",
      attributes: { "aria-label": label },
    });
    renderMath(node, tex, { displayMode: false });
    return node;
  }

}
