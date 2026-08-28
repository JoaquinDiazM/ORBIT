function el3103GlossarySource(locator, validation) {
  return Object.freeze({
    citationKey: "el3103-team-vector-2025",
    label: "Equipo docente EL3103, Clase auxiliar extra",
    locator,
    usage: "consulta",
    license: "no indicada",
    ...validation,
  });
}

const ELLINGSON_FIELDS = Object.freeze({
  validationCitationKey: "ellingson-electromagnetics-i-2018",
  validationLabel: "Ellingson, Electromagnetics I",
  validationLocator: "cap. 1",
  validationLicense: "CC BY-SA 4.0",
});

const ELLINGSON_OPERATORS = Object.freeze({
  validationCitationKey: "ellingson-electromagnetics-i-2018",
  validationLabel: "Ellingson, Electromagnetics I",
  validationLocator: "cap. 4",
  validationLicense: "CC BY-SA 4.0",
});

const OPENSTAX_CONSERVATIVE_FIELDS = Object.freeze({
  validationCitationKey: "openstax-calculus-volume-3-2016",
  validationLabel: "OpenStax, Calculus Volume 3",
  validationLocator: "secs. 6.3 y 6.5",
  validationLicense: "CC BY-NC-SA 4.0; solo consulta, redacción original",
});

const VECTOR_WORKSHOP_REQUIREMENT = Object.freeze({
  completedLocations: ["vector-workshop"],
});

export const GLOSSARY = Object.freeze([
  {
    id: "scalar-field",
    term: "Campo escalar",
    kind: "Definición",
    statement: "Función que asigna un número real a cada punto de un dominio espacial.",
    notation: String.raw`f:\Omega\subseteq\mathbb{R}^3\to\mathbb{R}`,
    requirements: VECTOR_WORKSHOP_REQUIREMENT,
    source: el3103GlossarySource("p. 1", ELLINGSON_FIELDS),
  },
  {
    id: "vector-field",
    term: "Campo vectorial",
    kind: "Definición",
    statement: "Función que asigna un vector a cada punto de un dominio espacial.",
    notation: String.raw`\mathbf{F}:\Omega\subseteq\mathbb{R}^3\to\mathbb{R}^3`,
    requirements: VECTOR_WORKSHOP_REQUIREMENT,
    source: el3103GlossarySource("p. 1", ELLINGSON_FIELDS),
  },
  {
    id: "gradient",
    term: "Gradiente",
    kind: "Definición",
    statement: "Cuando no se anula, es el campo vectorial que señala la dirección de crecimiento local más rápido de un campo escalar; su norma es la tasa máxima de cambio direccional.",
    notation: String.raw`\nabla f`,
    requirements: VECTOR_WORKSHOP_REQUIREMENT,
    source: el3103GlossarySource("p. 2, ec. (7)", ELLINGSON_OPERATORS),
  },
  {
    id: "divergence",
    term: "Divergencia",
    kind: "Definición",
    statement: "Campo escalar que mide el balance local de flujo saliente de un campo vectorial por unidad de volumen.",
    notation: String.raw`\nabla\!\cdot\!\mathbf{F}`,
    requirements: VECTOR_WORKSHOP_REQUIREMENT,
    source: el3103GlossarySource("p. 1, ec. (2)", ELLINGSON_OPERATORS),
  },
  {
    id: "curl",
    term: "Rotacional",
    kind: "Definición",
    statement: "Campo vectorial que representa la circulación local y su eje orientado.",
    notation: String.raw`\nabla\!\times\!\mathbf{F}`,
    requirements: VECTOR_WORKSHOP_REQUIREMENT,
    source: el3103GlossarySource("p. 2, ec. (5)", ELLINGSON_OPERATORS),
  },
  {
    id: "scalar-laplacian",
    term: "Laplaciano escalar",
    kind: "Definición",
    statement: "Divergencia del gradiente de un campo escalar; produce un campo escalar y compara el valor local con su entorno infinitesimal.",
    notation: String.raw`\nabla^2 f=\nabla\!\cdot\!(\nabla f)`,
    requirements: VECTOR_WORKSHOP_REQUIREMENT,
    source: el3103GlossarySource("p. 1, ec. (4)", ELLINGSON_OPERATORS),
  },
  {
    id: "conservative-field",
    term: "Campo conservativo",
    kind: "Definición",
    statement: "Campo que puede escribirse como el gradiente de un potencial escalar. En electrostática se adopta por separado la convención E = −∇V.",
    notation: String.raw`\mathbf{F}=\nabla\phi`,
    requirements: VECTOR_WORKSHOP_REQUIREMENT,
    source: el3103GlossarySource("pp. 1-2", OPENSTAX_CONSERVATIVE_FIELDS),
  },
  {
    id: "potential-implies-irrotational",
    term: "Un gradiente es irrotacional",
    kind: "Teorema",
    statement: "Si V tiene derivadas segundas continuas, entonces el rotacional de su gradiente es cero.",
    notation: String.raw`\nabla\!\times\!(\nabla V)=\mathbf{0}`,
    requirements: VECTOR_WORKSHOP_REQUIREMENT,
    source: el3103GlossarySource("p. 2, ec. (10)", OPENSTAX_CONSERVATIVE_FIELDS),
  },
  {
    id: "curl-free-conservative",
    term: "Criterio de campo conservativo",
    kind: "Teorema",
    statement: "En un dominio abierto y simplemente conexo, un campo C¹ con rotacional nulo admite un potencial escalar.",
    notation: String.raw`\nabla\!\times\!\mathbf{F}=\mathbf{0}\;\Longrightarrow\;\mathbf{F}=\nabla V`,
    requirements: VECTOR_WORKSHOP_REQUIREMENT,
    source: el3103GlossarySource("pp. 1-2", OPENSTAX_CONSERVATIVE_FIELDS),
  },
]);
