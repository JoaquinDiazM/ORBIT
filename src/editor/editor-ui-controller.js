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

function edgeKindsLabel(requirementKinds = []) {
  const labels = {
    completedLocations: "Spider",
    concepts: "concepto derivado",
    rewards: "recompensa derivada",
  };
  return requirementKinds.map((kind) => labels[kind] ?? kind).join(" + ");
}

export class EditorUIController {
  constructor({ model, app }) {
    this.model = model;
    this.app = app;
    this.readOnly = Boolean(model.getSnapshot().readOnly);
    this.currentView = this.readOnly ? "overview" : "spider";
    this.toastTimer = null;

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
      overviewPanel: query("#editor-overview-panel"),
      warningSummary: query("#editor-warning-summary"),
      warningList: query("#editor-warning-list"),
      helpPanel: query("#editor-help-panel"),
      spiderButton: query("#editor-open-spider"),
      beeButton: query("#editor-open-bee"),
      locationSelect: query("#editor-location-select"),
      locationArea: query("#editor-location-area"),
      locationX: query("#editor-location-x"),
      locationY: query("#editor-location-y"),
      applyLocation: query("#editor-apply-location"),
      sourceSelect: query("#editor-connection-source"),
      targetSelect: query("#editor-connection-target"),
      addConnection: query("#editor-add-connection"),
      connectionList: query("#editor-connection-list"),
      ringOneList: query("#editor-ring-one-list"),
      ringTwoList: query("#editor-ring-two-list"),
      selectedAreaSummary: query("#editor-selected-area-summary"),
      previousArea: query("#editor-area-previous"),
      nextArea: query("#editor-area-next"),
      undo: query("#editor-undo"),
      redo: query("#editor-redo"),
      reset: query("#editor-reset"),
      activeTool: query("#editor-active-tool"),
      areaCount: query("#editor-area-count"),
      locationCount: query("#editor-location-count"),
      saveStatus: query("#editor-save-status"),
      draftBadge: query("#editor-draft-badge"),
      importInput: query("#editor-import"),
      toastRegion: query("#toast-region"),
    };

    if (this.readOnly) this.#applyReadOnlyControls();

