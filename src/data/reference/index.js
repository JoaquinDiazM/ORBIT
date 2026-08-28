import { CONSTANTS } from "./constants.js";
import { FORMULAS } from "./formulas.js";
import { GLOSSARY } from "./glossary.js";
import { SYMBOLS } from "./symbols.js";

export { CONSTANTS, FORMULAS, GLOSSARY, SYMBOLS };

export const REFERENCE_COLLECTIONS = Object.freeze({
  symbols: SYMBOLS,
  constants: CONSTANTS,
  formulas: FORMULAS,
  glossary: GLOSSARY,
});

export const REFERENCE_VIEWS = Object.freeze({
  symbols: Object.freeze({
    id: "symbols",
    title: "Simbología",
    eyebrow: "Convención del curso",
  }),
  constants: Object.freeze({
    id: "constants",
    title: "Constantes",
    eyebrow: "Valores de referencia",
  }),
  formulas: Object.freeze({
    id: "formulas",
    title: "Formulario",
    eyebrow: "Herramientas desbloqueadas",
  }),
  glossary: Object.freeze({
    id: "glossary",
    title: "Glosario",
    eyebrow: "Definiciones, propiedades y teoremas",
  }),
});
