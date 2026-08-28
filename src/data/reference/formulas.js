const VECTOR_WORKSHOP_REQUIREMENT = Object.freeze({
  completedLocations: ["vector-workshop"],
});

const ONNES_ENCOUNTER_REQUIREMENT = Object.freeze({
  completedLocations: ["shielding-chamber"],
});

const ELLINGSON_VECTOR_SOURCE = Object.freeze({
  citationKey: "ellingson-electromagnetics-i-2018",
  label: "Ellingson, Electromagnetics I",
  locator: "sec. 4.7, teorema de la divergencia",
  usage: "adaptación",
  license: "CC BY-SA 4.0",
});

export const FORMULAS = Object.freeze([
  {
    id: "gradient-cartesian",
    title: "Gradiente cartesiano",
    category: "Operadores vectoriales",
    equation: {
      tex: String.raw`\nabla f=\frac{\partial f}{\partial x}\hat{\mathbf{x}}+\frac{\partial f}{\partial y}\hat{\mathbf{y}}+\frac{\partial f}{\partial z}\hat{\mathbf{z}}`,
      caption: "El gradiente transforma un campo escalar f en un campo vectorial.",
    },
    conditions: "f diferenciable en la región de interés.",
    requirements: VECTOR_WORKSHOP_REQUIREMENT,
  },
  {
    id: "divergence-cartesian",
    title: "Divergencia cartesiana",
    category: "Operadores vectoriales",
    equation: {
      tex: String.raw`\nabla\!\cdot\!\mathbf{F}=\frac{\partial F_x}{\partial x}+\frac{\partial F_y}{\partial y}+\frac{\partial F_z}{\partial z}`,
      caption: "La divergencia transforma un campo vectorial en un campo escalar.",
    },
    conditions: "F de clase C¹ en la región de interés.",
    requirements: VECTOR_WORKSHOP_REQUIREMENT,
  },
  {
    id: "curl-cartesian",
    title: "Rotacional cartesiano",
    category: "Operadores vectoriales",
    equation: {
      tex: String.raw`\nabla\!\times\!\mathbf{F}=\left(\frac{\partial F_z}{\partial y}-\frac{\partial F_y}{\partial z}\right)\hat{\mathbf{x}}+\left(\frac{\partial F_x}{\partial z}-\frac{\partial F_z}{\partial x}\right)\hat{\mathbf{y}}+\left(\frac{\partial F_y}{\partial x}-\frac{\partial F_x}{\partial y}\right)\hat{\mathbf{z}}`,
      caption: "El rotacional transforma un campo vectorial en otro campo vectorial.",
    },
    conditions: "F de clase C¹ en la región de interés.",
    requirements: VECTOR_WORKSHOP_REQUIREMENT,
  },
  {
    id: "scalar-laplacian",
    title: "Laplaciano escalar",
    category: "Operadores vectoriales",
    equation: {
      tex: String.raw`\nabla^2 f=\nabla\!\cdot\!(\nabla f)=\frac{\partial^2 f}{\partial x^2}+\frac{\partial^2 f}{\partial y^2}+\frac{\partial^2 f}{\partial z^2}`,
      caption: "El laplaciano de un campo escalar produce otro campo escalar.",
    },
    conditions: "f de clase C² en la región de interés.",
    requirements: VECTOR_WORKSHOP_REQUIREMENT,
  },
  {
    id: "divergence-of-curl",
    title: "Divergencia de un rotacional",
    category: "Identidades vectoriales",
    equation: {
      tex: String.raw`\nabla\!\cdot\!(\nabla\!\times\!\mathbf{F})=0`,
      caption: "La divergencia del rotacional se anula donde las derivadas mixtas pertinentes son continuas.",
    },
    conditions: "F con derivadas segundas continuas.",
    requirements: VECTOR_WORKSHOP_REQUIREMENT,
  },
  {
    id: "curl-of-gradient",
    title: "Rotacional de un gradiente",
    category: "Identidades vectoriales",
    equation: {
      tex: String.raw`\nabla\!\times\!(\nabla f)=\mathbf{0}`,
      caption: "El rotacional de un gradiente se anula donde las derivadas mixtas pertinentes son continuas.",
    },
    conditions: "f con derivadas segundas continuas.",
    requirements: VECTOR_WORKSHOP_REQUIREMENT,
  },
  {
    id: "divergence-scalar-product",
    title: "Divergencia de un escalar por un vector",
    category: "Identidades vectoriales",
    equation: {
      tex: String.raw`\nabla\!\cdot\!(f\mathbf{F})=f(\nabla\!\cdot\!\mathbf{F})+\mathbf{F}\!\cdot\!\nabla f`,
      caption: "Regla del producto para la divergencia.",
    },
    conditions: "f y F diferenciables.",
    requirements: VECTOR_WORKSHOP_REQUIREMENT,
  },
  {
    id: "curl-scalar-product",
    title: "Rotacional de un escalar por un vector",
    category: "Identidades vectoriales",
    equation: {
      tex: String.raw`\nabla\!\times\!(f\mathbf{F})=f(\nabla\!\times\!\mathbf{F})+(\nabla f)\!\times\!\mathbf{F}`,
      caption: "Regla del producto para el rotacional.",
    },
    conditions: "f y F diferenciables.",
    requirements: VECTOR_WORKSHOP_REQUIREMENT,
  },
  {
    id: "divergence-cross-product",
    title: "Divergencia de un producto cruz",
    category: "Identidades vectoriales",
    equation: {
      tex: String.raw`\nabla\!\cdot\!(\mathbf{F}\!\times\!\mathbf{G})=\mathbf{G}\!\cdot\!(\nabla\!\times\!\mathbf{F})-\mathbf{F}\!\cdot\!(\nabla\!\times\!\mathbf{G})`,
      caption: "Identidad para la divergencia del producto cruz de dos campos.",
    },
    conditions: "F y G diferenciables.",
    requirements: VECTOR_WORKSHOP_REQUIREMENT,
  },
  {
    id: "curl-cross-product",
    title: "Rotacional de un producto cruz",
    category: "Identidades vectoriales",
    equation: {
      tex: String.raw`\nabla\!\times\!(\mathbf{F}\!\times\!\mathbf{G})=\mathbf{F}(\nabla\!\cdot\!\mathbf{G})-\mathbf{G}(\nabla\!\cdot\!\mathbf{F})+(\mathbf{G}\!\cdot\!\nabla)\mathbf{F}-(\mathbf{F}\!\cdot\!\nabla)\mathbf{G}`,
      caption: "Identidad para el rotacional del producto cruz de dos campos.",
    },
    conditions: "F y G diferenciables.",
    requirements: VECTOR_WORKSHOP_REQUIREMENT,
  },
  {
    id: "divergence-theorem",
    title: "Teorema de la divergencia",
    category: "Teoremas integrales",
    equation: {
      tex: String.raw`\iiint_{\mathcal V}(\nabla\!\cdot\!\mathbf{F})\,\mathrm{d}\tau=\oiint_{\partial\mathcal V}\mathbf{F}\!\cdot\!\mathrm{d}\mathbf{a}`,
      caption: "El flujo saliente por la frontera equivale a la integral volumétrica de la divergencia.",
    },
    conditions: "F de clase C¹ y volumen regular con normal exterior orientada.",
    requirements: { rewards: ["npcs:gauss-guide"] },
    source: ELLINGSON_VECTOR_SOURCE,
  },
  {
    id: "superconducting-resistive-transition",
    title: "Transición resistiva superconductora",
    category: "Superconductividad",
    equation: {
      tex: String.raw`R(T)>0\quad (T>T_c),\qquad R(T)\approx 0\quad (T<T_c)`,
      caption: "Modelo cualitativo de una transición resistiva alrededor de la temperatura crítica.",
    },
    conditions: "Aproximación introductoria para corriente continua y dentro de la resolución experimental; no representa una curva universal.",
    requirements: ONNES_ENCOUNTER_REQUIREMENT,
  },
  {
    id: "superconducting-critical-domain",
    title: "Dominio crítico introductorio",
    category: "Superconductividad",
    equation: {
      tex: String.raw`T<T_c,\qquad |I|<I_c,\qquad |B|<B_c`,
      caption: "Condiciones críticas esquemáticas para sostener el estado superconductor en el modelo inicial.",
    },
    conditions: "Los valores críticos dependen del material, la geometría y el régimen de operación; esta expresión no sustituye un modelo de dispositivo.",
    requirements: ONNES_ENCOUNTER_REQUIREMENT,
  },
]);
