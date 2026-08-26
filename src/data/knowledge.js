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
    id: "circuit-analysis",
    title: "Análisis de circuitos concentrados",
    shortTitle: "Circuitos",
    summary: "Relacionar tensión, corriente, impedancia y conservación de energía en redes.",
    order: 3,
  },
  {
    id: "differential-equation-modeling",
    title: "Modelado con ecuaciones diferenciales",
    shortTitle: "Ecuaciones diferenciales",
    summary: "Reconocer EDO, EDP, sistemas y condiciones que determinan una solución física.",
    order: 4,
  },
  {
    id: "steady-currents",
    title: "Corrientes estacionarias y campo magnético",
    shortTitle: "Magnetostática",
    summary: "Relacionar corrientes con campos magnéticos y aplicar reglas de orientación.",
    order: 5,
  },
  {
    id: "faraday-induction",
    title: "Flujo e inducción de Faraday",
    shortTitle: "Inducción",
    summary: "Interpretar una variación de flujo como fuente de fuerza electromotriz.",
    order: 6,
  },
  {
    id: "maxwell-synthesis",
    title: "Síntesis de Maxwell",
    shortTitle: "Maxwell",
    summary: "Reconocer el acoplamiento dinámico entre campos eléctricos y magnéticos.",
    order: 7,
  },
  {
    id: "wave-propagation",
    title: "Propagación electromagnética",
    shortTitle: "Ondas",
    summary: "Conectar las ecuaciones de campo con ondas, energía y comunicaciones.",
    order: 8,
  },
  {
    id: "electromagnetic-sensing",
    title: "Sensado electromagnético",
    shortTitle: "Sensores",
    summary: "Modelar sensibilidad, carga y conversión de una magnitud electromagnética.",
    order: 9,
  },
  {
    id: "electromechanical-conversion",
    title: "Conversión electromecánica",
    shortTitle: "Conversión EM",
    summary: "Relacionar flujo, corriente, fuerza y energía en máquinas eléctricas.",
    order: 10,
  },
  {
    id: "power-system-analysis",
    title: "Análisis básico de sistemas de potencia",
    shortTitle: "Potencia",
    summary: "Interpretar potencia activa, reactiva y aparente en régimen sinusoidal.",
    order: 11,
  },
  {
    id: "computational-electromagnetics",
    title: "Electromagnetismo computacional",
    shortTitle: "EM computacional",
    summary: "Discretizar un problema de campo y evaluar convergencia y error.",
    order: 12,
  },
  {
    id: "fourier-analysis",
    title: "Análisis de Fourier",
    shortTitle: "Fourier",
    summary: "Relacionar una señal temporal con sus componentes de frecuencia y fase.",
    order: 13,
  },
  {
    id: "optical-propagation",
    title: "Propagación óptica",
    shortTitle: "Óptica",
    summary: "Aplicar condiciones de interfaz e índice de refracción a ondas ópticas.",
    order: 14,
  },
  {
    id: "electromagnetic-compatibility",
    title: "Compatibilidad electromagnética",
    shortTitle: "Compatibilidad EM",
    summary: "Identificar rutas de acoplamiento y estrategias de mitigación.",
    order: 15,
  },
  {
    id: "guided-wave-modes",
    title: "Modos de onda guiada",
    shortTitle: "Modos guiados",
    summary: "Relacionar geometría, condiciones de borde y frecuencia de corte.",
    order: 16,
  },
  {
    id: "transmission-line-analysis",
    title: "Análisis de líneas de transmisión",
    shortTitle: "Líneas",
    summary: "Usar impedancia característica y coeficiente de reflexión.",
    order: 17,
  },
  {
    id: "antenna-radiation",
    title: "Radiación de antenas",
    shortTitle: "Antenas",
    summary: "Relacionar longitud de onda, apertura, directividad y radiación.",
    order: 18,
  },
  {
    id: "interferometric-thinking",
    title: "Fase, coherencia e interferometría",
    shortTitle: "Interferometría",
    summary: "Relacionar diferencias de fase con mediciones distribuidas y resolución angular.",
    order: 19,
  },
  {
    id: "wireless-link-analysis",
    title: "Análisis de enlaces inalámbricos",
    shortTitle: "Enlaces",
    summary: "Integrar potencia, ganancia, pérdida, ancho de banda y ruido.",
    order: 20,
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
      description: "Hito integrador del recorrido demostrativo.",
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
