# Informe de validación de la versión 0.3.1

Fecha: 2026-08-27

## Validación automatizada

El comando canónico del repositorio y del workflow remoto es:

```bash
npm run check
```

El runtime administrado de esta sesión no expuso el ejecutable `npm`. Se ejecutaron, con el Node.js administrado, las mismas cuatro etapas declaradas por ese script y en el mismo orden:

```bash
node scripts/validate-content.mjs
node --test
node scripts/check-repository.mjs
node scripts/build.mjs
```

Resultado local: correcto.

- Cartografía y progresión: 19 zonas alcanzables con distribución axial `1 + 6 + 12`.
- Conceptos: 20 alcanzables.
- Lugares: 27 alcanzables.
- Secuencia progresiva completa: llega al hito `milestones:lunar-link`.
- Pruebas unitarias: 114 aprobadas, sin fallos ni omisiones.
- Sintaxis JavaScript: 55 archivos comprobados.
- Enlaces Markdown relativos: 34 archivos comprobados.
- Política de dependencias: KaTeX 0.18.1 fijado y respaldado por ADR 0005; `0.3.1` no añade dependencias.
- Versión de `package.json`, lockfile y `APP_CONFIG`: consistente en `0.3.1`.
- Esquema persistido: permanece en `v2`; etapas, respuestas y parámetros interactivos son efímeros.
- Build estático: generado correctamente en `dist/`.

## Casos cubiertos por pruebas

- Parser matemático de lista blanca, precedencia, multiplicación implícita no ambigua, normalización Unicode, límites de longitud, tokens, profundidad y costo, y ausencia de `eval`/`Function`.
- Equivalencia numérica, funcional y por gradiente cartesiano o cilíndrico, incluidos puntos singulares, constantes aditivas y feedback guiado/binario.
- Esquemas declarativos de alternativas estructuradas, secuencias, expresiones y dos tarjetas de campos con dominio, muestreo, escala y sliders compatibles.
- Muestreo y geometría determinista de `VectorField2D`, actualización y restablecimiento de parámetros, accesibilidad y ausencia de animación automática.
- Cinco intervenciones cartesianas y dos cilíndricas en el Taller Vectorial, con respuestas matemáticamente equivalentes y placeholders que no revelan el resultado.
- Compilación KaTeX de las ecuaciones de secciones, revelados e intervenciones, con captions accesibles.
- Disponibilidad derivada de referencias; `E` y `V` permanecen ocultos hasta Coulomb, y la matemática rutinaria no exige citas locales.
- Estado de secuencia estrictamente ordenado y de revisión, sin incorporación al perfil persistido.
- Conversión axial, fronteras compartidas, progresión completa, migraciones, audio, sombras, paneles, foco y controles de teclado ya cubiertos en versiones anteriores.

## Revisión manual de mundo, interfaz y audio

Se levantó la aplicación estática con un perfil `debug-v031` separado. La revisión en navegador comprobó:

- carga sin errores ni advertencias en consola;
- apertura del Taller Vectorial mediante `E` y recorrido de sus seis etapas;
- comparación A/B con etiquetas neutrales, dominio `ℝ²`, ventana y escala comunes;
- selección completa de cada tarjeta mediante ratón y teclado; un error no revela fórmulas ni controles;
- revelado textual y matemático de ambos resultados tras acertar, sin depender solo del color;
- sliders `a` y `b` visibles solo en modo resuelto, actualización inmediata y restablecimiento nominal;
- cinco intervenciones cartesianas en orden: un error no avanza, el feedback guiado permanece en el mismo campo y una forma algebraica equivalente es aceptada;
- foco trasladado a la siguiente intervención operable;
- dos intervenciones cilíndricas: expresión y decisión conceptual con feedback binario, sin completar el lugar tras la primera;
- desbloqueo final de tres zonas y cuatro lugares del Árbol II, manteniendo la separación de ambos grafos;
- aviso único de OpenStax al desbloquear el criterio topológico;
- formulario y glosario sin cuadros repetidos de fuentes; `E` y `V` ausentes antes de completar Coulomb;
- revisión posterior de la comparación, sus sliders y las cinco/dos intervenciones una vez completado el lugar;
- ausencia de desborde horizontal en la ventana predeterminada, 820 × 800 y 390 × 844; las tarjetas pasan a una columna en el panel mediano;
- reproducción iniciada correctamente para los tres recursos del debugger: ambiente global, cambio de hexágono y confirmación de interacción;
- inventario de audio intacto: tres OGG, tres metadatos JSON y tres entradas de manifiesto, todas referenciadas desde `src/`.

## Limitaciones vigentes

- No hay una suite end-to-end versionada; la revisión de navegador sigue siendo manual.
- No se ha realizado una auditoría formal de accesibilidad ni una matriz amplia de navegadores y dispositivos.
- El avance intermedio, las selecciones y los sliders son efímeros; solo la finalización del lugar se persiste.
- La equivalencia matemática usa puntos deterministas y no sustituye una demostración simbólica global.
- El contenido científico sigue siendo provisional y no ha pasado por una revisión académica externa completa.
- No se ha realizado una prueba piloto con estudiantes.

La versión 0.3.1 es un corte intermedio verificable y no se declara como la versión final 1.0.0.
