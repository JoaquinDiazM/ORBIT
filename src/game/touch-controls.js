const TAP_DISTANCE = 12;
const DOUBLE_TAP_MS = 350;
const DEAD_ZONE = 0.12;

export function joystickAxis(dx, dy, radius) {
  const length = Math.hypot(dx, dy);
  if (length <= radius * DEAD_ZONE || radius <= 0) return { x: 0, y: 0 };
  const strength = Math.min(1, (length / radius - DEAD_ZONE) / (1 - DEAD_ZONE));
  return { x: dx / length * strength, y: dy / length * strength };
}

export function createTouchMapGestures({ pick, interact, teleport, zoom }) {
  const pointers = new Map();
  let previousTap = null;
  let pinchDistance = 0;
  const distance = () => {
    const [first, second] = pointers.values();
    return Math.hypot(first.x - second.x, first.y - second.y);
  };

  return {
    down(event) {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, validTap: true });
      if (pointers.size > 1) {
        previousTap = null;
        for (const pointer of pointers.values()) pointer.validTap = false;
        pinchDistance = pointers.size === 2 ? distance() : 0;
      }
    },
    move(event) {
      const pointer = pointers.get(event.pointerId);
      if (!pointer) return;
      if (pointers.size === 1) {
        if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > TAP_DISTANCE) {
          pointer.validTap = false;
          previousTap = null;
        }
      } else {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        if (pointers.size === 2) {
          const next = distance();
          if (next > 0 && pinchDistance > 0) zoom(next / pinchDistance);
          pinchDistance = next;
        }
      }
    },
    up(event) {
      const pointer = pointers.get(event.pointerId);
      pointers.delete(event.pointerId);
      pinchDistance = 0;
      if (!pointer?.validTap || Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > TAP_DISTANCE) {
        previousTap = null;
        return;
      }
      const { location, area } = pick(event);
      if (location) {
        previousTap = null;
        interact(location);
      } else if (area?.id && previousTap?.id === area.id
        && event.timeStamp >= previousTap.time && event.timeStamp - previousTap.time <= DOUBLE_TAP_MS) {
        previousTap = null;
        teleport(area);
      } else {
        previousTap = area?.id ? { id: area.id, time: event.timeStamp } : null;
      }
    },
    cancel(event) {
      if (pointers.delete(event.pointerId)) {
        previousTap = null;
        pinchDistance = 0;
      }
    },
    reset() {
      pointers.clear();
      previousTap = null;
      pinchDistance = 0;
    },
  };
}

export function attachTouchControls({ canvas, controls, isBlocked, pick, interact, teleport, zoom, cycleTransport }) {
  const joystick = controls.querySelector(".touch-joystick");
  const thumb = joystick.querySelector("span");
  const gesture = createTouchMapGestures({ pick, interact, teleport, zoom });
  const controller = new AbortController();
  const listen = (target, type, handler) => target.addEventListener(type, handler, { signal: controller.signal });
  let axis = { x: 0, y: 0 };
  let joystickPointer = null;
  let blocked = false;
  const reset = () => {
    joystickPointer = null;
    axis = { x: 0, y: 0 };
    thumb.style.transform = "";
    gesture.reset();
  };
  const moveJoystick = (event) => {
    if (joystickPointer !== event.pointerId) return;
    const { left, top, width, height } = joystick.getBoundingClientRect();
    const radius = Math.min(width, height) * 0.36;
    axis = joystickAxis(event.clientX - left - width / 2, event.clientY - top - height / 2, radius);
    thumb.style.transform = `translate(${axis.x * radius}px, ${axis.y * radius}px)`;
  };
  listen(joystick, "pointerdown", (event) => {
    if (event.pointerType !== "touch" || joystickPointer !== null || isBlocked()) return;
    joystickPointer = event.pointerId;
    joystick.setPointerCapture(event.pointerId);
    moveJoystick(event);
  });
  listen(joystick, "pointermove", moveJoystick);
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    listen(joystick, type, (event) => {
      if (joystickPointer !== event.pointerId) return;
      joystickPointer = null;
      axis = { x: 0, y: 0 };
      thumb.style.transform = "";
    });
  }
  listen(canvas, "pointerdown", (event) => {
    if (event.pointerType !== "touch" || isBlocked()) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    gesture.down(event);
  });
  listen(canvas, "pointermove", (event) => gesture.move(event));
  listen(canvas, "pointerup", (event) => {
    if (event.pointerType !== "touch") return;
    if (isBlocked()) gesture.cancel(event);
    else gesture.up(event);
  });
  for (const type of ["pointercancel", "lostpointercapture"]) listen(canvas, type, gesture.cancel);
  for (const button of controls.querySelectorAll("[data-zoom-factor]")) {
    listen(button, "click", () => { if (!isBlocked()) zoom(Number(button.dataset.zoomFactor)); });
  }
  listen(controls.querySelector("[data-touch-transport]"), "click", () => {
    if (!isBlocked()) cycleTransport();
  });
  listen(window, "blur", reset);
  listen(document, "visibilitychange", reset);
  return {
    axis() {
      const next = isBlocked();
      if (next !== blocked) {
        blocked = next;
        controls.hidden = next;
        if (next) reset();
      }
      return axis;
    },
    destroy() {
      reset();
      controller.abort();
    },
  };
}
