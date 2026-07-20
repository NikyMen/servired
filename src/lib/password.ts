import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Hasheo de contraseñas con scrypt (node:crypto), sin dependencias externas.
 *
 * Vive aparte de auth.ts a propósito: auth.ts importa next/headers y solo corre
 * dentro de Next, mientras que esto lo necesita también el seed (script suelto).
 */

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keylen: number
) => Promise<Buffer>;

const KEY_LENGTH = 64;

/** Devuelve "sal:hash". La sal es distinta por usuario: dos claves iguales no comparten hash. */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(plain.normalize("NFKC"), salt, KEY_LENGTH);
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const derived = await scryptAsync(plain.normalize("NFKC"), salt, KEY_LENGTH);
  const expected = Buffer.from(hash, "hex");
  // timingSafeEqual explota si difieren los largos, por eso se chequea antes.
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}
