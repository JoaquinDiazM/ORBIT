# ADR 0004: audio local con APIs nativas

- Estado: aceptado
- Fecha: 2026-08-26

## Contexto

El prototipo incorpora tres recursos Ogg Vorbis para ambiente global, cruce de hexágono y confirmación de interacción. Todos son CC0 1.0, están acompañados por metadatos y suman aproximadamente 1.23 MiB. Cada recurso versionado debe tener un camino de reproducción verificable, sin convertir el audio en el único medio para comunicar un estado.

## Decisión

Usar `HTMLAudioElement` y un manifiesto JSON local, sin motor ni dependencia adicional. Las rutas se resuelven de forma relativa al manifiesto para funcionar en desarrollo y bajo la subruta de GitHub Pages.

El audio:

- solo comienza después de una interacción explícita del usuario;
- dispone de un control visible y de teclado para silenciarlo;
- pausa el ambiente cuando la pestaña queda oculta;
- reproduce efectos sin cálculos dentro del renderer ni del bucle por cuadro;
- degrada a silencio si un archivo o la reproducción fallan;
- conserva siempre una señal visual o textual equivalente;
- expone una prueba directa de los tres recursos en el debugger.

La clave runtime histórica `mission_start` se conserva para no romper el manifiesto, aunque el recurso confirma ahora cualquier interacción válida con un objeto o lugar.

Los archivos, sus autores, fuentes y licencias se registran en `public/assets/audio/ATTRIBUTION.md` y en los JSON homónimos.

## Alternativas consideradas

- **Web Audio API:** ofrece mezcla y fades más precisos, pero agrega complejidad innecesaria para tres recursos.
- **Librería de audio o motor de juego:** facilitaría canales y escenas, a costa de tamaño, mantenimiento y una dependencia que el prototipo aún no necesita.
- **No integrar audio:** evita peso de descarga, pero dejaría recursos intencionales sin una forma de ser escuchados.

## Consecuencias

El sistema sigue siendo estático, sin backend y sin dependencia npm. El ambiente provisional puede presentar un empalme audible porque el archivo original no fue reeditado como bucle perfecto. La compatibilidad depende del soporte del navegador para Ogg Vorbis; un navegador incompatible continúa siendo utilizable en silencio.

## Regla de revisión

Reconsiderar Web Audio solamente si se requieren mezcla simultánea compleja, posicionamiento espacial, crossfades entre zonas o control de volumen por categorías. Todo nuevo recurso debe registrarse, atribuirse y quedar conectado a un punto de reproducción accesible.
