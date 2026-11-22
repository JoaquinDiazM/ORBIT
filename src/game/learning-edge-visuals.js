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
  context.fillStyle = style.color;
  context.lineWidth = style.lineWidth;
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.quadraticCurveTo(control.x, control.y, end.x, end.y);
  context.stroke();

  // The arrow points along the tangent at the target, independently of the pulses.
  const tangentX = end.x - control.x;
  const tangentY = end.y - control.y;
  const headLength = Math.min(9 * lineScale, length * 0.28);
  const scale = headLength / Math.hypot(tangentX, tangentY);
  const headX = tangentX * scale;
  const headY = tangentY * scale;
  context.beginPath();
  context.moveTo(end.x, end.y);
  context.lineTo(end.x - headX + headY * 0.48, end.y - headY - headX * 0.48);
  context.lineTo(end.x - headX - headY * 0.48, end.y - headY + headX * 0.48);
  context.closePath();
  context.fill();

  if (timeSeconds !== null) {
    const muted = style.lineDash.length > 0;
    const pulseCount = length < 70 * lineScale ? 1 : 3;
    const radius = (muted ? 1.25 : 2.45) * lineScale;
    context.shadowBlur = 0;
    context.fillStyle = muted ? "#ffe19b" : "#fff5d1";
    for (let index = 0; index < pulseCount; index += 1) {
      const t = (timeSeconds * 0.58 + curve.phase + index / pulseCount) % 1;
      const point = pointOnLearningEdge(curve, t);
      context.globalAlpha = (muted ? 0.6 : 0.96) * Math.min(1, t * 12, (1 - t) * 12);
      context.beginPath();
      context.arc(point.x, point.y, radius, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();
}
