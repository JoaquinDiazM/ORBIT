import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
export const PASSWORD_POLICY = Object.freeze({ algorithm: "scrypt-v1", N: 32768, r: 8, p: 3, keyLength: 64 });
const PARAMETERS = Object.freeze({ N: PASSWORD_POLICY.N, r: PASSWORD_POLICY.r,
  p: PASSWORD_POLICY.p, maxmem: 64 * 1024 * 1024 });
let running = 0;
const waiting = [];

async function deriveKey(password, salt) {
  if (running >= 2) {
    if (waiting.length >= 16) throw apiError(429, "rate-limited", "El servidor está procesando ingresos. Intenta nuevamente en unos momentos.");
    await new Promise((accept) => waiting.push(accept));
  } else running += 1;
  try { return await scrypt(password, salt, PASSWORD_POLICY.keyLength, PARAMETERS); }
  finally {
    const next = waiting.shift();
    if (next) next(); else running -= 1;
  }
}

export function apiError(status, code, message, details) {
  return Object.assign(new Error(message), { status, code, details });
}

export function normalizeAlias(value) {
  const alias = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-z0-9][a-z0-9_.-]{2,63}$/.test(alias)) {
    throw apiError(400, "invalid-input", "El alias debe tener entre 3 y 64 letras ASCII, números, puntos, guiones o guiones bajos.");
  }
  return alias;
}

export function validatePassword(password) {
  if (typeof password !== "string" || password.length < 12 || password.length > 256
    || Buffer.byteLength(password, "utf8") > 1024 || password.includes("\u0000")) {
    throw apiError(400, "invalid-input", "La contraseña debe tener entre 12 y 256 caracteres.");
  }
  return password;
}

export async function hashPassword(password) {
  validatePassword(password);
  const salt = randomBytes(16).toString("hex");
  const key = await deriveKey(password, salt);
  return { ...PASSWORD_POLICY, salt, hash: key.toString("hex") };
}

export function validPasswordRecord(record) {
  return record && Object.entries(PASSWORD_POLICY).every(([key, value]) => record[key] === value)
    && /^[a-f0-9]{32}$/.test(record.salt)
    && /^[a-f0-9]{128}$/.test(record.hash);
}

export async function verifyPassword(password, record) {
  if (typeof password !== "string" || password.length > 256 || !validPasswordRecord(record)) return false;
  const key = await deriveKey(password, record.salt);
  return timingSafeEqual(key, Buffer.from(record.hash, "hex"));
}

export function newToken() { return randomBytes(32).toString("base64url"); }
export function tokenDigest(token) { return createHash("sha256").update(token).digest("hex"); }

export class AttemptLimiter {
  constructor({ limit = 10, windowMs = 15 * 60_000, maxKeys = 2000, clock = Date.now } = {}) {
    Object.assign(this, { limit, windowMs, maxKeys, clock });
    this.entries = new Map();
  }
  take(key) {
    const now = this.clock();
    for (const [id, entry] of this.entries) if (entry.until <= now) this.entries.delete(id);
    const entry = this.entries.get(key);
    if (entry?.count >= this.limit || (!entry && this.entries.size >= this.maxKeys)) {
      throw apiError(429, "rate-limited", "Demasiados intentos. Espera antes de volver a ingresar.");
    }
    this.entries.set(key, { count: (entry?.count ?? 0) + 1, until: entry?.until ?? now + this.windowMs });
  }
}
