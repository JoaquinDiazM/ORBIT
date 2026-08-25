export const CONCEPTS = Object.freeze([
  {
    id: "vectors-and-fields",
    title: "Vectores y campos",
    shortTitle: "Campos",
    summary: "Representar magnitudes distribuidas en el espacio y operar con sus componentes.",
    order: 1,
  },
  {
    id: "charge-and-superposition",
    title: "Carga, fuerza y superposición",
    shortTitle: "Superposición",
    summary: "Construir el efecto de varias fuentes a partir de contribuciones individuales.",
    order: 2,
  },
  {
    id: "steady-currents",
    title: "Corrientes estacionarias y campo magnético",
    shortTitle: "Magnetostática",
    summary: "Relacionar corrientes con campos magnéticos y aplicar reglas de orientación.",
    order: 3,
  },
  {
    id: "faraday-induction",
    title: "Flujo e inducción de Faraday",
    shortTitle: "Inducción",
    summary: "Interpretar una variación de flujo como fuente de fuerza electromotriz.",
    order: 4,
  },
  {
    id: "maxwell-synthesis",
    title: "Síntesis de Maxwell",
    shortTitle: "Maxwell",
    summary: "Reconocer el acoplamiento dinámico entre campos eléctricos y magnéticos.",
    order: 5,
  },
  {
    id: "wave-propagation",
    title: "Propagación electromagnética",
    shortTitle: "Ondas",
    summary: "Conectar las ecuaciones de campo con ondas, energía y comunicaciones.",
    order: 6,
  },
  {
    id: "interferometric-thinking",
    title: "Fase, coherencia e interferometría",
    shortTitle: "Interferometría",
    summary: "Relacionar diferencias de fase con mediciones distribuidas y resolución angular.",
    order: 7,
  },
]);

export const REWARDS = Object.freeze({
  gadgets: [
    {
      id: "field-lens",
      title: "Lente de campo",
      description: "Superpone una visualización vectorial prototipo alrededor del Observatorio de Coulomb.",
      control: "G",
    },
  ],
  transports: [
    {
      id: "walk",
      title: "A pie",
      description: "Transporte inicial.",
      speedMultiplier: 1,
      initial: true,
    },
    {
      id: "electric-cart",
      title: "Carro eléctrico",
      description: "Aumenta la velocidad de exploración después del bloque de magnetostática.",
      speedMultiplier: 1.42,
    },
    {
      id: "radio-skiff",
      title: "Deslizador de radio",
      description: "Transporte experimental desbloqueado al dominar propagación.",
      speedMultiplier: 1.78,
    },
  ],
  npcs: [
    {
      id: "gauss-guide",
      title: "Guía de Gauss",
      description: "Personaje secundario de demostración para conversaciones y desafíos opcionales.",
    },
  ],
  milestones: [
    {
      id: "lunar-link",
      title: "Enlace lunar operativo",
      description: "Hito final del recorrido demostrativo.",
    },
  ],
});

export function getConcept(id) {
  return CONCEPTS.find((concept) => concept.id === id) ?? null;
}

export function getReward(type, id) {
  return REWARDS[type]?.find((reward) => reward.id === id) ?? null;
}

export function rewardKey(type, id) {
  return `${type}:${id}`;
}

export function parseRewardKey(key) {
  const separator = key.indexOf(":");
  if (separator < 0) return { type: "unknown", id: key };
  return { type: key.slice(0, separator), id: key.slice(separator + 1) };
}
