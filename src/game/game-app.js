import { APP_CONFIG, DEBUG_DEFAULTS } from "../config.js";
import { WORLD_CONFIG } from "../data/world.js";
import { AXIAL_DIRECTIONS, getWorldBounds } from "../core/hex.js";
import {
  canonicalToDisplay,
  createDirectLayout,
  createDirectNavigationIndex,
  displayToCanonical,
} from "../core/direct-navigation.js";
import { getProfileCapabilities } from "../core/profile-policy.js";
import { StoragePersistenceError } from "../core/storage.js";
import {
  createWorldIndex,
  getAreaAtWorldPosition,
  getAreaCenter,
  getLocationWorldPosition,
} from "../core/world-graph.js";
import { Camera2D } from "./camera.js";
import { InputController } from "./input-controller.js";
import { CanvasRenderer } from "./renderer.js";

export const LOCATION_INTERACTION_AUDIO_KEY = "mission_start";
export const TELEPORT_AUDIO_KEY = "teleport";

const POINTER_CLICK_TOLERANCE_PX = 6;
const TELEPORT_DIRECTION_VECTORS = Object.freeze({
  left: Object.freeze({ x: -1, y: 0 }),
  right: Object.freeze({ x: 1, y: 0 }),
  up: Object.freeze({ x: 0, y: -1 }),
  down: Object.freeze({ x: 0, y: 1 }),
});

function compareNumbers(first, second, tolerance = 1e-9) {
  return Math.abs(first - second) <= tolerance ? 0 : first - second;
}

export function hasExclusivePointerModifier(event, modifier) {
  return Boolean(
    event?.[`${modifier}Key`]
    && (modifier === "ctrl" || !event?.ctrlKey)
    && (modifier === "alt" || !event?.altKey)
    && (modifier === "meta" || !event?.metaKey)
    && (modifier === "shift" || !event?.shiftKey),
  );
}

export function isPrimaryPointerButton(event) {
  return Boolean(
    event
    && event.button === 0
    && event.isPrimary !== false
    && Number.isFinite(event.clientX)
    && Number.isFinite(event.clientY),
  );
}

export function findDirectionalTeleportArea({
  areas,
  unlockedAreaIds,
  originArea,
  direction,
  hexSize = WORLD_CONFIG.hexSize,
}) {
  const vector = TELEPORT_DIRECTION_VECTORS[direction];
  if (!vector || !originArea || !Array.isArray(areas) || !(unlockedAreaIds instanceof Set)) {
    return null;
  }

  const origin = getAreaCenter(originArea, hexSize);
  const candidates = areas
    .filter((area) => area.id !== originArea.id && unlockedAreaIds.has(area.id))
    .map((area) => {
      const center = getAreaCenter(area, hexSize);
      const deltaX = center.x - origin.x;
      const deltaY = center.y - origin.y;
      const projection = deltaX * vector.x + deltaY * vector.y;
      const distance = Math.hypot(deltaX, deltaY);
      const lateral = Math.abs(deltaX * vector.y - deltaY * vector.x);
      return { area, projection, distance, angularError: lateral / distance };
    })
    .filter(({ projection, distance }) => projection > 1e-9 && distance > 1e-9)
    .sort((first, second) =>
      compareNumbers(first.distance, second.distance)
      || compareNumbers(first.angularError, second.angularError)
      || (first.area.order ?? Number.MAX_SAFE_INTEGER)
        - (second.area.order ?? Number.MAX_SAFE_INTEGER)
      || first.area.id.localeCompare(second.area.id));

  return candidates[0]?.area ?? null;
}

export function reduceLatestTreeTwoUnlock(current, event) {
  if (["reset", "state-imported"].includes(event?.type)) {
    return {
      newlyAccessibleLocationIds: new Set(),
      unlockSourceLocationId: null,
    };
  }
  if (event?.type !== "location-completed") return current;

  const newlyAccessibleLocationIds = new Set(
    event.detail?.newlyAccessibleLocationIds ?? [],
  );
  if (newlyAccessibleLocationIds.size === 0) return current;
  return {
    newlyAccessibleLocationIds,
    unlockSourceLocationId: event.detail.locationId ?? null,
  };
}

