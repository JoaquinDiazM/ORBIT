import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { APP_CONFIG } from "../../src/config.js";
import { apiError } from "./auth.mjs";

export async function readClientPolicy(packageRoot) {
  let text;
  try { text = await readFile(join(packageRoot, "client-policy.json"), "utf8"); }
  catch (error) { if (error.code === "ENOENT") return true; throw error; }
  const policy = JSON.parse(text);
  if (typeof policy?.allowCompatibleClients !== "boolean" || Object.keys(policy).length !== 1) {
    throw new Error("client-policy.json debe indicar allowCompatibleClients como verdadero o falso.");
  }
  return policy.allowCompatibleClients;
}

export function assertClientVersion(headers, allowCompatibleClients) {
  if (allowCompatibleClients) return;
  if (headers["x-orbit-web-version"] !== APP_CONFIG.version) {
    throw apiError(409, "web-version-mismatch",
      "El servidor requiere el cliente web " + APP_CONFIG.version + ". Recarga el curso y vuelve a conectarte.");
  }
  const windowsVersion = headers["x-orbit-windows-version"];
  if (windowsVersion !== undefined && windowsVersion !== APP_CONFIG.version) {
    throw apiError(409, "windows-version-mismatch",
      "El servidor requiere ORBIT para Windows " + APP_CONFIG.version + ". Actualiza el cliente y vuelve a conectarte.");
  }
}
