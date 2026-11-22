# Hoja de ruta de ORBIT

**ORBIT 1.0.0 alfa** corresponde a UPD-027. [ADR 0013](decisions/0013-self-hosted-courses-and-offline-client.md)
define el servidor opcional y el [changelog](../CHANGELOG.md) recoge lo incluido. El siguiente
objetivo es 1.0.1, centrado en errores y detalles visuales. Las versiones 1.1.0 y 1.2.0 se
definirán después. Las decisiones del chat se registran en la
[cola de actualizaciones](../ORBIT_UPDATES.md).

## Qué existe y qué debe conseguir el lanzamiento

La alfa ofrece ORBIT y ORBIT Editor estáticos para una ruta demostrativa de Electromagnetismo,
con progreso local y autoría mediante Spider. Incluye servidor docente, cuentas por curso, Owl,
sincronización y PWA. El helper local
sigue separado del servidor de cursos. Véase [Arquitectura](ARCHITECTURE.md).

Las decisiones confirmadas de UPD-027 fijan este destino:

- Acceso desde navegador y aplicación Windows instalable desde Edge/Chrome (PWA).
- Servidor proporcionado por cada equipo docente, compatible con Windows y Linux, con
  instalación y mantenimiento accesibles; ORBIT no sostendrá un servidor global.
- Cuentas con alias y contraseña, creadas y matriculadas por el docente, con recuperación a su
  cargo; el piloto no requiere correo ni registro abierto.
- Permisos por curso: cada docente administra sus cursos y estudiantes, y una cuenta
  administradora separada gestiona el servidor.
- Monitor básico de avance y finalización de actividades, sin recopilar respuestas ni intentos
  para seguimiento, mediante **Owl** en el Editor.
- Los cambios de curso conservan el avance; una incompatibilidad requiere una decisión
  explícita antes de aplicarse.
- Eliminar un estudiante borra su cuenta y su avance juntos. Restablecer su contraseña es una
  operación independiente. Cada cuenta estudiantil pertenece a un único curso.
- Preparar borradores y consultar Owl online; publicar siempre durante mantenimiento.
- Estudio sin conexión y sincronización posterior.
- Primero, un ensayo con un docente y un estudiante en dos máquinas; después se mantiene el
  piloto por Internet con 10 estudiantes, 2 docentes y 2 cursos genéricos o plantilla.
- Lanzamiento con una plantilla básica. El curso completo de Electromagnetismo se desarrollará
  después y no se presentará como terminado.

El [recorrido del README](../README.md#probar-el-servidor-docente) comienza con el docente
creando o importando un curso en Editor **offline**, continúa con el arranque del servidor propio
desde terminal y entrega un enlace para ORBIT y Editor **online**, con ingreso mediante las
cuentas provistas por el docente. El modo offline también se utilizará para cambios que
requieran mantenimiento. Se contempla el acceso a servidores universitarios mediante una VPN
institucional previa al enlace. Autoría offline y aprendizaje del estudiante sin conexión son
requisitos distintos, con los contratos de transición definidos en ADR 0013.

## Implementación de la alfa

ADR 0013 define servidor Node nativo, almacenamiento privado de un solo escritor, copias
verificadas y restauración con servicio detenido. Los borradores permanecen en cada dispositivo;
el servidor valida y publica durante mantenimiento. Sincroniza finalizaciones y reconcilia
revisiones con decisiones explícitas para cambios incompatibles. HTTPS protege Internet/VPN.

La [guía del servidor](SERVER_GUIDE.md) describe instalación, distribución, actualización y
recuperación. El [informe de UPD-027](reviews/UPD-027.md) concentra resultados y limitaciones
de la automatización, preflight y revisión humana de la alfa.

## Contratos que debe cubrir la revisión

La revisión compara las capacidades implementadas con el alcance acordado:

| Frente | Contrato de la alfa |
|---|---|
| Identidad y permisos | Sesiones reales, permisos por curso, administrador separado y recuperación sin revelar contraseñas. Los perfiles locales no conceden autoridad remota. |
| Cursos | Instancias independientes aunque compartan plantilla, matrícula por cuenta y selección de cursos autorizados. |
| Progreso y monitor | Finalizaciones por estudiante/curso, Owl sin respuestas ni intentos; copias offline y reconciliación al reconectar. |
| Ediciones | Borrador por dispositivo, publicación durante mantenimiento, compatibilidad de revisiones y decisión explícita sobre avances afectados. |
| Operación | Paquete Windows/Linux, acceso HTTPS también con VPN, copia y restauración con el servicio detenido. |
| Distribución | Modo estático conservado, paquete servidor y PWA instalable; actualización de recursos sin reiniciar avances. |

Los módulos y esquemas se localizan en [Arquitectura](ARCHITECTURE.md). El ensayo de dos máquinas
precede al piloto ampliado, que sigue pendiente tras la aprobación de la alfa.

## Evidencia necesaria para aceptar el lanzamiento

- Una persona ajena al desarrollo puede encontrar el acceso, instalar lo necesario y empezar
  con la plantilla siguiendo instrucciones comprobadas.
- Las cuentas y los permisos acordados aíslan cursos, avances y datos; recuperar credenciales
  no revela contraseñas. Eliminar un estudiante borra cuenta y avance; restablecer su contraseña
  conserva el avance.
- El monitor informa avance y finalización de los estudiantes del curso sin recopilar sus
  respuestas ni intentos para seguimiento.
- Cliente web y Windows mantienen reglas de progreso coherentes, incluidos desconexión,
  reconexión y cambio de edición según la política acordada.
- Actualizar un curso conserva el avance y exige una decisión explícita ante incompatibilidades.
- El servidor funciona en los dos sistemas previstos; copias, restauración, migraciones y
  actualización del producto y contenido tienen resultados reproducibles.
- El recorrido de dos máquinas verifica enlace, login, Editor offline/online y monitor antes
  del piloto ampliado. La operación documenta el acceso cuando la red exige VPN institucional.
- El piloto documenta sus recorridos reales, accesibilidad, errores y límites. Las comprobaciones
  automáticas y la revisión humana se registran por separado según la cola.

## Después del lanzamiento

La profundidad curricular completa, un banco amplio de problemas originales y su revisión
científica continúan como trabajo posterior. También quedan fuera de lo confirmado las
equivalencias entre cursos, consulta temática completa, integración con LMS, otros idiomas,
paquetes de terceros y nuevas simulaciones. Cada ampliación necesitará alcance y validación
propios; no se incorpora a 1.0.0 por aparecer en una visión anterior.
