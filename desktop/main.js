const invoke = window.__TAURI__?.core?.invoke;
const form = document.querySelector("#connect");
const server = document.querySelector("#server");
const open = document.querySelector("#open-course");
const offline = document.querySelector("#open-offline");
const connectionStatus = document.querySelector("#connection-status");
const version = document.querySelector("#version");
const check = document.querySelector("#check-updates");
const install = document.querySelector("#install-update");
const updateStatus = document.querySelector("#update-status");
let hasSigningKey = false;

async function action(status, message, work) {
  for (const control of [server, open, offline, check, install]) control.disabled = true;
  status.textContent = message;
  try {
    status.textContent = await work();
  } catch (error) {
    status.textContent = typeof error === "string" ? error : "La acción no pudo completarse. Vuelve a intentarlo.";
  } finally {
    server.disabled = open.disabled = offline.disabled = install.disabled = false;
    check.disabled = !hasSigningKey;
  }
}

if (invoke) {
  offline.addEventListener("click", () => {
    void action(connectionStatus, "Abriendo ORBIT sin conexión…", async () => {
      await invoke("open_offline");
      return "";
    });
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const address = server.value;
    void action(connectionStatus, "Abriendo el curso…", async () => {
      const saved = await invoke("connect_course", { address });
      return saved ? "" : "El curso se abrió. La dirección no pudo guardarse en este equipo.";
    });
  });

  check.addEventListener("click", () => {
    install.hidden = true;
    void action(updateStatus, "Buscando una versión nueva…", async () => {
      const available = await invoke("check_updates");
      if (!available) return "Ya tienes la versión más reciente.";
      install.hidden = false;
      return `ORBIT ${available} está disponible.`;
    });
  });

  install.addEventListener("click", () => {
    install.hidden = true;
    void action(updateStatus, "Descargando y verificando la actualización…", async () => {
      await invoke("install_update");
      return "Reiniciando ORBIT…";
    });
  });

  await action(connectionStatus, "Preparando la conexión…", async () => {
    const info = await invoke("launcher_info");
    server.value = info.server ?? "";
    version.textContent = `v${info.version}`;
    version.hidden = false;
    hasSigningKey = info.signedUpdates;
    updateStatus.textContent = hasSigningKey ? "" : "Las actualizaciones se habilitan en el instalador firmado.";
    return "";
  });
} else {
  connectionStatus.textContent = "Abre esta pantalla desde el cliente de Windows.";
}
