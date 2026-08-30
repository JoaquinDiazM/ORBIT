import { APP_CONFIG } from "../config.js";
import { WORLD_CONFIG } from "../data/world.js";
import { axialToPixel, getWorldBounds, pointInHex } from "../core/hex.js";
import { createWorldIndex, getLocationWorldPosition } from "../core/world-graph.js";
import { Camera2D } from "../game/camera.js";
import { EDITOR_LOCATION_SAFE_MARGIN } from "./editor-document.js";

const POINTER_NODE_RADIUS_PX = 27;
const EDITOR_FIT_PADDING = 120;
const EDITOR_FIT_MAX_ZOOM = 0.9;

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

function isConnectable(location) {
  return location && !["base", "debug"].includes(location.kind);
}

function failureMessage(result) {
  if (result?.errors?.[0]?.message) return result.errors[0].message;
  const messages = {
    "origin-fixed": "Campamento Base permanece fijo en el centro.",
    "ring-mismatch": "Bee rechazó el intercambio: teoría y aplicaciones pertenecen a anillos distintos.",
    "location-outside-safe-margin": "Spider rechazó el destino porque el nodo quedó fuera del margen seguro.",
    "self-connection": "Spider no admite una conexión hacia el mismo nodo.",
    "duplicate-connection": "Esa pareja ya está conectada por un requisito del curso.",
    "tree-two-cycle": "Spider rechazó la conexión porque produciría un ciclo.",
    "project-data-invalid": "El cambio dejaría contenido inaccesible en la progresión.",
  };
  return messages[result?.reason] ?? "La operación no superó la validación del editor.";
}

