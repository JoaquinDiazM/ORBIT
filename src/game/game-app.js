import { APP_CONFIG, DEBUG_DEFAULTS } from "../config.js";
import { LOCATIONS } from "../data/locations.js";
import { AREAS, WORLD_CONFIG } from "../data/world.js";
import { getWorldBounds } from "../core/hex.js";
import {
  createWorldIndex,
  getAreaAtWorldPosition,
  getLocationWorldPosition,
} from "../core/world-graph.js";
import { Camera2D } from "./camera.js";
import { InputController } from "./input-controller.js";
import { CanvasRenderer } from "./renderer.js";

export class GameApp {
  constructor({ canvas, progression, ui, debugInitiallyEnabled = false }) {
    this.canvas = canvas;
    this.progression = progression;
    this.ui = ui;
    this.worldIndex = createWorldIndex(AREAS);
    this.renderer = new CanvasRenderer(canvas);
    this.input = new InputController(canvas);
    this.debugState = {
      ...DEBUG_DEFAULTS,
      enabled: debugInitiallyEnabled,
    };

    const initialPlayer = progression.getSnapshot().state.player;
    this.player = {
      x: initialPlayer.x,
      y: initialPlayer.y,
      heading: -Math.PI / 2,
      velocityX: 0,
      velocityY: 0,
    };
    this.camera = new Camera2D({
      x: this.player.x,
      y: this.player.y,
      bounds: getWorldBounds(AREAS, WORLD_CONFIG.hexSize, 160),
    });
    this.nearestLocation = null;
    this.currentArea = null;
    this.lastTimestamp = null;
    this.lastPositionSave = 0;
    this.lastDebugUpdate = 0;
    this.running = false;
    this.frameRequest = null;

    this.onResize = () => {
      this.renderer.resize();
      this.camera.resize(this.renderer.width, this.renderer.height);
    };
    this.onWheel = (event) => {
      event.preventDefault();
      this.camera.adjustZoom(event.deltaY);
    };
    this.onPointerDown = (event) => this.#handlePointerDown(event);

    window.addEventListener("resize", this.onResize);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.progression.subscribe((event) => {
      if (["reset", "state-imported", "player-teleported"].includes(event.type)) {
        this.syncPlayerFromProgress();
      }
    });

    this.camera.resize(this.renderer.width, this.renderer.height);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.canvas.focus({ preventScroll: true });
    this.frameRequest = requestAnimationFrame((timestamp) => this.#frame(timestamp));
  }

  stop() {
    this.running = false;
    if (this.frameRequest !== null) cancelAnimationFrame(this.frameRequest);
    this.frameRequest = null;
    this.progression.setPlayerPosition(this.player.x, this.player.y);
  }

  destroy() {
    this.stop();
    this.input.destroy();
    window.removeEventListener("resize", this.onResize);
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
  }

  #frame(timestamp) {
    if (!this.running) return;
    if (this.lastTimestamp === null) this.lastTimestamp = timestamp;
    const deltaSeconds = Math.min(0.05, Math.max(0, (timestamp - this.lastTimestamp) / 1000));
    this.lastTimestamp = timestamp;

    this.#handleActions();
    this.#updateMovement(deltaSeconds);

    const snapshot = this.progression.getSnapshot();
    this.currentArea = getAreaAtWorldPosition(
      this.player.x,
      this.player.y,
      WORLD_CONFIG.hexSize,
      this.worldIndex,
    );
    this.nearestLocation = this.#findNearestAccessibleLocation(snapshot);

    if (this.input.consume("interact") && !this.ui.isBlockingModalOpen()) {
      if (this.nearestLocation) this.ui.openLocation(this.nearestLocation);
      else this.ui.toast("Acércate a un lugar disponible para interactuar.", "warning");
    }

    this.camera.follow(this.player.x, this.player.y, deltaSeconds);
    this.ui.updateHUD({ area: this.currentArea, snapshot });
    this.ui.setInteraction(this.ui.isBlockingModalOpen() ? null : this.nearestLocation);

    this.renderer.render({
      camera: this.camera,
      player: this.player,
      snapshot,
      nearestLocation: this.nearestLocation,
      debugState: this.debugState,
      timeSeconds: timestamp / 1000,
    });

    if (timestamp - this.lastPositionSave >= APP_CONFIG.positionSaveIntervalMs) {
      this.progression.setPlayerPosition(this.player.x, this.player.y);
      this.lastPositionSave = timestamp;
    }
    if (timestamp - this.lastDebugUpdate >= 240) {
      this.ui.updateDebugState(this.getDebugSnapshot());
      this.lastDebugUpdate = timestamp;
    }

    this.frameRequest = requestAnimationFrame((nextTimestamp) => this.#frame(nextTimestamp));
  }

  #handleActions() {
    if (this.input.consume("escape")) this.ui.closeTopPanel();
    if (this.input.consume("debug")) {
      this.debugState.enabled = !this.debugState.enabled;
      if (this.debugState.enabled) this.ui.openDebugPanel();
      else this.ui.closePanel("debug-panel");
    }
    if (this.input.consume("knowledge")) this.ui.toggleKnowledgePanel();
    if (this.input.consume("help")) this.ui.toggleHelpPanel();

    if (this.input.consume("gadget") && !this.ui.isBlockingModalOpen()) {
      const result = this.progression.toggleFieldLens();
      this.ui.toast(
        result.ok
          ? `Lente de campo ${result.enabled ? "activado" : "desactivado"}.`
          : "Todavía no has adquirido el Lente de campo.",
        result.ok ? "success" : "warning",
      );
    }

    if (this.input.consume("transport") && !this.ui.isBlockingModalOpen()) {
      const before = this.progression.getActiveTransport();
      const after = this.progression.cycleTransport();
      this.ui.toast(
        before.id === after.id
          ? "Todavía no has adquirido otro transporte."
          : `Transporte seleccionado: ${after.title}.`,
        before.id === after.id ? "warning" : "success",
      );
    }
  }