export function openLocationWithInteractionCue(location, audio, ui) {
  const completionWillHandleCue = Boolean(ui.willAutoCompleteLocation?.(location));
  const playInteractionCue = () => {
    if (typeof audio?.playInteractionCue === "function") {
      void audio.playInteractionCue({ specificAssetKey: LOCATION_INTERACTION_AUDIO_KEY });
    } else {
      void audio?.play?.(LOCATION_INTERACTION_AUDIO_KEY);
    }
  };

  if (!completionWillHandleCue) playInteractionCue();
  const result = ui.openLocation(location);
  if (completionWillHandleCue && !result?.completionCueHandled) playInteractionCue();
  return result;
}

export class GameApp {
  constructor({
    canvas,
    progression,
    ui,
    audio,
    areas = progression?.areas,
    locations = progression?.locations,
    getPersonalAreaAppearance = null,
    debugInitiallyEnabled = false,
  }) {
    if (!Array.isArray(areas) || !Array.isArray(locations)) {
      throw new TypeError("GameApp requiere la cartografía materializada del curso.");
    }
    this.canvas = canvas;
    this.progression = progression;
    this.ui = ui;
    this.audio = audio;
    this.areas = areas;
    this.locations = locations;
    this.profileCapabilities = getProfileCapabilities(progression.profile);
    this.worldIndex = createWorldIndex(this.areas);
    this.directNavigationIndex = createDirectNavigationIndex({ areas, locations });
    this.navigationMode = "global";
    this.navigationLayout = null;
    this.navigationHistory = [];
    this.renderer = new CanvasRenderer(canvas, {
      areas: this.areas,
      locations: this.locations,
      getPersonalAreaAppearance,
    });
    this.input = new InputController(canvas);
    this.debugState = this.profileCapabilities.canUseDebugger
      ? { ...DEBUG_DEFAULTS, enabled: debugInitiallyEnabled }
      : {
          enabled: false,
          noclip: false,
          showIds: false,
          showGraph: false,
          showCoords: false,
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
      bounds: getWorldBounds(this.areas, WORLD_CONFIG.hexSize, WORLD_CONFIG.hexSize * 2),
    });
    this.nearestLocation = null;
    this.currentArea = null;
    this.lastAreaSoundAt = 0;
    this.lastTimestamp = null;
    this.lastPositionSave = 0;
    this.lastDebugUpdate = 0;
    this.teleportPointerGesture = null;
    this.newlyAccessibleLocationIds = new Set();
    this.unlockSourceLocationId = null;
    this.running = false;
    this.frameRequest = null;
    this.motionQuery = typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
    this.reducedMotion = Boolean(this.motionQuery?.matches);
    this.onMotionPreferenceChanged = (event) => {
      this.reducedMotion = Boolean(event.matches);
    };

    this.onResize = () => {
      this.renderer.resize();
      this.camera.resize(this.renderer.width, this.renderer.height);
    };
    this.onWheel = (event) => {
      event.preventDefault();
      this.camera.adjustZoom(event.deltaY);
    };
    this.onPointerDown = (event) => this.#handlePointerDown(event);
    this.onPointerMove = (event) => this.#handlePointerMove(event);
    this.onPointerUp = (event) => this.#handlePointerUp(event);
    this.onPointerCancel = (event) => this.#cancelPointerTeleport(event);

