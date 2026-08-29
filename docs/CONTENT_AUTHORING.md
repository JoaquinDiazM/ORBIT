# Autoría de contenido

## Estado actual

El contenido se define en objetos JavaScript dentro de `src/data/`. Esta decisión mantiene el prototipo sin parser ni dependencia adicional. Una migración futura a Markdown/MDX requiere ADR.

La fuente declarativa actual corresponde a la ruta de Electromagnetismo Aplicado de **ORBIT —
Open Roadmap for Building Intuition and Theory**. Una ruta futura de otro curso deberá declarar
su alcance, perfil de entrada e IDs sin asumir que ya existe un cargador o esquema multicurso.

Las propuestas internas nacen en [`ORBIT_UPDATES.md`](../ORBIT_UPDATES.md): el usuario solo
necesita escribir intención y estado. La [plantilla de cambios](content-changes/CONTENT_CHANGE_TEMPLATE.md)
se conserva como anexo técnico opcional que puede completar el agente, no como formulario
obligatorio para el usuario ni como fuente runtime. El
[ejemplo del Taller Vectorial](content-changes/examples/update-vector-workshop.example.md) tiene
`apply: false` y no se importa durante el build.

Antes de editar `src/data/`, lee `src/data/AGENTS.md`.

## Agregar un concepto

En `src/data/knowledge.js`:

```js
{
  id: "electric-flux",
  title: "Flujo eléctrico",
  shortTitle: "Flujo",
  summary: "Relacionar orientación, superficie y campo mediante una integral de flujo.",
  order: 3,
}
```

El ID es parte del formato de progreso. No lo renombres después de publicar una versión sin migración.

Un cambio de título visible no autoriza a cambiar el ID. En 0.3.2, por ejemplo, la Estación de Superconductividad conserva `electromagnetic-compatibility` para zona y concepto, y el NPC Onnes conserva `shielding-chamber`, porque esos valores ya formaban parte de perfiles publicados. El punto de aprendizaje separado usa el ID nuevo `superconductivity-transition-lab`.

## Agregar una zona

En `src/data/world.js`:

```js
{
  id: "electromagnetic-energy",
  q: 2,
  r: -1,
  title: "Cuenca de la Energía Electromagnética",
  shortTitle: "Energía",
  subtitle: "Densidad, flujo y conservación",
  description: "...",
  color: "#334455",
  accent: "#ccddee",
  order: 7,
  requirements: { concepts: ["maxwell-synthesis"] },
  unlockHint: "...",
}
```

Criterios:

- `(q, r)` enteros y no duplicados;
- al menos un vecino existente;
- requisitos alcanzables fuera de la zona;
- color y texto no usados como único indicador de estado.

## Agregar un lugar

Esqueleto mínimo:

```js
{
  id: "gauss-flux-lab",
  areaId: "electrostatics",
  kind: "lesson",
  title: "Laboratorio de Flujo",
  shortTitle: "Flujo",
  marker: "Φ",
  offset: { x: 20, y: -55 },
  interactionRadius: 76,
  visibility: "visibleWhenAreaUnlocked",
  requirements: {
    concepts: ["charge-and-superposition"],
  },
  grants: {
    concepts: ["electric-flux"],
  },
  objective: "Calcular e interpretar el flujo de un campo a través de una superficie.",
  sections: [
    {
      title: "El problema",
      paragraphs: ["..."],
    },
    {
      title: "Modelo",
      equation: {
        tex: String.raw`\Phi_E=\iint_S\mathbf{E}\cdot\mathrm{d}\mathbf{A}`,
        caption: "Flujo eléctrico a través de la superficie S.",
      },
    },
  ],
  exercise: {
    type: "numeric",
    prompt: "...",
    expected: 12.0,
    absoluteTolerance: 0.1,
    unit: "N·m²/C",
    placeholder: "Ej.: 12.0",
    explanation: "...",
  },
  sources: [
    { label: "Fuente primaria o texto", url: "https://..." },
  ],
}
```

Las ecuaciones usan TeX compatible con KaTeX y siempre incluyen una descripción visible. La UI genera DOM y MathML mediante `katex.render`; no introduzcas HTML, delimitadores `$$...$$` ni comandos que requieran `trust: true`. `npm test` compila todas las expresiones con la configuración de producción.

## Requisitos

Campos admitidos:

```js
requirements: {
  concepts: ["concept-id"],
  completedLocations: ["location-id"],
  rewards: ["type:reward-id"],
  areas: ["area-id"],
}
```

Todos los elementos de una categoría y todas las categorías declaradas son obligatorios.

Las guías visuales del Árbol II se derivan automáticamente de `completedLocations`, `concepts` y `rewards`; no declares una segunda lista manual de aristas. Conceptos y recompensas se resuelven al lugar que los concede y los requisitos repetidos por pareja se agrupan. `areas` controla acceso, pero no crea estas guías. Si un cambio altera las 13 parejas únicas actuales, actualiza la prueba del derivador y verifica que la nueva topología sea intencional.

## Concesiones

```js
grants: {
  concepts: ["concept-id"],
  rewards: ["gadgets:field-lens"],
}
```

Un lugar no puede exigir el mismo concepto que concede.

## Ejercicios admitidos

### Alternativa

```js
{
  type: "choice",
  prompt: "...",
  choices: ["...", "...", "..."],
  answerIndex: 1,
  explanation: "...",
}
```

### Numérico

```js
{
  type: "numeric",
  prompt: "...",
  expected: 8.99e-7,
  absoluteTolerance: 1e-8,
  relativeTolerance: 0.02,
  unit: "N",
  placeholder: "Ej.: 8.99e-7",
  explanation: "...",
}
```

