import {
  createLearningEdgeCurve,
  drawLearningEdge,
  getTreeTwoEdgeVisualStyle,
} from "../game/learning-edge-visuals.js";

// The legend canvases have a 2x backing store and share the map's curve and brush.
const PIXEL_RATIO = 2;

export function createLearningEdgeLegend(canvases) {
  const samples = [];
  for (const canvas of canvases) {
    const context = canvas.getContext?.("2d");
    if (!context) continue;
    const width = canvas.width / PIXEL_RATIO;
    const height = canvas.height / PIXEL_RATIO;
    const curve = createLearningEdgeCurve({ x: -17, y: 7 }, { x: width + 21, y: 7 });
    const style = getTreeTwoEdgeVisualStyle(canvas.dataset.learningEdge);
    context.setTransform(PIXEL_RATIO, 0, 0, PIXEL_RATIO, 0, 0);
    samples.push({ context, curve, style, width, height });
  }

  let lastTime;
  return (timeSeconds) => {
    if (timeSeconds === lastTime) return;
    for (const { context, curve, style, width, height } of samples) {
      if (!style.pulse && lastTime !== undefined) continue;
      context.clearRect(0, 0, width, height);
      drawLearningEdge(context, curve, style, { timeSeconds, lineScale: 1 });
    }
    lastTime = timeSeconds;
  };
}
