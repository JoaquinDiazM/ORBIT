import { ScientificCalculator } from "./scientific-calculator.js";
import { SmithChartScaffold } from "./smith-chart.js";
import { VectorFieldExplorer } from "./vector-field-explorer.js";

export const GADGET_REWARD_KEYS = Object.freeze({
  vectorField: "gadgets:field-lens",
  smithChart: "gadgets:smith-chart",
});

const TOOL_DEFINITIONS = Object.freeze([
  Object.freeze({ id: "calculator", title: "Calculadora", reward: null }),
  Object.freeze({ id: "vector-field", title: "Campos 2D", reward: GADGET_REWARD_KEYS.vectorField }),
  Object.freeze({ id: "smith-chart", title: "Carta de Smith", reward: GADGET_REWARD_KEYS.smithChart }),
]);

function element(documentRef, tagName, { className, text, attributes } = {}) {
  const node = documentRef.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  for (const [name, value] of Object.entries(attributes ?? {})) {
    node.setAttribute(name, String(value));
  }
  return node;
}

export class GadgetHub {
  constructor({ container, progression, documentRef = globalThis.document, windowRef = globalThis.window } = {}) {
    if (!container?.append) throw new TypeError("GadgetHub requiere un contenedor DOM.");
    if (!progression?.getSnapshot) throw new TypeError("GadgetHub requiere ProgressionModel.");
    this.container = container;
    this.progression = progression;
    this.document = documentRef;
    this.window = windowRef;
    this.activeToolId = "calculator";
    this.instances = new Map();
    this.#build();
    this.refresh(this.progression.getSnapshot());
    this.selectTool("calculator");
  }

  #build() {
    const intro = element(this.document, "p", {
      text: "Las herramientas desbloqueadas siguen disponibles desde cualquier zona. La calculadora no requiere progreso.",
    });
    const chooser = element(this.document, "div", {
      className: "gadget-tool-chooser",
      attributes: { role: "group", "aria-label": "Herramientas disponibles" },
    });
    const announcement = element(this.document, "p", {
      className: "gadget-status",
      attributes: { role: "status", "aria-live": "polite" },
    });
    const buttons = new Map();
    const panels = new Map();
    for (const definition of TOOL_DEFINITIONS) {
      const panelId = `gadget-tool-${definition.id}`;
      const button = element(this.document, "button", {
        className: "gadget-tool-button",
        attributes: {
          type: "button",
          "aria-controls": panelId,
          "aria-pressed": "false",
        },
      });
      const title = element(this.document, "span", { text: definition.title });
      const state = element(this.document, "small", { text: "Disponible" });
      button.append(title, state);
      button.addEventListener("click", () => this.selectTool(definition.id, { focus: true }));
      chooser.append(button);
      buttons.set(definition.id, { button, state });

      const panel = element(this.document, "div", {
        className: "gadget-tool-panel",
        attributes: { id: panelId },
      });
      panel.hidden = true;
      panels.set(definition.id, panel);
    }
    this.container.append(intro, chooser, announcement, ...panels.values());
    this.elements = { intro, chooser, announcement, buttons, panels };
  }

  #isAvailable(definition, snapshot = this.progression.getSnapshot()) {
    return !definition.reward || snapshot.rewards?.has?.(definition.reward);
  }

  #ensureInstance(toolId) {
    if (this.instances.has(toolId)) return this.instances.get(toolId);
    const container = this.elements.panels.get(toolId);
    let instance;
    if (toolId === "calculator") {
      instance = new ScientificCalculator({ container, documentRef: this.document });
    } else if (toolId === "vector-field") {
      instance = new VectorFieldExplorer({
        container,
        documentRef: this.document,
        windowRef: this.window,
      });
    } else if (toolId === "smith-chart") {
      instance = new SmithChartScaffold({ container, documentRef: this.document });
    }
    if (instance) this.instances.set(toolId, instance);
    return instance ?? null;
  }

  refresh(snapshot = this.progression.getSnapshot()) {
    for (const definition of TOOL_DEFINITIONS) {
      const available = this.#isAvailable(definition, snapshot);
      const controls = this.elements.buttons.get(definition.id);
      controls.button.setAttribute("aria-disabled", String(!available));
      controls.state.textContent = available ? "Disponible" : "Bloqueado";
      controls.button.classList.toggle?.("is-locked", !available);
    }
    const active = TOOL_DEFINITIONS.find((definition) => definition.id === this.activeToolId);
    if (active && !this.#isAvailable(active, snapshot)) {
      this.selectTool("calculator");
      this.elements.announcement.textContent = "La herramienta dejó de estar disponible; se abrió la calculadora.";
    }
  }

  selectTool(toolId, { focus = false } = {}) {
    const definition = TOOL_DEFINITIONS.find((candidate) => candidate.id === toolId);
    if (!definition) return false;
    if (!this.#isAvailable(definition)) {
      this.elements.announcement.textContent = definition.id === "vector-field"
        ? "Completa el Taller Vectorial y adquiere el Explorador de campos para usarlo."
        : "Completa el Banco de Líneas y adquiere la Carta de Smith para consultar su esqueleto.";
      return false;
    }
    this.#ensureInstance(toolId);
    this.activeToolId = toolId;
    for (const candidate of TOOL_DEFINITIONS) {
      const selected = candidate.id === toolId;
      this.elements.panels.get(candidate.id).hidden = !selected;
      this.elements.buttons.get(candidate.id).button.setAttribute("aria-pressed", String(selected));
    }
    this.elements.announcement.textContent = `${definition.title} abierta.`;
    if (focus) {
      const panel = this.elements.panels.get(toolId);
      panel.querySelector?.("input, button, [tabindex]")?.focus?.({ preventScroll: true });
    }
    return true;
  }

  destroy() {
    for (const instance of this.instances.values()) instance.destroy?.();
    this.instances.clear();
    this.container.replaceChildren();
  }
}