La comprobación acepta punto o coma decimal. Usa tolerancia absoluta para valores próximos a cero y relativa cuando la escala pueda variar.

### Confirmación

```js
{
  type: "acknowledge",
  prompt: "...",
  buttonLabel: "Registrar",
  explanation: "...",
}
```

Debe reservarse para orientación, recompensas narrativas o acciones sin una respuesta académica razonable. No la uses para conceder un concepto central.

Un personaje secundario puede usar esta confirmación como cierre no evaluativo: el botón registra el encuentro, pero no formula una pregunta ni contiene alternativas, respuesta esperada o política de corrección. Si ese contexto desbloquea fórmulas, vincula sus requisitos a la finalización del NPC; sitúa la evaluación y la concesión del concepto en un lugar académico independiente. Onnes y el Laboratorio de Transición Superconductora son el ejemplo vigente.

### Acción del sistema

Existe un tipo interno `action` para abrir herramientas como el debugger. No lo uses como ejercicio académico.

### Figura de tres cargas

La presentación `point-charge-field` está especializada en una actividad de alternativa y usa `PointChargeField2D`. Su descriptor debe incluir:

- un dominio cuadrado y un punto de observación dentro de él;
- exactamente tres cargas con IDs únicos, posición inicial válida y valor normalizado en `[-1,1]`;
- rango de carga que incluya cero, paso de teclado positivo y radio de singularidad explícito;
- título, descripción y caption que aclaren que el modelo es normalizado.

La figura admite puntero y teclado, muestra las contribuciones y la suma, y declara la singularidad si una carga coincide con el punto de observación. Posiciones, valores y carga enfocada son estado de sesión: no los añadas al perfil ni suavices la singularidad para ocultarla.

## Dividir un lugar en etapas

Usa `steps` cuando una misión o lección no deba ocupar un único espacio de desplazamiento. Los lugares antiguos con `sections` y `exercise` siguen funcionando como una sola etapa.

```js
steps: [
  {
    id: "model",
    title: "Modelo",
    sections: [{ title: "Lectura", paragraphs: ["..."] }],
    exercise: { type: "none" },
  },
  {
    id: "exit-check",
    title: "Comprobación",
    sections: [{ title: "Aplicación", paragraphs: ["..."] }],
    exercise: {
      type: "choice",
      prompt: "...",
      choices: ["...", "..."],
      answerIndex: 0,
      explanation: "...",
    },
  },
]
```

- El ID de etapa es estable y único dentro del lugar.
- Una etapa de lectura abre la siguiente con **Continuar**.
- Una etapa evaluada abre la siguiente solo después de una respuesta correcta.
- Si el lugar concede progreso, la última etapa debe terminar con un ejercicio evaluable.
- El avance entre etapas se conserva durante la sesión; el hecho durable sigue siendo el lugar completado. No se añadió estado persistente ni migración.

## Biblioteca de referencia

La simbología, las constantes, las fórmulas y el glosario viven en `src/data/reference/`. Cada entrada declara un ID y requisitos. `source` es opcional: se reserva para datos numéricos, adaptaciones, afirmaciones históricas y teoremas específicos que realmente necesitan trazabilidad.

Su disponibilidad se deriva mediante las mismas categorías de requisitos del Árbol II. No guardes listas de fórmulas o definiciones desbloqueadas. Las colecciones se consultan en los paneles permanentes **Símbolos**, **Constantes**, **Formulario** y **Glosario**; esos paneles muestran solo las entradas habilitadas o su condición de desbloqueo. Consulta [Nomenclatura e IDs](CONTENT_NAMING.md).

No añadas una cita repetida a definiciones, operaciones algebraicas o identidades rutinarias. Cuando una fórmula, propiedad o colección con fuente se desbloquee, la interfaz debe comunicar esa referencia una sola vez y de forma agrupada. La consulta posterior permanece disponible en su menú, pero no debe crear un cuadro bibliográfico repetido por tarjeta o entrada. La procedencia del material docente que inspira globalmente el proyecto permanece centralizada en el `README` y no se repite en los datos runtime.

## Estándar pedagógico futuro

Un nodo listo para publicación debería incorporar:

- resultado de aprendizaje medible;
- prerrequisitos;
- contexto histórico con fuentes;
- evidencia o experimento;
- modelo moderno;
- derivación apropiada al nivel;
- aplicación ingenieril;
- ejemplo resuelto;
- práctica guiada;
- problema de evaluación;
- misión de transferencia;
- errores frecuentes;
- solución revisada por otra persona.

## Fuentes

- Prioriza fuentes primarias, libros universitarios abiertos, documentación institucional y artículos revisados.
- No uses una fuente secundaria popular como único respaldo de una afirmación histórica discutida.
- No incorpores imágenes o textos ajenos solo porque son accesibles en internet.
- Registra autor, título, institución/editorial, año y enlace estable cuando el formato final lo permita.
- Cuando una entrada necesite fuente, registra su clave canónica en `docs/references/references.bib` y un localizador exacto dentro de `source`.
- El conocimiento matemático común puede declararse sin `source`; no cites una fuente para suma, derivación elemental o notación estándar solo para completar un campo.
- Una fuente mostrada al desbloquear contenido se cita una vez y de manera agrupada; el panel de consulta puede seguir visible, pero no repite la bibliografía por entrada.
- Un adjunto con licencia no indicada puede orientar una reformulación independiente, pero no autoriza copiar prosa, tablas, ejercicios ni soluciones.

## Control de calidad

Después de añadir contenido:

```bash
npm run validate
npm test
npm run build
```

Después prueba manualmente:

- visibilidad antes y después del requisito;
- lugar alcanzable físicamente;
- ejercicio correcto, incorrecto y vacío;
- unidad y tolerancia;
- concesión única de progreso;
- persistencia tras recargar.
