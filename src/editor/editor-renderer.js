import { axialToPixel, hexCorners, pointInHex } from "../core/hex.js";
import { drawAreaAppearanceCanvas } from "../core/area-appearance-canvas.js";
import {
  getAreaAppearanceAnimationTime,
  resolveAreaAppearance,
} from "../core/area-appearance.js";
import { WORLD_CONFIG } from "../data/world.js";

const TWO_PI = Math.PI * 2;
const DEFAULT_LOCATION_HIT_RADIUS_PX = 28;
const LOCATION_RADIUS_PX = 18;
const EDITABLE_EDGE_COLOR = "rgba(255, 215, 112, 0.96)";
const DERIVED_EDGE_COLOR = "rgba(107, 222, 255, 0.82)";

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function safeZoom(value) {
  return Math.max(0.01, finite(value, 1));
}

function withAlpha(color, alpha) {
  if (typeof color !== "string") return `rgba(120, 227, 255, ${alpha})`;
  const normalized = color.replace("#", "");
  const expanded = normalized.length === 3
    ? normalized.split("").map((character) => character + character).join("")
    : normalized;
  if (!/^[0-9a-f]{6}$/i.test(expanded)) return `rgba(120, 227, 255, ${alpha})`;
  const value = Number.parseInt(expanded, 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function polygonPath(context, points) {
  if (points.length === 0) return;
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index].x, points[index].y);
  }
  context.closePath();
}

function roundedRectPath(context, x, y, width, height, radius) {
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

function createAreaCenterIndex(areas, hexSize) {
  return new Map(
    areas
      .filter((area) => area && typeof area.id === "string")
      .map((area) => [
        area.id,
        axialToPixel(finite(area.q), finite(area.r), hexSize),
      ]),
  );
}

function locationPosition(location, centerByAreaId) {
  const center = centerByAreaId.get(location?.areaId);
  if (!center) return null;
  return {
    x: center.x + finite(location.offset?.x),
    y: center.y + finite(location.offset?.y),
  };
}

function previewPosition(preview, fallback, centerByAreaId) {
  if (!preview) return fallback;
  const direct = preview.world ?? preview.position ?? preview.pointer ?? preview;
  if (Number.isFinite(direct?.x) && Number.isFinite(direct?.y)) {
    return { x: direct.x, y: direct.y };
  }
  const center = centerByAreaId.get(preview.areaId);
  if (!center || !preview.offset) return fallback;
  return {
    x: center.x + finite(preview.offset.x),
    y: center.y + finite(preview.offset.y),
  };
}

/**
 * Returns the area whose actual hexagon contains a world-space point.
 *
 * @param {{x:number, y:number, areas:Array, hexSize?:number}} options
 * @returns {object|null}
 */
export function findAreaAtWorldPoint({
  x,
  y,
  areas = [],
  hexSize = WORLD_CONFIG.hexSize,
} = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Array.isArray(areas)) return null;
  const size = Math.max(1, finite(hexSize, WORLD_CONFIG.hexSize));

  let nearest = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const area of areas) {
    if (!area || !Number.isFinite(area.q) || !Number.isFinite(area.r)) continue;
    const center = axialToPixel(area.q, area.r, size);
    if (!pointInHex(x, y, center.x, center.y, size)) continue;
    const distance = Math.hypot(x - center.x, y - center.y);
    if (distance < nearestDistance) {
      nearest = area;
      nearestDistance = distance;
    }
  }
  return nearest;
}

/**
 * Returns the nearest location marker under a world-space point. The hit radius
 * is expressed in CSS pixels so selection remains equally usable at every zoom.
 *
 * @param {{x:number, y:number, areas:Array, locations:Array, zoom?:number,
 *   hitRadiusPx?:number}} options
 * @returns {object|null}
 */
