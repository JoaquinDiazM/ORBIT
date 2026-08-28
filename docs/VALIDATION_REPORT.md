# Informe de validación de la versión 0.3.0

Fecha: 2026-08-27

## Validación automatizada

El comando canónico del repositorio y del workflow remoto es:

```bash
npm run check
```

El runtime administrado de esta sesión no expuso el ejecutable `npm`. Se ejecutaron, con Node.js 24.19.0, las mismas cuatro etapas declaradas por ese script y en el mismo orden:

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
- Pruebas unitarias: 52 aprobadas, sin fallos ni omisiones.
- Sintaxis JavaScript: 47 archivos comprobados.
- Enlaces Markdown relativos: 34 archivos comprobados.
- Política de dependencias: KaTeX 0.18.1 fijado y respaldado por ADR 0005; no se añadieron dependencias.
- Versión de `package.json` y `APP_CONFIG`: consistente en `0.3.0`.
- Esquema persistido: permanece en `v2`; no se añadió estado durable.
- Build estático: generado correctamente en `dist/`.

## Casos cubiertos por pruebas

- Parser numérico con coma decimal y notación científica, unidad y tolerancia.
- Alternativas, índices correctos y definiciones de ejercicios por etapas incompletables o mal formadas.
- Conversión axial–píxel–axial, vecindad y pertenencia geométrica.
- Estado inicial, apertura de fronteras compartidas y cadena académica hasta la misión lunar.
- Detección de zonas, referencias o recompensas inalcanzables y prerrequisitos inexistentes.
- Migración de perfiles y posiciones desde el esquema 1 y lectura/escritura del respaldo mediante `ProgressStorage`.
- Inventario y controlador de audio, degradación a silencio y cue previo a toda interacción válida.
- Compilación KaTeX y descripción accesible de todas las ecuaciones de contenido y referencia.
- Normalización de lugares antiguos, avance de etapas y revisión completa tras finalizar.
- Disponibilidad derivada de símbolos, constantes, fórmulas y glosario, incluido un desbloqueo por personaje secundario.
- Proyección de sombras para ocho rumbos y perfiles a pie, carro y deslizador.
- Coexistencia de ventana principal y secundaria, exclusividad del menú, pila de cierre, restauración de foco y contención móvil.
- Activación nativa de botones con Espacio sin perder los atajos globales.

## Revisión visual, de audio y de interfaz

Se regeneró e inspeccionó `docs/screenshots/prototype.png` desde la aplicación local. La revisión manual se realizó con un perfil de depuración separado y comprobó:

- carga sin errores ni advertencias inesperadas en consola;
- barra superior compacta y ausencia de la tarjeta permanente de 0.2;
- lección principal y formulario simultáneos en 1280 × 720 y 800 × 720, sin solapamiento;
- vista móvil de 390 × 844 con un panel visible, foco contenido y retorno al panel subyacente;
- apertura del Taller Vectorial mediante `E`, avance por cuatro etapas y aceptación de `5 N/C` como ejercicio de salida;
- desbloqueo de 10 de 11 fórmulas al completar el taller; el teorema de divergencia conserva su requisito de personaje secundario;
- simbología inicial completa con localizadores y atribuciones diferenciadas;
- reproducción del cue de interacción desde el debugger y durante la interacción normal, sin warnings;
- sombras abajo-derecha en los tres transportes y recogida del perfil al avanzar abajo-derecha;
- apertura y cierre sincronizados del debugger mediante F2 y su botón de cierre.

## Limitaciones vigentes

- No hay una suite end-to-end versionada; la revisión de navegador sigue siendo manual.
- No se ha realizado una auditoría formal de accesibilidad ni una matriz amplia de navegadores y dispositivos.
- El avance intermedio entre etapas es efímero durante la sesión; solo la finalización del lugar se persiste.
- El contenido científico sigue siendo provisional y no ha pasado por revisión académica completa.
- No se ha realizado una prueba piloto con estudiantes.

La versión 0.3.0 es un corte intermedio verificable y no se declara como la versión final 1.0.0.
