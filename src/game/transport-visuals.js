const TRAIL_PROFILES = Object.freeze({
  walk: {
    interval: 0.085, lifetime: 0.34, rear: 12, side: 5, color: "#c5d3d9",
    bobRate: 3.2, bobHeight: 0.8,
  },
  "electric-cart": {
    interval: 0.052, lifetime: 0.56, rear: 19, side: 4, color: "#c3b5a4",
    bobRate: 5, bobHeight: 0.35,
  },
  "radio-skiff": {
    interval: 0.032, lifetime: 0.32, rear: 21, side: 0, color: "#78e3ff",
    bobRate: 3.7, bobHeight: 1.6,
  },
});

export class TransportVisuals {
  #particles = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.#particles.length = 0;
    this.transportId = null;
    this.previous = null;
    this.lastEmission = -Infinity;
    this.phase = 0;
    this.bob = 0;
    this.moving = false;
  }

  update({ player, transportId, movementDistance, timeSeconds, lineScale, reducedMotion }) {
    if (reducedMotion) {
      if (this.transportId !== null) this.reset();
      return;
    }

    // The frame reports accepted movement. A larger position change is a jump,
    // for example after teleporting or restoring a save.
    const id = Object.hasOwn(TRAIL_PROFILES, transportId) ? transportId : "walk";
    if (this.transportId !== id || (this.previous && (
      timeSeconds < this.previous.timeSeconds
      || Math.hypot(player.x - this.previous.x, player.y - this.previous.y) > movementDistance + 0.05
    ))) {
      this.reset();
    }
    this.transportId = id;
    this.previous = { x: player.x, y: player.y, timeSeconds };
    this.moving = movementDistance > 0.001;
    this.phase = (this.phase + movementDistance / 12) % (Math.PI * 2);
    const profile = TRAIL_PROFILES[id];
    this.bob = id === "walk" && this.moving
      ? 1.15 * Math.sin(this.phase * 2)
      : Math.sin(timeSeconds * profile.bobRate) * profile.bobHeight;

    while (this.#particles.length && timeSeconds - this.#particles[0].born >= profile.lifetime) {
      this.#particles.shift();
    }
    if (!this.moving || timeSeconds - this.lastEmission < profile.interval) return;

    const dx = Math.cos(player.heading);
    const dy = Math.sin(player.heading);
    const side = Math.sign(Math.cos(this.phase)) * profile.side;
    this.#particles.push({
      x: player.x - (dx * profile.rear + dy * side) * lineScale,
      y: player.y - (dy * profile.rear - dx * side) * lineScale,
      dx,
      dy,
      born: timeSeconds,
    });
    this.lastEmission = timeSeconds;
  }

  drawTrail(context, timeSeconds, lineScale) {
    if (!this.#particles.length) return;
    const profile = TRAIL_PROFILES[this.transportId];
    const wake = this.transportId === "radio-skiff";
    const dustScale = this.transportId === "electric-cart" ? 1 : 0.52;
    context.save();
    context.fillStyle = profile.color;
    context.strokeStyle = profile.color;
    context.lineCap = "round";

    for (const particle of this.#particles) {
      const age = (timeSeconds - particle.born) / profile.lifetime;
      const strength = 1 - age;
      context.beginPath();
      if (wake) {
        const length = (10 + 10 * age) * lineScale;
        context.globalAlpha = 0.64 * strength;
        context.lineWidth = (1.2 + 2.8 * strength) * lineScale;
        context.moveTo(particle.x + particle.dx * length * 0.3, particle.y + particle.dy * length * 0.3);
        context.lineTo(particle.x - particle.dx * length, particle.y - particle.dy * length);
        context.stroke();
      } else {
        const drift = 9 * age * lineScale;
        context.globalAlpha = 0.46 * strength;
        context.arc(
          particle.x - particle.dx * drift,
          particle.y - particle.dy * drift,
          (2.3 + 4.4 * age) * dustScale * lineScale,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
    }
    context.restore();
  }
}