    this.#bindEvents();
    this.unsubscribeModel = this.model.subscribe(() => this.render());
    this.unsubscribeApp = this.app.subscribe((event) => {
      if (event?.message) this.toast(event.message, event.level ?? "info");
      this.render();
    });
    this.render();
  }

  destroy() {
    this.unsubscribeModel?.();
    this.unsubscribeApp?.();
    window.removeEventListener("keydown", this.onKeyDown);
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
  }

  #applyReadOnlyControls() {
    for (const button of [this.elements.spiderButton, this.elements.beeButton]) {
      button.setAttribute("aria-disabled", "true");
      button.title = "El perfil estudiante no permite usar Spider ni Bee.";
    }
    this.elements.undo.disabled = true;
    this.elements.redo.disabled = true;
    this.elements.reset.disabled = true;
    this.elements.importInput.disabled = true;
    this.elements.importInput.closest("label")?.classList.add("is-disabled");
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
    on("#editor-undo", "click", () => this.#report(this.model.undo(), "Cambio deshecho."));
    on("#editor-redo", "click", () => this.#report(this.model.redo(), "Cambio rehecho."));
    on("#editor-export", "click", () => {
      const date = new Date().toISOString().slice(0, 10);
      downloadJson(`orbit-editor-electromagnetismo-${date}.json`, this.model.exportDocument());
      this.toast("Borrador editorial exportado.", "success");
    });
    on("#editor-reset", "click", () => {
      if (!window.confirm("¿Restaurar la cartografía canónica? Esta acción inicia un nuevo historial editorial.")) return;
      this.#report(this.model.reset(), "Borrador restaurado a la cartografía canónica.");
    });

    this.elements.importInput.addEventListener("change", async () => {
      const [file] = this.elements.importInput.files ?? [];
      this.elements.importInput.value = "";
      if (!file) return;
      try {
        const candidate = JSON.parse(await file.text());
        const result = this.model.importDocument(candidate);
        const accepted = this.#report(result, "Borrador importado y validado.");
        const warningCount = result?.snapshot?.warnings?.length ?? 0;
        if (accepted && warningCount > 0) {
          this.showView("overview");
          this.toast(
            `Importación completada con ${warningCount} advertencia${warningCount === 1 ? "" : "s"}. Revisa el Resumen.`,
            "warning",
            7000,
          );
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

    this.onKeyDown = (event) => this.#handleKeyDown(event);
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
  }

  #toggleDock(dock, button, label) {
    const collapsed = dock.classList.toggle("is-collapsed");
    button.setAttribute("aria-expanded", String(!collapsed));
    button.setAttribute("aria-label", `${collapsed ? "Expandir" : "Minimizar"} ${label}`);
    button.title = `${collapsed ? "Expandir" : "Minimizar"} ${label}`;
  }

  #handleKeyDown(event) {
    if (event.code === "Escape") {
      if (this.app.cancelGesture()) event.preventDefault();
      return;
    }
    const historyAction = getEditorHistoryAction(event);
    if (historyAction) {
      event.preventDefault();
      if (this.readOnly) {
        this.toast("El perfil estudiante no puede modificar el historial editorial.", "warning");
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
    if (!result?.ok) {
      const message = result?.errors?.[0]?.message ?? this.#reasonMessage(result?.reason);
      this.toast(message, "error");
      return false;
    }
    if (result.changed && !quietSuccess) this.toast(successMessage, "success");
    return true;
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
      "duplicate-connection": "Esa relación ya existe en el grafo.",
      "tree-two-cycle": "La conexión produciría un ciclo en el Árbol II.",
      "nothing-to-undo": "No hay cambios para deshacer.",
      "nothing-to-redo": "No hay cambios para rehacer.",
      "profile-read-only": "El perfil estudiante no puede modificar el borrador editorial.",
    };
    return messages[reason] ?? "La operación no superó la validación del editor.";
  }

  showView(view) {
    if (this.readOnly && (view === "spider" || view === "bee")) {
      this.toast("El perfil estudiante no permite usar Spider ni Bee.", "warning");
      return;
    }
    this.currentView = view;
    this.elements.inspector.hidden = false;
    if (view === "spider" || view === "bee") this.app.setActiveTool(view);
    this.render();
  }

  render() {
    const snapshot = this.model.getSnapshot();
    const appState = this.app.getState();
    this.elements.shell.dataset.tool = appState.activeTool;
    this.elements.shell.dataset.dragging = String(Boolean(appState.gesture));
    this.elements.areaCount.textContent = String(snapshot.areas.length);
    this.elements.locationCount.textContent = String(snapshot.locations.length);
    this.elements.saveStatus.textContent = timestampLabel(snapshot.document.updatedAt);
    this.elements.draftBadge.textContent = this.readOnly
      ? "solo lectura"
      : snapshot.warnings.length
        ? `${snapshot.warnings.length} advertencia${snapshot.warnings.length === 1 ? "" : "s"}`
        : "borrador local";
    this.elements.draftBadge.title = this.readOnly
      ? "Consulta local sin permisos de edición."
      : snapshot.warnings.length
        ? "Abre Resumen para revisar las advertencias del borrador."
        : "Borrador editorial guardado localmente.";
    this.elements.undo.disabled = this.readOnly || !snapshot.canUndo;
    this.elements.redo.disabled = this.readOnly || !snapshot.canRedo;

    this.elements.spiderButton.setAttribute(
      "aria-pressed",
      String(!this.readOnly && appState.activeTool === "spider"),
    );
    this.elements.beeButton.setAttribute(
      "aria-pressed",
      String(!this.readOnly && appState.activeTool === "bee"),
    );
    const activeMode = this.readOnly
      ? "Consulta · solo lectura"
      : appState.activeTool === "bee"
        ? "Bee"
        : `Spider · ${appState.spiderMode === "connect" ? "conectar" : "mover"}`;
    this.elements.activeTool.textContent = activeMode;
    for (const radio of document.querySelectorAll('input[name="editor-spider-mode"]')) {
      radio.checked = radio.value === appState.spiderMode;
    }

    this.#renderInspectorView();
    this.#renderWarnings(snapshot);
    this.#renderLocationControls(snapshot, appState);
    this.#renderAreaControls(snapshot, appState);
    this.#renderConnections(snapshot, appState);
  }

  #renderInspectorView() {
    const views = {
      spider: {
        panel: this.elements.spiderPanel,
        title: "Spider",
        eyebrow: "Árbol II · nodos",
      },
      bee: {
        panel: this.elements.beePanel,
        title: "Bee",
        eyebrow: "Árbol I · zonas",
      },
      overview: {
        panel: this.elements.overviewPanel,
        title: "ORBIT Editor 0.4.0",
        eyebrow: "Borrador local",
      },
      help: {
        panel: this.elements.helpPanel,
        title: "Ayuda del editor",
        eyebrow: "Ratón y teclado",
      },
    };
    const selected = views[this.currentView] ?? views.spider;
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

    const connectable = snapshot.locations.filter(
      (location) => !["base", "debug"].includes(location.kind),
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
      if (edge.requirementKinds.includes("completedLocations")) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Quitar Spider";
        remove.disabled = this.readOnly;
        remove.addEventListener("click", () => {
          this.#report(
            this.model.disconnectLocations(edge.sourceId, edge.targetId),
            "Requisito Spider eliminado.",
          );
        });
        item.append(remove);
      } else {
        const locked = document.createElement("span");
        locked.className = "state-chip";
        locked.textContent = "solo lectura";
        item.append(locked);
      }
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
