import { APP_CONFIG } from "../config.js";
import { isAreaAppearanceCanvasAnimated } from "../core/area-appearance-canvas.js";
import { WORLD_CONFIG } from "../data/world.js";
import { axialToPixel, getWorldBounds, pointInHex } from "../core/hex.js";
import { createWorldIndex, getLocationWorldPosition } from "../core/world-graph.js";
import { Camera2D } from "../game/camera.js";
import { EDITOR_LOCATION_SAFE_MARGIN } from "./editor-document.js";
import { findTierLabelAtWorldPoint, getTierLabelLayouts } from "./editor-renderer.js";

const POINTER_NODE_RADIUS_PX = 27;
const EDITOR_FIT_PADDING = 120;
const EDITOR_FIT_MAX_ZOOM = 0.9;
const EDITOR_NAVIGATION_PADDING = WORLD_CONFIG.hexSize * 2;
const BEE_DRAG_THRESHOLD_PX = 7;
const EDITABLE_LOCATION_KINDS = new Set(["lesson", "mission", "npc"]);

export function hasReachedBeeDragThreshold(
  start,
  current,
  threshold = BEE_DRAG_THRESHOLD_PX,
) {
  if (![start?.x, start?.y, current?.x, current?.y, threshold].every(Number.isFinite)) {
    return false;
  }
  return Math.hypot(current.x - start.x, current.y - start.y) >= Math.max(0, threshold);
}

export function canUseEditorTool(tool, { readOnly = false } = {}) {
  if (!["spider", "bee", "bowerbird"].includes(tool)) return false;
  return true;
}

export function getEditorWorldBounds(
  areas,
  tierLabels,
  {
    padding = 0,
    zoom = APP_CONFIG.defaultZoom,
    hexSize = WORLD_CONFIG.hexSize,
  } = {},
) {
  const areaBounds = getWorldBounds(areas, hexSize, 0);
  const labelLayouts = getTierLabelLayouts({ areas, tierLabels, zoom, hexSize });
  const contentBounds = labelLayouts.reduce((bounds, label) => ({
    minX: Math.min(bounds.minX, label.x - label.width / 2),
    maxX: Math.max(bounds.maxX, label.x + label.width / 2),
    minY: Math.min(bounds.minY, label.y - label.height / 2),
    maxY: Math.max(bounds.maxY, label.y + label.height / 2),
  }), areaBounds);
  return {
    minX: contentBounds.minX - padding,
    maxX: contentBounds.maxX + padding,
    minY: contentBounds.minY - padding,
    maxY: contentBounds.maxY + padding,
  };
}

export function calculateEditorFitZoom(bounds, viewportWidth, viewportHeight) {
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const availableHeight = Math.max(320, viewportHeight - 130);
  return Math.min(
    EDITOR_FIT_MAX_ZOOM,
    viewportWidth / width,
    availableHeight / height,
  );
}

function pointerPosition(event, canvas, renderer) {
  const rectangle = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rectangle.left) / Math.max(1, rectangle.width)) * renderer.width,
    y: ((event.clientY - rectangle.top) / Math.max(1, rectangle.height)) * renderer.height,
  };
}

function isConnectable(location, learningNetworkLocationIds) {
  return Boolean(
    location
    && ["lesson", "mission"].includes(location.kind)
    && learningNetworkLocationIds.has(location.id),
  );
}

function failureMessage(result) {
  if (result?.errors?.[0]?.message) return result.errors[0].message;
  const messages = {
    "origin-fixed": "Campamento Base permanece fijo en el centro.",
    "ring-mismatch": "Bee rechazó el intercambio: las zonas pertenecen a niveles distintos.",
    "location-outside-safe-margin": "Spider rechazó el destino porque el nodo quedó fuera del margen seguro.",
    "self-connection": "Spider no admite una conexión hacia el mismo nodo.",
    "duplicate-connection": "Esa pareja ya está conectada en la Red de aprendizaje.",
    "learning-network-cycle": "Spider rechazó la conexión porque produciría un ciclo en la Red de aprendizaje.",
    "non-learning-location": "Spider solo incorpora lecciones y misiones a la Red de aprendizaje.",
    "location-not-in-learning-network": "Añade primero ambos nodos a la Red de aprendizaje.",
    "non-editable-location-kind": "Spider solo crea lecciones, misiones o personajes secundarios.",
    "location-not-editable": "Este tipo de lugar no admite autoría ni Inventario.",
    "location-not-in-inventory": "El nodo debe estar guardado en Inventario para realizar esa acción.",
    "protected-location-delete": "Ese nodo académico está protegido contra el borrado definitivo.",
    "location-deleted": "El ID fue eliminado y permanece reservado.",
    "location-sequence-exhausted": "La secuencia segura de IDs está agotada; no se creó ningún nodo.",
    "project-data-invalid": "El cambio dejaría contenido inaccesible en la progresión.",
  };
  return messages[result?.reason] ?? "La operación no superó la validación del editor.";
}

