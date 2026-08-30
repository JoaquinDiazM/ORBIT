import { hexCorners } from "./hex.js";

const TWO_PI = Math.PI * 2;
const DEFAULT_HEX_GAP = 4;

function finite(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
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
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index].x, points[index].y);
  }
  context.closePath();
}

function canonicalMotifId(areaId) {
  switch (areaId) {
    case "origin":
      return "canonical-origin";
    case "electrostatics":
      return "canonical-electrostatics";
    case "magnetism":
      return "canonical-magnetism";
    case "differential-equations":
      return "canonical-differential-equations";
    case "maxwell":
      return "canonical-maxwell";
    case "waves":
      return "canonical-waves";
    case "circuits":
      return "canonical-circuits";
    case "applications":
      return "canonical-applications";
    default:
      return "canonical-orbital-arcs";
  }
}

const ANIMATED_CANVAS_MOTIFS = new Set([
  "waves",
  "canonical-waves",
  "canonical-orbital-arcs",
]);

/**
 * Indica si la receta visual efectiva depende del tiempo. A diferencia del
 * catálogo, el motivo `canonical` necesita el ID de zona para resolver su
 * familia concreta.
 */
export function isAreaAppearanceCanvasAnimated(area, appearance = area?.appearance) {
  const motifId = appearance?.motifId === "canonical" || !appearance?.motifId
    ? canonicalMotifId(area?.id)
    : appearance.motifId;
  return ANIMATED_CANVAS_MOTIFS.has(motifId);
}

/**
 * Materializa el contrato visual común que consumen ORBIT estudiante y ORBIT editor.
 * La receta es deliberadamente serializable para poder detectar divergencias entre vistas.
 */
export function createAreaAppearanceCanvasRecipe(
  area,
  appearance,
  {
    center = { x: 0, y: 0 },
    zoom = 1,
    timeSeconds = 0,
    hexSize = 230,
    hexGap = DEFAULT_HEX_GAP,
  } = {},
) {
  const safeCenter = {
    x: finite(center?.x, 0),
    y: finite(center?.y, 0),
  };
  const safeZoom = Math.max(0.01, finite(zoom, 1));
  const safeHexSize = Math.max(1, finite(hexSize, 230));
  const safeHexGap = Math.max(0, finite(hexGap, DEFAULT_HEX_GAP));
  const lineScale = 1 / safeZoom;
  const motifId = appearance?.motifId === "canonical"
    ? canonicalMotifId(area?.id)
    : appearance?.motifId;
  const contourId = appearance?.contourId ?? "canonical";
  const accent = appearance?.accent ?? "#78e3ff";
  const color = appearance?.color ?? "#214765";

  return {
    fill: {
      gradient: [
        safeCenter.x - 50,
        safeCenter.y - 70,
        20,
        safeCenter.x,
        safeCenter.y,
        safeHexSize * 1.15,
      ],
      stops: [
        [0, withAlpha(accent, 0.32)],
        [0.52, withAlpha(color, 0.75)],
        [1, withAlpha(color, 0.42)],
      ],
    },
    motif: {
      id: motifId,
      accent,
      alpha: 0.22,
      lineWidth: 1.2 * lineScale,
      order: finite(area?.order, 0),
      timeSeconds: finite(timeSeconds, 0),
    },
    contour: {
      id: contourId,
      strokeStyle: withAlpha(accent, contourId === "canonical" ? 0.48 : 0.88),
      lineWidth: (contourId === "solid" ? 3.1 : 2.2) * lineScale,
      lineDash: contourId === "dashed" ? [13 * lineScale, 8 * lineScale] : [],
      innerLineWidth: 1.35 * lineScale,
      innerCorners: contourId === "double"
        ? hexCorners(safeCenter.x, safeCenter.y, safeHexSize - 16)
        : null,
    },
    corners: hexCorners(
      safeCenter.x,
      safeCenter.y,
      Math.max(1, safeHexSize - safeHexGap),
    ),
    center: safeCenter,
  };
}

