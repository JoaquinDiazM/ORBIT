fn main() {
    let manifest = tauri_build::AppManifest::new().commands(&[
        "launcher_info",
        "connect_course",
        "open_offline",
        "check_updates",
        "install_update",
    ]);
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(manifest))
        .expect("error configuring ORBIT desktop");
}
