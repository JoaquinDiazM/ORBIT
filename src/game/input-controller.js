const MOVEMENT_KEYS = Object.freeze({
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  up: ["KeyW", "ArrowUp"],
  down: ["KeyS", "ArrowDown"],
});

const ACTION_KEYS = Object.freeze({
  interact: ["KeyE", "Space"],
  debug: ["F2", "Backquote"],
  knowledge: ["KeyK"],
  transport: ["KeyT"],
  escape: ["Escape"],
});

export const DIRECTIONAL_TELEPORT_KEYS = Object.freeze({
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
});

function matchesClosest(target, selector) {
  return Boolean(target?.closest?.(selector));
}

export function isTextEntryTarget(target) {
  return matchesClosest(target, "input, textarea, select, [contenteditable='true']");
}

export function isActivatableControlTarget(target) {
  return matchesClosest(target, "button, a[href], [role='button'], [role='link']");
}

export class InputController {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.actions = new Set();
    this.directionalTeleportDown = new Set();

    this.onKeyDown = (event) => {
      if (isTextEntryTarget(event.target)) {
        if (event.code === "Escape") this.actions.add("escape");
        return;
      }

      const teleportDirection = DIRECTIONAL_TELEPORT_KEYS[event.code];
      const isDirectionalTeleport = Boolean(
        teleportDirection
        && event.target === this.canvas
        && event.ctrlKey
        && !event.altKey
        && !event.metaKey
        && !event.shiftKey,
      );
      if (isDirectionalTeleport) {
        event.preventDefault();
        if (!event.repeat && !this.directionalTeleportDown.has(event.code)) {
          this.actions.add(`teleport-${teleportDirection}`);
        }
        this.directionalTeleportDown.add(event.code);
        return;
      }

      const isMappedMovement = Object.values(MOVEMENT_KEYS).some((keys) =>
        keys.includes(event.code),
      );
      const actionEntry = Object.entries(ACTION_KEYS).find(([, keys]) =>
        keys.includes(event.code),
      );
      const uiShortcutActions = new Set(["debug", "knowledge", "escape"]);
      if (isActivatableControlTarget(event.target)) {
        if (["Space", "Enter"].includes(event.code)) return;
        if (!actionEntry || !uiShortcutActions.has(actionEntry[0])) return;
      }

      if (isMappedMovement || actionEntry || event.code === "Space") {
        event.preventDefault();
      }

      if (!this.down.has(event.code) && actionEntry) {
        this.actions.add(actionEntry[0]);
      }
      this.down.add(event.code);
    };

    this.onKeyUp = (event) => {
      this.down.delete(event.code);
      this.directionalTeleportDown.delete(event.code);
    };

    this.onBlur = () => {
      this.down.clear();
      this.actions.clear();
      this.directionalTeleportDown.clear();
    };

    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
  }

  axis() {
    const pressed = (keys) => keys.some((key) => this.down.has(key));
    let x = Number(pressed(MOVEMENT_KEYS.right)) - Number(pressed(MOVEMENT_KEYS.left));
    let y = Number(pressed(MOVEMENT_KEYS.down)) - Number(pressed(MOVEMENT_KEYS.up));
    const magnitude = Math.hypot(x, y);
    if (magnitude > 1) {
      x /= magnitude;
      y /= magnitude;
    }
    return { x, y };
  }

  consume(action) {
    if (!this.actions.has(action)) return false;
    this.actions.delete(action);
    return true;
  }

  consumeDirectionalTeleport() {
    for (const direction of Object.values(DIRECTIONAL_TELEPORT_KEYS)) {
      if (!this.consume(`teleport-${direction}`)) continue;
      return direction;
    }
    return null;
  }

  destroy() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
  }
}