export class EditorApp {
  constructor({ canvas, model, renderer, bowerbird = null }) {
    this.canvas = canvas;
    this.model = model;
    this.renderer = renderer;
    this.bowerbird = bowerbird;
    this.readOnly = Boolean(model.getSnapshot().readOnly);
    this.listeners = new Set();
    this.activeTool = this.readOnly ? "bowerbird" : "spider";
    this.spiderMode = "move";
    this.selectedLocationId = null;
    this.selectedAreaId = null;
    this.selectedTierLabel = null;
    this.hoveredLocationId = null;
    this.hoveredAreaId = null;
    this.hoveredTierLabel = null;
    this.pendingPlacement = null;
    this.gesture = null;
    this.frameRequest = null;
    this.destroyed = false;

    const snapshot = this.#snapshot();
    this.selectedLocationId =
      snapshot.locations.find((location) => location.id === "vector-workshop")?.id ??
      snapshot.locations[0]?.id ??
      null;
    this.selectedAreaId =
      snapshot.areas.find((area) => area.id === "electrostatics")?.id ??
      snapshot.areas.find((area) => area.tier > 0)?.id ??
      null;

    const tierLabels = this.#tierLabels(snapshot);
    const worldBounds = getEditorWorldBounds(snapshot.areas, tierLabels, {
      zoom: APP_CONFIG.minZoom,
    });
    this.camera = new Camera2D({
      x: 0,
      y: 0,
      zoom: APP_CONFIG.defaultZoom,
      bounds: getEditorWorldBounds(
        snapshot.areas,
        tierLabels,
        {
          padding: EDITOR_NAVIGATION_PADDING,
          zoom: APP_CONFIG.minZoom,
        },
      ),
      focusBounds: worldBounds,
    });
    this.renderer.resize();
    this.camera.resize(this.renderer.width, this.renderer.height);

    this.onResize = () => {
      this.renderer.resize();
      this.camera.resize(this.renderer.width, this.renderer.height);
      this.requestRender();
    };
    this.onWheel = (event) => {
      if (this.gesture && this.gesture.type !== "pan") return;
      event.preventDefault();
      const screen = pointerPosition(event, this.canvas, this.renderer);
      this.camera.zoomAt(event.deltaY, screen.x, screen.y);
      this.requestRender();
    };
    this.onPointerDown = (event) => this.#handlePointerDown(event);
    this.onPointerMove = (event) => this.#handlePointerMove(event);
    this.onPointerUp = (event) => this.#handlePointerUp(event);
    this.onPointerCancel = () => this.cancelGesture();
    this.onLostPointerCapture = () => {
      if (this.gesture) this.cancelGesture();
    };
    this.onContextMenu = (event) => event.preventDefault();
    this.motionQuery = typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
    this.reducedMotion = Boolean(this.motionQuery?.matches);
    this.onMotionPreferenceChanged = (event) => {
      this.reducedMotion = Boolean(event.matches);
      this.requestRender();
    };

    window.addEventListener("resize", this.onResize);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerCancel);
    this.canvas.addEventListener("lostpointercapture", this.onLostPointerCapture);
    this.canvas.addEventListener("contextmenu", this.onContextMenu);
    this.unsubscribeModel = this.model.subscribe(() => {
      this.reconcileLocationSelection();
      this.#updateCameraBounds();
      this.requestRender();
    });
    this.unsubscribeBowerbird = this.bowerbird?.subscribe(() => this.requestRender());
    this.motionQuery?.addEventListener?.("change", this.onMotionPreferenceChanged);
  }

  start() {
    this.canvas.focus({ preventScroll: true });
    this.fitWorld({ announce: false });
    this.requestRender();
  }

  destroy() {
    this.destroyed = true;
    if (this.frameRequest !== null) cancelAnimationFrame(this.frameRequest);
    this.unsubscribeModel?.();
    this.unsubscribeBowerbird?.();
    this.motionQuery?.removeEventListener?.("change", this.onMotionPreferenceChanged);
    window.removeEventListener("resize", this.onResize);
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerCancel);
    this.canvas.removeEventListener("lostpointercapture", this.onLostPointerCapture);
    this.canvas.removeEventListener("contextmenu", this.onContextMenu);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  #emit(type, detail = {}) {
    const event = { type, ...detail, state: this.getState() };
    for (const listener of this.listeners) listener(event);
  }

  getState() {
    const snapshot = this.#snapshot();
    return {
      activeTool: this.activeTool,
      spiderMode: this.spiderMode,
      selectedLocationId: this.selectedLocationId,
      selectedAreaId: this.selectedAreaId,
      selectedTierLabel: this.selectedTierLabel,
      hoveredLocationId: this.hoveredLocationId,
      hoveredAreaId: this.hoveredAreaId,
      hoveredTierLabel: this.hoveredTierLabel,
      gesture: this.gesture?.type ?? null,
      pendingPlacement: this.pendingPlacement ? structuredClone(this.pendingPlacement) : null,
      edges: structuredClone(
        snapshot.learningNetworkTopology ?? snapshot.treeTwoTopology ?? [],
      ),
      readOnly: this.readOnly,
      appearanceScope: this.bowerbird?.getSnapshot().scope ?? "course",
    };
  }

  setActiveTool(tool) {
    if (!canUseEditorTool(tool, { readOnly: this.readOnly }) || tool === this.activeTool) return false;
    this.cancelGesture();
    this.activeTool = tool;
    this.#emit("tool-changed");
    this.requestRender();
    return true;
  }

  setSpiderMode(mode) {
    if (!["move", "connect", "modify", "create", "inventory"].includes(mode) || mode === this.spiderMode) return false;
    this.cancelGesture();
    this.spiderMode = mode;
    this.#emit("spider-mode-changed");
    this.requestRender();
    return true;
  }

  selectLocation(locationId) {
    const exists = this.model.getSnapshot().locations.some(
      (location) => location.id === locationId,
    );
    if (!exists || locationId === this.selectedLocationId) return false;
    this.selectedLocationId = locationId;
    this.#emit("location-selected");
    this.requestRender();
    return true;
  }

  reconcileLocationSelection() {
    const snapshot = this.model.getSnapshot();
    const activeIds = new Set(snapshot.locations.map((location) => location.id));
    if (this.selectedLocationId && activeIds.has(this.selectedLocationId)) return false;

    const previousLocationId = this.selectedLocationId;
    this.selectedLocationId = snapshot.locations.find(
      (location) => location.id === "vector-workshop",
    )?.id ?? snapshot.locations[0]?.id ?? null;
    if (this.hoveredLocationId && !activeIds.has(this.hoveredLocationId)) {
      this.hoveredLocationId = null;
    }
    if (
      this.gesture?.locationId === previousLocationId
      || this.gesture?.sourceId === previousLocationId
      || this.gesture?.targetId === previousLocationId
    ) {
      this.gesture = null;
    }
    this.#emit("location-selection-reconciled", {
      previousLocationId,
      locationId: this.selectedLocationId,
    });
    this.requestRender();
    return true;
  }

  selectArea(areaId) {
    const exists = this.#snapshot().areas.some((area) => area.id === areaId);
    if (!exists) return false;
    const changed = areaId !== this.selectedAreaId || this.selectedTierLabel !== null;
    if (!changed) return false;
    this.selectedAreaId = areaId;
    this.selectedTierLabel = null;
    this.#emit("area-selected");
    this.requestRender();
    return true;
  }

  selectTierLabel(tier) {
    const normalizedTier = Number(tier);
    if (![1, 2].includes(normalizedTier) || this.selectedTierLabel === normalizedTier) return false;
    this.selectedTierLabel = normalizedTier;
    if (this.activeTool === "bee") this.selectedAreaId = null;
    this.#emit("tier-label-selected", {
      message: `Rótulo del nivel ${normalizedTier} seleccionado.`,
      level: "info",
    });
    this.requestRender();
    return true;
  }

  beginCreateLocation(kind) {
    if (this.readOnly || !EDITABLE_LOCATION_KINDS.has(kind)) return false;
    this.setActiveTool("spider");
    this.setSpiderMode("create");
    this.pendingPlacement = { type: "create", kind };
    this.#emit("placement-armed", {
      message: "Selecciona una zona del mapa para colocar el nuevo nodo.",
      level: "info",
    });
    this.requestRender();
    return true;
  }

  beginRestoreLocation(locationId) {
    if (this.readOnly || typeof locationId !== "string" || !locationId) return false;
    this.setActiveTool("spider");
    this.setSpiderMode("inventory");
    this.pendingPlacement = { type: "restore", locationId };
    this.#emit("placement-armed", {
      message: "Selecciona una zona del mapa para reinsertar el nodo.",
      level: "info",
    });
    this.requestRender();
    return true;
  }

  clearPendingPlacement({ announce = false } = {}) {
    if (!this.pendingPlacement) return false;
    this.pendingPlacement = null;
    if (announce) {
      this.#emit("placement-cancelled", {
        message: "Colocación cancelada; el borrador no cambió.",
        level: "info",
      });
    }
    this.requestRender();
    return true;
  }

  fitWorld({ announce = true } = {}) {
    const snapshot = this.#snapshot();
    const tierLabels = this.#tierLabels(snapshot);
    let zoom = EDITOR_FIT_MAX_ZOOM;
    let bounds = null;
    for (let iteration = 0; iteration < 3; iteration += 1) {
      bounds = getEditorWorldBounds(snapshot.areas, tierLabels, {
        padding: EDITOR_FIT_PADDING,
        zoom,
      });
      zoom = calculateEditorFitZoom(bounds, this.renderer.width, this.renderer.height);
    }
    bounds = getEditorWorldBounds(snapshot.areas, tierLabels, {
      padding: EDITOR_FIT_PADDING,
      zoom,
    });
    this.camera.setZoom(zoom);
    this.camera.setCenter((bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2);
    if (announce) this.#emit("camera-fitted", { message: "Mapamundi encuadrado.", level: "info" });
    this.requestRender();
  }

  panCameraByScreen(dx, dy) {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return false;
    this.camera.panByScreen(dx, dy);
    this.requestRender();
    return true;
  }

  cancelGesture() {
    if (!this.gesture) return this.clearPendingPlacement({ announce: true });
    this.gesture = null;
    this.#emit("gesture-cancelled", {
      message: "Edición cancelada; el borrador no cambió.",
      level: "info",
    });
    this.requestRender();
    return true;
  }

  requestRender() {
    if (this.destroyed || this.frameRequest !== null) return;
    this.frameRequest = requestAnimationFrame((timestamp) => {
      this.frameRequest = null;
      this.#render(timestamp);
    });
  }

  #render(timestamp = 0) {
    const snapshot = this.#snapshot();
    this.renderer.render({
      camera: this.camera,
      areas: snapshot.areas,
      locations: snapshot.locations,
      edges: snapshot.learningNetworkTopology ?? snapshot.treeTwoTopology ?? [],
      activeTool: this.activeTool,
      selectedLocationId: this.selectedLocationId,
      selectedAreaId: this.selectedAreaId,
      hoveredLocationId: this.hoveredLocationId,
      hoveredAreaId: this.hoveredAreaId,
      tierLabels: snapshot.tierLabels ?? snapshot.document?.tierLabels ?? [],
      selectedTierLabel: this.selectedTierLabel,
      hoveredTierLabel: this.hoveredTierLabel,
      timeSeconds: this.reducedMotion ? 0 : timestamp / 1000,
      reducedMotion: this.reducedMotion,
      dragPreview: this.gesture?.type === "location"
        && this.gesture.dragging
        ? {
            ...this.gesture.preview,
            type: "location",
            locationId: this.gesture.locationId,
          }
        : this.gesture?.type === "area" && this.gesture.dragging
          ? { type: "area", world: this.gesture.pointerWorld }
          : null,
      connectionPreview: this.gesture?.type === "connection"
        ? {
            sourceId: this.gesture.sourceId,
            targetId: this.gesture.targetId,
            world: this.gesture.pointerWorld,
            valid: Boolean(this.gesture.targetId),
          }
        : null,
      beeTargetAreaId: this.gesture?.type === "area" ? this.gesture.targetId : null,
      beeTargetValid: this.gesture?.type === "area" ? this.gesture.targetValid : false,
      tierLabelPreview: this.gesture?.type === "tier-label"
        && this.gesture.dragging
        ? { tier: this.gesture.tier, offset: this.gesture.previewOffset }
        : null,
    });
    if (
      this.activeTool === "bowerbird"
      && !this.reducedMotion
      && snapshot.areas.some((area) =>
        isAreaAppearanceCanvasAnimated(area, area.appearance))
    ) {
      this.requestRender();
    }
  }

  #snapshot() {
    const snapshot = this.model.getSnapshot();
    const appearanceSnapshot = this.bowerbird?.getSnapshot();
    if (appearanceSnapshot) snapshot.areas = appearanceSnapshot.areas;
    return snapshot;
  }

  #scene(snapshot = this.#snapshot()) {
    const worldIndex = createWorldIndex(snapshot.areas);
    const positions = new Map(
      snapshot.locations.map((location) => [
        location.id,
        getLocationWorldPosition(location, worldIndex, WORLD_CONFIG.hexSize),
      ]),
    );
    return { snapshot, worldIndex, positions };
  }

  #worldPoint(event) {
    const screen = pointerPosition(event, this.canvas, this.renderer);
    return { screen, world: this.camera.screenToWorld(screen.x, screen.y) };
  }

  #locationAt(world, scene, { connectableOnly = false, editableOnly = false } = {}) {
    const radius = POINTER_NODE_RADIUS_PX / this.camera.zoom;
    const learningNetworkLocationIds = new Set(
      scene.snapshot.learningNetworkLocationIds ?? [],
    );
    let nearest = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const location of scene.snapshot.locations) {
      if (connectableOnly && !isConnectable(location, learningNetworkLocationIds)) continue;
      if (editableOnly && !EDITABLE_LOCATION_KINDS.has(location.kind)) continue;
      const position = scene.positions.get(location.id);
      const distance = Math.hypot(world.x - position.x, world.y - position.y);
      if (distance <= radius && distance < nearestDistance) {
        nearest = location;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  #areaAt(world, snapshot) {
    let best = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const area of snapshot.areas) {
      const center = axialToPixel(area.q, area.r, WORLD_CONFIG.hexSize);
      if (!pointInHex(world.x, world.y, center.x, center.y, WORLD_CONFIG.hexSize - 4)) continue;
      const distance = Math.hypot(world.x - center.x, world.y - center.y);
      if (distance < bestDistance) {
        best = area;
        bestDistance = distance;
      }
    }
    return best;
  }

  #tierLabels(snapshot) {
    return snapshot.tierLabels ?? snapshot.document?.tierLabels ?? [];
  }

  #updateCameraBounds(snapshot = this.#snapshot()) {
    const tierLabels = this.#tierLabels(snapshot);
    this.camera.focusBounds = getEditorWorldBounds(snapshot.areas, tierLabels, {
      zoom: APP_CONFIG.minZoom,
    });
    this.camera.bounds = getEditorWorldBounds(snapshot.areas, tierLabels, {
      padding: EDITOR_NAVIGATION_PADDING,
      zoom: APP_CONFIG.minZoom,
    });
    this.camera.resize(this.renderer.width, this.renderer.height);
  }

  #tierLabelAt(world, snapshot) {
    return findTierLabelAtWorldPoint({
      x: world.x,
      y: world.y,
      areas: snapshot.areas,
      tierLabels: this.#tierLabels(snapshot),
      zoom: this.camera.zoom,
    });
  }

  #placePending(area, world) {
    const pending = this.pendingPlacement;
    if (!pending || !area) return false;
    const center = axialToPixel(area.q, area.r, WORLD_CONFIG.hexSize);
    const offset = { x: world.x - center.x, y: world.y - center.y };
    if (!pointInHex(
      offset.x,
      offset.y,
      0,
      0,
      WORLD_CONFIG.hexSize - EDITOR_LOCATION_SAFE_MARGIN,
    )) {
      this.#emit("drop-rejected", {
        message: "Elige un punto dentro del margen seguro del hexágono.",
        level: "warning",
      });
      return true;
    }

    const beforeIds = new Set(this.#snapshot().locations.map((location) => location.id));
    const result = pending.type === "create"
      ? this.model.createLocation({ kind: pending.kind, areaId: area.id, offset })
      : this.model.restoreLocation(pending.locationId, { areaId: area.id, offset });
    if (result?.ok && result.changed) {
      const snapshot = this.#snapshot();
      const created = snapshot.locations.find((location) => !beforeIds.has(location.id));
      const locationId = pending.type === "restore"
        ? pending.locationId
        : result.detail?.locationId
          ?? result.locationId
          ?? result.createdLocationId
          ?? result.detail?.location?.id
          ?? created?.id;
      if (locationId) this.selectedLocationId = locationId;
      this.pendingPlacement = null;
      this.#emit("edit-committed", {
        message: pending.type === "create"
          ? "Nodo creado y colocado por Spider."
          : "Nodo reinsertado desde Inventario.",
        level: "success",
      });
    } else if (result && !result.ok) {
      this.#emit("edit-rejected", { message: failureMessage(result), level: "error" });
    }
    this.requestRender();
    return true;
  }

  #handlePointerDown(event) {
    if (![0, 1].includes(event.button)) return;
    this.canvas.focus({ preventScroll: true });
    const { screen, world } = this.#worldPoint(event);
    const scene = this.#scene();
    const forcePan = event.button === 1;

    if (this.readOnly && !forcePan && ["spider", "bee"].includes(this.activeTool)) {
      if (this.activeTool === "spider") {
        const location = this.#locationAt(world, scene);
        if (location) {
          this.selectLocation(location.id);
          this.#emit("location-selected", {
            message: `${location.shortTitle ?? location.title ?? location.id} seleccionado en consulta.`,
            level: "info",
          });
        }
      } else {
        const label = this.#tierLabelAt(world, scene.snapshot);
        const area = label ? null : this.#areaAt(world, scene.snapshot);
        if (label) this.selectTierLabel(label.tier);
        else if (area) this.selectArea(area.id);
      }
      this.gesture = {
        type: "pan",
        pointerId: event.pointerId,
        lastScreen: screen,
      };
      this.canvas.setPointerCapture(event.pointerId);
      this.#emit("gesture-started");
      this.requestRender();
      return;
    }

    if (!forcePan && this.activeTool === "bowerbird") {
      const area = this.#areaAt(world, scene.snapshot);
      if (area) {
        this.selectArea(area.id);
        this.#emit("bowerbird-area-selected", {
          message: `Bowerbird seleccionó ${area.shortTitle ?? area.title}.`,
          level: "info",
        });
        return;
      }
    }

    if (!forcePan && this.activeTool === "bee") {
      const label = this.#tierLabelAt(world, scene.snapshot);
      if (label) {
        this.selectTierLabel(label.tier);
        this.gesture = {
          type: "tier-label",
          pointerId: event.pointerId,
          tier: label.tier,
          startScreen: screen,
          startWorld: world,
          startOffset: { ...label.offset },
          previewOffset: { ...label.offset },
          dragging: false,
        };
        this.canvas.setPointerCapture(event.pointerId);
        this.#emit("gesture-started");
        this.requestRender();
        return;
      }
    }

    if (!forcePan && this.activeTool === "spider") {
      if (this.pendingPlacement && ["create", "inventory"].includes(this.spiderMode)) {
        const area = this.#areaAt(world, scene.snapshot);
        if (area && this.#placePending(area, world)) return;
      }
      const location = this.#locationAt(world, scene, {
        connectableOnly: this.spiderMode === "connect",
        editableOnly: ["modify", "inventory"].includes(this.spiderMode),
      });
      if (location) {
        this.selectLocation(location.id);
        if (this.spiderMode === "connect") {
          this.gesture = {
            type: "connection",
            pointerId: event.pointerId,
            sourceId: location.id,
            targetId: null,
            pointerWorld: world,
          };
        } else if (this.spiderMode === "move") {
          this.gesture = {
            type: "location",
            pointerId: event.pointerId,
            locationId: location.id,
            startScreen: screen,
            dragging: false,
            preview: null,
          };
        } else {
          this.#emit("location-selected", {
            message: `${location.shortTitle ?? location.title ?? location.id} seleccionado.`,
            level: "info",
          });
          return;
        }
        this.canvas.setPointerCapture(event.pointerId);
        this.#emit("gesture-started");
        this.requestRender();
        return;
      }
    }

    if (!forcePan && this.activeTool === "bee") {
      const area = this.#areaAt(world, scene.snapshot);
      if (area) {
        this.selectArea(area.id);
        if (area.tier === 0) {
          this.#emit("fixed-origin", {
            message: "Campamento Base permanece fijo en el centro.",
            level: "warning",
          });
          return;
        }
        this.gesture = {
          type: "area",
          pointerId: event.pointerId,
          sourceId: area.id,
          startScreen: screen,
          dragging: false,
          pointerWorld: world,
          targetId: null,
          targetValid: false,
        };
        this.canvas.setPointerCapture(event.pointerId);
        this.#emit("gesture-started");
        this.requestRender();
        return;
      }
    }

    this.gesture = {
      type: "pan",
      pointerId: event.pointerId,
      lastScreen: screen,
    };
    this.canvas.setPointerCapture(event.pointerId);
    this.#emit("gesture-started");
  }

  #handlePointerMove(event) {
    const { screen, world } = this.#worldPoint(event);
    const scene = this.#scene();
    const hoveredLocation = this.activeTool === "spider"
      ? this.#locationAt(world, scene, {
          connectableOnly: !this.readOnly && this.spiderMode === "connect",
          editableOnly: !this.readOnly && ["modify", "inventory"].includes(this.spiderMode),
        })
      : null;
    const hoveredTierLabel = this.activeTool === "bee"
      ? this.#tierLabelAt(world, scene.snapshot)
      : null;
    const hoveredArea = ["bee", "bowerbird"].includes(this.activeTool) && !hoveredTierLabel
      ? this.#areaAt(world, scene.snapshot)
      : null;
    const hoverChanged =
      hoveredLocation?.id !== this.hoveredLocationId
      || hoveredArea?.id !== this.hoveredAreaId
      || hoveredTierLabel?.tier !== this.hoveredTierLabel;
    this.hoveredLocationId = hoveredLocation?.id ?? null;
    this.hoveredAreaId = hoveredArea?.id ?? null;
    this.hoveredTierLabel = hoveredTierLabel?.tier ?? null;

    if (!this.gesture || this.gesture.pointerId !== event.pointerId) {
      if (hoverChanged) this.requestRender();
      return;
    }

    if (this.gesture.type === "pan") {
      this.camera.panByScreen(
        screen.x - this.gesture.lastScreen.x,
        screen.y - this.gesture.lastScreen.y,
      );
      this.gesture.lastScreen = screen;
    } else if (this.gesture.type === "location") {
      if (!this.gesture.dragging) {
        this.gesture.dragging = hasReachedBeeDragThreshold(this.gesture.startScreen, screen);
      }
      if (!this.gesture.dragging) {
        this.requestRender();
        return;
      }
      const area = this.#areaAt(world, scene.snapshot);
      if (!area) {
        this.gesture.preview = { world, valid: false, areaId: null, offset: null };
      } else {
        const center = axialToPixel(area.q, area.r, WORLD_CONFIG.hexSize);
        const offset = { x: world.x - center.x, y: world.y - center.y };
        this.gesture.preview = {
          world,
          areaId: area.id,
          offset,
          valid: pointInHex(
            offset.x,
            offset.y,
            0,
            0,
            WORLD_CONFIG.hexSize - EDITOR_LOCATION_SAFE_MARGIN,
          ),
        };
      }
    } else if (this.gesture.type === "connection") {
      const target = this.#locationAt(world, scene, { connectableOnly: true });
      this.gesture.pointerWorld = world;
      this.gesture.targetId = target && target.id !== this.gesture.sourceId ? target.id : null;
    } else if (this.gesture.type === "area") {
      this.gesture.pointerWorld = world;
      if (!this.gesture.dragging) {
        this.gesture.dragging = hasReachedBeeDragThreshold(this.gesture.startScreen, screen);
      }
      if (!this.gesture.dragging) {
        this.requestRender();
        return;
      }
      const source = scene.snapshot.areas.find((area) => area.id === this.gesture.sourceId);
      const target = this.#areaAt(world, scene.snapshot);
      this.gesture.targetId = target?.id ?? null;
      this.gesture.targetValid = Boolean(
        source && target && source.id !== target.id && source.tier === target.tier,
      );
    } else if (this.gesture.type === "tier-label") {
      if (!this.gesture.dragging) {
        this.gesture.dragging = hasReachedBeeDragThreshold(this.gesture.startScreen, screen);
      }
      if (!this.gesture.dragging) {
        this.requestRender();
        return;
      }
      this.gesture.previewOffset = {
        x: this.gesture.startOffset.x + world.x - this.gesture.startWorld.x,
        y: this.gesture.startOffset.y + world.y - this.gesture.startWorld.y,
      };
    }
    this.requestRender();
  }

  #handlePointerUp(event) {
    if (!this.gesture || this.gesture.pointerId !== event.pointerId) return;
    const gesture = this.gesture;
    this.gesture = null;
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }

    let result = null;
    let message = null;
    if (gesture.type === "location" && gesture.dragging && gesture.preview?.valid) {
      result = this.model.moveLocation(gesture.locationId, {
        areaId: gesture.preview.areaId,
        offset: gesture.preview.offset,
      });
      message = "Nodo reubicado por Spider.";
    } else if (gesture.type === "location" && !gesture.dragging) {
      this.#emit("location-clicked", {
        message: "Nodo seleccionado. Arrástralo para cambiar su posición.",
        level: "info",
      });
    } else if (gesture.type === "connection" && gesture.targetId) {
      result = this.model.connectLocations(gesture.sourceId, gesture.targetId);
      message = "Conexión dirigida añadida a la Red de aprendizaje.";
    } else if (gesture.type === "area" && !gesture.dragging) {
      this.#emit("area-clicked", {
        message: "Zona seleccionada. Arrástrala para intercambiarla.",
        level: "info",
      });
    } else if (gesture.type === "area" && gesture.targetValid) {
      result = this.model.swapArea(gesture.sourceId, gesture.targetId);
      message = "Zonas intercambiadas dentro del mismo anillo.";
    } else if (gesture.type === "tier-label" && !gesture.dragging) {
      this.#emit("tier-label-clicked", {
        message: `Rótulo del nivel ${gesture.tier} seleccionado. Arrástralo para reubicarlo.`,
        level: "info",
      });
    } else if (gesture.type === "tier-label") {
      const snapshot = this.#snapshot();
      const label = this.#tierLabels(snapshot).find((entry) => Number(entry.tier) === gesture.tier);
      result = this.model.setTierLabel(gesture.tier, {
        text: label?.text ?? label?.label ?? `NIVEL ${gesture.tier}`,
        offset: gesture.previewOffset,
      });
      message = `Rótulo del nivel ${gesture.tier} reubicado.`;
    } else if (gesture.type !== "pan") {
      this.#emit("drop-rejected", {
        message: gesture.type === "area"
          ? "Bee solo acepta otra zona del mismo anillo. No se modificó el borrador."
          : "Destino inválido; no se modificó el borrador.",
        level: "warning",
      });
    }

    if (result?.ok && result.changed) {
      this.#updateCameraBounds();
      this.#emit("edit-committed", { message, level: "success" });
    } else if (result && !result.ok) {
      this.#emit("edit-rejected", { message: failureMessage(result), level: "error" });
    } else {
      this.#emit("gesture-finished");
    }
    this.requestRender();
  }
}
