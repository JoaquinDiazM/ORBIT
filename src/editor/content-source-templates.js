import { LOCATIONS } from "../data/locations.js";
import { getLocationSteps } from "../core/location-steps.js";
import { extractLocationContent, serializeContentSource } from "../core/content-source.js";
import { createGenericLocationContent } from "./editor-document.js";

export const CONTENT_SOURCE_TEMPLATES = Object.freeze([
  { id: "basic", label: "Documento básico" },
  { id: "equation", label: "Texto y ecuación" },
  { id: "choice", label: "Alternativas" },
  { id: "numeric", label: "Respuesta numérica con unidad" },
  { id: "expression", label: "Respuesta como expresión" },
  { id: "guided", label: "Secuencia guiada" },
  { id: "binary", label: "Secuencia con evaluación binaria" },
  { id: "vector-field-cards", label: "Comparación de campos registrados" },
  { id: "point-charge-field", label: "Laboratorio de cargas puntuales" },
  { id: "steps", label: "Contenido por etapas" },
]);

export function createContentSourceTemplate(kind, variant = "basic") {
  if (kind === "npc" && !["basic", "equation", "steps"].includes(variant)) {
    throw new Error("Los personajes ofrecen lectura y confirmación, sin evaluación académica.");
  }
  const content = extractLocationContent(createGenericLocationContent(kind));
  if (variant === "equation") {
    content.sections[0].paragraphs.push("Ejemplo provisional: el módulo del campo es $E$.");
    content.sections[0].equation = { tex: "E=F/q", caption: "Relación entre campo eléctrico, fuerza y carga de prueba." };
  } else if (variant === "steps") {
    content.steps = [
      { id: "reading", title: "Lectura provisional", sections: content.sections, exercise: { type: "none" } },
      { id: "practice", title: "Actividad provisional", sections: [{ title: "Aplicación", paragraphs: ["Sustituye este ejemplo por una actividad revisada."] }], exercise: content.exercise },
    ];
    delete content.sections;
    delete content.exercise;
  } else if (variant !== "basic") {
    const all = LOCATIONS.flatMap((location) => getLocationSteps(location).map((step) => step.exercise));
    const exercises = all.flatMap((exercise) => [exercise, ...(exercise?.items ?? [])]);
    const match = exercises.find((exercise) =>
      exercise && (exercise.presentation === variant
        || (exercise.type === "sequence" && exercise.feedback === variant)
        || (exercise.type === variant && !exercise.presentation)));
    if (!match) throw new Error(`No hay una plantilla registrada para ${variant}.`);
    content.exercise = structuredClone(match);
    // A sequence item has its identity in its parent; a standalone exercise does not.
    delete content.exercise.id;
    delete content.exercise.title;
  }
  return serializeContentSource(content);
}
