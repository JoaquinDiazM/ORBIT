import { CONCEPTS, REWARDS, getConcept, getReward, parseRewardKey } from "../data/knowledge.js";
import { LOCATIONS } from "../data/locations.js";
import { AREAS } from "../data/world.js";
import { evaluateExercise } from "../core/exercises.js";
import { describeMissingRequirements } from "../core/requirements.js";

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
  constructor({ progression }) {
    this.progression = progression;
    this.gameApi = null;
    this.openPanels = [];

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

    this.elements.profileBadge.textContent = `perfil: ${progression.profile}`;
    this.#populateDebugAreaSelect();
    this.#bindStaticControls();
    this.progression.subscribe(() => {
      this.updateKnowledgePanel();
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

    document.querySelectorAll("[data-close-panel]").forEach((button) => {
      button.addEventListener("click", () => this.closePanel(button.dataset.closePanel));
    });

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

    this.closePanel("knowledge-panel");
    this.closePanel("help-panel");
    this.elements.lessonEyebrow.textContent = locationKindLabel(location.kind);
    this.elements.lessonTitle.textContent = location.title;
    this.#renderLocationBody(location);
    this.openPanel("lesson-panel");
  }

  #renderLocationBody(location) {
    const body = this.elements.lessonBody;
    body.replaceChildren();
    body.classList.add("prose");

    const objective = element("section", { className: "lesson-section" });
    objective.append(element("h3", { text: "Objetivo de aprendizaje" }));
    appendTextParagraph(objective, location.objective);
    body.append(objective);

    for (const sectionData of location.sections ?? []) {
      body.append(this.#renderLessonSection(sectionData));
    }

    const completed = this.progression.isLocationCompleted(location.id);
    if (completed) {
      body.append(this.#renderCompletionCard(location));
    } else if (location.exercise?.type !== "none") {
      body.append(this.#renderExercise(location));
    }

    if ((location.sources ?? []).length > 0) {
      const sources = element("section", { className: "lesson-section" });
      sources.append(element("h3", { text: "Fuentes de consulta" }));
      const list = element("ul", { className: "source-list" });
      for (const source of location.sources) {
        const item = element("li");
        const link = element("a", {
          text: source.label,
          attributes: { href: source.url, target: "_blank", rel: "noreferrer noopener" },
        });
        item.append(link);
        list.append(item);
      }
      sources.append(list);
      body.append(sources);
    }
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
      section.append(element("div", { className: "equation-card", text: sectionData.equation }));
    }
    if (sectionData.callout) {
      section.append(element("p", { className: "callout", text: sectionData.callout }));
    }
    return section;
  }

  #renderExercise(location) {
    const exercise = location.exercise;
    const section = element("section", { className: "lesson-section" });
    section.append(element("h3", { text: "Misión de salida" }));
    const card = element("div", { className: "exercise-card" });
    appendTextParagraph(card, exercise.prompt);

    const form = element("form");
    let responseReader = () => null;

    if (exercise.type === "choice") {
      const fieldset = element("fieldset");
      fieldset.append(element("legend", { className: "eyebrow", text: "Selecciona una alternativa" }));
      const inputName = `exercise-${location.id}`;
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
      text: exercise.buttonLabel ?? "Comprobar y completar",
      attributes: { type: "submit" },
    });
    actions.append(submit);
    form.append(actions);
    const feedback = element("p", { className: "exercise-feedback" });
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
    });

    card.append(form);
    section.append(card);
    return section;
  }

  #renderCompletionCard(location) {
    const section = element("section", { className: "lesson-section" });
    section.append(element("h3", { text: "Estado" }));
    const card = element("div", { className: "completion-card" });
    appendTextParagraph(card, "Lugar completado. La solución queda disponible para revisión.");
    if (location.exercise?.explanation) {
      const solution = element("p", { className: "callout", text: location.exercise.explanation });
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
    this.updateKnowledgePanel();
    this.closePanel("lesson-panel");
    this.closePanel("help-panel");
    this.openPanel("knowledge-panel");
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

  toggleHelpPanel() {
    if (!this.elements.helpPanel.hidden) this.closePanel("help-panel");
    else {
      this.closePanel("lesson-panel");
      this.closePanel("knowledge-panel");
      this.openPanel("help-panel");
    }
  }

  openDebugPanel() {
    this.openPanel("debug-panel");
  }

  toggleDebugPanel() {
    if (this.elements.debugPanel.hidden) this.openDebugPanel();
    else this.closePanel("debug-panel");
  }

  openPanel(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    panel.hidden = false;
    this.openPanels = this.openPanels.filter((id) => id !== panelId);
    this.openPanels.push(panelId);
  }

  closePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    panel.hidden = true;
    this.openPanels = this.openPanels.filter((id) => id !== panelId);
  }

  closeTopPanel() {
    const panelId = this.openPanels.at(-1);
    if (panelId) this.closePanel(panelId);
  }

  isBlockingModalOpen() {
    return ["lesson-panel", "knowledge-panel", "help-panel"].some(
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
