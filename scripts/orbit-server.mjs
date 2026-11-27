import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { hashPassword, normalizeAlias } from "./online/auth.mjs";
import { ServerStore, createInitialServerState, diagnoseDataLock, recoverDataLock, restoreServerBackup } from "./online/store.mjs";
import { createOrbitServer } from "./online/server.mjs";
import { readClientPolicy } from "./online/client-policy.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HELP = `ORBIT · servidor docente

node scripts/orbit-server.mjs init --data DIRECTORIO --admin ALIAS
node scripts/orbit-server.mjs serve --data DIRECTORIO --host 127.0.0.1 --port 8080 --origin http://127.0.0.1:8080
node scripts/orbit-server.mjs backup --data DIRECTORIO --output ARCHIVO_NUEVO
node scripts/orbit-server.mjs restore --data DIRECTORIO --input COPIA
node scripts/orbit-server.mjs diagnose-lock --data DIRECTORIO
node scripts/orbit-server.mjs recover-lock --data DIRECTORIO --token TOKEN_EXACTO

init pide contraseña oculta y confirmación en una terminal. Para automatización permite
--password-file ARCHIVO; nunca recibe la contraseña como argumento. Mínimo 12 caracteres.
serve usa dist/ del paquete; --dist DIRECTORIO lo cambia. Para una red o Internet requiere
--origin https://HOST[:PUERTO] y --tls-cert ARCHIVO --tls-key ARCHIVO, además de host y puerto.
El directorio privado debe quedar fuera de dist/. No se usa el origen de desarrollo 4173.
backup y restore requieren el servidor detenido. Las copias contienen cuentas y avances;
restore verifica el digest, conserva el estado anterior y exige nueva sesión/sincronización.
También puedes restaurar en un directorio nuevo o vacío para recuperar uno dañado.
Si un cierre abrupto deja el lock, diagnose-lock muestra propietario y token. recover-lock
solo lo retira con ese token, en el mismo equipo y si el PID ya no existe; nunca mata procesos.
No ejecutes recuperación simultánea ni inicies el servidor hasta terminar la recuperación.
Ctrl+C detiene únicamente este servidor y libera su lock. Sin dependencia npm adicional.
`;

export function parseServerArguments(args) {
  const [command, ...rest] = args;
  if (!command || command === "help" || command === "--help") return { command: "help", options: {} };
  const allowed = {
    init: ["data", "admin", "password-file"],
    serve: ["data", "dist", "host", "port", "origin", "tls-cert", "tls-key"],
    backup: ["data", "output"], restore: ["data", "input"],
    "diagnose-lock": ["data"], "recover-lock": ["data", "token"],
  }[command];
  if (!allowed) throw new Error("Comando desconocido. Usa --help.");
  const options = {};
  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index]?.slice(2);
    const value = rest[index + 1];
    if (!rest[index]?.startsWith("--") || !allowed.includes(key) || !value
      || value.startsWith("--") || Object.hasOwn(options, key)) throw new Error("Argumento inválido o duplicado. Usa --help.");
    options[key] = value;
  }
  if (!options.data) throw new Error("Especifica --data con un directorio privado.");
  return { command, options };
}

export async function readHiddenPassword(label, input = process.stdin, output = process.stderr) {
  if (!input.isTTY || typeof input.setRawMode !== "function") {
    throw new Error("La entrada no es una terminal. Usa --password-file para automatización protegida.");
  }
  const previousRaw = Boolean(input.isRaw);
  output.write(label);
  return new Promise((accept, reject) => {
    let value = "";
    const finish = (error) => {
      input.off("data", receive); input.off("end", ended); input.off("error", finish);
      input.setRawMode(previousRaw); input.pause(); output.write("\n");
      if (error) reject(error); else accept(value);
    };
    const ended = () => finish(new Error("La entrada terminó antes de recibir la contraseña."));
    const receive = (chunk) => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\u0003") return finish(new Error("Inicialización cancelada."));
        if (character === "\r" || character === "\n") return finish();
        if (character === "\u007f" || character === "\b") value = [...value].slice(0, -1).join("");
        else if (character >= " " && character !== "\u007f") value += character;
        if (value.length > 256) return finish(new Error("La contraseña supera 256 caracteres."));
      }
    };
    input.setRawMode(true); input.on("data", receive); input.once("end", ended);
    input.once("error", finish); input.resume();
  });
}

async function initialPassword(options) {
  if (options["password-file"]) {
    const value = await readFile(resolve(options["password-file"]), "utf8");
    if (Buffer.byteLength(value) > 2048) throw new Error("El archivo de contraseña es demasiado grande.");
    return value.replace(/\r?\n$/, "");
  }
  const first = await readHiddenPassword("Contraseña de administración (oculta): ");
  const second = await readHiddenPassword("Repite la contraseña (oculta): ");
  if (first !== second) throw new Error("Las contraseñas no coinciden.");
  return first;
}

export async function runServerCli(args, { stdout = process.stdout } = {}) {
  const { command, options } = parseServerArguments(args);
  if (command === "help") { stdout.write(HELP); return null; }
  const dataDirectory = resolve(options.data);
  if (command === "diagnose-lock") {
    stdout.write(`${JSON.stringify(await diagnoseDataLock(dataDirectory), null, 2)}\n`);
    return null;
  }
  if (command === "recover-lock") {
    await recoverDataLock(dataDirectory, options.token);
    stdout.write("Lock interrumpido retirado tras comprobar equipo, PID y token. Ya puedes iniciar el servidor.\n");
    return null;
  }
  if (command === "init") {
    const alias = normalizeAlias(options.admin);
    const password = await hashPassword(await initialPassword(options));
    const store = await ServerStore.open(dataDirectory, { initialState: createInitialServerState({ alias, password }) });
    try { stdout.write(`Servidor inicializado: ${store.state.serverId}. La contraseña no se muestra ni se registra.\n`); }
    finally { await store.close(); }
    return null;
  }
  if (command === "restore") {
    if (!options.input) throw new Error("Especifica --input con la copia privada.");
    const result = await restoreServerBackup(dataDirectory, resolve(options.input));
    stdout.write(`Copia restaurada con nueva época de sesiones.${result.replaced ? " El estado anterior queda en previous.json." : " El directorio recuperado está listo."}\n`);
    return null;
  }
  if (command === "backup") {
    if (!options.output) throw new Error("Especifica --output con un archivo nuevo.");
    const store = await ServerStore.open(dataDirectory);
    try {
      await store.backup(resolve(options.output));
      stdout.write("Copia privada exportada con digest de integridad.\n");
    } finally { await store.close(); }
    return null;
  }
  const port = Number(options.port);
  if (!options.host || !options.origin || !Number.isInteger(port) || port < 1 || port > 65535 || port === 4173) {
    throw new Error("serve requiere --host, --port (1–65535, distinto de 4173) y --origin exacto.");
  }
  if (Boolean(options["tls-cert"]) !== Boolean(options["tls-key"])) throw new Error("TLS requiere certificado y clave juntos.");
  const tls = options["tls-cert"] ? {
    cert: await readFile(resolve(options["tls-cert"])), key: await readFile(resolve(options["tls-key"])),
  } : null;
  const allowCompatibleClients = await readClientPolicy(ROOT);
  const runtime = await createOrbitServer({ dataDirectory, distDirectory: resolve(options.dist ?? resolve(ROOT, "dist")),
    host: options.host, port, publicOrigin: options.origin, tls, allowCompatibleClients });
  stdout.write(`ORBIT online: ${runtime.origin}/\nServidor en primer plano. Ctrl+C para detener.\n`);
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    try { await runtime.close(); }
    catch { process.exitCode = 1; process.stderr.write("No se pudo verificar el cierre. Revisa el lock antes de reiniciar.\n"); }
    finally { process.off("SIGINT", stop); process.off("SIGTERM", stop); }
  };
  process.on("SIGINT", stop); process.on("SIGTERM", stop);
  return runtime;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runServerCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`ORBIT: ${error.message}\n`); process.exitCode = 1;
  });
}