export function findLocationAtWorldPoint({
  x,
  y,
  areas = [],
  locations = [],
  zoom = 1,
  hitRadiusPx = DEFAULT_LOCATION_HIT_RADIUS_PX,
} = {}) {
  if (
    !Number.isFinite(x)
    || !Number.isFinite(y)
    || !Array.isArray(areas)
    || !Array.isArray(locations)
  ) {
    return null;
  }

  const centerByAreaId = createAreaCenterIndex(areas, WORLD_CONFIG.hexSize);
  const radius = Math.max(1, finite(hitRadiusPx, DEFAULT_LOCATION_HIT_RADIUS_PX))
    / safeZoom(zoom);
  let nearest = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const location of locations) {
    const position = locationPosition(location, centerByAreaId);
    if (!position) continue;
    const distance = Math.hypot(x - position.x, y - position.y);
    if (distance <= radius && distance < nearestDistance) {
      nearest = location;
      nearestDistance = distance;
    }
  }
  return nearest;
}

function normalizeEdgeIds(edge) {
  return {
    sourceId: edge?.sourceId ?? edge?.sourceLocationId ?? edge?.from ?? null,
    targetId: edge?.targetId ?? edge?.targetLocationId ?? edge?.to ?? null,
  };
}

function edgeIsEditable(edge) {
  if (typeof edge?.editable === "boolean") return edge.editable;
  if (typeof edge?.derived === "boolean") return !edge.derived;
  const kinds = Array.isArray(edge?.requirementKinds)
    ? edge.requirementKinds
    : edge?.requirementKind
      ? [edge.requirementKind]
      : edge?.kind
        ? [edge.kind]
        : [];
  if (kinds.length === 0) return true;
  return kinds.includes("completedLocations") || kinds.includes("location");
}

function createStars(count) {
  let state = 0x0b17ed17;
  const random = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  return Array.from({ length: count }, () => ({
    x: random(),
    y: random(),
    radius: 0.45 + random() * 1.35,
    alpha: 0.18 + random() * 0.42,
    depth: 0.25 + random() * 0.75,
  }));
}

function compareEdgesForDrawing(first, second) {
  return Number(edgeIsEditable(first)) - Number(edgeIsEditable(second));
}

