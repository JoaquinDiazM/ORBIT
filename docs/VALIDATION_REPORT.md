# Informe de validación de la versión candidata 0.3.2

Fecha: 2026-08-28

## Estado de la entrega

La implementación local de ORBIT 0.3.2 incorpora las correcciones de menús, visualización y Superconductividad, además de los dos efectos nuevos con procedencia resuelta. Las etapas automatizadas ejecutables en este entorno pasan. La revisión manual final de navegador y audio todavía debe repetirse antes del cierre.

El repositorio de GitHub ya se llama `JoaquinDiazM/ORBIT`, el `origin` local apunta a su URL nueva y la carpeta de trabajo se llama `ORBIT`. El contenido versionado, el paquete y la interfaz usan la marca activa.

## Validación automatizada

El comando canónico del repositorio y del workflow remoto es:

```bash
npm run check
```

El runtime administrado de esta sesión no expuso el ejecutable `npm`. Se ejecutaron con Node.js 24.19.0 las cuatro etapas declaradas por ese script, en el mismo orden, y después `git diff --check`:

```bash
node scripts/validate-content.mjs
node --test
node scripts/check-repository.mjs
node scripts/build.mjs
git diff --check
```

Resultado local: correcto.

- Cartografía y progresión: 19 zonas alcanzables con distribución axial `1 + 6 + 12`.
- Conceptos: 20 alcanzables.
- Lugares: 28 alcanzables.
- Secuencia completa: llega al hito `milestones:lunar-link` sin zonas aisladas ni ciclos bloqueantes.
- El simulador parte de un perfil vacío y completa la progresión mediante sus requisitos normales; no usa `completeAll()`.
- Pruebas unitarias: 155 aprobadas, sin fallos, omisiones ni cancelaciones.
- Sintaxis JavaScript: 63 archivos comprobados.
- Enlaces Markdown relativos: 35 archivos comprobados.
- Política de dependencias: KaTeX 0.18.1 continúa como única dependencia y 0.3.2 no añade paquetes.
- Versión de `package.json`, lockfile y `APP_CONFIG`: consistente en `0.3.2`.
- Esquema persistido: `v3`, con migración desde `v1`/`v2` y lectura del prefijo histórico `aea-progress`.
- Build estático: generado correctamente en `dist/`.
- Higiene del diff: sin errores de espacios o marcadores detectados por `git diff --check`.

## Casos cubiertos por pruebas

- Migración del volumen maestro y mute históricos a `ambienceVolume`/`effectsVolume`, persistencia independiente, silencio por categoría a cero y prioridad de `v2` sobre `v1` cuando ambas claves históricas coexisten.
- Exclusión entre cue predeterminado y cue específico, transición única por finalización y degradación segura ante un asset inexistente.
- Inventario de cinco OGG versionados, cada uno con manifiesto, sidecar, atribución y punto de reproducción; tres son Freesound CC0 y dos contribuciones de ORBIT bajo MIT.
- Derivación de 13 parejas únicas del Árbol II desde `completedLocations`, `concepts` y `rewards`, sin lista paralela ni aristas de área.
- Dirección prerrequisito → destino, matriz de apariencia `completed → completed/completable` brillante y `completable → blocked` tenue, y exclusión de extremos ocultos.
- Modos **Oculta**, **Directo** y **Total**, incluida la vecindad axial de **Directo**, persistencia saneada de la preferencia y selección de una única arista causal **NUEVO**.
- Presencia de todos los menús secundarios, exclusividad entre ellos y coexistencia con la lección principal; **Árboles** queda como listado y **Visual** como configuración del mapa.
- Disponibilidad derivada de Símbolos, Constantes, Formulario y Glosario con sus paneles restaurados y sin cuadros bibliográficos repetidos.
- Compatibilidad de IDs al sustituir la zona visible por Superconductividad, NPC Onnes no evaluativo, fórmulas desbloqueadas por el encuentro y Laboratorio de Transición separado como concesionario del concepto.
- Cinco etapas de Coulomb, introducción inicial de `E` y `V`, tres cargas normalizadas, movimiento por teclado, singularidad exacta y carga cero sin singularidad espuria.
- Siete intervenciones de la demostración conservativa y transferencia final con `E_x = 1798 N/C`, `V = 0` y `E ≠ 0`.
- Taller Vectorial de seis etapas, parser matemático restringido, equivalencia por función/gradiente y ausencia de `eval`/`Function`.
- Geometría, fronteras compartidas, sombras, foco, paneles, TeX/MathML, referencias derivadas y recorrido completo de progresión.

## Revisión manual en navegador

La revisión manual anterior se realizó antes de las correcciones descritas aquí y no debe usarse como evidencia de la interfaz final. Antes del cierre se debe repetir con un perfil aislado y comprobar:

- los ocho botones secundarios: Árboles, Visual, Símbolos, Constantes, Formulario, Glosario, Ayuda y Sonido;
- coexistencia de la lección principal con un único panel secundario, foco, teclado y vista estrecha;
- consulta de las cuatro bibliotecas de referencia sin cuadros bibliográficos repetidos y aviso único al desbloquear una fuente pertinente;
- persistencia de **Oculta**, **Directo** y **Total**, sus filtros espaciales y la semántica brillante/tenue del mapa;
- Onnes como encuentro no evaluativo, desbloqueo de fórmulas y Laboratorio de Transición como lugar evaluable independiente;
- los dos sliders de audio, los cinco botones de prueba, el clic ordinario de interfaz, el efecto de zona nueva y una consola limpia;
- Coulomb, reducción de movimiento y la captura principal actualizada con la interfaz corregida.

Las pruebas automatizadas verifican los contratos estructurales de estos cambios, pero no sustituyen esa inspección visual y auditiva.

## Limitaciones vigentes

- El prompt anuncia una especificación académica de Coulomb “incluida más abajo”, pero el adjunto termina sin esa sección. La división concreta en cinco etapas, el dominio normalizado y la transferencia numérica son decisiones editoriales revisables que satisfacen los criterios explícitos disponibles.
- Falta repetir la revisión manual de navegador después de restaurar los menús e incorporar los tres niveles visuales y el segundo lugar de Superconductividad.
- No hay una suite end-to-end versionada ni una matriz amplia de navegadores y lectores de pantalla.
- La equivalencia matemática usa puntos deterministas y no sustituye una demostración simbólica global.
- El contenido científico sigue siendo provisional y no ha pasado por una revisión académica externa completa ni una prueba piloto con estudiantes.

0.3.2 sigue siendo un corte intermedio y no se declara como la versión final 1.0.0. La procedencia de audio ya no bloquea la entrega; queda completar la revisión manual final descrita arriba.
