import { WORLD_CONFIG } from "../data/world.js";
import { drawAreaAppearanceCanvas } from "../core/area-appearance-canvas.js";
import {
  DEFAULT_AREA_APPEARANCE,
  getAreaAppearanceAnimationTime,
  resolveAreaAppearance,
  sanitizeAreaAppearance,
} from "../core/area-appearance.js";
import { axialToPixel, hexCorners, hexEdge } from "../core/hex.js";
import { deriveKnowledgeGraphEdges, isLearningLocation } from "../core/knowledge-graph.js";
import {
  createWorldIndex,
  getLocationWorldPosition,
  getNeighborArea,
} from "../core/world-graph.js";
import { createLearningEdgeCurve, drawLearningEdge, pointOnLearningEdge } from "./learning-edge-visuals.js";
import { TransportVisuals } from "./transport-visuals.js";

const TREE_TWO_EDGE_YELLOW = Object.freeze({
  bright: "rgba(255, 209, 102, 0.96)",
  muted: "rgba(255, 209, 102, 0.42)",
});

/**
 * Keeps the two learning-network states on one hue. Stroke, opacity and glow carry the
 * redundant state signal required when color perception is limited.
 */
export function getTreeTwoEdgeVisualStyle(
  appearance,
  { isNew = false, zoom = 1 } = {},
) {
  const safeZoom = Math.max(0.01, Number.isFinite(zoom) ? zoom : 1);
  const lineScale = 1 / safeZoom;
  if (appearance === "muted") {
    return {
      color: TREE_TWO_EDGE_YELLOW.muted,
      lineWidth: 1.5 * lineScale,
      lineDash: [10 * lineScale, 7 * lineScale],
      shadowColor: "rgba(255, 209, 102, 0)",
      shadowBlur: 0,
    };
  }
  return {
    color: TREE_TWO_EDGE_YELLOW.bright,
    lineWidth: 3.4 * lineScale,
    lineDash: [],
    shadowColor: isNew
      ? "rgba(255, 209, 102, 0.9)"
      : "rgba(255, 209, 102, 0.58)",
    shadowBlur: (isNew ? 8 : 4) * lineScale,
  };
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function withAlpha(hexColor, alpha) {
  const normalized = hexColor.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => character + character)
          .join("")
      : normalized;
  const value = Number.parseInt(expanded, 16);
  if (!Number.isFinite(value)) return `rgba(120, 227, 255, ${alpha})`;
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function polygonPath(context, points) {
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index].x, points[index].y);
  }
  context.closePath();
}

function drawMapLabel(context, text, x, y, lineScale) {
  context.strokeStyle = "rgba(6, 15, 23, 0.93)";
  context.lineWidth = 3 * lineScale;
  context.lineJoin = "round";
  context.strokeText(text, x, y);
  context.fillText(text, x, y);
}

function drawRoundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

const LOCKED_AREA_APPEARANCE = Object.freeze({
  paletteId: "locked",
  motifId: "none",
  contourId: "locked",
  color: "#111d2a",
  accent: "#8294a3",
});

/**
 * Resolve the runtime precedence without leaking a student's personal
 * Bowerbird choice into a locked area.
 */
export function resolveRuntimeAreaAppearance(
  area,
  { personalAppearance = null, unlocked = true } = {},
) {
  if (!unlocked) return { ...LOCKED_AREA_APPEARANCE };
  const personal = personalAppearance === null || personalAppearance === undefined
    ? null
    : sanitizeAreaAppearance(personalAppearance);
  const published = sanitizeAreaAppearance(area?.appearance ?? DEFAULT_AREA_APPEARANCE);
  const candidate = personal?.ok
    ? personal.appearance
    : published.ok
      ? published.appearance
      : DEFAULT_AREA_APPEARANCE;
  return resolveAreaAppearance(area, candidate);
}

