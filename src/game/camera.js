import { APP_CONFIG } from "../config.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampAxis(value, boundsMin, boundsMax, halfViewport, focusMin, focusMax) {
  let minCenter = boundsMin + halfViewport;
  let maxCenter = boundsMax - halfViewport;
  let hasRange = minCenter <= maxCenter;

  const focusMinCenter = focusMax - halfViewport;
  const focusMaxCenter = focusMin + halfViewport;
  if (focusMinCenter <= focusMaxCenter) {
    minCenter = hasRange ? Math.min(minCenter, focusMinCenter) : focusMinCenter;
    maxCenter = hasRange ? Math.max(maxCenter, focusMaxCenter) : focusMaxCenter;
    hasRange = true;
  }

  return hasRange ? clamp(value, minCenter, maxCenter) : (boundsMin + boundsMax) / 2;
}

export class Camera2D {
  constructor({ x = 0, y = 0, zoom = APP_CONFIG.defaultZoom, bounds, focusBounds }) {
    this.x = x;
    this.y = y;
    this.zoom = zoom;
    this.bounds = bounds;
    // Optional content bounds keep the world reachable when a zoomed-out viewport fits.
    this.focusBounds = focusBounds;
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
  }

  resize(width, height) {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.#clampToBounds();
  }

  follow(targetX, targetY, deltaSeconds) {
    const blend = 1 - Math.exp(-APP_CONFIG.cameraFollowRate * deltaSeconds);
    this.x += (targetX - this.x) * blend;
    this.y += (targetY - this.y) * blend;
    this.#clampToBounds();
  }

  setZoom(nextZoom) {
    this.zoom = clamp(nextZoom, APP_CONFIG.minZoom, APP_CONFIG.maxZoom);
    this.#clampToBounds();
  }

  adjustZoom(delta) {
    const scale = delta > 0 ? 0.92 : 1.08;
    this.setZoom(this.zoom * scale);
  }

  zoomAt(delta, screenX, screenY) {
    const before = this.screenToWorld(screenX, screenY);
    this.adjustZoom(delta);
    const after = this.screenToWorld(screenX, screenY);
    this.x += before.x - after.x;
    this.y += before.y - after.y;
    this.#clampToBounds();
  }

  panByScreen(deltaX, deltaY) {
    if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return;
    this.x -= deltaX / this.zoom;
    this.y -= deltaY / this.zoom;
    this.#clampToBounds();
  }

  setCenter(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    this.x = x;
    this.y = y;
    this.#clampToBounds();
  }

  worldToScreen(x, y) {
    return {
      x: (x - this.x) * this.zoom + this.viewportWidth / 2,
      y: (y - this.y) * this.zoom + this.viewportHeight / 2,
    };
  }

  screenToWorld(x, y) {
    return {
      x: (x - this.viewportWidth / 2) / this.zoom + this.x,
      y: (y - this.viewportHeight / 2) / this.zoom + this.y,
    };
  }

  #clampToBounds() {
    if (!this.bounds) return;
    const halfWidth = this.viewportWidth / (2 * this.zoom);
    const halfHeight = this.viewportHeight / (2 * this.zoom);

    const minX = this.bounds.minX + halfWidth;
    const maxX = this.bounds.maxX - halfWidth;
    const minY = this.bounds.minY + halfHeight;
    const maxY = this.bounds.maxY - halfHeight;

    if (!this.focusBounds) {
      this.x = minX <= maxX
        ? clamp(this.x, minX, maxX)
        : (this.bounds.minX + this.bounds.maxX) / 2;
      this.y = minY <= maxY
        ? clamp(this.y, minY, maxY)
        : (this.bounds.minY + this.bounds.maxY) / 2;
      return;
    }

    this.x = clampAxis(
      this.x,
      this.bounds.minX,
      this.bounds.maxX,
      halfWidth,
      this.focusBounds.minX,
      this.focusBounds.maxX,
    );
    this.y = clampAxis(
      this.y,
      this.bounds.minY,
      this.bounds.maxY,
      halfHeight,
      this.focusBounds.minY,
      this.focusBounds.maxY,
    );
  }
}
