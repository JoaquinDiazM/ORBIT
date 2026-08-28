import { APP_CONFIG } from "../config.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class Camera2D {
  constructor({ x = 0, y = 0, zoom = APP_CONFIG.defaultZoom, bounds }) {
    this.x = x;
    this.y = y;
    this.zoom = zoom;
    this.bounds = bounds;
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

    this.x = minX <= maxX ? clamp(this.x, minX, maxX) : (this.bounds.minX + this.bounds.maxX) / 2;
    this.y = minY <= maxY ? clamp(this.y, minY, maxY) : (this.bounds.minY + this.bounds.maxY) / 2;
  }
}
