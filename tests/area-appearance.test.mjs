import assert from "node:assert/strict";
import test from "node:test";

import {
  AREA_APPEARANCE_CATALOG_VERSION,
  AREA_APPEARANCE_CONTOURS,
  AREA_APPEARANCE_MOTIFS,
  AREA_APPEARANCE_PALETTES,
  DEFAULT_AREA_APPEARANCE,
  getAreaAppearanceAnimationTime,
  isAnimatedAreaAppearance,
  resolveAreaAppearance,
  sameAreaAppearance,
  sanitizeAreaAppearance,
} from "../src/core/area-appearance.js";

function channel(value) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(color) {
  const value = Number.parseInt(color.slice(1), 16);
  return (
    channel((value >> 16) & 255) * 0.2126
    + channel((value >> 8) & 255) * 0.7152
    + channel(value & 255) * 0.0722
  );
}

function contrast(first, second) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

test("el catálogo Bowerbird v1 ofrece presets estables y contrastados", () => {
  assert.equal(AREA_APPEARANCE_CATALOG_VERSION, 1);
  assert.equal(AREA_APPEARANCE_PALETTES.length, 5);
  assert.equal(new Set(AREA_APPEARANCE_PALETTES.map(({ id }) => id)).size, 5);
  assert.equal(AREA_APPEARANCE_MOTIFS.some(({ id }) => id === "none"), true);
  assert.equal(AREA_APPEARANCE_MOTIFS.some(({ animated }) => !animated), true);
  assert.equal(AREA_APPEARANCE_MOTIFS.some(({ animated }) => animated), true);
  assert.deepEqual(
    AREA_APPEARANCE_CONTOURS.map(({ id }) => id),
    ["canonical", "solid", "dashed", "double"],
  );
  for (const palette of AREA_APPEARANCE_PALETTES.filter(({ id }) => id !== "canonical")) {
    assert.ok(contrast(palette.color, palette.accent) >= 4.5, palette.id);
  }
});

test("sanitizeAreaAppearance acepta solo triples completos del catálogo", () => {
  const valid = sanitizeAreaAppearance({
    paletteId: "aurora",
    motifId: "constellation",
    contourId: "double",
  });
  assert.equal(valid.ok, true);
  assert.deepEqual(valid.appearance, {
    paletteId: "aurora",
    motifId: "constellation",
    contourId: "double",
  });

  for (const candidate of [
    null,
    { paletteId: "future", motifId: "none", contourId: "solid" },
    { paletteId: "aurora", motifId: "none", contourId: "solid", script: "no" },
  ]) {
    assert.equal(sanitizeAreaAppearance(candidate).ok, false);
  }
});

test("resolveAreaAppearance conserva el canónico y materializa una paleta", () => {
  const area = { color: "#123456", accent: "#abcdef" };
  const canonical = resolveAreaAppearance(area, DEFAULT_AREA_APPEARANCE);
  const preset = resolveAreaAppearance(area, {
    paletteId: "ember",
    motifId: "waves",
    contourId: "dashed",
  });

  assert.equal(canonical.color, area.color);
  assert.equal(canonical.accent, area.accent);
  assert.notEqual(preset.color, area.color);
  assert.equal(preset.motif.animated, true);
  assert.equal(isAnimatedAreaAppearance(preset), true);
  assert.equal(isAnimatedAreaAppearance(DEFAULT_AREA_APPEARANCE), false);
  assert.equal(sameAreaAppearance(DEFAULT_AREA_APPEARANCE, { ...DEFAULT_AREA_APPEARANCE }), true);
  assert.equal(getAreaAppearanceAnimationTime(12.5), 12.5);
  assert.equal(getAreaAppearanceAnimationTime(12.5, { reducedMotion: true }), 0);
});
