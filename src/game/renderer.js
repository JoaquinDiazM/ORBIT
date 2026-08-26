import { APP_CONFIG } from "../config.js";
import { LOCATIONS } from "../data/locations.js";
import { AREAS, WORLD_CONFIG } from "../data/world.js";
import { axialToPixel, hexCorners, hexEdge } from "../core/hex.js";
import {
  createWorldIndex,
  getLocationWorldPosition,
  getNeighborArea,
} from "../core/world-graph.js";

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

function drawArrow(context, x, y, dx, dy, color, width = 2) {
  const length = Math.hypot(dx, dy);
  if (length < 0.001) return;
  const unitX = dx / length;
  const unitY = dy / length;
  const headLength = Math.min(9, Math.max(5, length * 0.3));

  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = width;
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x + dx, y + dy);
  context.stroke();

  const tipX = x + dx;
  const tipY = y + dy;
  context.beginPath();
  context.moveTo(tipX, tipY);
  context.lineTo(
    tipX - unitX * headLength - unitY * headLength * 0.48,
    tipY - unitY * headLength + unitX * headLength * 0.48,
  );
  context.lineTo(
    tipX - unitX * headLength + unitY * headLength * 0.48,
    tipY - unitY * headLength - unitX * headLength * 0.48,
  );
  context.closePath();
  context.fill();
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

