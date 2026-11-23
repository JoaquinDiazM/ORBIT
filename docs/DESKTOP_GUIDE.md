# ORBIT para Windows

## Docentes y estudiantes

1. Descarga `orbit-windows-x64-setup.exe` en [GitHub Releases](https://github.com/JoaquinDiazM/ORBIT/releases).
2. Ejecuta el instalador y abre **ORBIT** desde Inicio. Usa Windows 10 u 11 de 64 bits.
   Si falta WebView2, el instalador lo obtiene de Microsoft.
3. Pega la dirección HTTPS que te entregó el docente y pulsa **Abrir ORBIT**. El
   curso abre su inicio de sesión habitual. Usa tu alias y contraseña de ORBIT.
4. Para elegir otro servidor o actualizar, abre **Servidor y actualizaciones** en el
   menú de la ventana del curso. Pulsa **Buscar actualizaciones** y, si hay una
   versión disponible, **Instalar y reiniciar**. Conserva el mismo origen HTTPS
   del curso para mantener sus datos del navegador. Los enlaces de los túneles
   de prueba cambian entre arranques.

**VPN institucional** queda como opción informativa. El servidor se inicia y se
administra mediante el flujo de la [guía del servidor](SERVER_GUIDE.md).

## Compilación y distribución

Se requiere Node.js 24, Rust con destino MSVC x64 y Visual Studio Build Tools con
**Desarrollo para el escritorio con C++** y Windows SDK. La compilación de CI usa
Rust 1.100.0. [Requisitos de Tauri](https://v2.tauri.app/start/prerequisites/).

```powershell
npm ci
cargo test --locked --manifest-path src-tauri/Cargo.toml
npm run desktop -- build --ci --target x86_64-pc-windows-msvc -- --locked
```

El build local crea el instalador en `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis`.
Las actualizaciones están habilitadas en el instalador oficial firmado. Un build local
permite revisar instalación, conexión y persistencia de la dirección.

Al publicar una release normal con tag `vX.Y.Z` que coincide con `package.json`, el
workflow [windows-desktop.yml](../.github/workflows/windows-desktop.yml) adjunta el
instalador y su manifiesto al canal de actualización de GitHub. Configura una sola pareja
de firma para el canal y conserva una copia privada fuera del repositorio. Guarda la
clave pública como variable `ORBIT_UPDATER_PUBKEY` y la privada como secreto
`TAURI_SIGNING_PRIVATE_KEY`. Si la clave tiene contraseña, usa el secreto
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. [Firma de actualizaciones de Tauri](https://v2.tauri.app/plugin/updater/#signing-updates).

Para verificar una actualización completa, usa una instalación de la versión anterior
firmada con la misma clave. Inicia y cierra un curso, busca la versión nueva, instálala y
comprueba que ORBIT reinicia y recuerda su dirección. Verifica el rechazo de una firma
inválida en una distribución de ensayo.
