import { readFile } from "node:fs/promises";

import { materializeCourseEdition } from "../src/core/course-edition.js";
import { validateProjectData } from "../src/core/validator.js";

const editionCandidate = JSON.parse(
  await readFile(
    new URL(
      "../public/data/courses/electromagnetism-applied.edition.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const edition = await materializeCourseEdition(editionCandidate);
const result = validateProjectData({
  areas: edition.areas,
  locations: edition.locations,
  allowContentSubset: true,
});

for (const warning of result.warnings) {
  console.warn(`ADVERTENCIA: ${warning}`);
}

if (result.errors.length > 0) {
  for (const error of result.errors) console.error(`ERROR: ${error}`);
  process.exitCode = 1;
} else {
  console.log("Validación de mundo y progresión: OK");
  console.log(`Edición del curso: ${edition.edition.revision}`);
  console.log(
    `Simulación completa: ${result.simulation.unlockedAreas.size} zonas, ${result.simulation.concepts.size} conceptos y ${result.simulation.completedLocations.size} lugares alcanzables.`,
  );
  console.log("Secuencia de concesiones:");
  for (const entry of result.simulation.trace.filter((step) => step.granted.length > 0)) {
    console.log(`  - ${entry.locationId}: ${entry.granted.join(", ")}`);
  }
}