export class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { alpha: false });
    if (!this.context) throw new Error("Canvas 2D no está disponible en este navegador.");

    this.width = 0;
    this.height = 0;
    this.pixelRatio = 1;
    this.worldIndex = createWorldIndex(AREAS);
    this.locationById = new Map(LOCATIONS.map((location) => [location.id, location]));
    this.stars = this.#createStars(WORLD_CONFIG.backgroundStars);
    this.resize();
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

  render({ camera, player, snapshot, nearestLocation, debugState, timeSeconds }) {
    this.resize();
    const context = this.context;
    context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    context.clearRect(0, 0, this.width, this.height);

    this.#drawBackground(camera, timeSeconds);

    context.save();
    context.translate(this.width / 2, this.height / 2);
    context.scale(camera.zoom, camera.zoom);
    context.translate(-camera.x, -camera.y);

    this.#drawAreas(snapshot, camera.zoom, timeSeconds, debugState);
    if (debugState.showGraph) this.#drawKnowledgeGraphs(snapshot, camera.zoom);
    if (snapshot.state.settings.fieldLensEnabled) {
      this.#drawFieldLens(snapshot, camera.zoom, timeSeconds);
    }
    this.#drawAreaEdges(snapshot, camera.zoom, timeSeconds);
    this.#drawLocations(snapshot, nearestLocation, camera.zoom, timeSeconds, debugState);
    this.#drawPlayer(player, snapshot.activeTransport, camera.zoom, timeSeconds);

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

  #drawAreas(snapshot, zoom, timeSeconds, debugState) {
    const context = this.context;
    const lineScale = 1 / zoom;

    for (const area of AREAS) {
      const center = axialToPixel(area.q, area.r, WORLD_CONFIG.hexSize);
      const corners = hexCorners(center.x, center.y, WORLD_CONFIG.hexSize - 4);
      const unlocked = snapshot.unlockedAreaIds.has(area.id);

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
      if (unlocked) {
        fill.addColorStop(0, withAlpha(area.accent, 0.32));
        fill.addColorStop(0.52, withAlpha(area.color, 0.75));
        fill.addColorStop(1, withAlpha(area.color, 0.42));
      } else {
        fill.addColorStop(0, "rgba(24, 38, 54, 0.78)");
        fill.addColorStop(1, "rgba(8, 17, 29, 0.9)");
      }
      context.fillStyle = fill;
      context.fill();

      polygonPath(context, corners);
      context.clip();
      this.#drawTerrainPattern(area, center, unlocked, zoom, timeSeconds);
      if (!unlocked) this.#drawLockedHatching(center, zoom);
      context.restore();

      context.save();
      polygonPath(context, corners);
      context.strokeStyle = unlocked ? withAlpha(area.accent, 0.48) : "rgba(120, 149, 170, 0.17)";
      context.lineWidth = (unlocked ? 2.2 : 1.2) * lineScale;
      context.stroke();
      context.restore();

      context.save();
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = unlocked ? "rgba(238, 250, 255, 0.82)" : "rgba(167, 187, 201, 0.5)";
      context.font = `700 ${17 * lineScale}px system-ui, sans-serif`;
      context.fillText(area.shortTitle, center.x, center.y - WORLD_CONFIG.hexSize * 0.71);
      context.font = `600 ${9.5 * lineScale}px system-ui, sans-serif`;
      context.fillStyle = unlocked ? withAlpha(area.accent, 0.78) : "rgba(150, 169, 184, 0.43)";
      context.fillText(
        unlocked ? "ZONA ABIERTA" : "ARISTAS BLOQUEADAS",
        center.x,
        center.y - WORLD_CONFIG.hexSize * 0.61,
      );

      if (debugState.showCoords) {
        context.font = `600 ${9 * lineScale}px ui-monospace, monospace`;
        context.fillStyle = "rgba(181, 224, 243, 0.55)";
        context.fillText(`hex(${area.q}, ${area.r})`, center.x, center.y + WORLD_CONFIG.hexSize * 0.72);
      }
      context.restore();
    }
  }

  #drawTerrainPattern(area, center, unlocked, zoom, timeSeconds) {
    const context = this.context;
    const scale = 1 / zoom;
    context.save();
    context.globalAlpha = unlocked ? 0.22 : 0.09;
    context.strokeStyle = area.accent;
    context.fillStyle = area.accent;
    context.lineWidth = 1.2 * scale;

    switch (area.id) {
      case "origin": {
        for (let radius = 46; radius <= 166; radius += 40) {
          context.beginPath();
          context.arc(center.x, center.y, radius, 0, Math.PI * 2);
          context.stroke();
        }
        break;
      }
      case "electrostatics": {
        const signs = [
          [-118, -10, "+"],
          [96, 76, "−"],
          [82, -92, "+"],
          [-65, 108, "−"],
        ];
        context.font = `700 ${20 * scale}px Georgia, serif`;
        context.textAlign = "center";
        for (const [x, y, sign] of signs) context.fillText(sign, center.x + x, center.y + y);
        break;
      }
      case "magnetism": {
        for (let radius = 40; radius <= 170; radius += 33) {
          context.beginPath();
          context.arc(center.x, center.y, radius, -Math.PI * 0.78, Math.PI * 0.76);
          context.stroke();
        }
        break;
      }
      case "differential-equations": {
        for (let x = -140; x <= 140; x += 56) {
          for (let y = -120; y <= 120; y += 48) {
            const slope = Math.sin((x + y) * 0.018) * 13;
            context.beginPath();
            context.moveTo(center.x + x - 12, center.y + y + slope);
            context.lineTo(center.x + x + 12, center.y + y - slope);
            context.stroke();
          }
        }
        break;
      }
      case "maxwell": {
        for (let offset = -170; offset <= 170; offset += 38) {
          context.beginPath();
          context.moveTo(center.x - 180, center.y + offset);
          context.lineTo(center.x + 180, center.y + offset);
          context.stroke();
          context.beginPath();
          context.moveTo(center.x + offset, center.y - 180);
          context.lineTo(center.x + offset, center.y + 180);
          context.stroke();
        }
        break;
      }
      case "waves": {
        for (let row = -120; row <= 120; row += 42) {
          context.beginPath();
          for (let x = -180; x <= 180; x += 8) {
            const y = row + Math.sin(x * 0.045 + timeSeconds) * 12;
            if (x === -180) context.moveTo(center.x + x, center.y + y);
            else context.lineTo(center.x + x, center.y + y);
          }
          context.stroke();
        }
        break;
      }
      case "circuits": {
        for (let row = -100; row <= 100; row += 50) {
          context.beginPath();
          context.moveTo(center.x - 150, center.y + row);
          context.lineTo(center.x - 45, center.y + row);
          context.lineTo(center.x - 25, center.y + row - 18);
          context.lineTo(center.x + 15, center.y + row + 18);
          context.lineTo(center.x + 35, center.y + row);
          context.lineTo(center.x + 150, center.y + row);
          context.stroke();
        }
        break;
      }
      case "applications": {
        for (let index = -2; index <= 2; index += 1) {
          const x = center.x + index * 66;
          context.beginPath();
          context.moveTo(x, center.y + 95);
          context.lineTo(x, center.y - 62);
          context.stroke();
          context.beginPath();
          context.arc(x, center.y - 62, 30, Math.PI * 0.05, Math.PI * 0.95);
          context.stroke();
        }
        break;
      }
      default:
        for (let radius = 44; radius <= 154; radius += 36) {
          const phase = (area.order % 6) * (Math.PI / 3) + timeSeconds * 0.04;
          context.beginPath();
          context.arc(center.x, center.y, radius, phase, phase + Math.PI * 1.35);
          context.stroke();
        }
        break;
    }
    context.restore();
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

    for (const area of AREAS) {
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

  #drawKnowledgeGraphs(snapshot, zoom) {
    const context = this.context;
    const lineScale = 1 / zoom;
    const conceptSourceLocation = new Map();
    for (const location of LOCATIONS) {
      for (const conceptId of location.grants?.concepts ?? []) {
        conceptSourceLocation.set(conceptId, location);
      }
    }

    context.save();
    context.setLineDash([10 * lineScale, 7 * lineScale]);
    context.lineWidth = 1.6 * lineScale;

    for (const area of AREAS) {
      for (const conceptId of area.requirements?.concepts ?? []) {
        const sourceLocation = conceptSourceLocation.get(conceptId);
        if (!sourceLocation) continue;
        const sourceArea = this.worldIndex.byId.get(sourceLocation.areaId);
        const source = axialToPixel(sourceArea.q, sourceArea.r, WORLD_CONFIG.hexSize);
        const target = axialToPixel(area.q, area.r, WORLD_CONFIG.hexSize);
        context.strokeStyle = "rgba(120, 227, 255, 0.58)";
        context.beginPath();
        context.moveTo(source.x, source.y);
        context.lineTo(target.x, target.y);
        context.stroke();
      }
    }

    for (const location of LOCATIONS) {
      const target = getLocationWorldPosition(location, this.worldIndex, WORLD_CONFIG.hexSize);
      for (const prerequisiteId of location.requirements?.completedLocations ?? []) {
        const sourceLocation = this.locationById.get(prerequisiteId);
        if (!sourceLocation) continue;
        const source = getLocationWorldPosition(sourceLocation, this.worldIndex, WORLD_CONFIG.hexSize);
        context.strokeStyle = "rgba(255, 182, 237, 0.52)";
        context.beginPath();
        context.moveTo(source.x, source.y);
        context.lineTo(target.x, target.y);
        context.stroke();
      }
    }
    context.restore();
  }

  #drawFieldLens(snapshot, zoom, timeSeconds) {
    const sourceLocation = this.locationById.get("coulomb-observatory");
    if (!sourceLocation || !snapshot.unlockedAreaIds.has(sourceLocation.areaId)) return;
    const source = getLocationWorldPosition(sourceLocation, this.worldIndex, WORLD_CONFIG.hexSize);
    const context = this.context;
    const lineScale = 1 / zoom;

    context.save();
    context.globalCompositeOperation = "lighter";
    for (let x = -230; x <= 230; x += 46) {
      for (let y = -184; y <= 184; y += 46) {
        const px = source.x + x;
        const py = source.y + y;
        const distance = Math.hypot(x, y);
        if (distance < 32 || distance > 245) continue;
        const magnitude = Math.min(24, 720 / Math.max(32, distance));
        const wobble = 1 + 0.05 * Math.sin(timeSeconds * 1.5 + distance * 0.03);
        const dx = (x / distance) * magnitude * wobble;
        const dy = (y / distance) * magnitude * wobble;
        drawArrow(context, px - dx * 0.5, py - dy * 0.5, dx, dy, "rgba(115, 226, 255, 0.46)", 1.25 * lineScale);
      }
    }
    context.restore();
  }

  #drawLocations(snapshot, nearestLocation, zoom, timeSeconds, debugState) {
    const context = this.context;
    const lineScale = 1 / zoom;

    for (const location of LOCATIONS) {
      if (!snapshot.visibleLocationIds.has(location.id)) continue;
      const position = getLocationWorldPosition(location, this.worldIndex, WORLD_CONFIG.hexSize);
      const accessible = snapshot.accessibleLocationIds.has(location.id);
      const completed = snapshot.completedLocationIds.has(location.id);
      const isNearest = nearestLocation?.id === location.id;

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
      });

      context.save();
      context.textAlign = "center";
      context.textBaseline = "top";
      context.font = `700 ${10.8 * lineScale}px system-ui, sans-serif`;
      context.fillStyle = accessible
        ? "rgba(244, 251, 255, 0.9)"
        : "rgba(159, 177, 190, 0.56)";
      context.fillText(location.shortTitle, position.x, position.y + 27 * lineScale);

      if (debugState.showIds) {
        context.font = `600 ${8.2 * lineScale}px ui-monospace, monospace`;
        context.fillStyle = "rgba(120, 227, 255, 0.58)";
        context.fillText(location.id, position.x, position.y + 42 * lineScale);
      }
      context.restore();
    }
  }

  #drawLocationMarker(location, position, { accessible, completed, zoom }) {
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

  #drawPlayer(player, transport, zoom, timeSeconds) {
    const context = this.context;
    const lineScale = 1 / zoom;
    const bob = Math.sin(timeSeconds * 5.5) * 1.4 * lineScale;

    context.save();
    context.translate(player.x, player.y + bob);
    context.rotate(player.heading);

    context.fillStyle = "rgba(3, 13, 22, 0.64)";
    context.beginPath();
    context.ellipse(0, 15 * lineScale, 19 * lineScale, 8 * lineScale, 0, 0, Math.PI * 2);
    context.fill();

    if (transport.id === "electric-cart") {
      drawRoundedRect(context, -19 * lineScale, -12 * lineScale, 38 * lineScale, 24 * lineScale, 7 * lineScale);
      context.fillStyle = "#ffd166";
      context.fill();
      context.strokeStyle = "#fff4c9";
      context.lineWidth = 2 * lineScale;
      context.stroke();
      context.fillStyle = "#1b2733";
      for (const wheelX of [-12, 12]) {
        context.beginPath();
        context.arc(wheelX * lineScale, 14 * lineScale, 5 * lineScale, 0, Math.PI * 2);
        context.fill();
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
      context.strokeStyle = "rgba(120, 227, 255, 0.7)";
      context.beginPath();
      context.moveTo(-24 * lineScale, -7 * lineScale);
      context.lineTo(-42 * lineScale, -7 * lineScale);
      context.moveTo(-24 * lineScale, 7 * lineScale);
      context.lineTo(-42 * lineScale, 7 * lineScale);
      context.stroke();
    } else {
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
