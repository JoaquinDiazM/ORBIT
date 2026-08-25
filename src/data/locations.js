export const LOCATIONS = Object.freeze([
  {
    id: "base-camp",
    areaId: "origin",
    kind: "base",
    title: "Base de la Expedición",
    shortTitle: "Base",
    marker: "B",
    offset: { x: 0, y: 52 },
    interactionRadius: 78,
    visibility: "always",
    repeatable: true,
    requirements: {},
    grants: {},
    objective: "Comprender las reglas del mundo y la diferencia entre movimiento físico y progresión conceptual.",
    sections: [
      {
        title: "Dos capas superpuestas",
        paragraphs: [
          "El personaje puede caminar libremente por cualquier punto de una zona abierta. Los lugares de aprendizaje no funcionan como casillas ni restringen el movimiento.",
          "La progresión sí utiliza dos grafos. El Árbol I abre hexágonos completos; el Árbol II revela lugares, transportes, gadgets, personajes y misiones dentro de las zonas disponibles.",
        ],
      },
      {
        title: "Primera misión",
        paragraphs: [
          "Localiza el Taller Vectorial, situado al noroeste dentro de este mismo hexágono. Completar su ejercicio abrirá el Altiplano Electrostático.",
        ],
        callout: "Las seis aristas de la base comienzan bloqueadas. Cuando una zona nueva se abre, todas sus fronteras compartidas con zonas ya abiertas quedan transitables.",
      },
    ],
    exercise: { type: "none" },
    sources: [],
  },
  {
    id: "vector-workshop",
    areaId: "origin",
    kind: "lesson",
    title: "Taller Vectorial",
    shortTitle: "Vectores",
    marker: "V",
    offset: { x: -104, y: -64 },
    interactionRadius: 74,
    visibility: "always",
    requirements: {},
    grants: { concepts: ["vectors-and-fields"] },
    objective: "Interpretar un campo como una función vectorial y distinguir magnitud de componentes.",
    sections: [
      {
        title: "Por qué empezar aquí",
        paragraphs: [
          "El electromagnetismo no describe solamente números asignados a objetos: describe magnitudes con dirección definidas en cada punto del espacio. Antes de introducir cargas o corrientes, necesitamos leer esas representaciones con soltura.",
          "En el curso completo, este lugar será un diagnóstico breve de vectores, coordenadas, gradiente, divergencia, rotacional, unidades SI y análisis dimensional.",
        ],
      },
      {
        title: "Modelo mínimo",
        paragraphs: [
          "Un campo vectorial asigna un vector a cada posición. Sus componentes dependen del sistema de coordenadas, pero la magnitud física no cambia por renombrar los ejes.",
        ],
        equation: "E = 3 x̂ + 4 ŷ  N/C     ⇒     |E| = √(3² + 4²)",
      },
      {
        title: "Puente ingenieril",
        paragraphs: [
          "Las componentes permiten proyectar fuerzas, tensiones y flujos sobre direcciones relevantes para sensores, máquinas, líneas de transmisión y antenas.",
        ],
      },
    ],
    exercise: {
      type: "choice",
      prompt: "Para E = (3 x̂ + 4 ŷ) N/C, ¿cuál es la magnitud del campo?",
      choices: ["3 N/C", "4 N/C", "5 N/C", "7 N/C"],
      answerIndex: 2,
      explanation: "La magnitud euclidiana es √(3² + 4²) = 5 N/C.",
    },
    sources: [
      {
        label: "MIT OpenCourseWare 8.02 — Electricity and Magnetism",
        url: "https://ocw.mit.edu/courses/8-02-physics-ii-electricity-and-magnetism-spring-2007/",
      },
    ],
  },
  {
    id: "debug-terminal",
    areaId: "origin",
    kind: "debug",
    title: "Terminal de Cartografía",
    shortTitle: "Debugger",
    marker: "D",
    offset: { x: 112, y: 82 },
    interactionRadius: 72,
    visibility: "always",
    repeatable: true,
    requirements: {},
    grants: {},
    objective: "Abrir las herramientas de prueba del prototipo.",
    sections: [],
    exercise: { type: "action", action: "open-debug" },
    sources: [],
  },
  {
    id: "field-lens-cache",
    areaId: "origin",
    kind: "gadget",
    title: "Depósito del Lente de Campo",
    shortTitle: "Lente de campo",
    marker: "G",
    offset: { x: 103, y: -72 },
    interactionRadius: 70,
    visibility: "hiddenUntilUnlocked",
    requirements: { concepts: ["vectors-and-fields"] },
    grants: { rewards: ["gadgets:field-lens"] },
    objective: "Adquirir un gadget visual desbloqueado por conocimiento previo.",
    sections: [
      {
        title: "Árbol del conocimiento II",
        paragraphs: [
          "Este depósito no abrió una región del mundo. Apareció dentro de una zona ya disponible cuando adquiriste el concepto Vectores y campos.",
          "El gadget demuestra cómo el segundo árbol puede revelar herramientas opcionales sin alterar el recorrido conceptual principal.",
        ],
        callout: "La superposición visual es deliberadamente esquemática y no sustituye un cálculo de campo.",
      },
    ],
    exercise: {
      type: "acknowledge",
      prompt: "Registra el gadget y prueba la tecla G cerca o lejos del Observatorio de Coulomb.",
      buttonLabel: "Adquirir lente",
      explanation: "El Lente de campo quedó disponible y puede activarse con G.",
    },
    sources: [],
  },
  {
    id: "coulomb-observatory",
    areaId: "electrostatics",
    kind: "lesson",
    title: "Observatorio de Coulomb",
    shortTitle: "Coulomb",
    marker: "C",
    offset: { x: -42, y: -28 },
    interactionRadius: 78,
    visibility: "visibleWhenAreaUnlocked",
    requirements: {},
    grants: { concepts: ["charge-and-superposition"] },
    objective: "Aplicar superposición y estimar la escala de una fuerza electrostática.",
    sections: [
      {
        title: "Del fenómeno a una ley cuantitativa",
        paragraphs: [
          "La transición pedagógica importante no es memorizar un nombre, sino comprender que una interacción puede medirse, modelarse y después utilizarse para predecir configuraciones nuevas.",
          "En una formulación moderna, cada carga fuente contribuye al campo y las contribuciones se suman vectorialmente.",
        ],
      },
      {
        title: "Modelo mínimo",
        equation: "F = k |q₁ q₂| / r²,     k ≈ 8.99 × 10⁹ N·m²/C²",
        paragraphs: [
          "La dirección se obtiene desde la geometría. El signo de las cargas determina si la interacción es atractiva o repulsiva.",
        ],
      },
      {
        title: "Comprobaciones antes del número",
        bullets: [
          "La unidad final debe ser newton.",
          "Duplicar la distancia reduce la magnitud por un factor cuatro.",
          "Cambiar simultáneamente el signo de ambas cargas no cambia la magnitud.",
        ],
      },
    ],
    exercise: {
      type: "numeric",
      prompt: "Dos cargas de +1 nC están separadas 0.10 m. Calcula la magnitud de la fuerza en newton.",
      expected: 8.9875517923e-7,
      absoluteTolerance: 1.5e-8,
      unit: "N",
      placeholder: "Ej.: 8.99e-7",
      explanation: "F = 8.99×10⁹·(10⁻⁹)²/(0.10)² ≈ 8.99×10⁻⁷ N.",
    },
    sources: [
      {
        label: "Magnet Academy — Electricity and Magnetism",
        url: "https://nationalmaglab.org/magnet-academy/",
      },
      {
        label: "MIT OpenCourseWare 8.02",
        url: "https://ocw.mit.edu/courses/8-02-physics-ii-electricity-and-magnetism-spring-2007/",
      },
    ],
  },
  {
    id: "gauss-guide-post",
    areaId: "electrostatics",
    kind: "npc",
    title: "Puesto del Guía de Gauss",
    shortTitle: "Guía de Gauss",
    marker: "N",
    offset: { x: 98, y: 68 },
    interactionRadius: 70,
    visibility: "hiddenUntilUnlocked",
    requirements: {
      concepts: ["charge-and-superposition"],
      completedLocations: ["coulomb-observatory"],
    },
    grants: { rewards: ["npcs:gauss-guide"] },
    objective: "Registrar un personaje opcional desbloqueado dentro de una zona ya abierta.",
    sections: [
      {
        title: "Una ruta lateral",
        paragraphs: [
          "El futuro curso utilizará personajes secundarios para ofrecer preguntas conceptuales, contexto histórico y problemas opcionales sin bloquear el itinerario principal.",
          "Este encuentro solamente demuestra la mecánica. No pretende representar una conversación histórica real.",
        ],
      },
    ],
    exercise: {
      type: "acknowledge",
      prompt: "Registra al guía para incorporarlo al inventario narrativo.",
      buttonLabel: "Registrar encuentro",
      explanation: "El personaje secundario Guía de Gauss quedó registrado.",
    },
    sources: [],
  },
  {
    id: "ampere-foundry",
    areaId: "magnetism",
    kind: "lesson",
    title: "Fundición de Ampère",
    shortTitle: "Ampère",
    marker: "A",
    offset: { x: -52, y: -30 },
    interactionRadius: 78,
    visibility: "visibleWhenAreaUnlocked",
    requirements: {},
    grants: { concepts: ["steady-currents"] },
    objective: "Relacionar una corriente rectilínea con la orientación de su campo magnético.",
    sections: [
      {
        title: "Una influencia que rodea a la fuente",
        paragraphs: [
          "Una corriente estacionaria no produce un campo que simplemente apunte desde el conductor hacia afuera. La simetría de un hilo rectilíneo conduce a líneas cerradas alrededor de su eje.",
          "Esta geometría obliga a practicar producto cruz, circulación y regla de la mano derecha.",
        ],
      },
      {
        title: "Modelo mínimo",
        equation: "B(r) = μ₀ I / (2πr)  φ̂",
        paragraphs: [
          "La dirección φ̂ es tangente a circunferencias centradas en el conductor.",
        ],
      },
    ],
    exercise: {
      type: "choice",
      prompt: "Alrededor de un hilo rectilíneo largo con corriente estacionaria, el campo magnético es principalmente…",
      choices: [
        "Radial y dirigido hacia afuera",
        "Tangente a circunferencias alrededor del hilo",
        "Paralelo al hilo en todo punto",
        "Nulo fuera del conductor",
      ],
      answerIndex: 1,
      explanation: "La simetría cilíndrica y la regla de la mano derecha dan una dirección azimutal.",
    },
    sources: [
      {
        label: "MIT OpenCourseWare 8.02",
        url: "https://ocw.mit.edu/courses/8-02-physics-ii-electricity-and-magnetism-spring-2007/",
      },
    ],
  },
  {
    id: "electric-cart-depot",
    areaId: "magnetism",
    kind: "transport",
    title: "Depósito del Carro Eléctrico",
    shortTitle: "Carro eléctrico",
    marker: "T",
    offset: { x: 100, y: 66 },
    interactionRadius: 72,
    visibility: "hiddenUntilUnlocked",
    requirements: {
      concepts: ["steady-currents"],
      completedLocations: ["ampere-foundry"],
    },
    grants: { rewards: ["transports:electric-cart"] },
    objective: "Desbloquear una mejora de desplazamiento sin convertir el viaje en un minijuego.",
    sections: [
      {
        title: "Tecnología como recompensa",
        paragraphs: [
          "Los transportes cambian la velocidad y la representación del personaje, pero no alteran qué conocimientos son válidos. La recompensa visual está subordinada al aprendizaje.",
        ],
      },
    ],
    exercise: {
      type: "acknowledge",
      prompt: "Activa el depósito para añadir el carro a tu inventario. Luego usa T para alternar transportes.",
      buttonLabel: "Habilitar carro",
      explanation: "Carro eléctrico adquirido. La velocidad de exploración aumentará al seleccionarlo.",
    },
    sources: [],
  },
  {
    id: "faraday-station",
    areaId: "induction",
    kind: "lesson",
    title: "Estación de Faraday",
    shortTitle: "Faraday",
    marker: "F",
    offset: { x: -38, y: 20 },
    interactionRadius: 78,
    visibility: "visibleWhenAreaUnlocked",
    requirements: {},
    grants: { concepts: ["faraday-induction"] },
    objective: "Calcular la magnitud de una fem inducida por un cambio de flujo.",
    sections: [
      {
        title: "El cambio es la fuente",
        paragraphs: [
          "La idea central no es que un campo magnético estático produzca siempre una corriente, sino que una variación del flujo enlazado puede inducir una fuerza electromotriz.",
          "La orientación y el signo codifican la oposición descrita por la ley de Lenz; la magnitud depende de la rapidez del cambio.",
        ],
      },
      {
        title: "Modelo mínimo",
        equation: "ℰ = −N dΦ_B/dt",
      },
      {
        title: "Puente ingenieril",
        paragraphs: [
          "Generadores, transformadores, sensores inductivos y una gran parte de la conversión electromecánica se apoyan en esta relación.",
        ],
      },
    ],
    exercise: {
      type: "numeric",
      prompt: "Una bobina de 100 vueltas reduce el flujo por vuelta desde 0.020 Wb hasta 0 en 1.0 s. Ingresa la magnitud de la fem media.",
      expected: 2,
      absoluteTolerance: 0.02,
      unit: "V",
      placeholder: "Ej.: 2.0",
      explanation: "|ℰ| = N|ΔΦ|/Δt = 100·0.020/1.0 = 2.0 V.",
    },
    sources: [
      {
        label: "PhET — Faraday's Electromagnetic Lab",
        url: "https://phet.colorado.edu/sims/html/faradays-electromagnetic-lab/latest/faradays-electromagnetic-lab_all.html",
      },
    ],
  },
  {
    id: "maxwell-archive",
    areaId: "maxwell",
    kind: "lesson",
    title: "Cámara de Síntesis de Maxwell",
    shortTitle: "Maxwell",
    marker: "M",
    offset: { x: 8, y: -14 },
    interactionRadius: 78,
    visibility: "visibleWhenAreaUnlocked",
    requirements: {},
    grants: { concepts: ["maxwell-synthesis"] },
    objective: "Identificar por qué la corriente de desplazamiento completa la descripción de campos variables.",
    sections: [
      {
        title: "De leyes aisladas a un sistema",
        paragraphs: [
          "El valor pedagógico de esta etapa consiste en ver cómo conservación de carga, campos variables y simetría obligan a revisar una relación que era suficiente solamente para corrientes estacionarias.",
          "La síntesis no elimina las leyes anteriores: establece sus dominios y las conecta.",
        ],
      },
      {
        title: "Estructura conceptual",
        equation: "∇×B = μ₀J + μ₀ε₀ ∂E/∂t",
        paragraphs: [
          "El segundo término permite que un campo eléctrico variable contribuya a la circulación del campo magnético.",
        ],
      },
    ],
    exercise: {
      type: "choice",
      prompt: "¿Qué término permite extender la ley de Ampère a situaciones con campo eléctrico variable?",
      choices: [
        "La densidad de carga estática",
        "La corriente de desplazamiento, proporcional a ∂E/∂t",
        "El potencial gravitacional",
        "La resistencia eléctrica del vacío",
      ],
      answerIndex: 1,
      explanation: "El término μ₀ε₀∂E/∂t restaura la consistencia con campos variables y conservación de carga.",
    },
    sources: [
      {
        label: "LibreTexts — Electromagnetics I (Ellingson)",
        url: "https://phys.libretexts.org/Bookshelves/Electricity_and_Magnetism/Electromagnetics_I_(Ellingson)",
      },
    ],
  },
  {
    id: "hertz-beacon",
    areaId: "waves",
    kind: "lesson",
    title: "Baliza de Hertz",
    shortTitle: "Hertz",
    marker: "H",
    offset: { x: -42, y: 22 },
    interactionRadius: 78,
    visibility: "visibleWhenAreaUnlocked",
    requirements: {},
    grants: { concepts: ["wave-propagation"] },
    objective: "Reconocer la escala de velocidad que emerge de las constantes electromagnéticas del vacío.",
    sections: [
      {
        title: "Una predicción antes de la aplicación",
        paragraphs: [
          "Al combinar las ecuaciones dinámicas aparece una ecuación de onda. La velocidad característica depende de μ₀ y ε₀ y coincide con la velocidad de la luz en el vacío.",
          "Este resultado conecta óptica, radio y electromagnetismo dentro de una misma descripción.",
        ],
      },
      {
        title: "Modelo mínimo",
        equation: "c = 1 / √(μ₀ε₀) ≈ 3.00 × 10⁸ m/s",
      },
    ],
    exercise: {
      type: "numeric",
      prompt: "Ingresa la velocidad aproximada de una onda electromagnética en el vacío, en m/s.",
      expected: 3e8,
      absoluteTolerance: 5e6,
      unit: "m/s",
      placeholder: "Ej.: 3.0e8",
      explanation: "La aproximación estándar es c ≈ 3.00×10⁸ m/s.",
    },
    sources: [
      {
        label: "LibreTexts — Electromagnetics I (Ellingson)",
        url: "https://phys.libretexts.org/Bookshelves/Electricity_and_Magnetism/Electromagnetics_I_(Ellingson)",
      },
    ],
  },
  {
    id: "radio-skiff-hangar",
    areaId: "waves",
    kind: "transport",
    title: "Hangar del Deslizador de Radio",
    shortTitle: "Deslizador",
    marker: "T",
    offset: { x: 106, y: -62 },
    interactionRadius: 72,
    visibility: "hiddenUntilUnlocked",
    requirements: {
      concepts: ["wave-propagation"],
      completedLocations: ["hertz-beacon"],
    },
    grants: { rewards: ["transports:radio-skiff"] },
    objective: "Mostrar una segunda recompensa tecnológica dentro del Árbol II.",
    sections: [
      {
        title: "Movimiento y significado",
        paragraphs: [
          "El prototipo representa el dominio de propagación mediante un transporte rápido. La animación futura debería ser breve y no competir con el ejercicio académico.",
        ],
      },
    ],
    exercise: {
      type: "acknowledge",
      prompt: "Añade el deslizador al inventario y selecciónalo con T.",
      buttonLabel: "Habilitar deslizador",
      explanation: "Deslizador de radio adquirido.",
    },
    sources: [],
  },
  {
    id: "atacama-array",
    areaId: "applications",
    kind: "mission",
    title: "Arreglo de Atacama",
    shortTitle: "Atacama",
    marker: "I",
    offset: { x: -74, y: 48 },
    interactionRadius: 82,
    visibility: "visibleWhenAreaUnlocked",
    requirements: {},
    grants: { concepts: ["interferometric-thinking"] },
    objective: "Relacionar fase coherente y combinación de señales con instrumentación astronómica distribuida.",
    sections: [
      {
        title: "Una aplicación transversal",
        paragraphs: [
          "Un arreglo interferométrico combina señales recibidas en ubicaciones distintas. La información de fase y el conocimiento de la geometría permiten sintetizar una apertura efectiva mayor que cada elemento individual.",
          "El curso completo podrá conectar aquí ondas, antenas, retardos, coherencia, ruido, electrónica de recepción y procesamiento de señales.",
        ],
      },
      {
        title: "Pregunta guía",
        paragraphs: [
          "La suma de potencias por sí sola no conserva toda la información necesaria para reconstruir interferencias. Es indispensable mantener relaciones temporales o de fase entre canales.",
        ],
      },
    ],
    exercise: {
      type: "choice",
      prompt: "¿Qué información es esencial al combinar señales de varias antenas para formar interferencias útiles?",
      choices: [
        "Solo el color exterior de cada antena",
        "La fase o retardo relativo entre señales",
        "Únicamente la masa mecánica de los platos",
        "La temperatura ambiente sin ninguna referencia temporal",
      ],
      answerIndex: 1,
      explanation: "La coherencia de fase o la calibración de retardos relativos permite combinar las señales de forma interferométrica.",
    },
    sources: [
      {
        label: "ALMA Observatory — How ALMA works",
        url: "https://www.almaobservatory.org/en/about-alma/how-alma-works/",
      },
    ],
  },
  {
    id: "lunar-relay",
    areaId: "applications",
    kind: "mission",
    title: "Relé Lunar",
    shortTitle: "Enlace lunar",
    marker: "L",
    offset: { x: 82, y: -56 },
    interactionRadius: 82,
    visibility: "hiddenUntilUnlocked",
    requirements: {
      concepts: ["interferometric-thinking"],
      completedLocations: ["atacama-array"],
    },
    grants: { rewards: ["milestones:lunar-link"] },
    objective: "Cerrar la demostración con un cálculo elemental de tiempo de propagación Tierra–Luna.",
    sections: [
      {
        title: "Misión final del prototipo",
        paragraphs: [
          "Un enlace espacial obliga a integrar distancia, velocidad de propagación, potencia, antenas, ruido y sincronización. Esta demostración utiliza solamente el tiempo de vuelo; la futura misión completa debería incorporar un presupuesto de enlace.",
        ],
      },
      {
        title: "Modelo mínimo",
        equation: "t = d/c,     d ≈ 3.844 × 10⁸ m",
      },
    ],
    exercise: {
      type: "numeric",
      prompt: "Usando la distancia media Tierra–Luna de 3.844×10⁸ m, estima el tiempo de vuelo unidireccional de la señal, en segundos.",
      expected: 1.2813333333,
      absoluteTolerance: 0.03,
      unit: "s",
      placeholder: "Ej.: 1.28",
      explanation: "t = d/c ≈ 3.844×10⁸ / 3.00×10⁸ ≈ 1.28 s.",
    },
    sources: [
      {
        label: "NASA — Space Communications: 7 Things You Need to Know",
        url: "https://www.nasa.gov/centers-and-facilities/goddard/space-communications-7-things-you-need-to-know/",
      },
    ],
  },
]);

export function getLocation(id) {
  return LOCATIONS.find((location) => location.id === id) ?? null;
}
