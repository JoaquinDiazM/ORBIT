import { ProgressStorage } from "../core/storage.js";

const PRODUCTS = new Set(["orbit", "editor"]);
const MAX_WIDTH = 1200;

export function panelWidthBounds({ viewportWidth, right = 16, occupiedLeft = 176 }) {
  const maximum = Math.max(1, Math.floor(Math.min(MAX_WIDTH, viewportWidth - right - occupiedLeft)));
  return { minimum: Math.min(280, maximum), maximum };
}

export function clampPanelWidth(width, bounds) {
  return Math.round(Math.min(bounds.maximum, Math.max(bounds.minimum, width)));
}

export class PanelWidthPreferences {
  constructor({ product, storage } = {}) {
    if (!PRODUCTS.has(product)) throw new TypeError("Producto de panel desconocido.");
    this.product = product;
    this.storage = storage ?? new ProgressStorage(`orbit-panel-width:v1:${product}`);
    this.widths = {};
    const loaded = this.storage.loadResult();
    const value = loaded.value;
    this.blocked = Boolean(loaded.error) || (loaded.found && (
      value?.kind !== "orbit-panel-width"
      || value.schemaVersion !== 1
      || value.product !== product
      || !value.widths || typeof value.widths !== "object" || Array.isArray(value.widths)
      || Object.entries(value.widths).some(([id, width]) =>
        !/^[a-z][a-z0-9-]{0,79}$/.test(id)
        || !Number.isFinite(width) || width < 1 || width > MAX_WIDTH)
    ));
    if (loaded.found && !this.blocked) this.widths = { ...value.widths };
  }

  get(id) { return this.widths[id] ?? null; }

  set(id, width) {
    if (this.blocked) throw new Error("La preferencia de ancho guardada es incompatible; se conserva intacta.");
    if (!/^[a-z][a-z0-9-]{0,79}$/.test(id)
      || (width !== null && (!Number.isFinite(width) || width < 1 || width > MAX_WIDTH))) {
      throw new TypeError("Ancho de ventana inválido.");
    }
    const widths = { ...this.widths };
    if (width === null) delete widths[id];
    else widths[id] = Math.round(width);
    this.storage.save({ kind: "orbit-panel-width", schemaVersion: 1, product: this.product, widths });
    this.widths = widths;
  }
}