// World coordinates grow right/down; upper-left light therefore casts toward +x/+y.
const SHADOW_DIRECTION_COMPONENT = Math.SQRT1_2;
const PLAYER_SHADOW_PROFILES = Object.freeze({
  walk: Object.freeze({
    radiusX: 19,
    radiusY: 8,
    minOffset: 5,
    maxOffset: 18,
  }),
  "electric-cart": Object.freeze({
    radiusX: 22,
    radiusY: 10,
    minOffset: 5,
    maxOffset: 19,
  }),
  "radio-skiff": Object.freeze({
    radiusX: 28,
    radiusY: 10,
    minOffset: 5,
    maxOffset: 20,
  }),
});

export function getPlayerShadowGeometry(heading, transportId = "walk") {
  const safeHeading = Number.isFinite(heading) ? heading : 0;
  const profile = PLAYER_SHADOW_PROFILES[transportId] ?? PLAYER_SHADOW_PROFILES.walk;
  const headingX = Math.cos(safeHeading);
  const headingY = Math.sin(safeHeading);
  const awayAlignment = Math.max(
    0,
    Math.min(1, (headingX + headingY) * SHADOW_DIRECTION_COMPONENT),
  );
  const squaredAwayAlignment = awayAlignment * awayAlignment;
  const awayShortening = squaredAwayAlignment * squaredAwayAlignment;
  const offsetDistance =
    profile.maxOffset - (profile.maxOffset - profile.minOffset) * awayShortening;

  return {
    offsetX: offsetDistance * SHADOW_DIRECTION_COMPONENT,
    offsetY: offsetDistance * SHADOW_DIRECTION_COMPONENT,
    radiusX: profile.radiusX,
    radiusY: profile.radiusY,
    rotation: safeHeading,
  };
}

export class CanvasRenderer {
  #learningCurves = new Map();
  #transportVisuals = new TransportVisuals();
  #invitationStarts = new Map();
  #invitationLayouts = new Map();

  constructor(canvas, {
    areas,
    locations,
    getPersonalAreaAppearance = null,
  } = {}) {
    if (!Array.isArray(areas) || !Array.isArray(locations)) {
      throw new TypeError("CanvasRenderer requiere la cartografía materializada del curso.");
    }
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { alpha: false });
    if (!this.context) throw new Error("Canvas 2D no está disponible en este navegador.");