  #updateMovement(deltaSeconds) {
    if (this.ui.isBlockingModalOpen()) {
      this.player.velocityX = 0;
      this.player.velocityY = 0;
      return;
    }

    const axis = this.input.axis();
    const transport = this.progression.getActiveTransport();
    const speed = APP_CONFIG.baseMoveSpeed * transport.speedMultiplier;
    const velocityX = axis.x * speed;
    const velocityY = axis.y * speed;
    this.player.velocityX = velocityX;
    this.player.velocityY = velocityY;

    if (Math.abs(velocityX) + Math.abs(velocityY) < 0.001) return;
    this.player.heading = Math.atan2(velocityY, velocityX);

    const snapshot = this.progression.getSnapshot();
    const candidate = {
      x: this.player.x + velocityX * deltaSeconds,
      y: this.player.y + velocityY * deltaSeconds,
    };

    if (this.#canOccupy(candidate.x, candidate.y, snapshot)) {
      this.player.x = candidate.x;
      this.player.y = candidate.y;
      return;
    }

    const candidateX = { x: candidate.x, y: this.player.y };
    if (this.#canOccupy(candidateX.x, candidateX.y, snapshot)) this.player.x = candidateX.x;

    const candidateY = { x: this.player.x, y: candidate.y };
    if (this.#canOccupy(candidateY.x, candidateY.y, snapshot)) this.player.y = candidateY.y;
  }

  #canOccupy(x, y, snapshot) {
    const area = getAreaAtWorldPosition(x, y, WORLD_CONFIG.hexSize, this.worldIndex);
    if (!area) return false;
    if (this.debugState.noclip) return true;
    return snapshot.unlockedAreaIds.has(area.id);
  }

