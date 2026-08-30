export const AREA_APPEARANCE_CATALOG_VERSION = 1;

export const DEFAULT_AREA_APPEARANCE = Object.freeze({
  paletteId: "canonical",
  motifId: "canonical",
  contourId: "canonical",
});

function freezeCatalog(entries) {
  return Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));
}

export const AREA_APPEARANCE_PALETTES = freezeCatalog([
  {
    id: "canonical",
    label: "Original de la zona",
    description: "Conserva los colores publicados para esta zona.",
    color: null,
    accent: null,
  },
  {
    id: "polar",
    label: "Noche polar",
    description: "Azul profundo con acento celeste luminoso.",
    color: "#17364d",
    accent: "#9beaff",
  },
  {
    id: "aurora",
    label: "Aurora",
    description: "Verde azulado oscuro con acento menta.",
    color: "#213f43",
    accent: "#9df3d5",
  },
  {
    id: "ember",
    label: "Ascua",
    description: "Terracota oscuro con acento ámbar.",
    color: "#4a302d",
    accent: "#ffd095",
  },
  {
    id: "violet",
    label: "Violeta orbital",
    description: "Violeta profundo con acento lavanda.",
    color: "#352e54",
    accent: "#d8c2ff",
  },
]);

export const AREA_APPEARANCE_MOTIFS = freezeCatalog([
  {
    id: "canonical",
    label: "Original de la zona",
    description: "Conserva el motivo visual publicado.",
    animated: false,
  },
  {
    id: "none",
    label: "Sin motivo",
    description: "Muestra únicamente la paleta y el contorno.",
    animated: false,
  },
  {
    id: "constellation",
    label: "Constelación estática",
    description: "Une puntos fijos para distinguir la zona sin depender del color.",
    animated: false,
  },
  {
    id: "waves",
    label: "Ondas móviles",
    description: "Desplaza ondas suaves; queda estático con movimiento reducido.",
    animated: true,
  },
]);

export const AREA_APPEARANCE_CONTOURS = freezeCatalog([
  {
    id: "canonical",
    label: "Original de la zona",
    description: "Conserva el borde publicado.",
  },
  {
    id: "solid",
    label: "Sólido",
    description: "Borde continuo de mayor presencia.",
  },
  {
    id: "dashed",
    label: "Discontinuo",
    description: "Borde segmentado reconocible sin depender del color.",
  },
  {
    id: "double",
    label: "Doble",
    description: "Dos líneas concéntricas alrededor de la zona.",
  },
]);

const PALETTE_BY_ID = new Map(AREA_APPEARANCE_PALETTES.map((entry) => [entry.id, entry]));
const MOTIF_BY_ID = new Map(AREA_APPEARANCE_MOTIFS.map((entry) => [entry.id, entry]));
const CONTOUR_BY_ID = new Map(AREA_APPEARANCE_CONTOURS.map((entry) => [entry.id, entry]));
const APPEARANCE_FIELDS = Object.freeze(["paletteId", "motifId", "contourId"]);

function appearanceIssue(code, message, path) {
  return { code, message, path };
}

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function sanitizeAreaAppearance(candidate, { path = "appearance" } = {}) {
  if (!isRecord(candidate)) {
    return {
      ok: false,
      appearance: null,
      errors: [
        appearanceIssue(
          "invalid-area-appearance",
          "La apariencia debe declarar paleta, motivo y contorno.",
          path,
        ),
      ],
    };
  }

  const errors = [];
  const unknownFields = Object.keys(candidate).filter(
    (field) => !APPEARANCE_FIELDS.includes(field),
  );
  if (unknownFields.length > 0) {
    errors.push(
      appearanceIssue(
        "unsupported-area-appearance-field",
        `La apariencia contiene campos no soportados: ${unknownFields.join(", ")}.`,
        path,
      ),
    );
  }

  const registries = [
    ["paletteId", PALETTE_BY_ID, "paleta"],
    ["motifId", MOTIF_BY_ID, "motivo"],
    ["contourId", CONTOUR_BY_ID, "contorno"],
  ];
  for (const [field, registry, label] of registries) {
    if (typeof candidate[field] !== "string" || !registry.has(candidate[field])) {
      errors.push(
        appearanceIssue(
          `unknown-area-${field.replace("Id", "")}`,
          `La ${label} ${String(candidate[field])} no pertenece al catálogo visual v${AREA_APPEARANCE_CATALOG_VERSION}.`,
          `${path}.${field}`,
        ),
      );
    }
  }

  return {
    ok: errors.length === 0,
    appearance: errors.length === 0
      ? {
          paletteId: candidate.paletteId,
          motifId: candidate.motifId,
          contourId: candidate.contourId,
        }
      : null,
    errors,
  };
}

export function resolveAreaAppearance(area, candidate = area?.appearance) {
  const sanitized = sanitizeAreaAppearance(candidate ?? DEFAULT_AREA_APPEARANCE);
  const appearance = sanitized.ok ? sanitized.appearance : DEFAULT_AREA_APPEARANCE;
  const palette = PALETTE_BY_ID.get(appearance.paletteId) ?? PALETTE_BY_ID.get("canonical");
  const motif = MOTIF_BY_ID.get(appearance.motifId) ?? MOTIF_BY_ID.get("canonical");
  const contour = CONTOUR_BY_ID.get(appearance.contourId) ?? CONTOUR_BY_ID.get("canonical");

  return {
    ...appearance,
    color: palette.color ?? area?.color ?? "#214765",
    accent: palette.accent ?? area?.accent ?? "#8bdcf7",
    palette,
    motif,
    contour,
  };
}

export function isAnimatedAreaAppearance(candidate) {
  const motifId = candidate?.motifId ?? DEFAULT_AREA_APPEARANCE.motifId;
  return Boolean(MOTIF_BY_ID.get(motifId)?.animated);
}

export function getAreaAppearanceAnimationTime(timeSeconds, { reducedMotion = false } = {}) {
  return reducedMotion || !Number.isFinite(timeSeconds) ? 0 : timeSeconds;
}

export function sameAreaAppearance(first, second) {
  const firstResult = sanitizeAreaAppearance(first ?? DEFAULT_AREA_APPEARANCE);
  const secondResult = sanitizeAreaAppearance(second ?? DEFAULT_AREA_APPEARANCE);
  if (!firstResult.ok || !secondResult.ok) return false;
  return APPEARANCE_FIELDS.every(
    (field) => firstResult.appearance[field] === secondResult.appearance[field],
  );
}
