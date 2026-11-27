#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::{fs, io, path::PathBuf, sync::Mutex};
use tauri::{
    menu::{Menu, MenuItem},
    webview::NewWindowResponse,
    AppHandle, Manager, State, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent,
};
use tauri_plugin_updater::{Update, UpdaterExt};

const LAUNCHER: &str = "launcher";
const COURSE: &str = "course";
const RETURN_TO_LAUNCHER: &str = "return-to-launcher";

#[derive(Default)]
struct AvailableUpdate(Mutex<Option<Update>>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LauncherInfo {
    version: String,
    server: Option<String>,
    signed_updates: bool,
}

fn require_launcher(window: &WebviewWindow) -> Result<(), String> {
    if window.label() == LAUNCHER {
        Ok(())
    } else {
        Err("Acción disponible desde la pantalla local de ORBIT.".into())
    }
}

fn course_url(input: &str) -> Result<Url, String> {
    let address = input.trim();
    let message = "Introduce el enlace HTTPS del curso de ORBIT.";
    if address.len() > 2048 || address.chars().any(char::is_control) {
        return Err(message.into());
    }
    let mut url = Url::parse(address).map_err(|_| message.to_string())?;
    if url.scheme() != "https" || url.host_str().is_none() {
        return Err(message.into());
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err("Quita las credenciales de la dirección del servidor.".into());
    }
    if !matches!(url.path(), "/" | "/index.html" | "/editor.html") {
        return Err("Usa la dirección principal del servidor o el enlace a ORBIT Editor.".into());
    }
    let mut params = url.query_pairs();
    let valid_query = match params.next() {
        None => true,
        Some((name, value)) => name == "course" && is_course_id(&value) && params.next().is_none(),
    };
    if !valid_query {
        return Err(
            "Usa el enlace del curso con su identificador o la dirección principal.".into(),
        );
    }
    url.set_fragment(None);
    Ok(url)
}

fn is_course_id(value: &str) -> bool {
    value.len() == 36
        && value.bytes().enumerate().all(|(index, byte)| {
            if matches!(index, 8 | 13 | 18 | 23) {
                byte == b'-'
            } else {
                byte.is_ascii_hexdigit()
            }
        })
}

fn navigation_allowed(initial: &Url, target: &Url) -> bool {
    target.scheme() == "https"
        && target.username().is_empty()
        && target.password().is_none()
        && target.origin() == initial.origin()
}

fn server_file(app: &AppHandle) -> Result<PathBuf, tauri::Error> {
    Ok(app.path().app_config_dir()?.join("server-url"))
}

fn remember_server(app: &AppHandle, url: &Url) -> io::Result<()> {
    let path = server_file(app).map_err(|error| io::Error::other(error.to_string()))?;
    let directory = path
        .parent()
        .ok_or_else(|| io::Error::other("No config directory"))?;
    fs::create_dir_all(directory)?;
    let temporary = directory.join(format!("server-url.{}.tmp", std::process::id()));
    fs::write(&temporary, url.as_str())?;
    if let Err(error) = fs::rename(&temporary, path) {
        let _ = fs::remove_file(&temporary);
        return Err(error);
    }
    Ok(())
}

fn signed_updates_configured(app: &AppHandle) -> bool {
    app.config()
        .plugins
        .0
        .get("updater")
        .and_then(|config| config.get("pubkey"))
        .and_then(|key| key.as_str())
        .is_some_and(|key| !key.trim().is_empty())
}

#[tauri::command]
fn launcher_info(window: WebviewWindow) -> Result<LauncherInfo, String> {
    require_launcher(&window)?;
    let app = window.app_handle();
    let server = server_file(app)
        .ok()
        .and_then(|path| fs::read_to_string(path).ok())
        .and_then(|value| course_url(&value).ok())
        .map(|url| url.to_string());
    Ok(LauncherInfo {
        version: app.package_info().version.to_string(),
        server,
        signed_updates: signed_updates_configured(app),
    })
}

#[tauri::command]
async fn connect_course(launcher: WebviewWindow, address: String) -> Result<bool, String> {
    require_launcher(&launcher)?;
    let app = launcher.app_handle();
    if let Some(course) = app.get_webview_window(COURSE) {
        let _ = course.set_focus();
        return Ok(true);
    }
    let url = course_url(&address)?;
    let selected_origin = url.clone();
    let origin = url.origin().ascii_serialization();
    let title = format!("ORBIT · {origin}");
    let version_script = format!(
        "if (window === window.top && location.origin === {:?}) \
         Object.defineProperty(globalThis, '__orbitWindowsVersion', {{ value: {:?} }});",
        origin,
        app.package_info().version.to_string()
    );
    let go_back = MenuItem::with_id(
        app,
        RETURN_TO_LAUNCHER,
        "Servidor y actualizaciones",
        true,
        None::<&str>,
    )
    .map_err(|_| "No se pudo preparar el menú de ORBIT.")?;
    let menu =
        Menu::with_items(app, &[&go_back]).map_err(|_| "No se pudo preparar el menú de ORBIT.")?;
    let course = WebviewWindowBuilder::new(app, COURSE, WebviewUrl::External(url.clone()))
        .initialization_script(version_script)
        .title(title)
        .inner_size(1200.0, 800.0)
        .min_inner_size(400.0, 380.0)
        .menu(menu)
        .on_menu_event(|app, event| {
            if event.id() == RETURN_TO_LAUNCHER {
                if let Some(course) = app.get_webview_window(COURSE) {
                    let _ = course.close();
                }
            }
        })
        .on_navigation(move |target| navigation_allowed(&selected_origin, target))
        .on_new_window(|_, _| NewWindowResponse::Deny)
        .disable_drag_drop_handler()
        .build()
        .map_err(|_| "No se pudo abrir la ventana del curso.".to_string())?;

    let handle = app.clone();
    course.on_window_event(move |event| {
        if let WindowEvent::Destroyed = event {
            if let Some(window) = handle.get_webview_window(LAUNCHER) {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    });
    let saved = remember_server(app, &url).is_ok();
    let _ = launcher.hide();
    Ok(saved)
}

#[tauri::command]
async fn check_updates(
    launcher: WebviewWindow,
    state: State<'_, AvailableUpdate>,
) -> Result<Option<String>, String> {
    require_launcher(&launcher)?;
    *state
        .0
        .lock()
        .map_err(|_| "No se pudo iniciar la comprobación.")? = None;
    let app = launcher.app_handle();
    if !signed_updates_configured(app) {
        return Err(
            "Esta compilación no está configurada para recibir actualizaciones firmadas.".into(),
        );
    }
    let update = app
        .updater()
        .map_err(|_| "No se pudo preparar el actualizador.")?
        .check()
        .await
        .map_err(|_| {
            "No se pudieron consultar las versiones. Comprueba la conexión y vuelve a intentarlo."
        })?;
    let version = update.as_ref().map(|available| available.version.clone());
    *state
        .0
        .lock()
        .map_err(|_| "No se pudo guardar la actualización disponible.")? = update;
    Ok(version)
}

#[tauri::command]
async fn install_update(
    launcher: WebviewWindow,
    state: State<'_, AvailableUpdate>,
) -> Result<(), String> {
    require_launcher(&launcher)?;
    let update = state
        .0
        .lock()
        .map_err(|_| "No se pudo iniciar la actualización.")?
        .take()
        .ok_or("Busca una actualización antes de instalar.")?;
    update.download_and_install(|_, _| {}, || {}).await
        .map_err(|_| "No se pudo descargar, verificar o instalar la actualización. Puedes seguir usando ORBIT.")?;
    launcher.app_handle().restart();
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AvailableUpdate::default())
        .invoke_handler(tauri::generate_handler![
            launcher_info,
            connect_course,
            check_updates,
            install_update
        ])
        .run(tauri::generate_context!())
        .expect("error starting ORBIT desktop");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_a_course_link_but_rejects_credentials_and_other_settings() {
        let valid = "https://campus.example:8443/?course=802312b2-7af2-48a3-b244-830c09e8acf9";
        assert_eq!(
            course_url(&format!(" {valid}#mapa ")).unwrap().as_str(),
            valid
        );
        for invalid in [
            "http://campus.example/",
            "javascript:alert(1)",
            "https://name:password@campus.example/",
            "https://campus.example/?token=secret",
            "https://campus.example/?course=other",
            "https://campus.example/a/different/app",
        ] {
            assert!(course_url(invalid).is_err(), "{invalid}");
        }
    }

    #[test]
    fn the_course_can_open_its_editor_only_inside_the_selected_origin() {
        let selected = Url::parse("https://campus.example:8443/").unwrap();
        for (address, expected) in [
            ("https://campus.example:8443/editor.html?course=foo", true),
            ("https://campus.example/editor.html", false),
            ("http://campus.example:8443/editor.html", false),
            ("https://other.example:8443/", false),
            ("https://login@campus.example:8443/", false),
        ] {
            assert_eq!(
                navigation_allowed(&selected, &Url::parse(address).unwrap()),
                expected
            );
        }
    }
}
