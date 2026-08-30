import {
  DEFAULT_AREA_APPEARANCE,
  sanitizeAreaAppearance,
} from "../core/area-appearance.js";

function publishedAppearance(area) {
  const result = sanitizeAreaAppearance(area?.appearance ?? DEFAULT_AREA_APPEARANCE);
  return result.ok ? result.appearance : DEFAULT_AREA_APPEARANCE;
}

export class EditorBowerbirdSession {
  constructor({ editorModel, personalPreferences = null, publishedAreas = null } = {}) {
    if (!editorModel) throw new TypeError("Bowerbird requiere el modelo editorial.");
    if (personalPreferences && !Array.isArray(publishedAreas)) {
      throw new TypeError(
        "Bowerbird personal requiere las zonas publicadas de la edición activa.",
      );
    }
    this.editorModel = editorModel;
    this.personalPreferences = personalPreferences;
    this.publishedAppearanceByAreaId = new Map(
      (publishedAreas ?? []).map((area) => [area.id, publishedAppearance(area)]),
    );
    this.scope = personalPreferences ? "personal" : "course";
  }

  getSnapshot() {
    const course = this.editorModel.getSnapshot();
    const personal = this.personalPreferences?.getSnapshot() ?? null;
    const effectiveAreas = course.areas.map((area) => ({
      ...area,
      appearance: personal
        ? personal.appearances.get(area.id)
          ?? this.publishedAppearanceByAreaId.get(area.id)
          ?? DEFAULT_AREA_APPEARANCE
        : area.appearance ?? DEFAULT_AREA_APPEARANCE,
    }));
    return {
      scope: this.scope,
      areas: structuredClone(effectiveAreas),
      preferences: personal ? structuredClone(personal.preferences) : null,
      warnings: personal ? structuredClone(personal.warnings) : [],
      updatedAt: personal?.preferences.updatedAt ?? course.document.updatedAt,
    };
  }

  getAreaAppearance(areaId) {
    const area = this.getSnapshot().areas.find((candidate) => candidate.id === areaId);
    return area ? structuredClone(area.appearance) : null;
  }

  setAreaAppearance(areaId, appearance) {
    return this.personalPreferences
      ? this.personalPreferences.setAreaAppearance(areaId, appearance)
      : this.editorModel.setAreaAppearance(areaId, appearance);
  }

  resetAreaAppearance(areaId) {
    return this.personalPreferences
      ? this.personalPreferences.resetAreaAppearance(areaId)
      : this.editorModel.resetAreaAppearance(areaId);
  }

  subscribe(listener) {
    return this.personalPreferences?.subscribe(listener) ?? (() => {});
  }

  exportPersonalPreferences() {
    return this.personalPreferences?.exportPreferences() ?? null;
  }

  destroy() {
    this.personalPreferences?.destroy();
  }
}