export class EditorApp {
  constructor({ canvas, model, renderer }) {
    this.canvas = canvas;
    this.model = model;
    this.renderer = renderer;
    this.readOnly = Boolean(model.getSnapshot().readOnly);
    this.listeners = new Set();
    this.activeTool = "spider";
    this.spiderMode = "move";
    this.selectedLocationId = null;
    this.selectedAreaId = null;
    this.hoveredLocationId = null;
    this.hoveredAreaId = null;
    this.gesture = null;
    this.frameRequest = null;
    this.destroyed = false;

    const snapshot = this.model.getSnapshot();
    this.selectedLocationId =
      snapshot.locations.find((location) => location.id === "vector-workshop")?.id ??
      snapshot.locations[0]?.id ??
      null;
    this.selectedAreaId =
      snapshot.areas.find((area) => area.id === "electrostatics")?.id ??
      snapshot.areas.find((area) => area.tier > 0)?.id ??
      null;

    this.camera = new Camera2D({
      x: 0,
      y: 0,
      zoom: APP_CONFIG.defaultZoom,
      bounds: getWorldBounds(
        snapshot.areas,
        WORLD_CONFIG.hexSize,
        WORLD_CONFIG.hexSize * 2,
      ),
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

    window.addEventListener("resize", this.onResize);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerCancel);
    this.canvas.addEventListener("lostpointercapture", this.onLostPointerCapture);
    this.canvas.addEventListener("contextmenu", this.onContextMenu);
    this.unsubscribeModel = this.model.subscribe(() => this.requestRender());
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
    const snapshot = this.model.getSnapshot();
    return {
      activeTool: this.activeTool,
      spiderMode: this.spiderMode,
      selectedLocationId: this.selectedLocationId,
      selectedAreaId: this.selectedAreaId,
      hoveredLocationId: this.hoveredLocationId,
      hoveredAreaId: this.hoveredAreaId,
      gesture: this.gesture?.type ?? null,
      edges: structuredClone(snapshot.treeTwoTopology ?? []),
      readOnly: this.readOnly,
    };
  }

  setActiveTool(tool) {
    if (this.readOnly) return false;
    if (!["spider", "bee"].includes(tool) || tool === this.activeTool) return;
    this.cancelGesture();
    this.activeTool = tool;
    this.#emit("tool-changed");
    this.requestRender();
  }

  setSpiderMode(mode) {
    if (this.readOnly) return false;
    if (!["move", "connect"].includes(mode) || mode === this.spiderMode) return;
    this.cancelGesture();
    this.spiderMode = mode;
    this.#emit("spider-mode-changed");
    this.requestRender();
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

  selectArea(areaId) {
    const exists = this.model.getSnapshot().areas.some((area) => area.id === areaId);
    if (!exists || areaId === this.selectedAreaId) return false;
    this.selectedAreaId = areaId;
    this.#emit("area-selected");
    this.requestRender();
    return true;
  }

  fitWorld({ announce = true } = {}) {
    const snapshot = this.model.getSnapshot();
    const bounds = getWorldBounds(snapshot.areas, WORLD_CONFIG.hexSize, EDITOR_FIT_PADDING);
    const zoom = calculateEditorFitZoom(bounds, this.renderer.width, this.renderer.height);
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
    if (!this.gesture) return false;
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
    this.frameRequest = requestAnimationFrame(() => {
      this.frameRequest = null;
      this.#render();
    });
  }

  #render() {
    const snapshot = this.model.getSnapshot();
    this.renderer.render({
      camera: this.camera,
      areas: snapshot.areas,
      locations: snapshot.locations,
      edges: snapshot.treeTwoTopology ?? [],
      activeTool: this.activeTool,
      selectedLocationId: this.selectedLocationId,
      selectedAreaId: this.selectedAreaId,
      hoveredLocationId: this.hoveredLocationId,
      hoveredAreaId: this.hoveredAreaId,
      dragPreview: this.gesture?.type === "location" ? this.gesture.preview : null,
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
    });
  }

  #scene(snapshot = this.model.getSnapshot()) {
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

  #locationAt(world, scene, { connectableOnly = false } = {}) {
    const radius = POINTER_NODE_RADIUS_PX / this.camera.zoom;
    let nearest = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const location of scene.snapshot.locations) {
      if (connectableOnly && !isConnectable(location)) continue;
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

  #handlePointerDown(event) {
    if (![0, 1].includes(event.button)) return;
    this.canvas.focus({ preventScroll: true });
    const { screen, world } = this.#worldPoint(event);
    const scene = this.#scene();
    const forcePan = this.readOnly || event.button === 1;

    if (!forcePan && this.activeTool === "spider") {
      const location = this.#locationAt(world, scene, {
        connectableOnly: this.spiderMode === "connect",
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
        } else {
          this.gesture = {
            type: "location",
            pointerId: event.pointerId,
            locationId: location.id,
            preview: null,
          };
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
      ? this.#locationAt(world, scene, { connectableOnly: this.spiderMode === "connect" })
      : null;
    const hoveredArea = this.activeTool === "bee" ? this.#areaAt(world, scene.snapshot) : null;
    const hoverChanged =
      hoveredLocation?.id !== this.hoveredLocationId || hoveredArea?.id !== this.hoveredAreaId;
    this.hoveredLocationId = hoveredLocation?.id ?? null;
    this.hoveredAreaId = hoveredArea?.id ?? null;

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
      const source = scene.snapshot.areas.find((area) => area.id === this.gesture.sourceId);
      const target = this.#areaAt(world, scene.snapshot);
      this.gesture.targetId = target?.id ?? null;
      this.gesture.targetValid = Boolean(
        source && target && source.id !== target.id && source.tier === target.tier,
      );
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
    if (gesture.type === "location" && gesture.preview?.valid) {
      result = this.model.moveLocation(gesture.locationId, {
        areaId: gesture.preview.areaId,
        offset: gesture.preview.offset,
      });
      message = "Nodo reubicado por Spider.";
    } else if (gesture.type === "connection" && gesture.targetId) {
      result = this.model.connectLocations(gesture.sourceId, gesture.targetId);
      message = "Prerrequisito dirigido añadido por Spider.";
    } else if (gesture.type === "area" && gesture.targetValid) {
      result = this.model.swapArea(gesture.sourceId, gesture.targetId);
      message = "Zonas intercambiadas dentro del mismo anillo.";
    } else if (gesture.type !== "pan") {
      this.#emit("drop-rejected", {
        message: gesture.type === "area"
          ? "Bee solo acepta otra zona del mismo anillo. No se modificó el borrador."
          : "Destino inválido; no se modificó el borrador.",
        level: "warning",
      });
    }

    if (result?.ok && result.changed) {
      this.#emit("edit-committed", { message, level: "success" });
    } else if (result && !result.ok) {
      this.#emit("edit-rejected", { message: failureMessage(result), level: "error" });
    } else {
      this.#emit("gesture-finished");
    }
    this.requestRender();
  }
}