export class EditorRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas?.getContext?.("2d", { alpha: false });
    if (!this.context) throw new Error("Canvas 2D no está disponible para ORBIT Editor.");
    this.width = 0;
    this.height = 0;
    this.pixelRatio = 1;
    this.stars = createStars(WORLD_CONFIG.backgroundStars ?? 320);
    this.resize();
  }

  resize() {
    const rectangle = this.canvas.getBoundingClientRect?.() ?? {};
    const width = Math.max(1, Math.round(finite(rectangle.width, this.canvas.clientWidth ?? 1)));
    const height = Math.max(1, Math.round(finite(rectangle.height, this.canvas.clientHeight ?? 1)));
    const ratio = Math.min(Math.max(1, finite(globalThis.devicePixelRatio, 1)), 2);
    if (width === this.width && height === this.height && ratio === this.pixelRatio) return false;

    this.width = width;
    this.height = height;
    this.pixelRatio = ratio;
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    return true;
  }

  render({
    camera = { x: 0, y: 0, zoom: 1 },
    areas = [],
    locations = [],
    edges = [],
    activeTool = "spider",
    selectedLocationId = null,
    selectedAreaId = null,
    hoveredLocationId = null,
    hoveredAreaId = null,
    dragPreview = null,
    connectionPreview = null,
    beeTargetAreaId = null,
    beeTargetValid = false,
    timeSeconds = 0,
    reducedMotion = false,
  } = {}) {
    this.resize();
    const context = this.context;
    const zoom = safeZoom(camera.zoom);
    const safeAreas = Array.isArray(areas) ? areas : [];
    const safeLocations = Array.isArray(locations) ? locations : [];
    const safeEdges = Array.isArray(edges) ? edges : [];
    const centerByAreaId = createAreaCenterIndex(safeAreas, WORLD_CONFIG.hexSize);
    const rawPositionByLocationId = new Map();
    const positionByLocationId = new Map();
    const previewLocationId = dragPreview?.locationId ?? selectedLocationId;

    for (const location of safeLocations) {
      const position = locationPosition(location, centerByAreaId);
      if (!position || typeof location.id !== "string") continue;
      rawPositionByLocationId.set(location.id, position);
      positionByLocationId.set(
        location.id,
        location.id === previewLocationId
          ? previewPosition(dragPreview, position, centerByAreaId)
          : position,
      );
    }

    context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    context.clearRect(0, 0, this.width, this.height);
    this.#drawBackground(camera);

    context.save();
    context.translate(this.width / 2, this.height / 2);
    context.scale(zoom, zoom);
    context.translate(-finite(camera.x), -finite(camera.y));

    this.#drawAreas(
      safeAreas,
      centerByAreaId,
      zoom,
      activeTool,
      finite(timeSeconds),
      Boolean(reducedMotion),
    );
    this.#drawRingFrames(safeAreas, centerByAreaId, zoom);
    this.#drawEdges(safeEdges, positionByLocationId, zoom);

    if (String(activeTool).toLowerCase() === "bee") {
      this.#drawBeeOverlay({
        centerByAreaId,
        selectedAreaId,
        beeTargetAreaId,
        beeTargetValid,
        dragPreview,
        zoom,
      });
    }

    if (String(activeTool).toLowerCase() === "bowerbird") {
      this.#drawBowerbirdOverlay({
        centerByAreaId,
        selectedAreaId,
        hoveredAreaId,
        zoom,
      });
    }

    this.#drawLocations({
      locations: safeLocations,
      positionByLocationId,
      rawPositionByLocationId,
      selectedLocationId,
      hoveredLocationId,
      dragPreview,
      activeTool,
      zoom,
    });

    if (String(activeTool).toLowerCase() === "spider") {
      this.#drawConnectionPreview({
        connectionPreview,
        positionByLocationId,
        zoom,
      });
    }

    context.restore();
    this.#drawVignette();
  }

  #drawBackground(camera) {
    const context = this.context;
    const gradient = context.createRadialGradient(
      this.width * 0.5,
      this.height * 0.42,
      24,
      this.width * 0.5,
      this.height * 0.42,
      Math.max(this.width, this.height) * 0.82,
    );
    gradient.addColorStop(0, "#14334c");
    gradient.addColorStop(0.45, "#0a1c30");
    gradient.addColorStop(1, "#050c16");
    context.fillStyle = gradient;
    context.fillRect(0, 0, this.width, this.height);

    context.save();
    for (const star of this.stars) {
      const parallaxX = -finite(camera.x) * 0.012 * star.depth;
      const parallaxY = -finite(camera.y) * 0.012 * star.depth;
      const x = ((star.x * this.width + parallaxX) % this.width + this.width) % this.width;
      const y = ((star.y * this.height + parallaxY) % this.height + this.height) % this.height;
      context.globalAlpha = star.alpha;
      context.fillStyle = "#d9f5ff";
      context.beginPath();
      context.arc(x, y, star.radius, 0, TWO_PI);
      context.fill();
    }
    context.restore();

    context.save();
    context.strokeStyle = "rgba(92, 202, 240, 0.09)";
    context.lineWidth = 1;
    for (let y = 40; y < this.height; y += 84) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(this.width, y);
      context.stroke();
    }
    context.restore();
  }

  #drawRingFrames(areas, centerByAreaId, zoom) {
    const context = this.context;
    const lineScale = 1 / zoom;
    const ringStyles = new Map([
      [1, {
        label: "ANILLO 1 · TEORÍA",
        color: "rgba(151, 218, 255, 0.32)",
        dash: [],
      }],
      [2, {
        label: "ANILLO 2 · APLICACIONES",
        color: "rgba(255, 209, 102, 0.3)",
        dash: [12 * lineScale, 8 * lineScale],
      }],
    ]);

    for (const [tier, style] of ringStyles) {
      const centers = areas
        .filter((area) => area.tier === tier)
        .map((area) => centerByAreaId.get(area.id))
        .filter(Boolean)
        .sort((first, second) => Math.atan2(first.y, first.x) - Math.atan2(second.y, second.x));
      if (centers.length < 3) continue;
      const outline = centers.map((point) => {
        const distance = Math.max(1, Math.hypot(point.x, point.y));
        const expansion = WORLD_CONFIG.hexSize * 0.7;
        return {
          x: point.x + (point.x / distance) * expansion,
          y: point.y + (point.y / distance) * expansion,
        };
      });

      context.save();
      context.strokeStyle = style.color;
      context.lineWidth = 2 * lineScale;
      context.setLineDash(style.dash);
      polygonPath(context, outline);
      context.stroke();
      context.restore();

      const top = outline.reduce((current, point) => point.y < current.y ? point : current);
      this.#drawWorldLabel(
        style.label,
        top.x,
        top.y - 20 * lineScale,
        zoom,
        tier === 1 ? "rgba(13, 47, 68, 0.9)" : "rgba(63, 50, 25, 0.9)",
      );
    }
  }

  #drawWorldLabel(text, x, y, zoom, background) {
    const context = this.context;
    const scale = 1 / zoom;
    context.save();
    context.font = `800 ${10.5 * scale}px system-ui, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    const width = context.measureText(text).width + 16 * scale;
    const height = 24 * scale;
    roundedRectPath(context, x - width / 2, y - height / 2, width, height, 7 * scale);
    context.fillStyle = background;
    context.fill();
    context.strokeStyle = "rgba(194, 237, 255, 0.28)";
    context.lineWidth = 1 * scale;
    context.stroke();
    context.fillStyle = "rgba(235, 249, 255, 0.88)";
    context.fillText(text, x, y + 0.5 * scale);
    context.restore();
  }

  #drawAreas(areas, centerByAreaId, zoom, activeTool, timeSeconds, reducedMotion) {
    const context = this.context;
    const lineScale = 1 / zoom;
    const showCoordinates = String(activeTool).toLowerCase() === "bee";

    for (const area of areas) {
      const center = centerByAreaId.get(area.id);
      if (!center) continue;
      const appearance = resolveAreaAppearance(area, area.appearance);

      drawAreaAppearanceCanvas(context, {
        area,
        appearance,
        center,
        zoom,
        timeSeconds: getAreaAppearanceAnimationTime(timeSeconds, { reducedMotion }),
        hexSize: WORLD_CONFIG.hexSize,
      });

      context.save();
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "rgba(240, 250, 255, 0.88)";
      context.font = `750 ${14 * lineScale}px system-ui, sans-serif`;
      context.fillText(
        area.shortTitle ?? area.title ?? area.id,
        center.x,
        center.y - WORLD_CONFIG.hexSize * 0.69,
      );
      if (showCoordinates) {
        context.font = `700 ${9.5 * lineScale}px ui-monospace, monospace`;
        context.fillStyle = "rgba(191, 232, 249, 0.68)";
        context.fillText(
          `hex(${finite(area.q)}, ${finite(area.r)}) · anillo ${finite(area.tier)}`,
          center.x,
          center.y + WORLD_CONFIG.hexSize * 0.69,
        );
      }
      context.restore();
    }
  }

  #drawBowerbirdOverlay({ centerByAreaId, selectedAreaId, hoveredAreaId, zoom }) {
    const context = this.context;
    const lineScale = 1 / zoom;
    for (const [areaId, alpha, inset] of [
      [hoveredAreaId, 0.62, 17],
      [selectedAreaId, 0.98, 10],
    ]) {
      const center = centerByAreaId.get(areaId);
      if (!center) continue;
      context.save();
      polygonPath(context, hexCorners(center.x, center.y, WORLD_CONFIG.hexSize - inset));
      context.strokeStyle = `rgba(255, 231, 150, ${alpha})`;
      context.lineWidth = (areaId === selectedAreaId ? 3.2 : 1.8) * lineScale;
      context.setLineDash(areaId === selectedAreaId ? [] : [8 * lineScale, 6 * lineScale]);
      context.stroke();
      context.restore();
    }
  }

  #drawEdges(edges, positionByLocationId, zoom) {
    const orderedEdges = [...edges].sort(compareEdgesForDrawing);
    for (const edge of orderedEdges) {
      const { sourceId, targetId } = normalizeEdgeIds(edge);
      const source = positionByLocationId.get(sourceId);
      const target = positionByLocationId.get(targetId);
      if (!source || !target) continue;
      this.#drawDirectedEdge(source, target, { editable: edgeIsEditable(edge), zoom });
    }
  }

  #drawDirectedEdge(source, target, { editable, zoom, preview = false, valid = true }) {
    const context = this.context;
    const lineScale = 1 / zoom;
    const distance = Math.hypot(target.x - source.x, target.y - source.y);
    if (distance < 1) return;
    const unitX = (target.x - source.x) / distance;
    const unitY = (target.y - source.y) / distance;
    const endpointPadding = (LOCATION_RADIUS_PX + 8) * lineScale;
    const start = {
      x: source.x + unitX * endpointPadding,
      y: source.y + unitY * endpointPadding,
    };
    const end = {
      x: target.x - unitX * endpointPadding,
      y: target.y - unitY * endpointPadding,
    };
    const drawDistance = Math.hypot(end.x - start.x, end.y - start.y);
    if (drawDistance < 4 * lineScale) return;
    const color = preview
      ? valid ? "rgba(255, 230, 146, 0.98)" : "rgba(255, 116, 132, 0.96)"
      : editable ? EDITABLE_EDGE_COLOR : DERIVED_EDGE_COLOR;
    const headLength = (preview ? 12 : 10) * lineScale;

    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = (editable || preview ? 3 : 2) * lineScale;
    context.setLineDash(
      preview
        ? [6 * lineScale, 5 * lineScale]
        : editable
          ? []
          : [10 * lineScale, 7 * lineScale],
    );
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
    context.setLineDash([]);

    context.beginPath();
    context.moveTo(end.x, end.y);
    context.lineTo(
      end.x - unitX * headLength - unitY * headLength * 0.48,
      end.y - unitY * headLength + unitX * headLength * 0.48,
    );
    context.lineTo(
      end.x - unitX * headLength + unitY * headLength * 0.48,
      end.y - unitY * headLength - unitX * headLength * 0.48,
    );
    context.closePath();
    context.fill();

    if (!editable && !preview) {
      const midpoint = {
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2,
      };
      const size = 5.5 * lineScale;
      context.translate(midpoint.x, midpoint.y);
      context.rotate(Math.PI / 4);
      context.fillStyle = "rgba(5, 18, 31, 0.94)";
      context.strokeStyle = DERIVED_EDGE_COLOR;
      context.lineWidth = 1.8 * lineScale;
      context.fillRect(-size, -size, size * 2, size * 2);
      context.strokeRect(-size, -size, size * 2, size * 2);
    }
    context.restore();
  }

  #drawBeeOverlay({
    centerByAreaId,
    selectedAreaId,
    beeTargetAreaId,
    beeTargetValid,
    dragPreview,
    zoom,
  }) {
    const context = this.context;
    const lineScale = 1 / zoom;
    const selectedCenter = centerByAreaId.get(selectedAreaId);
    const targetCenter = centerByAreaId.get(beeTargetAreaId);

    if (selectedCenter) {
      context.save();
      polygonPath(
        context,
        hexCorners(selectedCenter.x, selectedCenter.y, WORLD_CONFIG.hexSize - 10),
      );
      context.strokeStyle = "rgba(255, 221, 120, 0.98)";
      context.lineWidth = 4 * lineScale;
      context.setLineDash([16 * lineScale, 7 * lineScale]);
      context.stroke();
      context.restore();
    }

    if (targetCenter && beeTargetAreaId !== selectedAreaId) {
      const valid = Boolean(beeTargetValid);
      context.save();
      polygonPath(
        context,
        hexCorners(targetCenter.x, targetCenter.y, WORLD_CONFIG.hexSize - 13),
      );
      context.fillStyle = valid ? "rgba(92, 231, 160, 0.12)" : "rgba(255, 105, 126, 0.14)";
      context.strokeStyle = valid ? "rgba(124, 240, 177, 0.96)" : "rgba(255, 119, 137, 0.96)";
      context.lineWidth = 4 * lineScale;
      context.setLineDash(valid ? [] : [8 * lineScale, 6 * lineScale]);
      context.fill();
      context.stroke();
      context.restore();
      this.#drawWorldLabel(
        valid ? "INTERCAMBIAR ZONAS" : "ANILLO INCOMPATIBLE",
        targetCenter.x,
        targetCenter.y,
        zoom,
        valid ? "rgba(14, 65, 44, 0.94)" : "rgba(75, 20, 31, 0.94)",
      );
    }

    const preview = dragPreview?.type === "area" ? dragPreview : null;
    const direct = preview?.world ?? preview?.position ?? preview;
    if (Number.isFinite(direct?.x) && Number.isFinite(direct?.y)) {
      context.save();
      polygonPath(
        context,
        hexCorners(direct.x, direct.y, WORLD_CONFIG.hexSize - 18),
      );
      context.globalAlpha = 0.5;
      context.fillStyle = "rgba(255, 215, 112, 0.16)";
      context.strokeStyle = "rgba(255, 229, 154, 0.92)";
      context.lineWidth = 3 * lineScale;
      context.setLineDash([10 * lineScale, 7 * lineScale]);
      context.fill();
      context.stroke();
      context.restore();
    }
  }

  #drawLocations({
    locations,
    positionByLocationId,
    rawPositionByLocationId,
    selectedLocationId,
    hoveredLocationId,
    dragPreview,
    activeTool,
    zoom,
  }) {
    const context = this.context;
    const lineScale = 1 / zoom;
    const isSpider = String(activeTool).toLowerCase() === "spider";
    const previewLocationId = dragPreview?.locationId ?? selectedLocationId;
    const hasLocationPreview = Boolean(
      dragPreview
      && dragPreview.type !== "area"
      && previewLocationId,
    );

    for (const location of locations) {
      const position = positionByLocationId.get(location.id);
      if (!position) continue;
      const selected = isSpider && location.id === selectedLocationId;
      const hovered = isSpider && location.id === hoveredLocationId;
      const previewed = hasLocationPreview && location.id === previewLocationId;
      const rawPosition = rawPositionByLocationId.get(location.id);

      if (
        previewed
        && rawPosition
        && Math.hypot(position.x - rawPosition.x, position.y - rawPosition.y) > 0.5
      ) {
        context.save();
        context.globalAlpha = 0.27;
        this.#drawLocationMarker(location, rawPosition, zoom);
        context.restore();
        context.save();
        context.strokeStyle = "rgba(255, 220, 118, 0.62)";
        context.lineWidth = 1.5 * lineScale;
        context.setLineDash([6 * lineScale, 5 * lineScale]);
        context.beginPath();
        context.moveTo(rawPosition.x, rawPosition.y);
        context.lineTo(position.x, position.y);
        context.stroke();
        context.restore();
      }

      if (hovered || selected || previewed) {
        context.save();
        context.beginPath();
        context.arc(
          position.x,
          position.y,
          (hovered ? 25 : 29) * lineScale,
          0,
          TWO_PI,
        );
        let highlightStroke = "rgba(111, 229, 255, 0.92)";
        if (selected || previewed) highlightStroke = "rgba(255, 218, 111, 0.98)";
        if (previewed && dragPreview?.valid === false) {
          highlightStroke = "rgba(255, 116, 132, 0.98)";
        }
        context.strokeStyle = highlightStroke;
        context.lineWidth = (selected ? 3.2 : 2.1) * lineScale;
        context.setLineDash(previewed ? [5 * lineScale, 4 * lineScale] : []);
        context.stroke();
        context.restore();
      }

      this.#drawLocationMarker(location, position, zoom);

      context.save();
      context.textAlign = "center";
      context.textBaseline = "top";
      context.font = `750 ${11 * lineScale}px system-ui, sans-serif`;
      context.fillStyle = "rgba(242, 251, 255, 0.94)";
      context.fillText(
        location.shortTitle ?? location.title ?? location.id,
        position.x,
        position.y + 27 * lineScale,
      );
      context.font = `650 ${8.3 * lineScale}px ui-monospace, monospace`;
      context.fillStyle = "rgba(129, 225, 255, 0.68)";
      context.fillText(location.id ?? "", position.x, position.y + 42 * lineScale);
      context.restore();

      if (selected) {
        const handleX = position.x + 31 * lineScale;
        context.save();
        context.fillStyle = "rgba(255, 216, 105, 1)";
        context.strokeStyle = "rgba(39, 27, 5, 0.92)";
        context.lineWidth = 2 * lineScale;
        context.beginPath();
        context.arc(handleX, position.y, 7 * lineScale, 0, TWO_PI);
        context.fill();
        context.stroke();
        context.restore();
      }
    }
  }

  #drawLocationMarker(location, position, zoom) {
    const context = this.context;
    const lineScale = 1 / zoom;
    const radius = LOCATION_RADIUS_PX * lineScale;

    context.save();
    context.translate(position.x, position.y);
    context.fillStyle = "rgba(9, 39, 59, 0.98)";
    context.strokeStyle = "rgba(123, 229, 255, 0.94)";
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
      case "mission":
        context.beginPath();
        for (let index = 0; index < 10; index += 1) {
          const angle = -Math.PI / 2 + index * Math.PI / 5;
          const pointRadius = index % 2 === 0 ? radius : radius * 0.48;
          const x = Math.cos(angle) * pointRadius;
          const y = Math.sin(angle) * pointRadius;
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.closePath();
        break;
      case "transport":
        roundedRectPath(
          context,
          -radius,
          -radius * 0.72,
          radius * 2,
          radius * 1.44,
          5 * lineScale,
        );
        break;
      case "gadget":
        polygonPath(context, hexCorners(0, 0, radius));
        break;
      case "debug":
        context.beginPath();
        context.rect(-radius, -radius, radius * 2, radius * 2);
        break;
      case "npc":
      case "base":
      default:
        context.beginPath();
        context.arc(0, 0, radius, 0, TWO_PI);
        break;
    }

    context.fill();
    context.stroke();
    context.fillStyle = "#effbff";
    context.font = `850 ${11.5 * lineScale}px system-ui, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(location.marker ?? "•", 0, 0.5 * lineScale);
    context.restore();
  }

  #drawConnectionPreview({ connectionPreview, positionByLocationId, zoom }) {
    if (!connectionPreview) return;
    const sourceId = connectionPreview.sourceId
      ?? connectionPreview.sourceLocationId
      ?? connectionPreview.from;
    const targetId = connectionPreview.targetId
      ?? connectionPreview.targetLocationId
      ?? connectionPreview.to;
    const source = positionByLocationId.get(sourceId);
    const target = positionByLocationId.get(targetId)
      ?? previewPosition(connectionPreview, null, new Map());
    if (!source || !target) return;
    this.#drawDirectedEdge(source, target, {
      editable: true,
      preview: true,
      valid: connectionPreview.valid !== false,
      zoom,
    });
  }

  #drawVignette() {
    const context = this.context;
    context.save();
    const gradient = context.createRadialGradient(
      this.width / 2,
      this.height / 2,
      Math.min(this.width, this.height) * 0.25,
      this.width / 2,
      this.height / 2,
      Math.max(this.width, this.height) * 0.72,
    );
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.32)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, this.width, this.height);
    context.restore();
  }
}