  #findNearestAccessibleLocation(snapshot) {
    let nearest = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const location of LOCATIONS) {
      if (!snapshot.accessibleLocationIds.has(location.id)) continue;
      const position = getLocationWorldPosition(location, this.worldIndex, WORLD_CONFIG.hexSize);
      const distance = Math.hypot(this.player.x - position.x, this.player.y - position.y);
      const radius = location.interactionRadius ?? APP_CONFIG.interactionRadius;
      if (distance <= radius && distance < nearestDistance) {
        nearest = location;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  #handlePointerDown(event) {
    this.canvas.focus({ preventScroll: true });
    if (!this.debugState.enabled || !event.shiftKey) return;
    const rectangle = this.canvas.getBoundingClientRect();
    const screenX = event.clientX - rectangle.left;
    const screenY = event.clientY - rectangle.top;
    const world = this.camera.screenToWorld(screenX, screenY);
    const area = getAreaAtWorldPosition(world.x, world.y, WORLD_CONFIG.hexSize, this.worldIndex);
    if (!area) {
      this.ui.toast("El punto seleccionado está fuera de la cartografía definida.", "warning");
      return;
    }
    this.player.x = world.x;
    this.player.y = world.y;
    this.progression.setPlayerPosition(world.x, world.y);
    this.ui.toast(`Teletransporte de depuración: ${area.title}.`, "success");
  }

  getDebugState() {
    return { ...this.debugState };
  }

  setDebugOption(option, value) {
    if (!(option in this.debugState)) return false;
    this.debugState[option] = Boolean(value);
    if (option === "noclip" && !value) {
      const snapshot = this.progression.getSnapshot();
      const area = getAreaAtWorldPosition(
        this.player.x,
        this.player.y,
        WORLD_CONFIG.hexSize,
        this.worldIndex,
      );
      if (!area || !snapshot.unlockedAreaIds.has(area.id)) {
        this.teleportToArea("origin");
        this.ui.toast("Noclip desactivado fuera de una zona abierta; retorno al spawn.", "warning");
      }
    }
    return true;
  }

  teleportToArea(areaId) {
    const position = this.progression.teleportToArea(areaId);
    if (!position) return false;
    this.player.x = position.x;
    this.player.y = position.y;
    this.camera.x = position.x;
    this.camera.y = position.y;
    return true;
  }

  teleportToWorld(x, y) {
    const area = getAreaAtWorldPosition(x, y, WORLD_CONFIG.hexSize, this.worldIndex);
    if (!area) return false;
    this.player.x = x;
    this.player.y = y;
    this.progression.setPlayerPosition(x, y);
    return true;
  }

  syncPlayerFromProgress() {
    const position = this.progression.getSnapshot().state.player;
    this.player.x = position.x;
    this.player.y = position.y;
    this.player.velocityX = 0;
    this.player.velocityY = 0;
    this.camera.x = position.x;
    this.camera.y = position.y;
  }

  completeNearby() {
    const snapshot = this.progression.getSnapshot();
    const candidates = LOCATIONS.filter((location) => {
      const hasProgressionEffect =
        (location.grants?.concepts?.length ?? 0) > 0 ||
        (location.grants?.rewards?.length ?? 0) > 0;
      return (
        hasProgressionEffect &&
        snapshot.accessibleLocationIds.has(location.id) &&
        !snapshot.completedLocationIds.has(location.id)
      );
    })
      .map((location) => ({
        location,
        position: getLocationWorldPosition(location, this.worldIndex, WORLD_CONFIG.hexSize),
      }))
      .map((entry) => ({
        ...entry,
        distance: Math.hypot(this.player.x - entry.position.x, this.player.y - entry.position.y),
      }))
      .sort((a, b) => a.distance - b.distance);

    const candidate = candidates.find((entry) => entry.distance <= 170);
    if (!candidate) return { ok: false, message: "No hay un lugar progresivo incompleto a menos de 170 unidades." };
    const result = this.progression.completeLocation(candidate.location.id, { force: true });
    return {
      ok: result.ok,
      message: result.ok
        ? `Lugar completado por debugger: ${candidate.location.title}.`
        : `No fue posible completar ${candidate.location.title}.`,
    };
  }

  getDebugSnapshot() {
    const snapshot = this.progression.getSnapshot();
    return {
      runtime: {
        debug: { ...this.debugState },
        camera: {
          x: Number(this.camera.x.toFixed(2)),
          y: Number(this.camera.y.toFixed(2)),
          zoom: Number(this.camera.zoom.toFixed(3)),
        },
        player: {
          x: Number(this.player.x.toFixed(2)),
          y: Number(this.player.y.toFixed(2)),
          velocityX: Number(this.player.velocityX.toFixed(2)),
          velocityY: Number(this.player.velocityY.toFixed(2)),
        },
        currentArea: this.currentArea?.id ?? null,
        nearestLocation: this.nearestLocation?.id ?? null,
      },
      progression: {
        profile: snapshot.profile,
        concepts: [...snapshot.concepts],
        unlockedAreas: [...snapshot.unlockedAreaIds],
        completedLocations: [...snapshot.completedLocationIds],
        visibleLocations: [...snapshot.visibleLocationIds],
        rewards: [...snapshot.rewards],
        activeTransport: snapshot.activeTransport.id,
        fieldLensEnabled: snapshot.state.settings.fieldLensEnabled,
      },
    };
  }
}