    window.addEventListener("resize", this.onResize);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerCancel);
    this.canvas.addEventListener("lostpointercapture", this.onPointerCancel);
    this.unsubscribeProgression = this.progression.subscribe((event) => {
      if (["reset", "state-imported"].includes(event.type)) {
        this.navigationHistory = [];
      }
      if (["reset", "state-imported", "player-teleported"].includes(event.type)) {
        this.syncPlayerFromProgress();
      }
      if (event.type === "navigation-mode-changed") {
        // A settings save may precede the next periodic movement save. Never
        // replace the live canonical position with that older saved position.
        const saved = this.progression.getSnapshot().state.player;
        if (saved.x !== this.player.x || saved.y !== this.player.y) {
          this.#persistPlayerPosition(this.player.x, this.player.y);
        }
        this.#refreshNavigationLayout({ force: true });
      }
      const latestUnlock = reduceLatestTreeTwoUnlock(
        {
          newlyAccessibleLocationIds: this.newlyAccessibleLocationIds,
          unlockSourceLocationId: this.unlockSourceLocationId,
        },
        event,
      );
      this.newlyAccessibleLocationIds = latestUnlock.newlyAccessibleLocationIds;
      this.unlockSourceLocationId = latestUnlock.unlockSourceLocationId;
    });
    this.motionQuery?.addEventListener?.("change", this.onMotionPreferenceChanged);

    this.#refreshNavigationLayout({ force: true, snapCamera: true });
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
    this.#persistPlayerPosition(this.player.x, this.player.y);
  }

  destroy() {
    try {
      this.stop();
    } finally {
      for (const cleanup of [
        () => {
          if (this.teleportPointerGesture) {
            this.#releasePointerTeleport(this.teleportPointerGesture.pointerId);
          }
        },
        () => this.input.destroy(),
        () => this.unsubscribeProgression?.(),
        () => this.motionQuery?.removeEventListener?.("change", this.onMotionPreferenceChanged),
        () => window.removeEventListener("resize", this.onResize),
        () => this.canvas.removeEventListener("wheel", this.onWheel),
        () => this.canvas.removeEventListener("pointerdown", this.onPointerDown),
        () => this.canvas.removeEventListener("pointermove", this.onPointerMove),
        () => this.canvas.removeEventListener("pointerup", this.onPointerUp),
        () => this.canvas.removeEventListener("pointercancel", this.onPointerCancel),
        () => this.canvas.removeEventListener("lostpointercapture", this.onPointerCancel),
      ]) {
        try {
          cleanup();
        } catch (error) {
          console.error("No fue posible liberar un recurso del mapa.", error);
        }
      }
    }
  }

  #playerArea(position = this.player) {
    return getAreaAtWorldPosition(
      position.x, position.y, WORLD_CONFIG.hexSize, this.worldIndex,
    );
  }

  #displayPlayerPosition() {
    if (!this.navigationLayout) return { x: this.player.x, y: this.player.y };
    return canonicalToDisplay(this.navigationLayout, {
      areaId: this.#playerArea()?.id,
      x: this.player.x,
      y: this.player.y,
    }) ?? { x: this.player.x, y: this.player.y };
  }

  #displayWorldIndex() {
    return this.navigationLayout?.worldIndex ?? this.worldIndex;
  }

  #setNavigationLayout(layout, { snapCamera = false } = {}) {
    const previousDisplay = this.#displayPlayerPosition();
    this.navigationLayout = layout;
    this.navigationMode = layout ? "direct" : "global";
    this.renderer.setNavigationLayout(layout);
    const areas = layout?.areas ?? this.areas;
    this.camera.bounds = getWorldBounds(areas, WORLD_CONFIG.hexSize, WORLD_CONFIG.hexSize * 2);
    this.camera.focusBounds = layout ? getWorldBounds(areas, WORLD_CONFIG.hexSize) : undefined;
    const display = this.#displayPlayerPosition();
    this.camera.x = snapCamera ? display.x : this.camera.x + display.x - previousDisplay.x;
    this.camera.y = snapCamera ? display.y : this.camera.y + display.y - previousDisplay.y;
  }

  #refreshNavigationLayout({ entry = null, force = false, snapCamera = false } = {}) {
    const snapshot = this.progression.getSnapshot();
    const mode = snapshot.state.settings?.navigationMode ?? "global";
    const area = this.#playerArea();
    if (!force && mode === this.navigationMode
      && (mode !== "direct" || this.navigationLayout?.centerAreaId === area?.id)) return;
    let layout = null;
    if (mode === "direct" && area) {
      try {
        layout = createDirectLayout({
          index: this.directNavigationIndex,
          centerAreaId: area.id,
          courseRevision: this.progression.courseRevision ?? snapshot.state.courseRevision ?? "",
          hexSize: WORLD_CONFIG.hexSize,
          entry,
        });
      } catch (error) {
        if (!(error instanceof RangeError)) throw error;
        this.ui.toast("Esta cartografía requiere navegación Global: hay más de seis zonas relacionadas.", "warning");
      }
    }
    this.#setNavigationLayout(layout, { snapCamera });
  }

  #navigationEntry(fromAreaId, toAreaId, layout) {
    if (!layout) return null;
    const from = layout.worldIndex.byId.get(fromAreaId);
    const to = layout.worldIndex.byId.get(toAreaId);
    if (!from || !to) return null;
    const direction = AXIAL_DIRECTIONS.findIndex(({ q, r }) =>
      to.q - from.q === q && to.r - from.r === r);
    return direction < 0 ? null : { fromAreaId, direction };
  }

  #rememberDeparture(position, destinationAreaId, layout = this.navigationLayout) {
    const areaId = this.#playerArea(position)?.id;
    if (!layout || !areaId || areaId === destinationAreaId) return;
    if (this.navigationHistory.at(-1)?.areaId === destinationAreaId) {
      this.navigationHistory.pop();
    } else {
      this.navigationHistory.push({ areaId, position: { x: position.x, y: position.y }, layout });
      if (this.navigationHistory.length > 128) this.navigationHistory.shift();
    }
  }

  canReturnToPreviousArea() {
    if (this.navigationMode !== "direct") return false;
    const previous = this.navigationHistory.at(-1);
    return Boolean(previous && (this.debugState.noclip
      || this.progression.getSnapshot().unlockedAreaIds.has(previous.areaId)));
  }

  returnToPreviousArea() {
    if (!this.canReturnToPreviousArea() || this.ui.isBlockingModalOpen()) return false;
    const previous = this.navigationHistory.at(-1);
    if (!this.#persistPlayerPosition(previous.position.x, previous.position.y)) return false;
    this.navigationHistory.pop();
    Object.assign(this.player, previous.position, { velocityX: 0, velocityY: 0 });
    this.currentArea = this.worldIndex.byId.get(previous.areaId);
    this.#setNavigationLayout(previous.layout, { snapCamera: true });
    void this.audio?.play?.(TELEPORT_AUDIO_KEY);
    this.ui.toast(`Regreso: ${this.currentArea.title}.`, "success");
    return true;
  }

  #frame(timestamp) {
    if (!this.running) return;
    if (this.lastTimestamp === null) this.lastTimestamp = timestamp;
    const deltaSeconds = Math.min(0.05, Math.max(0, (timestamp - this.lastTimestamp) / 1000));
    this.lastTimestamp = timestamp;

    this.#handleActions();
    this.#updateMovement(deltaSeconds);

    const snapshot = this.progression.getSnapshot();
    const previousAreaId = this.currentArea?.id ?? null;
    this.currentArea = getAreaAtWorldPosition(
      this.player.x,
      this.player.y,
      WORLD_CONFIG.hexSize,
      this.worldIndex,
    );
    if (
      previousAreaId &&
      this.currentArea?.id &&
      previousAreaId !== this.currentArea.id &&
      timestamp - this.lastAreaSoundAt > 500
    ) {
      void this.audio?.play("hexagon_transition");
      this.lastAreaSoundAt = timestamp;
    }
    this.nearestLocation = this.#findNearestAccessibleLocation(snapshot);

    if (this.input.consume("interact") && !this.ui.isBlockingModalOpen()) {
      if (this.nearestLocation) {
        openLocationWithInteractionCue(this.nearestLocation, this.audio, this.ui);
      } else {
        this.ui.toast("Acércate a un lugar disponible para interactuar.", "warning");
      }
    }

    const displayPlayer = this.#displayPlayerPosition();
    this.camera.follow(displayPlayer.x, displayPlayer.y, deltaSeconds);
    this.ui.updateHUD({
      area: this.currentArea,
      snapshot,
      navigationMode: this.navigationMode,
      canReturnToPreviousArea: this.canReturnToPreviousArea(),
    });
    this.ui.setInteraction(this.ui.isBlockingModalOpen() ? null : this.nearestLocation);

    this.renderer.render({
      camera: this.camera,
      player: { ...this.player, ...displayPlayer },
      snapshot,
      nearestLocation: this.nearestLocation,
      debugState: this.debugState,
      timeSeconds: this.reducedMotion ? 0 : timestamp / 1000,
      reducedMotion: this.reducedMotion,
      newlyAccessibleLocationIds: this.newlyAccessibleLocationIds,
      unlockSourceLocationId: this.unlockSourceLocationId,
    });

    if (timestamp - this.lastPositionSave >= APP_CONFIG.positionSaveIntervalMs) {
      this.#persistPlayerPosition(this.player.x, this.player.y);
      this.lastPositionSave = timestamp;
    }
    if (this.profileCapabilities.canUseDebugger && timestamp - this.lastDebugUpdate >= 240) {
      this.ui.updateDebugState(this.getDebugSnapshot());
      this.lastDebugUpdate = timestamp;
    }

    this.frameRequest = requestAnimationFrame((nextTimestamp) => this.#frame(nextTimestamp));
  }

  #handleActions() {
    if (this.input.consume("escape")) this.ui.closeTopPanel();
    const teleportDirection = this.input.consumeDirectionalTeleport();
    if (teleportDirection && !this.ui.isBlockingModalOpen()) {
      this.#teleportInDirection(teleportDirection);
    }
    if (this.input.consume("debug")) {
      if (!this.profileCapabilities.canUseDebugger) {
        this.ui.toast("El debugger solo está disponible en el perfil debug.", "warning");
      } else {
        this.debugState.enabled = !this.debugState.enabled;
        if (this.debugState.enabled) this.ui.openDebugPanel();
        else this.ui.closePanel("debug-panel");
        void this.audio?.playInteractionCue?.();
      }
    }
    if (this.input.consume("knowledge")) {
      this.ui.toggleKnowledgePanel();
      void this.audio?.playInteractionCue?.();
    }
    if (this.input.consume("transport") && !this.ui.isBlockingModalOpen()) {
      const before = this.progression.getActiveTransport();
      let after;
      try {
        after = this.progression.cycleTransport();
      } catch (error) {
        if (!this.#reportPersistenceError(error)) throw error;
        return;
      }
      this.ui.toast(
        before.id === after.id
          ? "Todavía no has adquirido otro transporte."
          : `Transporte seleccionado: ${after.title}.`,
        before.id === after.id ? "warning" : "success",
      );
      if (before.id !== after.id) void this.audio?.playInteractionCue?.();
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
    const previous = { x: this.player.x, y: this.player.y };
    const previousAreaId = this.#playerArea()?.id;
    const previousLayout = this.navigationLayout;
    const display = this.#displayPlayerPosition();
    const candidate = {
      x: display.x + velocityX * deltaSeconds,
      y: display.y + velocityY * deltaSeconds,
    };

    let next = display;
    if (this.#canOccupy(candidate.x, candidate.y, snapshot)) {
      next = candidate;
    } else {
      const candidateX = { x: candidate.x, y: display.y };
      if (this.#canOccupy(candidateX.x, candidateX.y, snapshot)) next = candidateX;
      const candidateY = { x: next.x, y: candidate.y };
      if (this.#canOccupy(candidateY.x, candidateY.y, snapshot)) next = candidateY;
    }
    const canonical = previousLayout ? displayToCanonical(previousLayout, next) : next;
    if (!canonical) return;
    this.player.x = canonical.x;
    this.player.y = canonical.y;
    const destinationAreaId = this.#playerArea()?.id;
    if (destinationAreaId !== previousAreaId) {
      this.#rememberDeparture(previous, destinationAreaId, previousLayout);
      this.#refreshNavigationLayout({
        entry: this.#navigationEntry(previousAreaId, destinationAreaId, previousLayout),
      });
    }
  }

  #canOccupy(x, y, snapshot) {
    const area = getAreaAtWorldPosition(x, y, WORLD_CONFIG.hexSize, this.#displayWorldIndex());
    if (!area) return false;
    if (this.debugState.noclip) return true;
    return snapshot.unlockedAreaIds.has(area.id);
  }

  #findNearestAccessibleLocation(snapshot) {
    let nearest = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    const player = this.#displayPlayerPosition();
    const worldIndex = this.#displayWorldIndex();

    for (const location of this.locations) {
      if (!snapshot.accessibleLocationIds.has(location.id)) continue;
      if (!worldIndex.byId.has(location.areaId)) continue;
      const position = getLocationWorldPosition(location, worldIndex, WORLD_CONFIG.hexSize);
      const distance = Math.hypot(player.x - position.x, player.y - position.y);
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
    if (
      event.target === this.canvas
      && isPrimaryPointerButton(event)
      && hasExclusivePointerModifier(event, "ctrl")
      && !this.ui.isBlockingModalOpen()
    ) {
      event.preventDefault?.();
      this.teleportPointerGesture = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        dragged: false,
      };
      try {
        this.canvas.setPointerCapture?.(event.pointerId);
      } catch {
        // Pointer capture is an enhancement; the click remains valid on the canvas without it.
      }
      return;
    }
    if (
      !this.debugState.enabled
      || !isPrimaryPointerButton(event)
      || !hasExclusivePointerModifier(event, "shift")
    ) return;
    const world = this.#worldPointFromPointerEvent(event);
    const canonical = this.navigationLayout ? displayToCanonical(this.navigationLayout, world) : world;
    const area = canonical && this.#playerArea(canonical);
    if (!area) {
      this.ui.toast("El punto seleccionado está fuera de la cartografía definida.", "warning");
      return;
    }
    if (!this.teleportToWorld(canonical.x, canonical.y)) return;
    this.ui.toast(`Teletransporte de depuración: ${area.title}.`, "success");
  }

  #handlePointerMove(event) {
    const gesture = this.teleportPointerGesture;
    if (!gesture || gesture.pointerId !== event.pointerId || gesture.dragged) return;
    if (
      Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY)
      > POINTER_CLICK_TOLERANCE_PX
    ) {
      gesture.dragged = true;
    }
  }

  #handlePointerUp(event) {
    const gesture = this.teleportPointerGesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    this.#releasePointerTeleport(event.pointerId);
    if (
      gesture.dragged
      || Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY)
        > POINTER_CLICK_TOLERANCE_PX
      || !isPrimaryPointerButton(event)
      || !hasExclusivePointerModifier(event, "ctrl")
      || this.ui.isBlockingModalOpen()
    ) return;

    event.preventDefault?.();
    const area = this.#areaFromPointerEvent(event);
    if (!area) {
      this.ui.toast("El punto seleccionado está fuera de la cartografía definida.", "warning");
      return;
    }
    this.#teleportToUnlockedArea(area);
  }

  #cancelPointerTeleport(event) {
    const gesture = this.teleportPointerGesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    this.#releasePointerTeleport(event.pointerId);
  }

  #releasePointerTeleport(pointerId) {
    this.teleportPointerGesture = null;
    try {
      if (this.canvas.hasPointerCapture?.(pointerId)) {
        this.canvas.releasePointerCapture(pointerId);
      }
    } catch {
      // A browser may release capture before dispatching cancellation.
    }
  }

  #areaFromPointerEvent(event) {
    const world = this.#worldPointFromPointerEvent(event);
    return getAreaAtWorldPosition(world.x, world.y, WORLD_CONFIG.hexSize, this.#displayWorldIndex());
  }

  #worldPointFromPointerEvent(event) {
    const rectangle = this.canvas.getBoundingClientRect();
    const scaleX = rectangle.width > 0 ? this.renderer.width / rectangle.width : 1;
    const scaleY = rectangle.height > 0 ? this.renderer.height / rectangle.height : 1;
    const screenX = (event.clientX - rectangle.left) * scaleX;
    const screenY = (event.clientY - rectangle.top) * scaleY;
    return this.camera.screenToWorld(screenX, screenY);
  }

  #teleportInDirection(direction) {
    const snapshot = this.progression.getSnapshot();
    const originArea = this.#displayWorldIndex().byId.get(this.#playerArea()?.id);
    const destination = findDirectionalTeleportArea({
      areas: this.navigationLayout?.areas ?? this.areas,
      unlockedAreaIds: snapshot.unlockedAreaIds,
      originArea,
      direction,
    });
    if (!destination) {
      this.ui.toast("No hay otra zona abierta en esa dirección.", "warning");
      return false;
    }
    return this.#teleportToUnlockedArea(destination);
  }

  #teleportToUnlockedArea(area) {
    const snapshot = this.progression.getSnapshot();
    if (!snapshot.unlockedAreaIds.has(area.id)) {
      this.ui.toast(`La zona ${area.title} todavía está bloqueada.`, "warning");
      return false;
    }
    if (!this.teleportToArea(area.id, { suppressAreaTransitionCue: true })) return false;
    void this.audio?.play?.(TELEPORT_AUDIO_KEY);
    this.ui.toast(`Teletransporte: ${area.title}.`, "success");
    return true;
  }

  getDebugState() {
    return { ...this.debugState };
  }

  setDebugOption(option, value) {
    if (!this.profileCapabilities.canUseDebugger) return false;
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

  teleportToArea(areaId, { suppressAreaTransitionCue = false } = {}) {
    const snapshot = this.progression.getSnapshot();
    const area = this.worldIndex.byId.get(areaId);
    if (!area) return false;
    if (!this.debugState.noclip && !snapshot.unlockedAreaIds.has(areaId)) {
      this.ui.toast(`La zona ${area.title} todavía está bloqueada.`, "warning");
      return false;
    }
    const previous = { x: this.player.x, y: this.player.y };
    const previousLayout = this.navigationLayout;
    const previousAreaId = this.#playerArea()?.id;
    let position;
    try {
      position = this.progression.teleportToArea(areaId);
    } catch (error) {
      if (!this.#reportPersistenceError(error)) throw error;
      return false;
    }
    if (!position) return false;
    this.player.x = position.x;
    this.player.y = position.y;
    this.player.velocityX = 0;
    this.player.velocityY = 0;
    this.#rememberDeparture(previous, areaId, previousLayout);
    this.#refreshNavigationLayout({
      entry: this.#navigationEntry(previousAreaId, areaId, previousLayout),
      force: true,
      snapCamera: true,
    });
    if (suppressAreaTransitionCue) {
      this.currentArea = this.worldIndex.byId.get(areaId) ?? this.currentArea;
    }
    return true;
  }

  teleportToWorld(x, y) {
    const area = getAreaAtWorldPosition(x, y, WORLD_CONFIG.hexSize, this.worldIndex);
    if (!area) return false;
    if (!this.debugState.noclip && !this.progression.getSnapshot().unlockedAreaIds.has(area.id)) {
      this.ui.toast(`La zona ${area.title} todavía está bloqueada.`, "warning");
      return false;
    }
    const previous = { x: this.player.x, y: this.player.y };
    const previousAreaId = this.#playerArea()?.id;
    const previousLayout = this.navigationLayout;
    if (!this.#persistPlayerPosition(x, y)) return false;
    this.player.x = x;
    this.player.y = y;
    this.player.velocityX = 0;
    this.player.velocityY = 0;
    this.#rememberDeparture(previous, area.id, previousLayout);
    this.#refreshNavigationLayout({
      entry: this.#navigationEntry(previousAreaId, area.id, previousLayout),
      force: true,
      snapCamera: true,
    });
    return true;
  }

  syncPlayerFromProgress() {
    const position = this.progression.getSnapshot().state.player;
    this.player.x = position.x;
    this.player.y = position.y;
    this.player.velocityX = 0;
    this.player.velocityY = 0;
    this.#refreshNavigationLayout({ force: true, snapCamera: true });
  }

  completeNearby() {
    const snapshot = this.progression.getSnapshot();
    const worldIndex = this.#displayWorldIndex();
    const player = this.#displayPlayerPosition();
    const candidates = this.locations.filter((location) => {
      const hasProgressionEffect =
        (location.grants?.concepts?.length ?? 0) > 0 ||
        (location.grants?.rewards?.length ?? 0) > 0;
      return (
        hasProgressionEffect &&
        worldIndex.byId.has(location.areaId) &&
        snapshot.accessibleLocationIds.has(location.id) &&
        !snapshot.completedLocationIds.has(location.id)
      );
    })
      .map((location) => ({
        location,
        position: getLocationWorldPosition(location, worldIndex, WORLD_CONFIG.hexSize),
      }))
      .map((entry) => ({
        ...entry,
        distance: Math.hypot(player.x - entry.position.x, player.y - entry.position.y),
      }))
      .sort((a, b) => a.distance - b.distance);

    const candidate = candidates.find((entry) => entry.distance <= 170);
    if (!candidate) return { ok: false, message: "No hay un lugar progresivo incompleto a menos de 170 unidades." };
    let result;
    try {
      result = this.progression.completeLocation(candidate.location.id, { force: true });
    } catch (error) {
      if (!this.#reportPersistenceError(error)) throw error;
      return {
        ok: false,
        reason: "storage-write-failed",
        message: "No fue posible guardar el progreso; el lugar no se completó.",
      };
    }
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
        navigationMode: this.navigationMode,
        navigationCenterArea: this.navigationLayout?.centerAreaId ?? null,
        canReturnToPreviousArea: this.canReturnToPreviousArea(),
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
        ambienceVolume: snapshot.state.settings.ambienceVolume,
        effectsVolume: snapshot.state.settings.effectsVolume,
        treeTwoVisualizationMode: snapshot.state.settings.treeTwoVisualizationMode,
      },
    };
  }

  #persistPlayerPosition(x, y) {
    try {
      this.progression.setPlayerPosition(x, y);
      return true;
    } catch (error) {
      if (!this.#reportPersistenceError(error)) throw error;
      return false;
    }
  }

  #reportPersistenceError(error) {
    if (!(error instanceof StoragePersistenceError)) return false;
    this.ui.reportPersistenceError?.(error);
    return true;
  }
}
