const OPENSTAX_CONSERVATIVE_FIELDS = Object.freeze({
  citationKey: "openstax-calculus-volume-3-2016",
  label: "OpenStax, Calculus Volume 3",
  locator: "secs. 6.3 y 6.5",
  usage: "consulta; redacción original",
  license: "CC BY-NC-SA 4.0",
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
  },
  {
    id: "vector-field",
    term: "Campo vectorial",
    kind: "Definición",
    statement: "Función que asigna un vector a cada punto de un dominio espacial.",
    notation: String.raw`\mathbf{F}:\Omega\subseteq\mathbb{R}^3\to\mathbb{R}^3`,
    requirements: VECTOR_WORKSHOP_REQUIREMENT,
  },
  {
    id: "gradient",
    term: "Gradiente",
    kind: "Definición",
    statement: "Cuando no se anula, es el campo vectorial que señala la dirección de crecimiento local más rápido de un campo escalar; su norma es la tasa máxima de cambio direccional.",
    notation: String.raw`\nabla f`,
    requirements: VECTOR_WORKSHOP_REQUIREMENT,
  },
  {
    id: "divergence",
    term: "Divergencia",
    kind: "Definición",
    statement: "Campo escalar que mide el balance local de flujo saliente de un campo vectorial por unidad de volumen.",
    notation: String.raw`\nabla\!\cdot\!\mathbf{F}`,
    requirements: VECTOR_WORKSHOP_REQUIREMENT,
  },
  {
    id: "curl",
    term: "Rotacional",
    kind: "Definición",
    statement: "Campo vectorial que representa la circulación local y su eje orientado.",
    notation: String.raw`\nabla\!\times\!\mathbf{F}`,
    requirements: VECTOR_WORKSHOP_REQUIREMENT,
  },
  {
    id: "scalar-laplacian",
    term: "Laplaciano escalar",
    kind: "Definición",
    statement: "Divergencia del gradiente de un campo escalar; produce un campo escalar y compara el valor local con su entorno infinitesimal.",
    notation: String.raw`\nabla^2 f=\nabla\!\cdot\!(\nabla f)`,
    requirements: VECTOR_WORKSHOP_REQUIREMENT,
  },
  {
    id: "conservative-field",
    term: "Campo conservativo",
    kind: "Definición",
    statement: "Campo vectorial que puede escribirse como el gradiente de una función escalar definida en su dominio.",
    notation: String.raw`\mathbf{F}=\nabla f`,
    requirements: VECTOR_WORKSHOP_REQUIREMENT,
  },
  {
    id: "potential-implies-irrotational",
    term: "Un gradiente es irrotacional",
    kind: "Teorema",
    statement: "Si f tiene derivadas segundas continuas, entonces el rotacional de su gradiente es cero.",
    notation: String.raw`\nabla\!\times\!(\nabla f)=\mathbf{0}`,
    requirements: VECTOR_WORKSHOP_REQUIREMENT,
  },
  {
    id: "curl-free-conservative",
    term: "Criterio de campo conservativo",
    kind: "Teorema",
    statement: "En un dominio abierto y simplemente conexo, un campo C¹ con rotacional nulo admite un potencial escalar.",
    notation: String.raw`\nabla\!\times\!\mathbf{F}=\mathbf{0}\;\Longrightarrow\;\mathbf{F}=\nabla f`,
    requirements: VECTOR_WORKSHOP_REQUIREMENT,
    source: OPENSTAX_CONSERVATIVE_FIELDS,
  },
]);
