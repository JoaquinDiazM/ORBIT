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
    objective: "Leer campos por sus componentes, reconocer elementos diferenciales y reconstruir una función escalar cuyo gradiente produzca un campo vectorial dado.",
    prerequisites: [
      "Álgebra elemental",
      "Trigonometría básica",
      "Derivación e integración directa",
      "Derivadas parciales elementales",
      "Noción básica de vector y de sistema de coordenadas",
    ],
    model: "Campos escalares f y vectoriales F sobre un dominio, operadores diferenciales y elementos de línea, superficie y volumen en bases cartesianas, cilíndricas y esféricas.",
    application: "Aplicación matemática: reconstrucción de una función escalar a partir de un campo vectorial general; las aplicaciones ingenieriles se reservan para nodos posteriores.",
    steps: [
      {
        id: "fields-and-notation",
        title: "Campos y notación",
        sections: [
          {
            title: "Por qué empezar aquí",
            paragraphs: [
              "El electromagnetismo no describe solamente números asignados a objetos: describe magnitudes escalares y vectoriales definidas en cada punto del espacio. Antes de introducir cargas o corrientes, necesitamos leer esas representaciones con soltura.",
              "ORBIT escribe los escalares en cursiva, los vectores en negrita y las unidades SI en letra recta. La Simbología del menú secundario conserva esta convención para consultarla durante el recorrido.",
            ],
          },
          {
            title: "Dos tipos de campo",
            paragraphs: [
              "Un campo escalar asigna un número a cada posición; un campo vectorial asigna un vector. Bajo un cambio entre bases ortonormales, las componentes cambian, pero la norma y la magnitud física representada no.",
            ],
            equation: {
              tex: String.raw`f:\Omega\subseteq\mathbb{R}^3\to\mathbb{R}
                \qquad
                \mathbf{F}:\Omega\subseteq\mathbb{R}^3\to\mathbb{R}^3`,
              caption: "Tipos de entrada y salida de un campo escalar f y un campo vectorial F.",
            },
          },
        ],
        exercise: { type: "none" },
      },
      {
        id: "vector-operators",
        title: "Operadores",
        sections: [
          {
            title: "Gradiente, divergencia y rotacional",
            paragraphs: [
              "El gradiente transforma un escalar en vector; cuando no se anula, señala la dirección de máximo crecimiento local y su norma da la tasa máxima. La divergencia transforma un vector en escalar y mide flujo neto saliente local. El rotacional transforma un vector en vector y caracteriza circulación local.",
            ],
            equation: {
              tex: String.raw`f\xrightarrow{\;\nabla\;}\nabla f
                \qquad
                \mathbf{F}\xrightarrow{\;\nabla\cdot\;}\nabla\cdot\mathbf{F}
                \qquad
                \mathbf{F}\xrightarrow{\;\nabla\times\;}\nabla\times\mathbf{F}`,
              caption: "Tipos de campo de entrada y salida para los tres operadores básicos.",
            },
          },
          {
            title: "Laplaciano escalar",
            paragraphs: [
              "Aplicar la divergencia al gradiente produce el laplaciano. Para un campo escalar, su resultado también es escalar.",
            ],
            equation: {
              tex: String.raw`\nabla^2 f=\nabla\cdot(\nabla f)=\frac{\partial^2 f}{\partial x^2}+\frac{\partial^2 f}{\partial y^2}+\frac{\partial^2 f}{\partial z^2}`,
              caption: "Laplaciano de un campo escalar en coordenadas cartesianas.",
            },
            callout: "El signo de la divergencia informa un balance local de flujo; por sí solo no determina cómo cambia la rapidez de un flujo al alejarse de un punto.",
          },
          {
            title: "Elementos diferenciales cartesianos",
            paragraphs: [
              "En una base cartesiana ortonormal, los desplazamientos y medidas orientadas se construyen directamente con dx, dy y dz.",
            ],
            equation: {
              tex: String.raw`\begin{aligned}
                d\boldsymbol{\ell}&=dx\,\hat{\mathbf{x}}+dy\,\hat{\mathbf{y}}+dz\,\hat{\mathbf{z}},\\
                d\mathbf{S}_x&=dy\,dz\,\hat{\mathbf{x}},\qquad
                d\mathbf{S}_y=dx\,dz\,\hat{\mathbf{y}},\qquad
                d\mathbf{S}_z=dx\,dy\,\hat{\mathbf{z}},\\
                d\tau&=dx\,dy\,dz.
              \end{aligned}`,
              caption: "Elementos diferenciales de línea, superficies coordenadas y volumen en coordenadas cartesianas.",
            },
          },
          {
            title: "Elementos diferenciales cilíndricos",
            paragraphs: [
              "El arco azimutal mide r dφ; ese factor geométrico también aparece en las superficies y el volumen correspondientes.",
            ],
            equation: {
              tex: String.raw`\begin{aligned}
                d\boldsymbol{\ell}&=dr\,\hat{\mathbf{r}}+r\,d\varphi\,\hat{\boldsymbol{\varphi}}+dz\,\hat{\mathbf{z}},\\
                d\mathbf{S}_r&=r\,d\varphi\,dz\,\hat{\mathbf{r}},\qquad
                d\mathbf{S}_{\varphi}=dr\,dz\,\hat{\boldsymbol{\varphi}},\qquad
                d\mathbf{S}_z=r\,dr\,d\varphi\,\hat{\mathbf{z}},\\
                d\tau&=r\,dr\,d\varphi\,dz.
              \end{aligned}`,
              caption: "Elementos diferenciales de línea, superficies coordenadas y volumen en coordenadas cilíndricas.",
            },
          },
          {
            title: "Elementos diferenciales esféricos",
            paragraphs: [
              "Con θ como ángulo polar y φ como ángulo azimutal, los factores r y r sen θ reflejan las longitudes de arco de la base esférica.",
              "En este nodo basta reconocer estas expresiones; la derivación completa de los factores de escala y las integrales asociadas se estudiará más adelante.",
            ],
            equation: {
              tex: String.raw`\begin{aligned}
                d\boldsymbol{\ell}&=dr\,\hat{\mathbf{r}}+r\,d\theta\,\hat{\boldsymbol{\theta}}+r\sin\theta\,d\varphi\,\hat{\boldsymbol{\varphi}},\\
                d\mathbf{S}_r&=r^2\sin\theta\,d\theta\,d\varphi\,\hat{\mathbf{r}},\\
                d\mathbf{S}_{\theta}&=r\sin\theta\,dr\,d\varphi\,\hat{\boldsymbol{\theta}},\qquad
                d\mathbf{S}_{\varphi}=r\,dr\,d\theta\,\hat{\boldsymbol{\varphi}},\\
                d\tau&=r^2\sin\theta\,dr\,d\theta\,d\varphi.
              \end{aligned}`,
              caption: "Elementos diferenciales de línea, superficies coordenadas y volumen en coordenadas esféricas.",
            },
          },
        ],
        exercise: { type: "none" },
      },
      {
        id: "vector-identities",
        title: "Identidades",
        sections: [
          {
            title: "Composiciones que se anulan",
            paragraphs: [
              "Si las derivadas mixtas necesarias son continuas, la divergencia de un rotacional y el rotacional de un gradiente se anulan.",
            ],
            equation: {
              tex: String.raw`\nabla\cdot(\nabla\times\mathbf{F})=0
                \qquad
                \nabla\times(\nabla f)=\mathbf{0}`,
              caption: "Identidades para F y f con derivadas segundas continuas.",
            },
          },
          {
            title: "Reglas del producto",
            paragraphs: [
              "Las identidades siguientes requieren campos diferenciables. Cada una se presenta con sus hipótesis cuando se desbloquea en este taller.",
            ],
            equation: {
              tex: String.raw`\begin{aligned}
                \nabla\cdot(f\mathbf{F})&=f\,\nabla\cdot\mathbf{F}+\mathbf{F}\cdot\nabla f\\
                \nabla\times(f\mathbf{F})&=f\,\nabla\times\mathbf{F}+(\nabla f)\times\mathbf{F}\\
                \nabla\cdot(\mathbf{F}\times\mathbf{G})&=\mathbf{G}\cdot(\nabla\times\mathbf{F})-\mathbf{F}\cdot(\nabla\times\mathbf{G})
              \end{aligned}`,
              caption: "Tres reglas del producto usadas en cálculo vectorial electromagnético.",
            },
          },
          {
            title: "Campos conservativos",
            paragraphs: [
              "Un campo que deriva de un potencial es irrotacional si el potencial es suficientemente regular. El recíproco necesita además una condición sobre el dominio: en un abierto simplemente conexo —conectado y sin agujeros topológicos—, un campo C¹ con rotacional nulo admite un potencial.",
            ],
            equation: {
              tex: String.raw`\mathbf{F}=\nabla f\quad\Longrightarrow\quad\nabla\times\mathbf{F}=\mathbf{0}`,
              caption: "Un campo generado como gradiente es irrotacional cuando f posee las derivadas necesarias.",
            },
          },
        ],
        exercise: { type: "none" },
      },
      {
        id: "exit-check",
        title: "Reconocimiento visual",
        sections: [
          {
            title: "Dos campos bajo las mismas condiciones",
            paragraphs: [
              "Ambos campos están definidos en ℝ². Compara la dirección de sus flechas dentro de una misma ventana de visualización, con escala y densidad de muestreo comunes.",
              "Antes de responder, las etiquetas son deliberadamente neutrales. Las expresiones algebraicas y el análisis se mostrarán solo después de acertar.",
            ],
          },
        ],
        exercise: {
          type: "choice",
          presentation: "vector-field-cards",
          prompt: "¿Cuál de los siguientes campos vectoriales es conservativo?",
          choices: [
            {
              id: "field-a",
              label: "Campo A",
              figure: {
                fieldId: "radial-linear",
                domain: { x: [-2, 2], y: [-2, 2] },
                samplesPerAxis: 9,
                visualScale: 2.5,
                parameter: { id: "a", min: 0.5, max: 1.5, step: 0.1, nominal: 1 },
              },
              reveal: {
                sections: [
                  {
                    title: "Campo A después de responder",
                    paragraphs: [
                      "Este campo apunta desde el origen y admite una función escalar generadora. Su rotacional se anula para todo a del intervalo disponible.",
                    ],
                    equation: {
                      tex: String.raw`\begin{aligned}
                        \mathbf{F}_A(x,y;a)&=a\left(x\,\hat{\mathbf{x}}+y\,\hat{\mathbf{y}}\right),\\
                        f_A(x,y;a)&=\frac{a}{2}\left(x^2+y^2\right),\\
                        \nabla f_A&=\mathbf{F}_A,\qquad
                        (\nabla\times\mathbf{F}_A)_z=0.
                      \end{aligned}`,
                      caption: "Campo A, función escalar generadora y comprobación de rotacional nulo.",
                    },
                  },
                ],
              },
            },
            {
              id: "field-b",
              label: "Campo B",
              figure: {
                fieldId: "rotational-linear",
                domain: { x: [-2, 2], y: [-2, 2] },
                samplesPerAxis: 9,
                visualScale: 2.5,
                parameter: { id: "b", min: 0.5, max: 1.5, step: 0.1, nominal: 1 },
              },
              reveal: {
                sections: [
                  {
                    title: "Campo B después de responder",
                    paragraphs: [
                      "Las flechas son tangentes a círculos alrededor del origen. El rotacional vale 2b y no se anula porque el intervalo del parámetro excluye b = 0.",
                    ],
                    equation: {
                      tex: String.raw`\begin{aligned}
                        \mathbf{F}_B(x,y;b)&=b\left(-y\,\hat{\mathbf{x}}+x\,\hat{\mathbf{y}}\right),\\
                        (\nabla\times\mathbf{F}_B)_z
                        &=\frac{\partial(bx)}{\partial x}-\frac{\partial(-by)}{\partial y}=2b\ne 0.
                      \end{aligned}`,
                      caption: "Campo B y comprobación de rotacional no nulo en el rango permitido de b.",
                    },
                  },
                ],
              },
            },
          ],
          answerId: "field-a",
          retryExplanation: "Aún no. Compara si las direcciones pueden provenir del crecimiento de una sola función escalar; las fórmulas permanecerán ocultas durante el reintento.",
          explanation: "Campo A es conservativo: existe f_A con F_A = ∇f_A. Campo B posee circulación y rotacional no nulo.",
        },
      },
      {
        id: "guided-cartesian-potential",
        title: "Reconstrucción cartesiana guiada",
        sections: [
          {
            title: "Campo y objetivo",
            paragraphs: [
              "Sea el siguiente campo definido en Ω = ℝ³. Determina una función escalar f tal que F = ∇f y concluye si el campo es conservativo.",
              "El desarrollo está dividido en exactamente cinco intervenciones. Entre ellas, ORBIT mostrará únicamente el paso necesario para continuar el procedimiento.",
            ],
            equation: {
              tex: String.raw`\mathbf{F}(x,y,z)
                =\left(y^2\cos x+z^3\right)\hat{\mathbf{x}}
                +\left(2y\sin x-4\right)\hat{\mathbf{y}}
                +\left(3xz^2+2z\right)\hat{\mathbf{z}}`,
              caption: "Campo vectorial cartesiano cuya función escalar generadora se reconstruirá por componentes.",
            },
          },
        ],
        exercise: {
          type: "sequence",
          feedback: "guided",
          items: [
            {
              id: "choose-method",
              type: "choice",
              prompt: "Al tratar y y z como parámetros, ¿cómo se resuelve ∂f/∂x = y² cos(x) + z³?",
              choices: [
                { id: "direct-integration", label: "Integración directa respecto de x" },
                { id: "separation", label: "Separación de variables" },
                { id: "characteristics", label: "Ecuación característica" },
                { id: "fourier", label: "Transformada de Fourier" },
              ],
              answerId: "direct-integration",
              explanation: "Se integra directamente respecto de x, tratando y y z como constantes. Métodos más generales se estudiarán en nodos posteriores.",
            },
            {
              id: "first-integration",
              type: "choice",
              prompt: "Selecciona el resultado correcto de la primera integración respecto de x.",
              choices: [
                { id: "function-of-yz", label: "y² sin(x) + xz³ + C(y,z)" },
                { id: "numeric-constant", label: "y² sin(x) + xz³ + C₀" },
                { id: "function-of-x", label: "y² sin(x) + xz³ + C(x)" },
                { id: "missing-x", label: "y² sin(x) + z³ + C(y,z)" },
              ],
              answerId: "function-of-yz",
              explanation: "La constante de integración puede depender de y y z porque esas variables se mantuvieron fijas al integrar respecto de x.",
              reveal: {
                sections: [
                  {
                    title: "Primera integración",
                    equation: {
                      tex: String.raw`f(x,y,z)=y^2\sin x+xz^3+C(y,z)`,
                      caption: "Resultado de integrar la componente x, con una función de integración dependiente de y y z.",
                    },
                  },
                ],
              },
            },
            {
              id: "match-y-component",
              type: "expression",
              prompt: "De ∂f/∂y = 2y sin(x) + ∂C/∂y, ingresa la expresión para ∂C/∂y que reproduce la componente y de F.",
              promptPrefix: String.raw`\frac{\partial C}{\partial y}=`,
              placeholder: "Escribe solo el miembro derecho",
              answerPolicy: {
                kind: "expression-equivalent",
                version: 1,
                variables: ["y", "z"],
                constants: [],
                expectedExpression: "-4",
                feedback: "guided",
              },
              reveal: {
                sections: [
                  {
                    title: "Compatibilidad con la componente y",
                    equation: {
                      tex: String.raw`\frac{\partial C}{\partial y}=-4
                        \quad\Longrightarrow\quad C(y,z)=-4y+D(z)`,
                      caption: "La componente y determina la dependencia lineal de C respecto de y.",
                    },
                  },
                ],
              },
            },
            {
              id: "match-z-component",
              type: "expression",
              prompt: "Si f = y² sin(x) + xz³ − 4y + D(z), ingresa D′(z) para reproducir la componente z de F.",
              promptPrefix: String.raw`D'(z)=`,
              placeholder: "Escribe solo el miembro derecho",
              answerPolicy: {
                kind: "expression-equivalent",
                version: 1,
                variables: ["z"],
                constants: [],
                expectedExpression: "2*z",
                feedback: "guided",
              },
              reveal: {
                sections: [
                  {
                    title: "Compatibilidad con la componente z",
                    equation: {
                      tex: String.raw`D'(z)=2z
                        \quad\Longrightarrow\quad D(z)=z^2+C_0`,
                      caption: "La componente z completa la función de integración restante.",
                    },
                  },
                ],
              },
            },
            {
              id: "final-cartesian-expression",
              type: "expression",
              prompt: "Escribe una función escalar final f cuyo gradiente reproduzca F. Puedes omitir o añadir una constante aditiva.",
              placeholder: "Escribe f(x,y,z)",
              answerPolicy: {
                kind: "gradient-equivalent",
                version: 1,
                variables: ["x", "y", "z"],
                constants: ["C", "C_0"],
                coordinateSystem: "cartesian",
                expectedGradient: [
                  "y^2*cos(x)+z^3",
                  "2*y*sin(x)-4",
                  "3*x*z^2+2*z",
                ],
                feedback: "guided",
              },
              reveal: {
                sections: [
                  {
                    title: "Verificación cartesiana",
                    paragraphs: [
                      "Las tres componentes coinciden con F. Por tanto, F = ∇f; la integral de línea depende solo de los extremos y el campo es conservativo en ℝ³.",
                    ],
                    equation: {
                      tex: String.raw`\begin{aligned}
                        f&=y^2\sin x+xz^3-4y+z^2+C_0,\\
                        \frac{\partial f}{\partial x}&=y^2\cos x+z^3,\\
                        \frac{\partial f}{\partial y}&=2y\sin x-4,\\
                        \frac{\partial f}{\partial z}&=3xz^2+2z,\\
                        \nabla f&=\mathbf{F}.
                      \end{aligned}`,
                      caption: "Función escalar y comprobación de sus tres derivadas parciales cartesianas.",
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      {
        id: "independent-cylindrical-potential",
        title: "Evaluación cilíndrica independiente",
        sections: [
          {
            title: "Campo y dominio",
            paragraphs: [
              "En coordenadas cilíndricas (r, φ, z), considera el siguiente campo en una región de trabajo con r > 0 y componente azimutal nula.",
              "Esta evaluación consta de dos intervenciones y no entrega pistas durante la resolución. La primera respuesta se valida como una expresión completa, no como una cadena literal.",
            ],
            equation: {
              tex: String.raw`\mathbf{F}(r,\varphi,z)
                =\frac{rz}{(r^2+z^2)^{3/2}}\,\hat{\mathbf{r}}
                -\frac{r^2}{(r^2+z^2)^{3/2}}\,\hat{\mathbf{z}},
                \qquad F_{\varphi}=0`,
              caption: "Campo vectorial definido en la región cilíndrica r > 0; la evaluación usa puntos interiores de esa región.",
            },
          },
        ],
        exercise: {
          type: "sequence",
          feedback: "binary",
          items: [
            {
              id: "cylindrical-expression",
              type: "expression",
              prompt: "Encuentra una expresión f(r, φ, z) cuyo gradiente reproduzca el campo F.",
              placeholder: "Escribe f(r,phi,z)",
              answerPolicy: {
                kind: "gradient-equivalent",
                version: 1,
                variables: ["r", "phi", "z"],
                constants: ["C", "C_0"],
                coordinateSystem: "cylindrical",
                testPoints: [
                  { r: 0.5, phi: 0, z: 0.75 },
                  { r: 1, phi: 0.4, z: 2 },
                  { r: 1.5, phi: 1.2, z: -0.5 },
                  { r: 2, phi: 2.1, z: -1.25 },
                  { r: 0.8, phi: 3, z: 1.4 },
                  { r: 2.3, phi: 5, z: 0 },
                ],
                expectedGradient: [
                  "r*z/(r^2+z^2)^(3/2)",
                  "0",
                  "-r^2/(r^2+z^2)^(3/2)",
                ],
                feedback: "binary",
              },
              reveal: {
                sections: [
                  {
                    title: "Verificación posterior",
                    paragraphs: [
                      "Una forma válida es f = −z/√(r² + z²) + C. La constante aditiva no modifica el gradiente.",
                    ],
                    equation: {
                      tex: String.raw`\begin{aligned}
                        f&=-\frac{z}{\sqrt{r^2+z^2}}+C,\\
                        \nabla f&=\frac{\partial f}{\partial r}\hat{\mathbf{r}}
                        +\frac{1}{r}\frac{\partial f}{\partial\varphi}\hat{\boldsymbol{\varphi}}
                        +\frac{\partial f}{\partial z}\hat{\mathbf{z}},\\
                        \frac{\partial f}{\partial r}&=\frac{rz}{(r^2+z^2)^{3/2}},\qquad
                        \frac{1}{r}\frac{\partial f}{\partial\varphi}=0,\\
                        \frac{\partial f}{\partial z}&=-\frac{r^2}{(r^2+z^2)^{3/2}}.
                      \end{aligned}`,
                      caption: "Función escalar válida y verificación de las tres componentes del gradiente cilíndrico.",
                    },
                  },
                ],
              },
            },
            {
              id: "conservative-reason",
              type: "choice",
              prompt: "¿Por qué encontrar esta función escalar permite afirmar que el campo es conservativo?",
              choices: [
                {
                  id: "gradient-definition",
                  label: "Porque existe f en el dominio con F = ∇f; por el teorema fundamental, la integral depende solo de los extremos.",
                },
                { id: "zero-divergence", label: "Porque la divergencia se anula en el dominio y esa condición basta para garantizar conservación." },
                { id: "no-phi", label: "Porque las componentes no dependen de φ y toda independencia angular garantiza conservación." },
                { id: "decay", label: "Porque la magnitud decrece con la distancia y todo campo decreciente es conservativo." },
              ],
              answerId: "gradient-definition",
              explanation: "La existencia de f con F = ∇f en el dominio establece la independencia de trayectoria por el teorema fundamental de las integrales de línea.",
            },
          ],
        },
      },
    ],
    sources: [],
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
    objective: "Construir el campo eléctrico por superposición, relacionarlo con el potencial y justificar su carácter conservativo fuera de las cargas fuente.",
    prerequisites: [
      "Taller Vectorial completado",
      "Álgebra vectorial y derivadas parciales elementales",
      "Física general: fuerza, trabajo y energía potencial",
    ],
    model: "Cargas puntuales estacionarias en el vacío, superposición lineal, campo eléctrico E y potencial escalar V con E = −∇V fuera de las fuentes.",
    application: "Estimación de fuerzas, campos y diferencias de potencial producidas por configuraciones discretas de carga.",
    steps: [
      {
        id: "force-field-potential",
        title: "De fuerza a campo y potencial",
        sections: [
          {
            title: "La carga de prueba deja de ser protagonista",
            paragraphs: [
              "La fuerza sobre una carga de prueba q₀ depende tanto de la configuración fuente como del valor de q₀. El campo eléctrico separa ambas funciones: describe lo que las fuentes producen en cada punto y permite calcular después la fuerza sobre cualquier carga de prueba suficientemente pequeña.",
              "Este nodo introduce por primera vez la notación electromagnética E y V. En el Taller Vectorial se usaron F y f para mantener separada la herramienta matemática de su interpretación física.",
            ],
            equation: {
              tex: String.raw`\mathbf{F}=q_0\mathbf{E},\qquad
                \mathbf{E}(\mathbf{r})=
                \frac{1}{4\pi\varepsilon_0}\sum_i q_i
                \frac{\mathbf{r}-\mathbf{r}_i}{\lVert\mathbf{r}-\mathbf{r}_i\rVert^3}`,
              caption: "Fuerza sobre una carga de prueba y superposición del campo de cargas puntuales.",
            },
          },
          {
            title: "Convención de potencial electrostático",
            paragraphs: [
              "En electrostática se define el potencial para que el campo apunte hacia donde V disminuye con mayor rapidez. El signo menos es una convención física esencial y no contradice la relación F = ∇f estudiada para un campo matemático general.",
            ],
            equation: {
              tex: String.raw`V(\mathbf r)=\frac{1}{4\pi\varepsilon_0}
                \sum_i\frac{q_i}{\lVert\mathbf r-\mathbf r_i\rVert},
                \qquad \mathbf E=-\nabla V`,
              caption: "Potencial de cargas puntuales y relación electrostática entre campo y gradiente.",
            },
          },
        ],
        exercise: { type: "none" },
      },
      {
        id: "three-charge-laboratory",
        title: "Laboratorio de tres cargas",
        sections: [
          {
            title: "Superposición visible",
            paragraphs: [
              "Mueve las tres cargas por el plano con el puntero o enfoca una carga y usa las flechas del teclado. Ajusta cada valor normalizado entre −1 y +1; el cero conserva la fuente en la escena, pero elimina su contribución.",
              "P es un punto de observación fijo. Las flechas finas muestran contribuciones individuales y la gruesa, su suma vectorial. Si una carga coincide con P, el campo puntual no está definido y la figura lo anuncia en vez de suavizar la singularidad.",
            ],
          },
        ],
        exercise: {
          type: "choice",
          presentation: "point-charge-field",
          figure: {
            title: "Campo normalizado de tres cargas puntuales",
            description: "Tres cargas móviles rodean el punto de observación P. Cada símbolo incluye signo y valor; las flechas indican contribuciones y suma.",
            caption: "Modelo adimensional para explorar geometría y superposición; no representa una escala física concreta.",
            domain: { x: [-2, 2], y: [-2, 2] },
            probe: { x: 0, y: 0 },
            chargeRange: { min: -1, max: 1, step: 0.1 },
            keyboardStep: 0.1,
            singularityRadius: 0,
            charges: [
              { id: "q1", label: "q₁", x: -1.2, y: 0.7, value: 0.8 },
              { id: "q2", label: "q₂", x: 1.1, y: 0.6, value: -0.6 },
              { id: "q3", label: "q₃", x: 0.2, y: -1.25, value: 0.4 },
            ],
          },
          prompt: "Después de explorar, ¿qué operación produce el campo total en P?",
          choices: [
            { id: "vector-sum", label: "Sumar vectorialmente las tres contribuciones evaluadas en P" },
            { id: "magnitudes", label: "Sumar solo las tres magnitudes, sin considerar dirección" },
            { id: "nearest", label: "Conservar únicamente la contribución de la carga más cercana" },
            { id: "average", label: "Promediar las posiciones y tratar las cargas como una sola" },
          ],
          answerId: "vector-sum",
          retryExplanation: "La ley es lineal en las fuentes, pero cada contribución conserva la dirección determinada por su geometría.",
          explanation: "El principio de superposición suma vectores; signos, distancias y direcciones se evalúan para cada fuente antes de sumar.",
        },
      },
      {
        id: "coulomb-scale",
        title: "Escala, signo y distancia",
        sections: [
          {
            title: "Dos cargas puntuales",
            equation: {
              tex: String.raw`F=k_e\frac{\lvert q_1q_2\rvert}{r^2},\qquad
                k_e\approx 8.99\times10^9\;\mathrm{N\,m^2/C^2}`,
              caption: "Magnitud de la fuerza de Coulomb entre dos cargas puntuales.",
            },
            bullets: [
              "El producto de cargas fija atracción o repulsión; la expresión mostrada calcula la magnitud.",
              "Duplicar la distancia reduce la magnitud por un factor cuatro.",
              "La respuesta debe expresarse en newton y comprobarse con su orden de magnitud.",
            ],
          },
        ],
        exercise: {
          type: "numeric",
          prompt: "Dos cargas de +1 nC están separadas 0,10 m. Calcula la magnitud de la fuerza en newton.",
          expected: 8.9875517923e-7,
          absoluteTolerance: 1.5e-8,
          unit: "N",
          placeholder: "Ej.: 8,99e-7",
          explanation: "F = 8,99×10⁹·(10⁻⁹)²/(0,10)² ≈ 8,99×10⁻⁷ N. Es repulsiva porque ambas cargas tienen el mismo signo.",
        },
      },
      {
        id: "electrostatic-conservative-proof",
        title: "Por qué el campo electrostático es conservativo",
        sections: [
          {
            title: "Una carga puntual y su dominio",
            paragraphs: [
              "Considera una carga q en el origen y el dominio Ω = ℝ³∖{0}. El origen se excluye porque allí el modelo de carga puntual es singular. Reconstruiremos el campo desde V y terminaremos conectando el cálculo local con la independencia de trayectoria.",
              "La demostración tiene exactamente siete intervenciones. Cada paso validado revela la pieza algebraica o conceptual necesaria para el siguiente.",
            ],
            equation: {
              tex: String.raw`R=\sqrt{x^2+y^2+z^2},\qquad
                \Omega=\mathbb{R}^3\setminus\{\mathbf 0\}`,
              caption: "Distancia a la carga fuente y dominio donde campo y potencial están definidos.",
            },
          },
        ],
        exercise: {
          type: "sequence",
          feedback: "guided",
          items: [
            {
              id: "choose-point-potential",
              type: "choice",
              prompt: "¿Qué potencial corresponde a una carga puntual q si se toma V → 0 cuando R → ∞?",
              choices: [
                { id: "inverse-radius", label: "V = kₑq/R" },
                { id: "inverse-square", label: "V = kₑq/R²" },
                { id: "linear-radius", label: "V = kₑqR" },
                { id: "constant", label: "V = kₑq" },
              ],
              answerId: "inverse-radius",
              explanation: "El potencial de una carga puntual decrece como 1/R y la referencia elegida elimina una constante aditiva.",
              reveal: {
                sections: [
                  {
                    title: "Potencial candidato",
                    equation: {
                      tex: String.raw`V(x,y,z)=\frac{k_eq}{\sqrt{x^2+y^2+z^2}}`,
                      caption: "Potencial de la carga puntual en Ω.",
                    },
                  },
                ],
              },
            },
            {
              id: "differentiate-x",
              type: "expression",
              prompt: "Escribe ∂V/∂x para V = kq/√(x²+y²+z²).",
              promptPrefix: String.raw`\frac{\partial V}{\partial x}=`,
              placeholder: "Escribe solo el miembro derecho",
              answerPolicy: {
                kind: "expression-equivalent",
                version: 1,
                variables: ["x", "y", "z"],
                constants: ["k", "q"],
                testPoints: [
                  { x: 1, y: 0, z: 0 },
                  { x: 0.5, y: -1, z: 2 },
                  { x: -1.5, y: 0.75, z: 0.5 },
                ],
                expectedExpression: "-k*q*x/(x^2+y^2+z^2)^(3/2)",
                feedback: "guided",
              },
              reveal: {
                sections: [
                  {
                    title: "Componente x del gradiente",
                    equation: {
                      tex: String.raw`\frac{\partial V}{\partial x}
                        =-\frac{k_eqx}{(x^2+y^2+z^2)^{3/2}}`,
                      caption: "La regla de la cadena aporta x y el exponente −3/2.",
                    },
                  },
                ],
              },
            },
            {
              id: "differentiate-y",
              type: "expression",
              prompt: "Aplica la misma regla de la cadena y escribe ∂V/∂y.",
              promptPrefix: String.raw`\frac{\partial V}{\partial y}=`,
              placeholder: "Escribe solo el miembro derecho",
              answerPolicy: {
                kind: "expression-equivalent",
                version: 1,
                variables: ["x", "y", "z"],
                constants: ["k", "q"],
                testPoints: [
                  { x: 1, y: 0.5, z: 0 },
                  { x: 0.5, y: -1, z: 2 },
                  { x: -1.5, y: 0.75, z: 0.5 },
                ],
                expectedExpression: "-k*q*y/(x^2+y^2+z^2)^(3/2)",
                feedback: "guided",
              },
              reveal: {
                sections: [
                  {
                    title: "Componente y del gradiente",
                    equation: {
                      tex: String.raw`\frac{\partial V}{\partial y}
                        =-\frac{k_eqy}{(x^2+y^2+z^2)^{3/2}}`,
                      caption: "La segunda componente conserva la misma dependencia radial.",
                    },
                  },
                ],
              },
            },
            {
              id: "differentiate-z",
              type: "expression",
              prompt: "Completa el gradiente escribiendo ∂V/∂z.",
              promptPrefix: String.raw`\frac{\partial V}{\partial z}=`,
              placeholder: "Escribe solo el miembro derecho",
              answerPolicy: {
                kind: "expression-equivalent",
                version: 1,
                variables: ["x", "y", "z"],
                constants: ["k", "q"],
                testPoints: [
                  { x: 1, y: 0, z: 0.5 },
                  { x: 0.5, y: -1, z: 2 },
                  { x: -1.5, y: 0.75, z: -0.5 },
                ],
                expectedExpression: "-k*q*z/(x^2+y^2+z^2)^(3/2)",
                feedback: "guided",
              },
              reveal: {
                sections: [
                  {
                    title: "Gradiente completo",
                    equation: {
                      tex: String.raw`\nabla V=-\frac{k_eq}{R^3}
                        \left(x\hat{\mathbf x}+y\hat{\mathbf y}+z\hat{\mathbf z}\right)`,
                      caption: "Las tres derivadas forman un vector radial dirigido hacia menor R cuando q es positivo.",
                    },
                  },
                ],
              },
            },
            {
              id: "assemble-electric-field",
              type: "choice",
              prompt: "¿Qué campo resulta al aplicar la convención electrostática E = −∇V?",
              choices: [
                { id: "outward-field", label: "E = kₑq(x x̂ + y ŷ + z ẑ)/R³" },
                { id: "inward-field", label: "E = −kₑq(x x̂ + y ŷ + z ẑ)/R³" },
                { id: "constant-field", label: "E = kₑq(x̂ + ŷ + ẑ)" },
                { id: "scalar-field", label: "E = kₑq/R" },
              ],
              answerId: "outward-field",
              explanation: "El signo menos cancela el signo del gradiente. Para q positiva, el campo apunta radialmente hacia afuera.",
              reveal: {
                sections: [
                  {
                    title: "Campo reconstruido",
                    equation: {
                      tex: String.raw`\mathbf E=-\nabla V
                        =\frac{k_eq}{R^3}
                        \left(x\hat{\mathbf x}+y\hat{\mathbf y}+z\hat{\mathbf z}\right)
                        =\frac{k_eq}{R^2}\hat{\mathbf R}`,
                      caption: "Campo de Coulomb obtenido como gradiente negativo del potencial.",
                    },
                  },
                ],
              },
            },
            {
              id: "curl-conclusion",
              type: "choice",
              prompt: "¿Por qué se anula ∇×E en Ω?",
              choices: [
                { id: "curl-gradient", label: "Porque E = −∇V y el rotor de un gradiente C² se anula" },
                { id: "zero-divergence", label: "Porque toda divergencia nula obliga a que el rotor sea nulo" },
                { id: "radial-only", label: "Porque cualquier campo radial tiene rotor nulo, incluso si depende del ángulo" },
                { id: "inverse-square-only", label: "Porque cualquier magnitud proporcional a 1/R² es conservativa" },
              ],
              answerId: "curl-gradient",
              explanation: "En Ω el potencial es suficientemente regular; por la identidad ∇×(∇V)=0, también ∇×E=0.",
            },
            {
              id: "path-independence",
              type: "choice",
              prompt: "¿Qué afirmación completa la demostración del carácter conservativo?",
              choices: [
                { id: "endpoint-only", label: "∫Aᴮ E·dℓ = V(A) − V(B) y, para una curva cerrada, ∮E·dℓ = 0" },
                { id: "length-only", label: "La integral depende solo de la longitud total del camino" },
                { id: "always-positive", label: "La integral es positiva para cualquier orientación del recorrido" },
                { id: "source-included", label: "La misma demostración sigue siendo regular en el punto R = 0" },
              ],
              answerId: "endpoint-only",
              explanation: "La integral depende únicamente de los extremos. En un lazo, ambos extremos coinciden y la circulación electrostática es cero; el punto fuente permanece fuera del dominio.",
              reveal: {
                sections: [
                  {
                    title: "Conclusión local y global",
                    equation: {
                      tex: String.raw`\int_A^B\mathbf E\cdot\mathrm d\boldsymbol\ell
                        =V(A)-V(B),\qquad
                        \oint_C\mathbf E\cdot\mathrm d\boldsymbol\ell=0`,
                      caption: "Independencia de trayectoria y circulación nula para curvas cerradas contenidas en Ω.",
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      {
        id: "dipole-transfer",
        title: "Transferencia: potencial nulo no significa campo nulo",
        sections: [
          {
            title: "Un dipolo sobre el eje x",
            paragraphs: [
              "Ubica +1 nC en x = −0,10 m y −1 nC en x = +0,10 m. El origen está a igual distancia de ambas cargas. Evalúa por separado potencial y campo: uno suma escalares y el otro, vectores.",
            ],
            equation: {
              tex: String.raw`V(\mathbf 0)=k_e\left(\frac{+q}{a}+\frac{-q}{a}\right)=0`,
              caption: "Cancelación del potencial en el punto medio de dos cargas opuestas.",
            },
          },
        ],
        exercise: {
          type: "sequence",
          feedback: "binary",
          items: [
            {
              id: "dipole-field-value",
              type: "numeric",
              prompt: "Calcula la componente Ex en el origen. Usa kₑ = 8,99×10⁹ N m²/C² y responde en N/C.",
              expected: 1798,
              absoluteTolerance: 20,
              unit: "N/C",
              placeholder: "Ej.: 1,80e3",
              explanation: "Ambas contribuciones apuntan hacia +x y cada una vale kₑq/a² ≈ 899 N/C; por tanto Ex ≈ 1,80×10³ N/C.",
            },
            {
              id: "zero-potential-interpretation",
              type: "choice",
              prompt: "¿Cómo puede V ser cero mientras E no lo es en el origen?",
              choices: [
                { id: "value-versus-gradient", label: "V es un valor escalar local; E depende de su gradiente, que puede ser no nulo donde V cruza por cero" },
                { id: "field-must-vanish", label: "No puede ocurrir: si V = 0 en un punto, E también debe anularse allí" },
                { id: "units-cancel", label: "Ocurre porque volt y newton por coulomb son la misma unidad" },
                { id: "only-positive", label: "Ocurre únicamente si ambas cargas son positivas" },
              ],
              answerId: "value-versus-gradient",
              explanation: "El cero de una función no obliga a que su pendiente sea cero. El dipolo cancela V en el punto medio, pero sus campos se refuerzan en la dirección +x.",
            },
          ],
          explanation: "Has distinguido suma escalar y vectorial, aplicado superposición y conectado el campo electrostático con un potencial conservativo.",
        },
      },
    ],
    sources: [],
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
          "Los personajes secundarios ofrecen contexto narrativo o histórico y desbloquean herramientas de consulta sin convertir el encuentro en una evaluación.",
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
    id: "circuit-analysis-bench",
    areaId: "circuits",
    kind: "lesson",
    title: "Banco de Análisis de Circuitos",
    shortTitle: "Banco de circuitos",
    marker: "Ω",
    offset: { x: -34, y: 12 },
    interactionRadius: 78,
    visibility: "visibleWhenAreaUnlocked",
    requirements: {},
    grants: { concepts: ["circuit-analysis"] },
    objective: "Aplicar un modelo concentrado y verificar potencia, signo y unidades.",
    sections: [
      {
        title: "Del campo a una red",
        paragraphs: [
          "Cuando las dimensiones del dispositivo son pequeñas frente a la longitud de onda relevante, tensión y corriente pueden modelarse mediante elementos concentrados.",
          "Este modelo es una aproximación con dominio de validez; no reemplaza las ecuaciones de campo en estructuras eléctricamente grandes.",
        ],
      },
      {
        title: "Modelo mínimo",
        equation: {
          tex: String.raw`V=RI,\qquad P=VI=I^2R=\frac{V^2}{R}`,
          caption: "Relaciones para una resistencia pasiva bajo la convención de carga.",
        },
        paragraphs: [
          "La aplicación inmediata es estimar corriente y disipación antes de seleccionar un componente.",
        ],
      },
    ],
    exercise: {
      type: "numeric",
      prompt: "Una resistencia de 6 Ω está conectada a 12 V. Calcula la corriente en ampere.",
      expected: 2,
      absoluteTolerance: 0.02,
      unit: "A",
      placeholder: "Ej.: 2,0",
      explanation: "Se elige la ley de Ohm porque el elemento es resistivo: I = V/R = 12/6 = 2 A; el signo depende de la referencia elegida.",
    },
    sources: [
      {
        label: "MIT OpenCourseWare 6.002 — Circuits and Electronics",
        url: "https://ocw.mit.edu/courses/6-002-circuits-and-electronics-spring-2007/",
      },
    ],
  },
  {
    id: "differential-equations-lab",
    areaId: "differential-equations",
    kind: "lesson",
    title: "Laboratorio de Ecuaciones Diferenciales",
    shortTitle: "Laboratorio de ED",
    marker: "∂",
    offset: { x: 26, y: -18 },
    interactionRadius: 78,
    visibility: "visibleWhenAreaUnlocked",
    requirements: {},
    grants: { concepts: ["differential-equation-modeling"] },
    objective: "Distinguir ecuación, condiciones auxiliares y escala característica de una solución.",
    sections: [
      {
        title: "Una ley local no basta",
        paragraphs: [
          "Las EDO describen evolución en una variable; las EDP permiten variación espacial y temporal. Una solución física requiere además condiciones iniciales o de borde compatibles.",
          "En electromagnetismo, esta herramienta reaparece en transitorios de circuitos, difusión, potencial, ondas y modos guiados.",
        ],
      },
      {
        title: "Modelo mínimo",
        equation: {
          tex: String.raw`\frac{\mathrm{d}V}{\mathrm{d}t}+\frac{1}{RC}V=0,
            \qquad V(t)=V_0e^{-t/(RC)}`,
          caption: "Descarga ideal de un circuito RC con constante de tiempo τ = RC.",
        },
        paragraphs: [
          "El producto RC fija la escala temporal y permite juzgar si una respuesta calculada es razonable.",
        ],
      },
    ],
    exercise: {
      type: "choice",
      prompt: "Si R se duplica y C permanece fija, ¿qué ocurre con el tiempo característico RC?",
      choices: ["Se reduce a la mitad", "No cambia", "Se duplica", "Se anula"],
      answerIndex: 2,
      explanation: "La constante τ = RC se duplica; la descarga es más lenta y conserva unidades de segundo.",
    },
    sources: [
      {
        label: "MIT OpenCourseWare 18.03 — Differential Equations",
        url: "https://ocw.mit.edu/courses/18-03-differential-equations-spring-2010/",
      },
    ],
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
        equation: {
          tex: String.raw`\mathbf{B}(r)=\frac{\mu_0 I}{2\pi r}\,\hat{\boldsymbol{\phi}}`,
          caption: "Campo magnético de un conductor rectilíneo largo.",
        },
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
    areaId: "maxwell",
    kind: "lesson",
    title: "Estación de Faraday",
    shortTitle: "Faraday",
    marker: "F",
    offset: { x: -82, y: 48 },
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
        equation: {
          tex: String.raw`\mathcal{E}=-N\frac{\mathrm{d}\Phi_B}{\mathrm{d}t}`,
          caption: "Ley de Faraday-Lenz para una bobina de N vueltas.",
        },
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
    offset: { x: 82, y: -54 },
    interactionRadius: 78,
    visibility: "visibleWhenAreaUnlocked",
    requirements: { concepts: ["faraday-induction"] },
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
        equation: {
          tex: String.raw`\nabla\times\mathbf{B}=\mu_0\mathbf{J}
            +\mu_0\varepsilon_0\frac{\partial\mathbf{E}}{\partial t}`,
          caption: "Ley de Ampère-Maxwell con corriente de desplazamiento.",
        },
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
        equation: {
          tex: String.raw`c=\frac{1}{\sqrt{\mu_0\varepsilon_0}}
            \approx3.00\times10^8\;\mathrm{m/s}`,
          caption: "Velocidad de una onda electromagnética en el vacío.",
        },
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
    id: "sensor-calibration-lab",
    areaId: "sensors-instrumentation",
    kind: "lesson",
    title: "Laboratorio de Calibración de Sensores",
    shortTitle: "Calibración",
    marker: "S",
    offset: { x: -28, y: 18 },
    interactionRadius: 78,
    visibility: "visibleWhenAreaUnlocked",
    requirements: {},
    grants: { concepts: ["electromagnetic-sensing"] },
    objective: "Calcular una respuesta lineal y reconocer sensibilidad, unidad y carga del instrumento.",
    sections: [
      {
        title: "De una magnitud a una lectura",
        paragraphs: [
          "Un sensor electromagnético convierte una variable física en una señal medible. La calibración relaciona ambas y declara el intervalo donde el modelo es válido.",
          "La electrónica de lectura puede cargar al sensor; por eso el sistema de medición forma parte del modelo, no es un observador ideal.",
        ],
      },
      {
        title: "Modelo mínimo",
        equation: {
          tex: String.raw`\Delta V=S_B\,\Delta B`,
          caption: "Respuesta lineal de un sensor magnético con sensibilidad S_B.",
        },
        paragraphs: ["Esta relación permite dimensionar amplificación y resolución del conversor."],
      },
    ],
    exercise: {
      type: "numeric",
      prompt: "Un sensor entrega 50 mV/mT. ¿Qué cambio de tensión produce una variación de 4 mT?",
      expected: 0.2,
      absoluteTolerance: 0.005,
      unit: "V",
      placeholder: "Ej.: 0,20",
      explanation: "ΔV = 50 mV/mT·4 mT = 200 mV = 0.20 V; las unidades de mT se cancelan.",
    },
    sources: [{ label: "NIST — Sensors", url: "https://www.nist.gov/topics/sensors" }],
  },
  {
    id: "rotating-machine-lab",
    areaId: "electrical-machines",
    kind: "lesson",
    title: "Laboratorio de Máquina Rotatoria",
    shortTitle: "Máquina rotatoria",
    marker: "R",
    offset: { x: -34, y: 10 },
    interactionRadius: 78,
    visibility: "visibleWhenAreaUnlocked",
    requirements: {},
    grants: { concepts: ["electromechanical-conversion"] },
    objective: "Relacionar corriente, flujo y torque en un modelo electromecánico elemental.",
    sections: [
      {
        title: "Conversión, no creación",
        paragraphs: [
          "Una máquina eléctrica intercambia energía entre dominios eléctrico, magnético y mecánico. Pérdidas y saturación se omiten aquí y deben reincorporarse en un modelo maduro.",
        ],
      },
      {
        title: "Modelo mínimo",
        equation: {
          tex: String.raw`\tau=k\Phi I`,
          caption: "Modelo lineal de torque para flujo Φ y corriente I.",
        },
        paragraphs: ["El modelo sirve para estimar el punto de operación antes de estudiar geometría y conmutación."],
      },
    ],
    exercise: {
      type: "numeric",
      prompt: "Si kΦ = 0.8 N·m/A e I = 3 A, calcula el torque ideal.",
      expected: 2.4,
      absoluteTolerance: 0.03,
      unit: "N·m",
      placeholder: "Ej.: 2,4",
      explanation: "τ = (0.8 N·m/A)(3 A) = 2.4 N·m. El resultado ideal no incluye pérdidas.",
    },
    sources: [
      {
        label: "MIT OpenCourseWare 6.061 — Introduction to Electric Power Systems",
        url: "https://ocw.mit.edu/courses/6-061-introduction-to-electric-power-systems-spring-2011/",
      },
    ],
  },
  {
    id: "power-network-station",
    areaId: "power-systems",
    kind: "lesson",
    title: "Estación de Redes de Potencia",
    shortTitle: "Red de potencia",
    marker: "P",
    offset: { x: 22, y: -18 },
    interactionRadius: 78,
    visibility: "visibleWhenAreaUnlocked",
    requirements: {},
    grants: { concepts: ["power-system-analysis"] },
    objective: "Distinguir potencia activa, reactiva y aparente en régimen sinusoidal.",
    sections: [
      {
        title: "Qué efectivamente se transfiere",
        paragraphs: [
          "En corriente alterna, el desfase entre tensión y corriente separa la potencia media transferida de la energía que oscila entre fuentes y elementos reactivos.",
        ],
      },
      {
        title: "Modelo mínimo",
        equation: {
          tex: String.raw`P=V_{\mathrm{rms}}I_{\mathrm{rms}}\cos\varphi,\qquad
            \lvert S\rvert=V_{\mathrm{rms}}I_{\mathrm{rms}}`,
          caption: "Potencia activa P y magnitud de potencia aparente S.",
        },
        paragraphs: ["El factor de potencia influye en corriente, pérdidas y dimensionamiento de equipos."],
      },
    ],
    exercise: {
      type: "numeric",
      prompt: "Una carga consume 5 A a 230 V rms con factor de potencia 0.8. Calcula P.",
      expected: 920,
      absoluteTolerance: 5,
      unit: "W",
      placeholder: "Ej.: 920",
      explanation: "P = 230·5·0.8 = 920 W. La potencia aparente sería 1150 VA.",
    },
    sources: [
      {
        label: "MIT OpenCourseWare 6.061 — Introduction to Electric Power Systems",
        url: "https://ocw.mit.edu/courses/6-061-introduction-to-electric-power-systems-spring-2011/",
      },
    ],
  },
  {
    id: "field-solver-lab",
    areaId: "computational-electromagnetics",
    kind: "lesson",
    title: "Laboratorio de Solución de Campos",
    shortTitle: "Solución numérica",
    marker: "#",
    offset: { x: -24, y: 12 },
    interactionRadius: 78,
    visibility: "visibleWhenAreaUnlocked",
    requirements: {},
    grants: { concepts: ["computational-electromagnetics"] },
    objective: "Interpretar discretización, convergencia y comparación con un caso verificable.",
    sections: [
      {
        title: "Una aproximación que debe demostrar calidad",
        paragraphs: [
          "Una malla transforma un campo continuo en un conjunto finito de incógnitas. Una imagen suave no prueba exactitud: se necesitan refinamiento, balance físico y comparación con casos conocidos.",
        ],
      },
      {
        title: "Modelo mínimo",
        equation: {
          tex: String.raw`\nabla^2V=-\frac{\rho}{\varepsilon},\qquad
            \lVert e_h\rVert\approx C h^p`,
          caption: "Ecuación de Poisson y modelo de error para paso de malla h.",
        },
        paragraphs: ["El orden p se estima refinando la malla y observando cómo disminuye el error."],
      },
    ],
    exercise: {
      type: "choice",
      prompt: "En un método de segundo orden, ¿qué se espera al reducir h a la mitad en el régimen asintótico?",
      choices: ["El error se duplica", "El error baja aproximadamente a un cuarto", "No cambia", "Se anula exactamente"],
      answerIndex: 1,
      explanation: "Con p = 2, (h/2)²/h² = 1/4. Es una expectativa de convergencia, no exactitud absoluta.",
    },
    sources: [
      {
        label: "MIT OpenCourseWare 6.013 — Electromagnetics and Applications",
        url: "https://ocw.mit.edu/courses/6-013-electromagnetics-and-applications-spring-2009/",
      },
    ],
  },
  {
    id: "spectrum-workshop",
    areaId: "fourier-analysis",
    kind: "lesson",
    title: "Taller del Espectro",
    shortTitle: "Espectro",
    marker: "Σ",
    offset: { x: 18, y: -12 },
    interactionRadius: 78,
    visibility: "visibleWhenAreaUnlocked",
    requirements: {},
    grants: { concepts: ["fourier-analysis"] },
    objective: "Relacionar período, frecuencia, amplitud y fase de una componente sinusoidal.",
    sections: [
      {
        title: "Dos vistas de la misma señal",
        paragraphs: [
          "La descripción temporal muestra evolución; la espectral revela qué frecuencias y fases componen la señal. Ninguna vista elimina información si la transformación se aplica con sus hipótesis.",
        ],
      },
      {
        title: "Modelo mínimo",
        equation: {
          tex: String.raw`x(t)=A\cos(2\pi f_0t+\phi),\qquad f_0=\frac{1}{T}`,
          caption: "Componente sinusoidal y relación entre frecuencia y período.",
        },
        paragraphs: ["El espectro permite analizar filtrado, modulación, dispersión e interferencia."],
      },
    ],
    exercise: {
      type: "numeric",
      prompt: "Una señal tiene período T = 2 ms. Calcula su frecuencia fundamental.",
      expected: 500,
      absoluteTolerance: 2,
      unit: "Hz",
      placeholder: "Ej.: 500",
      explanation: "T = 0.002 s, por lo que f₀ = 1/T = 500 Hz.",
    },
    sources: [
      {
        label: "MIT OpenCourseWare RES.6-007 — Signals and Systems",
        url: "https://ocw.mit.edu/courses/res-6-007-signals-and-systems-spring-2011/",
      },
    ],
  },
  {
    id: "optics-bench",
    areaId: "optics-photonics",
    kind: "lesson",
    title: "Banco de Interfaces Ópticas",
    shortTitle: "Interfaz óptica",
    marker: "O",
    offset: { x: -20, y: 14 },
    interactionRadius: 78,
    visibility: "visibleWhenAreaUnlocked",
    requirements: {},
    grants: { concepts: ["optical-propagation"] },
    objective: "Aplicar continuidad de fase para relacionar ángulos e índices de refracción.",
    sections: [
      {
        title: "La óptica sigue siendo electromagnetismo",
        paragraphs: [
          "En una interfaz plana, la frecuencia se conserva y la componente tangencial del vector de onda debe ser compatible a ambos lados.",
        ],
      },
      {
        title: "Modelo mínimo",
        equation: {
          tex: String.raw`n_1\sin\theta_1=n_2\sin\theta_2`,
          caption: "Ley de Snell para dos medios isotrópicos.",
        },
        paragraphs: ["La misma idea sustenta lentes, fibras y dispositivos fotónicos."],
      },
    ],
    exercise: {
      type: "choice",
      prompt: "Al pasar de un medio con mayor índice a otro con menor índice, la reflexión interna total puede ocurrir cuando…",
      choices: ["El ángulo de incidencia supera el crítico", "La frecuencia es cero", "Ambos índices son idénticos", "La incidencia es siempre normal"],
      answerIndex: 0,
      explanation: "Para n₁ > n₂ existe un ángulo crítico; sobre él no hay ángulo transmitido real en el modelo ideal.",
    },
    sources: [
      {
        label: "MIT OpenCourseWare 2.71 — Optics",
        url: "https://ocw.mit.edu/courses/2-71-optics-spring-2009/",
      },
    ],
  },
  {
    id: "shielding-chamber",
    areaId: "electromagnetic-compatibility",
    kind: "npc",
    title: "Heike Kamerlingh Onnes",
    shortTitle: "Onnes",
    marker: "O",
    offset: { x: 20, y: -12 },
    interactionRadius: 78,
    visibility: "visibleWhenAreaUnlocked",
    requirements: {},
    grants: {},
    objective: "Conocer el hito experimental de 1911 y abrir en el Formulario el modelo introductorio de la transición superconductora.",
    prerequisites: [
      "Temperatura absoluta",
      "Noción cualitativa de resistencia eléctrica",
    ],
    model: "Encuentro histórico no evaluativo: al registrarlo se habilitan fórmulas introductorias, mientras el aprendizaje y su comprobación permanecen en un lugar independiente.",
    application: "Contexto para la futura ruta de materiales, instrumentación criogénica, imanes y sensores.",
    sections: [
      {
        title: "Una observación que cambió el modelo",
        paragraphs: [
          "En 1911, el trabajo de baja temperatura dirigido por Heike Kamerlingh Onnes mostró que la resistencia eléctrica del mercurio descendía abruptamente hasta un valor no medible al enfriarlo cerca del cero absoluto.",
          "El encuentro conserva ese contexto histórico. El modelo, sus límites y la comprobación conceptual se estudian por separado en el Laboratorio de Transición Superconductora.",
        ],
      },
    ],
    exercise: {
      type: "acknowledge",
      prompt: "Registra el encuentro para incorporar sus fórmulas introductorias al Formulario.",
      buttonLabel: "Registrar encuentro",
      explanation: "El contexto de Onnes quedó registrado y sus fórmulas introductorias están disponibles en el Formulario.",
    },
    sources: [
      {
        label: "Nobel Prize — Heike Kamerlingh Onnes",
        url: "https://www.nobelprize.org/prizes/physics/1913/onnes/facts/",
      },
    ],
  },
  {
    id: "superconductivity-transition-lab",
    areaId: "electromagnetic-compatibility",
    kind: "lesson",
    title: "Laboratorio de Transición Superconductora",
    shortTitle: "Transición superconductora",
    marker: "S",
    offset: { x: -78, y: 52 },
    interactionRadius: 78,
    visibility: "visibleWhenAreaUnlocked",
    requirements: {},
    grants: { concepts: ["electromagnetic-compatibility"] },
    objective: "Distinguir una transición superconductora de una disminución resistiva gradual mediante el comportamiento cualitativo de R frente a T.",
    prerequisites: [
      "Resistencia eléctrica en corriente continua",
      "Lectura cualitativa de gráficos",
      "Temperatura absoluta",
    ],
    model: "Modelo introductorio y provisional: bajo una temperatura crítica y sin exceder los límites críticos de corriente y campo, ciertos materiales pueden presentar resistencia eléctrica continua indistinguible de cero dentro de la resolución experimental.",
    application: "Puente futuro hacia materiales, instrumentación criogénica, imanes y sensores; el diseño de dispositivos y la teoría microscópica quedan fuera de este primer aprendizaje.",
    sections: [
      {
        title: "Modelo inicial y sus límites",
        paragraphs: [
          "Representamos la transición mediante una temperatura crítica T_c. Por encima de ella el material posee resistencia; por debajo puede entrar en estado superconductor si tampoco se exceden sus límites críticos de corriente y campo.",
          "Este modelo es provisional: no explica el mecanismo microscópico, la respuesta magnética ni cómo dependen los límites críticos del material y la geometría.",
        ],
        equation: {
          tex: String.raw`R(T)>0\quad (T>T_c),\qquad R(T)\approx 0\quad (T<T_c)`,
          caption: "Esquema cualitativo de una transición resistiva; no representa una curva universal ni reemplaza los límites críticos del material.",
        },
        callout: "La aproximación R ≈ 0 describe una medición de corriente continua dentro de su resolución; no autoriza a tratar cualquier material frío como superconductor.",
      },
    ],
    exercise: {
      type: "choice",
      prompt: "¿Qué observación distinguiría mejor una transición superconductora de una mejora resistiva gradual?",
      choices: [
        {
          id: "abrupt-zero-resistance",
          label: "La resistencia cae abruptamente hasta un valor indistinguible de cero al cruzar una temperatura crítica, bajo condiciones apropiadas.",
        },
        {
          id: "smooth-resistance-change",
          label: "La resistencia disminuye suavemente pero permanece finita en todo el intervalo medido.",
        },
        {
          id: "mass-change",
          label: "La masa de la muestra aumenta cada vez que baja su temperatura.",
        },
        {
          id: "unconditional-transition",
          label: "Todo material pierde su resistencia a la misma temperatura, sin importar corriente ni campo aplicado.",
        },
      ],
      answerId: "abrupt-zero-resistance",
      explanation: "La evidencia inicial es una transición abrupta alrededor de T_c. Este criterio introductorio todavía no explica el mecanismo ni sustituye el estudio de respuesta magnética y límites críticos.",
    },
    sources: [],
  },
  {
    id: "waveguide-mode-gallery",
    areaId: "waveguides",
    kind: "lesson",
    title: "Galería de Modos Guiados",
    shortTitle: "Modos guiados",
    marker: "W",
    offset: { x: -22, y: 14 },
    interactionRadius: 78,
    visibility: "visibleWhenAreaUnlocked",
    requirements: {},
    grants: { concepts: ["guided-wave-modes"] },
    objective: "Calcular una frecuencia de corte y reconocer que una guía admite modos discretos.",
    sections: [
      {
        title: "Geometría que selecciona soluciones",
        paragraphs: [
          "Las condiciones de borde restringen las distribuciones transversales posibles. Cada modo posee una frecuencia de corte; bajo ella no se propaga potencia en una guía ideal uniforme.",
        ],
      },
      {
        title: "Modelo mínimo",
        equation: {
          tex: String.raw`f_{c,10}=\frac{c}{2a}`,
          caption: "Frecuencia de corte del modo TE10 en una guía rectangular llena de aire.",
        },
        paragraphs: ["Esta escala guía la elección de dimensiones en alimentación de antenas y sistemas de microondas."],
      },
    ],
    exercise: {
      type: "numeric",
      prompt: "Para una guía de aire con lado ancho a = 3.0 cm, estima f_c del modo TE10.",
      expected: 5e9,
      absoluteTolerance: 1e8,
      unit: "Hz",
      placeholder: "Ej.: 5,0e9",
      explanation: "f_c = 3.00×10⁸/(2·0.030) = 5.0×10⁹ Hz. Bajo esa frecuencia el modo es evanescente.",
    },
    sources: [
      {
        label: "MIT OpenCourseWare 6.013 — Electromagnetics and Applications",
        url: "https://ocw.mit.edu/courses/6-013-electromagnetics-and-applications-spring-2009/",
      },
    ],
  },
  {
    id: "transmission-line-bench",
    areaId: "transmission-lines",
    kind: "lesson",
    title: "Banco de Líneas de Transmisión",
    shortTitle: "Banco de líneas",
    marker: "Z",
    offset: { x: -26, y: 16 },
    interactionRadius: 78,
    visibility: "visibleWhenAreaUnlocked",
    requirements: {},
    grants: { concepts: ["transmission-line-analysis"] },
    objective: "Calcular un coeficiente de reflexión y vincularlo con adaptación de impedancias.",
    sections: [
      {
        title: "Cuando el circuito tiene longitud",
        paragraphs: [
          "Si el tiempo de propagación deja de ser despreciable, tensión y corriente dependen de posición. Una discontinuidad de impedancia genera ondas reflejadas.",
        ],
      },
      {
        title: "Modelo mínimo",
        equation: {
          tex: String.raw`\Gamma_L=\frac{Z_L-Z_0}{Z_L+Z_0}`,
          caption: "Coeficiente de reflexión de tensión en una carga Z_L.",
        },
        paragraphs: ["La adaptación Γ = 0 maximiza la transferencia hacia una carga ideal en este modelo."],
      },
    ],
    exercise: {
      type: "numeric",
      prompt: "Una línea de 50 Ω termina en 100 Ω. Calcula Γ_L.",
      expected: 0.3333333333,
      absoluteTolerance: 0.015,
      unit: "adimensional",
      placeholder: "Ej.: 0,33",
      explanation: "Γ_L = (100−50)/(100+50) = 1/3. El signo positivo indica reflexión sin inversión de tensión.",
    },
    sources: [
      {
        label: "LibreTexts — Engineering Electromagnetics",
        url: "https://eng.libretexts.org/Bookshelves/Electrical_Engineering/Electro-Optics/Book%3A_Electromagnetics_I_(Ellingson)",
      },
    ],
  },
  {
    id: "antenna-range",
    areaId: "antennas",
    kind: "lesson",
    title: "Campo de Medición de Antenas",
    shortTitle: "Campo de antenas",
    marker: "λ",
    offset: { x: 24, y: -18 },
    interactionRadius: 78,
    visibility: "visibleWhenAreaUnlocked",
    requirements: {},
    grants: { concepts: ["antenna-radiation"] },
    objective: "Relacionar frecuencia, longitud de onda y escala de una antena resonante.",
    sections: [
      {
        title: "De una corriente localizada a radiación",
        paragraphs: [
          "Una distribución de corriente variable produce campos que, suficientemente lejos, transportan energía. Patrón, polarización y directividad describen cómo se distribuye.",
        ],
      },
      {
        title: "Modelo mínimo",
        equation: {
          tex: String.raw`\lambda=\frac{c}{f},\qquad L_{\lambda/2}\approx\frac{\lambda}{2}`,
          caption: "Escala ideal de un dipolo de media onda en el vacío.",
        },
        paragraphs: ["La longitud real depende del conductor, el entorno y el método de alimentación."],
      },
    ],
    exercise: {
      type: "numeric",
      prompt: "Estima la longitud ideal de media onda a 300 MHz.",
      expected: 0.5,
      absoluteTolerance: 0.02,
      unit: "m",
      placeholder: "Ej.: 0,50",
      explanation: "λ = 3.00×10⁸/3.00×10⁸ = 1.0 m; una media onda ideal mide 0.50 m.",
    },
    sources: [
      {
        label: "MIT OpenCourseWare 6.013 — Electromagnetics and Applications",
        url: "https://ocw.mit.edu/courses/6-013-electromagnetics-and-applications-spring-2009/",
      },
    ],
  },
  {
    id: "wireless-link-station",
    areaId: "wireless-communications",
    kind: "mission",
    title: "Estación de Presupuesto de Enlace",
    shortTitle: "Presupuesto de enlace",
    marker: "dB",
    offset: { x: -26, y: 18 },
    interactionRadius: 82,
    visibility: "visibleWhenAreaUnlocked",
    requirements: {},
    grants: { concepts: ["wireless-link-analysis"] },
    objective: "Combinar ganancias y pérdidas en decibel para estimar potencia recibida.",
    sections: [
      {
        title: "Un enlace es una cadena completa",
        paragraphs: [
          "La potencia recibida depende del transmisor, las antenas, la propagación y las pérdidas del sistema. Compararla con ruido y sensibilidad determina el margen.",
        ],
      },
      {
        title: "Modelo mínimo",
        equation: {
          tex: String.raw`P_r\,[\mathrm{dBm}]=P_t+G_t+G_r-L_{\mathrm{trayecto}}-L_{\mathrm{otros}}`,
          caption: "Presupuesto de enlace expresado en decibel y dBm.",
        },
        paragraphs: ["El modelo facilita integrar antenas, línea, propagación y receptor sin perder la trazabilidad de cada término."],
      },
    ],
    exercise: {
      type: "numeric",
      prompt: "Con P_t = 20 dBm, G_t = 10 dB, G_r = 10 dB y pérdida de trayecto de 100 dB, sin otras pérdidas, calcula P_r.",
      expected: -60,
      absoluteTolerance: 0.5,
      unit: "dBm",
      placeholder: "Ej.: -60",
      explanation: "P_r = 20 + 10 + 10 − 100 = −60 dBm. Aún falta compararlo con ruido y sensibilidad.",
    },
    sources: [
      {
        label: "NASA — Basics of Space Flight: Telecommunications",
        url: "https://science.nasa.gov/learn/basics-of-space-flight/chapter10-1/",
      },
    ],
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
    requirements: { concepts: ["antenna-radiation", "fourier-analysis"] },
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
      concepts: [
        "interferometric-thinking",
        "wireless-link-analysis",
        "power-system-analysis",
        "computational-electromagnetics",
        "optical-propagation",
        "electromagnetic-compatibility",
      ],
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
        equation: {
          tex: String.raw`t=\frac{d}{c},\qquad d\approx3.844\times10^8\;\mathrm{m}`,
          caption: "Tiempo de vuelo unidireccional para una señal Tierra–Luna.",
        },
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
