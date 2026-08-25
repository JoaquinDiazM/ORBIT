import { validateProjectData } from "../src/core/validator.js";

const result = validateProjectData();

for (const warning of result.warnings) {
  console.warn(`ADVERTENCIA: ${warning}`);
}

if (result.errors.length > 0) {
  for (const error of result.errors) console.error(`ERROR: ${error}`);
  process.exitCode = 1;
} else {
  console.log("Validación de mundo y progresión: OK");
  console.log(
    `Simulación completa: ${result.simulation.unlockedAreas.size} zonas, ${result.simulation.concepts.size} conceptos y ${result.simulation.completedLocations.size} lugares alcanzables.`,
  );
  console.log("Secuencia de concesiones:");
  for (const entry of result.simulation.trace.filter((step) => step.granted.length > 0)) {
    console.log(`  - ${entry.locationId}: ${entry.granted.join(", ")}`);
  }
}