export function setupPanelResizers({
  product,
  document = globalThis.document,
  window = globalThis.window,
  preferences = new PanelWidthPreferences({ product }),
} = {}) {
  const disposers = [];
  const refreshers = [];
  const panels = [...document.querySelectorAll(".primary-panel, .debug-panel")];
  for (const panel of panels) {
    const separator = document.createElement("div");
    separator.className = "panel-width-handle";
    separator.tabIndex = 0;
    separator.setAttribute("role", "separator");
    separator.setAttribute("aria-orientation", "vertical");
    separator.setAttribute("aria-label", "Ancho de la ventana");
    separator.setAttribute("aria-controls", panel.id);
    const toolbar = document.createElement("div");
    toolbar.className = "panel-width-toolbar";
    const help = document.createElement("span");
    help.id = `${panel.id}-width-help`;
    help.textContent = "Ancho: arrastra el borde izquierdo o enfócalo y usa ←/→. Inicio restaura.";
    separator.setAttribute("aria-describedby", help.id);
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "panel-width-reset";
    reset.textContent = "Restaurar ancho";
    const status = document.createElement("span");
    status.className = "panel-width-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    toolbar.append(help, reset, status);
    panel.append(separator);
    const header = panel.querySelector(".panel-header");
    if (header) header.after(toolbar);
    else panel.prepend(toolbar);
    panel.classList.add("resizable-right-panel");
    let desired = preferences.get(panel.id);
    let gesture = null;

    const bounds = () => {
      let occupiedLeft = product === "editor" ? 176 : 192;
      for (const other of document.querySelectorAll(".secondary-panel:not([hidden]), .editor-dock:not([hidden])")) {
        if (window.getComputedStyle(other).display === "none") continue;
        occupiedLeft = Math.max(occupiedLeft, other.getBoundingClientRect().right + 16);
      }
      const right = Number.parseFloat(window.getComputedStyle(panel).right) || 16;
      return panelWidthBounds({ viewportWidth: window.innerWidth, right, occupiedLeft });
    };
    const defaultWidth = () => product === "editor" ? 528
      : window.innerWidth > 1270 ? 512
        : Math.min(432, (window.innerWidth - 192) / 2);
    const refresh = () => {
      const compact = window.innerWidth <= 760;
      separator.setAttribute("aria-hidden", String(compact));
      separator.tabIndex = compact ? -1 : 0;
      toolbar.setAttribute("aria-hidden", String(compact));
      reset.setAttribute("aria-hidden", String(compact));
      reset.disabled = compact;
      if (compact) {
        panel.style.removeProperty("--resized-panel-width");
        return;
      }
      const limits = bounds();
      const width = clampPanelWidth(desired ?? defaultWidth(), limits);
      panel.style.setProperty("--resized-panel-width", `${width}px`);
      separator.setAttribute("aria-valuemin", String(Math.ceil(limits.minimum)));
      separator.setAttribute("aria-valuemax", String(Math.floor(limits.maximum)));
      separator.setAttribute("aria-valuenow", String(width));
      separator.setAttribute("aria-valuetext", `${width} píxeles de ancho`);
    };
    const commit = (candidate, previous) => {
      try {
        preferences.set(panel.id, candidate);
        desired = candidate;
        status.textContent = candidate === null ? "Ancho predeterminado restaurado." : "Ancho guardado.";
      } catch (error) {
        desired = previous;
        status.textContent = error.message || "No fue posible guardar el ancho.";
      }
      refresh();
    };
    const release = (event, cancel = false) => {
      if (!gesture || (event?.pointerId !== undefined && event.pointerId !== gesture.pointerId)) return;
      const current = gesture;
      gesture = null;
      if (separator.hasPointerCapture?.(current.pointerId)) separator.releasePointerCapture(current.pointerId);
      panel.classList.remove("resizing-panel");
      if (cancel) {
        desired = current.previous;
        refresh();
      } else commit(desired, current.previous);
    };
    const down = (event) => {
      if (event.button !== 0 || event.isPrimary === false || window.innerWidth <= 760 || gesture) return;
      event.preventDefault();
      separator.focus({ preventScroll: true });
      gesture = {
        pointerId: event.pointerId,
        startX: event.clientX,
        width: panel.getBoundingClientRect().width,
        previous: desired,
      };
      separator.setPointerCapture(event.pointerId);
      panel.classList.add("resizing-panel");
    };
    const move = (event) => {
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      desired = clampPanelWidth(gesture.width + gesture.startX - event.clientX, bounds());
      refresh();
    };
    const up = (event) => { move(event); release(event); };
    const cancel = (event) => release(event, true);
    const keydown = (event) => {
      if (gesture && event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        cancel();
        return;
      }
      if (window.innerWidth <= 760 || event.altKey || event.ctrlKey || event.metaKey) return;
      if (!["ArrowLeft", "ArrowRight", "Home"].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      if (gesture) return;
      const previous = desired;
      const width = panel.getBoundingClientRect().width;
      const step = event.shiftKey ? 64 : 16;
      const candidate = event.key === "Home" ? null
        : clampPanelWidth(width + (event.key === "ArrowLeft" ? step : -step), bounds());
      commit(candidate, previous);
    };
    const restore = () => { cancel(); commit(null, desired); };
    for (const [name, handler] of [
      ["pointerdown", down], ["pointermove", move], ["pointerup", up],
      ["pointercancel", cancel], ["lostpointercapture", cancel], ["keydown", keydown],
    ]) {
      separator.addEventListener(name, handler);
      disposers.push(() => separator.removeEventListener(name, handler));
    }
    reset.addEventListener("click", restore);
    disposers.push(() => {
      cancel();
      reset.removeEventListener("click", restore);
      separator.remove();
      toolbar.remove();
      panel.classList.remove("resizable-right-panel");
      panel.style.removeProperty("--resized-panel-width");
    });
    refreshers.push(() => { if (panel.hidden || window.innerWidth <= 760) cancel(); refresh(); });
    refresh();
  }
  const refreshAll = () => refreshers.forEach((refresh) => refresh());
  window.addEventListener("resize", refreshAll);
  const observer = typeof window.MutationObserver === "function"
    ? new window.MutationObserver(refreshAll) : null;
  observer?.observe(document.body, { attributes: true, attributeFilter: ["hidden"], subtree: true });
  for (const dock of document.querySelectorAll(".editor-dock")) {
    observer?.observe(dock, { attributes: true, attributeFilter: ["class"] });
  }
  return {
    destroy() {
      observer?.disconnect();
      window.removeEventListener("resize", refreshAll);
      disposers.forEach((dispose) => dispose());
    },
  };
}
