const BRIGHT_PULSE = Object.freeze({ radius: 2.45, color: "#fff5d1", alpha: 0.96 });
const MUTED_PULSE = Object.freeze({ radius: 1.25, color: "#ffe19b", alpha: 0.6 });

export function getTreeTwoEdgeVisualStyle(appearance, { isNew = false, zoom = 1 } = {}) {
  const lineScale = 1 / Math.max(0.01, Number.isFinite(zoom) ? zoom : 1);
  if (appearance === "blocked") {
    return {
      color: "rgba(174, 189, 204, 0.48)",
      lineWidth: 1.4 * lineScale,
      lineDash: [3 * lineScale, 5 * lineScale],
      shadowColor: "transparent",
      shadowBlur: 0,
      pulse: null,
    };
  }
  if (appearance === "muted") {
    return {
      color: "rgba(255, 209, 102, 0.42)",
      lineWidth: 1.5 * lineScale,
      lineDash: [10 * lineScale, 7 * lineScale],
      shadowColor: isNew ? "rgba(255, 209, 102, 0.58)" : "transparent",
      shadowBlur: isNew ? 4 * lineScale : 0,
      pulse: MUTED_PULSE,
    };
  }
  return {
    color: "rgba(255, 209, 102, 0.96)",
    lineWidth: 3.4 * lineScale,
    lineDash: [],
    shadowColor: isNew ? "rgba(255, 209, 102, 0.9)" : "rgba(255, 209, 102, 0.58)",
    shadowBlur: (isNew ? 8 : 4) * lineScale,
    pulse: BRIGHT_PULSE,
  };
}

export function createLearningEdgeCurve(source, target) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return null;

  const unitX = dx / distance;
  const unitY = dy / distance;
  // Keep the usual marker clearance while preventing short links from reversing.
  const clearanceScale = Math.min(1, distance / 80);
  const start = { x: source.x + unitX * 25 * clearanceScale, y: source.y + unitY * 25 * clearanceScale };
  const end = { x: target.x - unitX * 29 * clearanceScale, y: target.y - unitY * 29 * clearanceScale };
  const length = distance - 54 * clearanceScale;
  const bend = Math.min(42, length * 0.23);
  const control = {
    x: (start.x + end.x) / 2 - unitY * bend,
    y: (start.y + end.y) / 2 + unitX * bend,
  };

  return {
    start,
    control,
    end,
    length,
    phase: Math.abs(source.x * 0.011 + source.y * 0.005) % 1,
    bounds: {
      left: Math.min(start.x, control.x, end.x),
      right: Math.max(start.x, control.x, end.x),
      top: Math.min(start.y, control.y, end.y),
      bottom: Math.max(start.y, control.y, end.y),
    },
  };
}

export function pointOnLearningEdge({ start, control, end }, t) {
  const rest = 1 - t;
  return {
    x: rest * rest * start.x + 2 * rest * t * control.x + t * t * end.x,
    y: rest * rest * start.y + 2 * rest * t * control.y + t * t * end.y,
  };
}

export function drawLearningEdge(context, curve, style, { timeSeconds, lineScale }) {
  const { start, control, end, length } = curve;
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.setLineDash(style.lineDash);
  context.shadowColor = style.shadowColor;
  context.shadowBlur = style.shadowBlur;
  context.strokeStyle = style.color;
  context.lineWidth = style.lineWidth;
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.quadraticCurveTo(control.x, control.y, end.x, end.y);
  context.stroke();

  if (timeSeconds !== null && style.pulse) {
    const { radius, color, alpha } = style.pulse;
    const pulseCount = length < 70 * lineScale ? 1 : 3;
    context.shadowBlur = 0;
    context.fillStyle = color;
    for (let index = 0; index < pulseCount; index += 1) {
      const t = (timeSeconds * 0.58 + curve.phase + index / pulseCount) % 1;
      const point = pointOnLearningEdge(curve, t);
      context.globalAlpha = alpha * Math.min(1, t * 12, (1 - t) * 12);
      context.beginPath();
      context.arc(point.x, point.y, radius * lineScale, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();
}