function drawMotif(context, recipe) {
  const { center, motif } = recipe;
  const scale = motif.lineWidth / 1.2;

  context.save();
  context.globalAlpha = motif.alpha;
  context.strokeStyle = motif.accent;
  context.fillStyle = motif.accent;
  context.lineWidth = motif.lineWidth;

  switch (motif.id) {
    case "none":
      break;
    case "constellation": {
      const points = [
        [-116, 62],
        [-65, -82],
        [4, 24],
        [76, -96],
        [125, 54],
        [42, 112],
      ];
      context.beginPath();
      for (const [index, [x, y]] of points.entries()) {
        if (index === 0) context.moveTo(center.x + x, center.y + y);
        else context.lineTo(center.x + x, center.y + y);
      }
      context.stroke();
      for (const [x, y] of points) {
        context.beginPath();
        context.arc(center.x + x, center.y + y, 4.2 * scale, 0, TWO_PI);
        context.fill();
      }
      break;
    }
    case "waves":
      for (let row = -112; row <= 112; row += 44) {
        context.beginPath();
        for (let x = -190; x <= 190; x += 10) {
          const y = row + Math.sin(x * 0.045 + motif.timeSeconds * 1.2) * 13;
          if (x === -190) context.moveTo(center.x + x, center.y + y);
          else context.lineTo(center.x + x, center.y + y);
        }
        context.stroke();
      }
      break;
    case "canonical-origin":
      for (let radius = 46; radius <= 166; radius += 40) {
        context.beginPath();
        context.arc(center.x, center.y, radius, 0, TWO_PI);
        context.stroke();
      }
      break;
    case "canonical-electrostatics": {
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
    case "canonical-magnetism":
      for (let radius = 40; radius <= 170; radius += 33) {
        context.beginPath();
        context.arc(center.x, center.y, radius, -Math.PI * 0.78, Math.PI * 0.76);
        context.stroke();
      }
      break;
    case "canonical-differential-equations":
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
    case "canonical-maxwell":
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
    case "canonical-waves":
      for (let row = -120; row <= 120; row += 42) {
        context.beginPath();
        for (let x = -180; x <= 180; x += 8) {
          const y = row + Math.sin(x * 0.045 + motif.timeSeconds) * 12;
          if (x === -180) context.moveTo(center.x + x, center.y + y);
          else context.lineTo(center.x + x, center.y + y);
        }
        context.stroke();
      }
      break;
    case "canonical-circuits":
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
    case "canonical-applications":
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
    case "canonical-orbital-arcs":
    default:
      for (let radius = 44; radius <= 154; radius += 36) {
        const phase = (motif.order % 6) * (Math.PI / 3) + motif.timeSeconds * 0.04;
        context.beginPath();
        context.arc(center.x, center.y, radius, phase, phase + Math.PI * 1.35);
        context.stroke();
      }
      break;
  }
  context.restore();
}

/** Dibuja relleno, motivo y contorno mediante una única receta compartida. */
export function drawAreaAppearanceCanvas(context, options) {
  const recipe = createAreaAppearanceCanvasRecipe(
    options.area,
    options.appearance,
    options,
  );

  context.save();
  polygonPath(context, recipe.corners);
  const gradient = context.createRadialGradient(...recipe.fill.gradient);
  for (const [offset, color] of recipe.fill.stops) gradient.addColorStop(offset, color);
  context.fillStyle = gradient;
  context.fill();
  context.clip();
  drawMotif(context, recipe);
  context.restore();

  context.save();
  context.strokeStyle = recipe.contour.strokeStyle;
  context.lineWidth = recipe.contour.lineWidth;
  context.setLineDash(recipe.contour.lineDash);
  polygonPath(context, recipe.corners);
  context.stroke();
  if (recipe.contour.innerCorners) {
    context.lineWidth = recipe.contour.innerLineWidth;
    polygonPath(context, recipe.contour.innerCorners);
    context.stroke();
  }
  context.setLineDash([]);
  context.restore();

  return recipe;
}
