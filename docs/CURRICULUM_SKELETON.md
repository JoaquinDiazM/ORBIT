# Esqueleto curricular preliminar — Electromagnetismo Aplicado

> Documento de diseño, no programa definitivo. Debe contrastarse con programas universitarios, experiencia docente y pruebas con estudiantes antes de fijar el mapa completo.

Este documento describe únicamente la primera ruta de **ORBIT — Open Roadmap for Building
Intuition and Theory**. Una ruta futura de otro curso necesitará su propio esqueleto curricular;
las conexiones entre rutas deberán declarar resultados y prerrequisitos equivalentes de forma
explícita y todavía no están implementadas.

## Perfil de entrada

El estudiante puede:

- operar con vectores en coordenadas cartesianas y reconocer otros sistemas;
- derivar e integrar funciones de una y varias variables a nivel introductorio;
- interpretar gradiente, divergencia y rotacional con apoyo;
- resolver problemas de mecánica clásica, trabajo y energía;
- usar números complejos a nivel básico cuando se introduzca régimen sinusoidal.

El Campamento Base debe diagnosticar y ofrecer repasos breves, no repetir cursos completos de matemáticas o mecánica.

## Tronco común candidato

| Nº | Resultado de aprendizaje | Herramienta central | Aplicación o evidencia terminal |
|---:|---|---|---|
| 0 | Representar campos escalares y vectoriales, unidades y sistemas de coordenadas | vectores, cálculo vectorial, SI | interpretar y dibujar un campo simple |
| 1 | Calcular fuerza y campo producidos por distribuciones discretas de carga | Coulomb y superposición | analizar una geometría de cargas |
| 2 | Explotar simetría y flujo para distribuciones continuas | flujo y ley de Gauss | obtener campos de simetría plana, cilíndrica o esférica |
| 3 | Relacionar campo, potencial, energía y trabajo | potencial electrostático | diseñar o analizar una configuración de electrodos |
| 4 | Analizar conductores, dieléctricos y capacitancia | condiciones de borde y energía | capacitor real simplificado o sensor capacitivo |
| 5 | Relacionar corriente estacionaria con campo y fuerza magnética | Biot–Savart, Ampère, Lorentz | conductor, bobina, torque o actuador |
| 6 | Calcular fem inducida y dirección de respuesta | flujo, Faraday y Lenz | generador, transformador o sensor inductivo |
| 7 | Integrar las leyes como sistema local y reconocer conservación | ecuaciones de Maxwell | explicar corriente de desplazamiento y continuidad |
| 8 | Analizar energía y potencia electromagnética | densidades de energía y Poynting | seguir el flujo de energía en un sistema |
| 9 | Derivar y caracterizar ondas electromagnéticas | ecuación de onda, polarización, impedancia | propagación y reflexión en medios simples |
| 10 | Analizar sistemas guiados y adaptación | líneas de transmisión | impedancia, reflexión y potencia entregada |
| 11 | Conectar fuentes, radiación, antenas y sistemas distribuidos | radiación, ganancia, fase | enlace, antena o arreglo interferométrico |

## Posibles regiones del Árbol I

La tabla curricular no obliga a que cada fila sea exactamente un hexágono. Una región puede contener más de un resultado o una rama puede especializarse.

```text
Campamento Base
  ├─ Electroestática ─ Magnetismo ─ Maxwell (incluye Inducción) ─ Ondas
  ├─ Circuitos
  └─ Ecuaciones diferenciales
       │
       └─ convergencia de prerrequisitos
            ├─ Sensores, máquinas y potencia
            ├─ Fourier, óptica y electromagnetismo computacional
            ├─ Superconductividad, líneas y guías de onda
            └─ Antenas, radioastronomía y comunicaciones espaciales
```

No tiene que ser un árbol estricto. Las aplicaciones avanzadas probablemente requerirán varios conceptos convergentes.

## Rutas laterales candidatas del Árbol II

### Energía y máquinas

- fuerza y torque;
- materiales magnéticos;
- circuitos magnéticos;
- transformadores;
- motores y generadores;
- transporte electrificado.

### Telecomunicaciones

- fasores;
- líneas de transmisión;
- adaptación;
- polarización;
- antenas y arreglos;
- presupuesto de enlace.

### Instrumentación científica

- sensores capacitivos e inductivos;
- compatibilidad y blindaje;
- adquisición de señales;
- receptores;
- fase y sincronización;
- interferometría y radioastronomía.

### Historia global

Rutas opcionales pueden conectar observaciones, instrumentos y desarrollos en distintas regiones del mundo sin convertir la historia en una única línea europea. Cada caso debe contar con fuentes y matices de atribución.

## Tipos de nodo por resultado

Cada resultado principal debería tener, como mínimo:

- una pregunta histórica o experimental;
- una explicación conceptual;
- una derivación;
- una visualización;
- un ejemplo resuelto;
- dos ejercicios guiados;
- dos a cuatro ejercicios de evaluación;
- una actividad de transferencia;
- un registro de errores frecuentes.

## Matriz de diseño propuesta

Antes de implementar una nueva región, completar:

| Campo | Pregunta |
|---|---|
| Resultado | ¿Qué podrá hacer el estudiante? |
| Evidencia | ¿Qué respuesta o producto demuestra que puede hacerlo? |
| Prerrequisitos | ¿Qué conceptos y técnicas necesita? |
| Historia | ¿Qué problema o evidencia motiva la herramienta? |
| Modelo | ¿Qué representación moderna se introduce? |
| Ejemplo | ¿Qué caso resuelto hace visibles las decisiones? |
| Práctica | ¿Cómo disminuye el andamiaje? |
| Transferencia | ¿Qué tecnología o sistema nuevo puede analizar? |
| Errores | ¿Qué confusiones se esperan? |
| Fuentes | ¿Qué respalda historia, física y valores numéricos? |
| Desbloqueo I | ¿Abre una región? |
| Desbloqueo II | ¿Qué lugar, gadget, transporte o ruta abre? |

## Decisiones pendientes

- Profundidad exacta de cálculo vectorial.
- Inclusión y momento de fasores.
- Alcance de materiales y condiciones de borde.
- Peso de líneas de transmisión respecto de ondas libres.
- Tratamiento de relatividad y potenciales retardados.
- Nivel de radiación de dipolos y teoría de antenas.
- Correspondencia con el curso formal que se quiera complementar.
- Política de soluciones completas frente a respuestas finales.