    this.areas = areas;
    this.locations = locations;
    this.canonicalAreas = areas;
    this.canonicalLocations = locations;
    this.getPersonalAreaAppearance = typeof getPersonalAreaAppearance === "function"
      ? getPersonalAreaAppearance
      : () => null;
    this.width = 0;
    this.height = 0;
    this.pixelRatio = 1;
    this.worldIndex = createWorldIndex(this.areas);
    this.canonicalWorldIndex = this.worldIndex;
    this.navigationMode = "global";
    this.locationById = new Map(this.locations.map((location) => [location.id, location]));
    this.stars = this.#createStars(WORLD_CONFIG.backgroundStars);
    this.resize();
  }

  setNavigationLayout(layout) {
    this.navigationMode = layout ? "direct" : "global";
    this.areas = layout?.areas ?? this.canonicalAreas;
    this.worldIndex = layout?.worldIndex ?? this.canonicalWorldIndex;
    this.locations = layout
      ? this.canonicalLocations.filter((location) => layout.visibleAreaIds.has(location.areaId))
      : this.canonicalLocations;
    this.locationById = new Map(this.locations.map((location) => [location.id, location]));
    this.#learningCurves.clear();
    this.#transportVisuals.reset();
  }

  #createStars(count) {
    const random = seededRandom(0x5a17c0de);
    return Array.from({ length: count }, () => ({
      x: random(),
      y: random(),
      radius: 0.4 + random() * 1.6,
      alpha: 0.14 + random() * 0.52,
      depth: 0.25 + random() * 0.75,
    }));
  }

  resize() {
    const rectangle = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rectangle.width));
    const height = Math.max(1, Math.round(rectangle.height));
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    if (width === this.width && height === this.height && ratio === this.pixelRatio) return false;

    this.width = width;
    this.height = height;
    this.pixelRatio = ratio;
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    return true;
  }

  render({
    camera,
    player,
    movementDistance = 0,
    snapshot,
    nearestLocation,
    debugState,
    timeSeconds,
    reducedMotion = false,
    newlyAccessibleLocationIds = [],
    unlockSourceLocationId = null,
  }) {
    this.resize();
    const context = this.context;
    const animationTime = getAreaAppearanceAnimationTime(timeSeconds, { reducedMotion });
    const overview = camera.zoom <= 0.55;
    const detail = camera.zoom >= 1.18;
    if (!detail) this.#invitationStarts.clear();
    context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    context.clearRect(0, 0, this.width, this.height);

    this.#drawBackground(camera, animationTime);

    context.save();
    context.translate(this.width / 2, this.height / 2);
    context.scale(camera.zoom, camera.zoom);
    context.translate(-camera.x, -camera.y);

    const areaLabels = this.#drawAreas(snapshot, camera.zoom, animationTime, reducedMotion);
    this.#drawTreeTwoGuides(
      snapshot,
      camera,
      newlyAccessibleLocationIds,
      unlockSourceLocationId,
      debugState.showGraph ? "total" : null,
      reducedMotion ? null : animationTime,
      overview,
    );
    this.#drawAreaEdges(snapshot, camera.zoom, animationTime);
    const lineScale = 1 / camera.zoom;
    this.#drawAreaLabels(areaLabels, lineScale, debugState, overview);
    this.#transportVisuals.update({
      player,
      transportId: snapshot.activeTransport.id,
      movementDistance,
      timeSeconds: animationTime,
      lineScale,
      reducedMotion,
    });
    this.#transportVisuals.drawTrail(context, animationTime, lineScale);
    this.#drawLocations(snapshot, nearestLocation, camera, animationTime, debugState, { overview, detail, reducedMotion });
    this.#drawPlayer(player, snapshot.activeTransport, lineScale);

    context.restore();
    this.#drawVignette();
  }

  #drawBackground(camera, timeSeconds) {
    const context = this.context;
    const gradient = context.createRadialGradient(
      this.width * 0.52,
      this.height * 0.42,
      30,
      this.width * 0.52,
      this.height * 0.42,
      Math.max(this.width, this.height) * 0.8,
    );
    gradient.addColorStop(0, "#102b43");
    gradient.addColorStop(0.42, "#0a1b2d");
    gradient.addColorStop(1, "#050c16");
    context.fillStyle = gradient;
    context.fillRect(0, 0, this.width, this.height);

    context.save();
    for (const star of this.stars) {
      const parallaxX = -camera.x * 0.015 * star.depth;
      const parallaxY = -camera.y * 0.015 * star.depth;
      const x = ((star.x * this.width + parallaxX) % this.width + this.width) % this.width;
      const y = ((star.y * this.height + parallaxY) % this.height + this.height) % this.height;
      const pulse = 0.8 + 0.2 * Math.sin(timeSeconds * (0.35 + star.depth) + star.x * 9);
      context.globalAlpha = star.alpha * pulse;
      context.fillStyle = "#ccefff";
      context.beginPath();
      context.arc(x, y, star.radius, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();

    context.save();
    context.globalAlpha = 0.15;
    context.strokeStyle = "#4cc9f0";
    context.lineWidth = 1;
    for (let row = -2; row < 8; row += 1) {
      const baseY = row * 120 + ((timeSeconds * 7) % 120);
      context.beginPath();
      for (let x = -30; x <= this.width + 30; x += 24) {
        const y = baseY + Math.sin(x * 0.018 + timeSeconds * 0.55 + row) * 8;
        if (x === -30) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    }
    context.restore();
  }

  #drawAreas(snapshot, zoom, timeSeconds, reducedMotion) {
    const context = this.context;
    const lineScale = 1 / zoom;
    const labels = [];

    for (const area of this.areas) {
      const center = axialToPixel(area.q, area.r, WORLD_CONFIG.hexSize);
      const corners = hexCorners(center.x, center.y, WORLD_CONFIG.hexSize - 4);
      const unlocked = snapshot.unlockedAreaIds.has(area.id);
      const appearance = resolveRuntimeAreaAppearance(area, {
        personalAppearance: unlocked ? this.getPersonalAreaAppearance(area.id) : null,
        unlocked,
      });

      if (unlocked) {
        drawAreaAppearanceCanvas(context, {
          area,
          appearance,
          center,
          zoom,
          timeSeconds: getAreaAppearanceAnimationTime(timeSeconds, { reducedMotion }),
          hexSize: WORLD_CONFIG.hexSize,
        });
      } else {
        context.save();
        polygonPath(context, corners);
        const fill = context.createRadialGradient(
          center.x - 50,
          center.y - 70,
          20,
          center.x,
          center.y,
          WORLD_CONFIG.hexSize * 1.15,
        );
        fill.addColorStop(0, "rgba(24, 38, 54, 0.78)");
        fill.addColorStop(1, "rgba(8, 17, 29, 0.9)");
        context.fillStyle = fill;
        context.fill();
        polygonPath(context, corners);
        context.clip();
        this.#drawLockedHatching(center, zoom);
        context.restore();

        context.save();
        context.strokeStyle = "rgba(120, 149, 170, 0.17)";
        context.lineWidth = 1.2 * lineScale;
        context.setLineDash([]);
        polygonPath(context, corners);
        context.stroke();
        context.restore();
      }

      labels.push({ area, center, unlocked, accent: appearance.accent });
    }
    return labels;
  }

  #drawAreaLabels(labels, lineScale, debugState, overview) {
    const context = this.context;
    for (const { area, center, unlocked, accent } of labels) {
      context.save();
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = unlocked ? "rgba(238, 250, 255, 0.82)" : "rgba(167, 187, 201, 0.5)";
      context.font = `700 ${17 * lineScale}px system-ui, sans-serif`;
      drawMapLabel(context, area.shortTitle, center.x, center.y - WORLD_CONFIG.hexSize * 0.71, lineScale);
      if (overview) {
        context.restore();
        continue;
      }
      context.font = `600 ${9.5 * lineScale}px system-ui, sans-serif`;
      context.fillStyle = unlocked
        ? withAlpha(accent, 0.78)
        : "rgba(150, 169, 184, 0.43)";
      drawMapLabel(
        context,
        unlocked ? "ZONA ABIERTA" : "ARISTAS BLOQUEADAS",
        center.x,
        center.y - WORLD_CONFIG.hexSize * 0.61,
        lineScale,
      );

      if (debugState.showCoords) {
        context.font = `600 ${9 * lineScale}px ui-monospace, monospace`;
        context.fillStyle = "rgba(181, 224, 243, 0.55)";
        const coordinateLabel = this.navigationMode === "direct" ? "vista" : "hex";
        context.fillText(`${coordinateLabel}(${area.q}, ${area.r})`, center.x, center.y + WORLD_CONFIG.hexSize * 0.72);
      }
      context.restore();
    }
  }

  #drawLockedHatching(center, zoom) {
    const context = this.context;
    const lineScale = 1 / zoom;
    context.save();
    context.strokeStyle = "rgba(148, 169, 185, 0.12)";
    context.lineWidth = 1.1 * lineScale;
    for (let offset = -420; offset <= 420; offset += 32) {
      context.beginPath();
      context.moveTo(center.x - 330 + offset, center.y - 330);
      context.lineTo(center.x + 330 + offset, center.y + 330);
      context.stroke();
    }
    context.restore();
  }

  #drawAreaEdges(snapshot, zoom, timeSeconds) {
    const context = this.context;
    const lineScale = 1 / zoom;

    for (const area of this.areas) {
      if (!snapshot.unlockedAreaIds.has(area.id)) continue;
      const center = axialToPixel(area.q, area.r, WORLD_CONFIG.hexSize);

      for (let directionIndex = 0; directionIndex < 6; directionIndex += 1) {
        const neighbor = getNeighborArea(area, directionIndex, this.worldIndex);
        const neighborUnlocked = neighbor ? snapshot.unlockedAreaIds.has(neighbor.id) : false;
        const edge = hexEdge(center.x, center.y, WORLD_CONFIG.hexSize - 4, directionIndex);

        if (!neighborUnlocked) {
          context.save();
          context.lineCap = "round";
          context.strokeStyle = "rgba(3, 7, 13, 0.88)";
          context.lineWidth = 10 * lineScale;
          context.beginPath();
          context.moveTo(edge.start.x, edge.start.y);
          context.lineTo(edge.end.x, edge.end.y);
          context.stroke();

          const pulse = 0.7 + 0.3 * Math.sin(timeSeconds * 2.4 + directionIndex);
          context.strokeStyle = `rgba(255, 161, 87, ${0.56 + 0.22 * pulse})`;
          context.lineWidth = 3.2 * lineScale;
          context.setLineDash([16 * lineScale, 8 * lineScale]);
          context.beginPath();
          context.moveTo(edge.start.x, edge.start.y);
          context.lineTo(edge.end.x, edge.end.y);
          context.stroke();
          context.restore();
        } else if (neighbor && area.id.localeCompare(neighbor.id) < 0) {
          const midpoint = {
            x: (edge.start.x + edge.end.x) / 2,
            y: (edge.start.y + edge.end.y) / 2,
          };
          const dx = edge.end.x - edge.start.x;
          const dy = edge.end.y - edge.start.y;
          const length = Math.hypot(dx, dy);
          const ux = dx / length;
          const uy = dy / length;
          context.save();
          context.strokeStyle = "rgba(124, 230, 173, 0.74)";
          context.lineWidth = 4 * lineScale;
          context.lineCap = "round";
          context.beginPath();
          context.moveTo(midpoint.x - ux * 31, midpoint.y - uy * 31);
          context.lineTo(midpoint.x + ux * 31, midpoint.y + uy * 31);
          context.stroke();
          context.restore();
        }
      }
    }
  }

  #drawTreeTwoGuides(
    snapshot,
    camera,
    newlyAccessibleLocationIds,
    unlockSourceLocationId,
    visualizationModeOverride,
    timeSeconds,
    overview,
  ) {
    const edges = deriveKnowledgeGraphEdges({
      locations: this.locations,
      areas: this.areas,
      snapshot,
      visualizationMode:
        visualizationModeOverride ?? snapshot.state?.settings?.treeTwoVisualizationMode,
      newlyAccessibleLocationIds,
      unlockSourceLocationId,
    });
    if (edges.length === 0) return;

    const context = this.context;
    const { x, y, zoom } = camera;
    const lineScale = 1 / zoom;
    const halfWidth = (this.width / 2 + 36) * lineScale;
    const halfHeight = (this.height / 2 + 36) * lineScale;
    for (const edge of edges) {
      let curve = this.#learningCurves.get(edge.id);
      if (curve === undefined) {
        const source = getLocationWorldPosition(
          this.locationById.get(edge.sourceId), this.worldIndex, WORLD_CONFIG.hexSize,
        );
        const target = getLocationWorldPosition(
          this.locationById.get(edge.targetId), this.worldIndex, WORLD_CONFIG.hexSize,
        );
        curve = createLearningEdgeCurve(source, target);
        this.#learningCurves.set(edge.id, curve);
      }
      if (!curve) continue;
      const { left, right, top, bottom } = curve.bounds;
      if (right < x - halfWidth || left > x + halfWidth || bottom < y - halfHeight || top > y + halfHeight) {
        continue;
      }

      const style = getTreeTwoEdgeVisualStyle(edge.appearance, { isNew: edge.isNew, zoom });
      drawLearningEdge(context, curve, style, { timeSeconds, lineScale });
      if (overview || !edge.isNew || edge.appearance !== "bright") continue;

      const midpoint = pointOnLearningEdge(curve, 0.5);
      context.save();
      context.font = `800 ${9 * lineScale}px system-ui, sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      const labelWidth = context.measureText("NUEVO").width + 10 * lineScale;
      context.fillStyle = "rgba(5, 12, 22, 0.9)";
      drawRoundedRect(
        context,
        midpoint.x - labelWidth / 2,
        midpoint.y - 9 * lineScale,
        labelWidth,
        18 * lineScale,
        5 * lineScale,
      );
      context.fill();
      context.fillStyle = "rgba(255, 237, 178, 1)";
      context.fillText("NUEVO", midpoint.x, midpoint.y);
      context.restore();
    }
  }

  #drawLocations(snapshot, nearestLocation, camera, timeSeconds, debugState, { overview, detail, reducedMotion }) {
    const context = this.context;
    const { zoom } = camera;
    const lineScale = 1 / zoom;

    for (const location of this.locations) {
      if (!snapshot.visibleLocationIds.has(location.id)) continue;
      if (overview && !isLearningLocation(location)) continue;
      const position = getLocationWorldPosition(location, this.worldIndex, WORLD_CONFIG.hexSize);
      const accessible = snapshot.accessibleLocationIds.has(location.id);
      const completed = snapshot.completedLocationIds.has(location.id);
      const isNearest = nearestLocation?.id === location.id;
      const passed = snapshot.state?.passedLessonSteps;
      const lessonProgress = detail && location.kind === "lesson"
        ? completed ? 1 : (Object.hasOwn(passed ?? {}, location.id) ? passed[location.id].length : 0)
          / (location.steps?.length || 1)
        : 0;

      if (isNearest) {
        const pulse = 1 + 0.14 * Math.sin(timeSeconds * 4.5);
        context.save();
        context.strokeStyle = "rgba(255, 209, 102, 0.74)";
        context.lineWidth = 2.2 * lineScale;
        context.beginPath();
        context.arc(position.x, position.y, 29 * pulse, 0, Math.PI * 2);
        context.stroke();
        context.restore();
      }

      this.#drawLocationMarker(location, position, {
        accessible,
        completed,
        zoom,
        lessonProgress,
      });

      if (overview) continue;
      context.save();
      context.textAlign = "center";
      context.textBaseline = "top";
      context.font = `700 ${10.8 * lineScale}px system-ui, sans-serif`;
      context.fillStyle = accessible
        ? "rgba(244, 251, 255, 0.9)"
        : "rgba(159, 177, 190, 0.56)";
      drawMapLabel(context, location.shortTitle, position.x, position.y + 27 * lineScale, lineScale);

      if (debugState.showIds) {
        context.font = `600 ${8.2 * lineScale}px ui-monospace, monospace`;
        context.fillStyle = "rgba(120, 227, 255, 0.58)";
        context.fillText(location.id, position.x, position.y + 42 * lineScale);
      }
      context.restore();
    }
    if (detail) this.#drawMapInvitations(snapshot, camera, timeSeconds, reducedMotion, debugState.showIds);
  }

  #drawMapInvitations(snapshot, camera, timeSeconds, reducedMotion, showIds) {
    const context = this.context;
    const scale = 1 / camera.zoom;
    const cards = [];
    for (const location of this.locations) {
      if (!location.mapInvitation || !snapshot.visibleLocationIds.has(location.id)) continue;
      const position = getLocationWorldPosition(location, this.worldIndex, WORLD_CONFIG.hexSize);
      const x = (position.x - camera.x) * camera.zoom + this.width / 2;
      const top = (position.y - camera.y) * camera.zoom + this.height / 2 + (showIds ? 57 : 44);
      if (x < 0 || x > this.width || top < 0 || top + 18 > this.height) continue;
      const layout = this.#invitationLayout(location.mapInvitation);
      const width = Math.min(this.width - 8, layout.width + 12);
      const height = layout.lines.length * 14 + 6;
      if (width <= 12) continue;
      const left = Math.max(4, Math.min(x - width / 2, this.width - width - 4));
      const right = left + width;
      if (top + height > this.height - 4 || cards.some((card) =>
        left < card.right && right > card.left && top < card.bottom && top + height > card.top)) continue;
      cards.push({ left, right, top, bottom: top + height });

      if (!this.#invitationStarts.has(location.id)) this.#invitationStarts.set(location.id, timeSeconds);
      let remaining = reducedMotion ? Infinity : 1 + Math.floor((timeSeconds - this.#invitationStarts.get(location.id)) * 34);
      context.save();
      context.translate(camera.x + (left - this.width / 2) * scale, camera.y + (top - this.height / 2) * scale);
      context.scale(scale, scale);
      context.fillStyle = "rgba(6, 16, 26, 0.94)";
      drawRoundedRect(context, 0, 0, width, height, 5);
      context.fill();
      context.font = "600 11px system-ui, sans-serif";
      context.fillStyle = "#f8e2ad";
      context.textAlign = "left";
      context.textBaseline = "top";
      for (const [index, line] of layout.lines.entries()) {
        const text = line.slice(0, Math.max(0, remaining)).join("");
        context.fillText(text, 6, 4 + index * 14, width - 12);
        remaining -= line.length;
      }
      context.restore();
    }
  }

  #invitationLayout(text) {
    let layout = this.#invitationLayouts.get(text);
    if (layout) return layout;
    const context = this.context;
    const lines = [];
    let line = "";
    context.save();
    context.font = "600 11px system-ui, sans-serif";
    for (const word of text.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (line && context.measureText(next).width > 185) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    const width = Math.min(250, Math.max(0, ...lines.map((value) => context.measureText(value).width)));
    context.restore();
    layout = { width, lines: lines.map((value) => Array.from(value)) };
    this.#invitationLayouts.set(text, layout);
    return layout;
  }

  #drawLocationMarker(location, position, { accessible, completed, zoom, lessonProgress }) {
    const context = this.context;
    const lineScale = 1 / zoom;
    const radius = 17 * lineScale;
    const fill = completed
      ? "rgba(36, 122, 78, 0.96)"
      : accessible
        ? "rgba(14, 52, 75, 0.96)"
        : "rgba(35, 42, 50, 0.9)";
    const stroke = completed
      ? "rgba(124, 230, 173, 0.96)"
      : accessible
        ? "rgba(120, 227, 255, 0.92)"
        : "rgba(135, 151, 162, 0.58)";

    context.save();
    context.translate(position.x, position.y);
    context.fillStyle = fill;
    context.strokeStyle = stroke;
    context.lineWidth = 2.2 * lineScale;

    switch (location.kind) {
      case "lesson":
        context.beginPath();
        context.moveTo(0, -radius);
        context.lineTo(radius, 0);
        context.lineTo(0, radius);
        context.lineTo(-radius, 0);
        context.closePath();
        break;
      case "mission": {
        context.beginPath();
        for (let index = 0; index < 10; index += 1) {
          const angle = -Math.PI / 2 + (index * Math.PI) / 5;
          const pointRadius = index % 2 === 0 ? radius : radius * 0.48;
          const x = Math.cos(angle) * pointRadius;
          const y = Math.sin(angle) * pointRadius;
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.closePath();
        break;
      }
      case "transport":
        drawRoundedRect(context, -radius, -radius * 0.72, radius * 2, radius * 1.44, 5 * lineScale);
        break;
      case "gadget": {
        const points = hexCorners(0, 0, radius);
        polygonPath(context, points);
        break;
      }
      case "npc":
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.moveTo(radius * 0.2, radius * 0.8);
        context.lineTo(radius * 0.58, radius * 1.18);
        context.lineTo(radius * 0.52, radius * 0.66);
        break;
      case "debug":
        context.beginPath();
        context.rect(-radius, -radius, radius * 2, radius * 2);
        break;
      case "base":
      default:
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        break;
    }

    context.fill();
    context.stroke();
    if (lessonProgress > 0) {
      const perimeter = 4 * Math.SQRT2 * radius;
      context.strokeStyle = "#ffd166";
      context.lineWidth = 3.1 * lineScale;
      if (lessonProgress < 1) context.setLineDash([perimeter * lessonProgress, perimeter]);
      context.stroke();
      context.setLineDash([]);
    }
    context.fillStyle = accessible ? "#ecfbff" : "rgba(190, 202, 210, 0.7)";
    context.font = `800 ${11.5 * lineScale}px system-ui, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(completed ? "✓" : location.marker, 0, 0.5 * lineScale);

    if (!accessible) {
      context.fillStyle = "rgba(255, 179, 93, 0.9)";
      context.beginPath();
      context.arc(radius * 0.72, -radius * 0.72, 5.5 * lineScale, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  #drawPlayer(player, transport, lineScale) {
    const context = this.context;
    const { bob, phase, moving } = this.#transportVisuals;
    const shadow = getPlayerShadowGeometry(player.heading, transport.id);

    context.save();
    context.translate(player.x, player.y);

    context.fillStyle = "rgba(3, 13, 22, 0.64)";
    context.beginPath();
    context.ellipse(
      shadow.offsetX * lineScale,
      shadow.offsetY * lineScale,
      shadow.radiusX * lineScale,
      shadow.radiusY * lineScale,
      shadow.rotation,
      0,
      Math.PI * 2,
    );
    context.fill();

    context.translate(0, bob * lineScale);
    context.rotate(player.heading);

    if (transport.id === "electric-cart") {
      drawRoundedRect(context, -19 * lineScale, -12 * lineScale, 38 * lineScale, 24 * lineScale, 7 * lineScale);
      context.fillStyle = "#ffd166";
      context.fill();
      context.strokeStyle = "#fff4c9";
      context.lineWidth = 2 * lineScale;
      context.stroke();
      context.fillStyle = "#1b2733";
      context.strokeStyle = "#a5b5c2";
      context.lineWidth = 1.45 * lineScale;
      const spokeX = Math.cos(phase) * 3.4;
      const spokeY = Math.sin(phase) * 3.4;
      for (const wheelX of [-12, 12]) {
        context.beginPath();
        context.arc(wheelX * lineScale, 14 * lineScale, 5 * lineScale, 0, Math.PI * 2);
        context.fill();
        context.beginPath();
        context.moveTo((wheelX - spokeX) * lineScale, (14 - spokeY) * lineScale);
        context.lineTo((wheelX + spokeX) * lineScale, (14 + spokeY) * lineScale);
        context.stroke();
      }
    } else if (transport.id === "radio-skiff") {
      context.fillStyle = "#ffb6ed";
      context.strokeStyle = "#fff0fb";
      context.lineWidth = 2 * lineScale;
      context.beginPath();
      context.moveTo(24 * lineScale, 0);
      context.quadraticCurveTo(-2 * lineScale, -17 * lineScale, -21 * lineScale, 0);
      context.quadraticCurveTo(-2 * lineScale, 17 * lineScale, 24 * lineScale, 0);
      context.closePath();
      context.fill();
      context.stroke();
      context.fillStyle = moving ? "#c0f3ff" : "#78a7b8";
      context.beginPath();
      context.arc(-18 * lineScale, 0, 3 * lineScale, 0, Math.PI * 2);
      context.fill();
    } else {
      if (moving) {
        const step = Math.cos(phase) * 4;
        context.fillStyle = "#71c4dc";
        for (const side of [-1, 1]) {
          context.beginPath();
          context.ellipse(
            (-12 + step * side) * lineScale, side * 7 * lineScale,
            4 * lineScale, 2 * lineScale, 0, 0, Math.PI * 2,
          );
          context.fill();
        }
      }
      context.fillStyle = "#f6fbff";
      context.strokeStyle = "#78e3ff";
      context.lineWidth = 2.3 * lineScale;
      context.beginPath();
      context.moveTo(18 * lineScale, 0);
      context.lineTo(-11 * lineScale, -12 * lineScale);
      context.lineTo(-5 * lineScale, 0);
      context.lineTo(-11 * lineScale, 12 * lineScale);
      context.closePath();
      context.fill();
      context.stroke();
      context.fillStyle = "#ffd166";
      context.beginPath();
      context.arc(0, 0, 4.2 * lineScale, 0, Math.PI * 2);
      context.fill();
    }

    context.restore();
  }

  #drawVignette() {
    const context = this.context;
    const gradient = context.createRadialGradient(
      this.width / 2,
      this.height / 2,
      Math.min(this.width, this.height) * 0.27,
      this.width / 2,
      this.height / 2,
      Math.max(this.width, this.height) * 0.72,
    );
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1, "rgba(0, 4, 10, 0.46)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, this.width, this.height);
  }
}
