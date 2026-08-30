import assert from "node:assert/strict";
import test from "node:test";

import { BowerbirdPreferencesModel } from "../src/core/bowerbird-preferences.js";
import { DEFAULT_AREA_APPEARANCE } from "../src/core/area-appearance.js";
import { AREAS } from "../src/data/world.js";
import { EditorBowerbirdSession } from "../src/editor/bowerbird-session.js";
import { EditorModel } from "../src/editor/editor-model.js";

class MemoryStorage {
  constructor(value = null) {
    this.value = value === null ? null : structuredClone(value);
    this.saveCount = 0;
  }

  load() {
    return this.value === null ? null : structuredClone(this.value);
  }

  save(value) {
    this.value = structuredClone(value);
    this.saveCount += 1;
  }
}

test("Docente incorpora Bowerbird al borrador común y su historial", () => {
  const editor = new EditorModel({ storage: new MemoryStorage() });
  const session = new EditorBowerbirdSession({ editorModel: editor });
  const result = session.setAreaAppearance("origin", {
    paletteId: "ember",
    motifId: "constellation",
    contourId: "double",
  });

  assert.equal(result.ok, true);
  assert.equal(session.getSnapshot().scope, "course");
  assert.equal(session.getAreaAppearance("origin").paletteId, "ember");
  assert.equal(JSON.parse(editor.exportDocument()).areas[0].appearance.paletteId, "ember");
  assert.equal(editor.getSnapshot().canUndo, true);
});

test("Estudiante superpone preferencias sin mutar ni exportar el borrador Docente", () => {
  const editorStorage = new MemoryStorage();
  const editor = new EditorModel({ storage: editorStorage, readOnly: true });
  const personalStorage = new MemoryStorage();
  const personal = new BowerbirdPreferencesModel({ storage: personalStorage });
  const session = new EditorBowerbirdSession({
    editorModel: editor,
    personalPreferences: personal,
    publishedAreas: editor.getSnapshot().areas,
  });
  const before = editor.exportDocument();
  const result = session.setAreaAppearance("electrostatics", {
    paletteId: "violet",
    motifId: "waves",
    contourId: "dashed",
  });

  assert.equal(result.ok, true);
  assert.equal(session.getSnapshot().scope, "personal");
  assert.equal(session.getAreaAppearance("electrostatics").motifId, "waves");
  assert.equal(editor.exportDocument(), before);
  assert.equal(editorStorage.saveCount, 0);
  assert.equal(personalStorage.saveCount, 1);
  assert.equal(JSON.parse(session.exportPersonalPreferences()).kind, "orbit-bowerbird-preferences");

  assert.equal(session.resetAreaAppearance("electrostatics").ok, true);
  assert.equal(
    session.getAreaAppearance("electrostatics").paletteId,
    JSON.parse(before).areas.find(({ id }) => id === "electrostatics").appearance.paletteId,
  );
});

test("Estudiante hereda la edición publicada y nunca la apariencia del borrador Docente", () => {
  const publishedAppearance = {
    paletteId: "aurora",
    motifId: "constellation",
    contourId: "solid",
  };
  const draftAppearance = {
    paletteId: "ember",
    motifId: "waves",
    contourId: "double",
  };
  const personalAppearance = {
    paletteId: "violet",
    motifId: "none",
    contourId: "dashed",
  };
  const publishedAreas = structuredClone(AREAS).map((area) => ({
    ...area,
    appearance: area.id === "electrostatics"
      ? publishedAppearance
      : DEFAULT_AREA_APPEARANCE,
  }));

  const teacher = new EditorModel({
    storage: new MemoryStorage(),
    baseAreas: publishedAreas,
  });
  assert.equal(
    teacher.setAreaAppearance("electrostatics", draftAppearance).ok,
    true,
  );
  const studentEditor = new EditorModel({
    storage: new MemoryStorage(JSON.parse(teacher.exportDocument())),
    baseAreas: publishedAreas,
    readOnly: true,
  });
  const personal = new BowerbirdPreferencesModel({
    storage: new MemoryStorage(),
    baseAreas: publishedAreas,
  });
  const session = new EditorBowerbirdSession({
    editorModel: studentEditor,
    personalPreferences: personal,
    publishedAreas,
  });

  assert.deepEqual(
    studentEditor.getSnapshot().areas.find(({ id }) => id === "electrostatics").appearance,
    draftAppearance,
    "el modelo readOnly conserva el borrador para las vistas editoriales",
  );
  assert.deepEqual(
    session.getAreaAppearance("electrostatics"),
    publishedAppearance,
    "sin override personal Bowerbird parte desde la edición publicada",
  );

  assert.equal(session.setAreaAppearance("electrostatics", personalAppearance).ok, true);
  assert.deepEqual(session.getAreaAppearance("electrostatics"), personalAppearance);

  assert.equal(session.resetAreaAppearance("electrostatics").ok, true);
  assert.deepEqual(
    session.getAreaAppearance("electrostatics"),
    publishedAppearance,
    "Heredar apariencia del curso elimina el override y vuelve a publicada",
  );
});

test("Bowerbird personal exige inyectar explícitamente la edición publicada", () => {
  const editor = new EditorModel({ storage: new MemoryStorage(), readOnly: true });
  const personal = new BowerbirdPreferencesModel({ storage: new MemoryStorage() });

  assert.throws(
    () => new EditorBowerbirdSession({ editorModel: editor, personalPreferences: personal }),
    /zonas publicadas/,
  );
});
