import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const TYPES: Record<string, { ext: string; kind: "image" | "video"; valid: (b: Buffer) => boolean }> = {
  "image/jpeg": { ext: "jpg", kind: "image", valid: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": { ext: "png", kind: "image", valid: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  "image/webp": { ext: "webp", kind: "image", valid: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
  "video/webm": { ext: "webm", kind: "video", valid: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
  "video/mp4": { ext: "mp4", kind: "video", valid: (b) => b.subarray(4, 8).toString("ascii") === "ftyp" },
};

function key() {
  const configured = process.env.KYC_ENCRYPTION_KEY;
  if (configured) {
    const decoded = Buffer.from(configured, /^[a-f0-9]{64}$/i.test(configured) ? "hex" : "base64");
    if (decoded.length === 32) return decoded;
  }
  if (process.env.NODE_ENV === "production") throw new Error("KYC_ENCRYPTION_KEY inválida o ausente.");
  return createHash("sha256").update(process.env.ADMIN_SESSION_SECRET || "servired-dev-kyc").digest();
}

export function encryptKyc(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptKyc(value: string) {
  const [ivText, tagText, encryptedText] = value.split(".");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, "base64url")), decipher.final()]).toString("utf8");
}

export function lookupKyc(value: string) {
  return createHmac("sha256", key()).update(value).digest("hex");
}

export function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function validCuil(value: string) {
  const digits = normalizeDigits(value);
  if (!/^\d{11}$/.test(digits)) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((total, weight, index) => total + Number(digits[index]) * weight, 0);
  let check = 11 - (sum % 11);
  if (check === 11) check = 0;
  if (check === 10) check = 9;
  return check === Number(digits[10]);
}

export function validDni(value: string) {
  return /^\d{7,8}$/.test(normalizeDigits(value));
}

export function cuilMatchesDni(cuil: string, dni: string) {
  const cuilDigits = normalizeDigits(cuil);
  const rawDni = normalizeDigits(dni);
  const dniDigits = rawDni.padStart(8, "0");
  return validCuil(cuilDigits) && validDni(rawDni) && cuilDigits.slice(2, 10) === dniDigits;
}

export function validPhone(value: string) {
  return /^\d{8,15}$/.test(normalizeDigits(value));
}

/** CVU y CBU usan los mismos dos dígitos verificadores. */
export function validCvu(value: string) {
  const digits = normalizeDigits(value);
  if (!/^\d{22}$/.test(digits)) return false;
  const check = (part: string, weights: number[]) =>
    (10 - weights.reduce((sum, weight, index) => sum + Number(part[index]) * weight, 0) % 10) % 10;
  return check(digits.slice(0, 7), [7, 1, 3, 9, 7, 1, 3]) === Number(digits[7])
    && check(digits.slice(8, 21), [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3]) === Number(digits[21]);
}

type ChallengePayload = { u: string; c: string; e: number };

export function createVideoChallenge(userId: string) {
  const challenge = `SERVIRED ${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
  const payload: ChallengePayload = { u: userId, c: challenge, e: Date.now() + 10 * 60 * 1000 };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", key()).update(encoded).digest("base64url");
  return { challenge, token: `${encoded}.${signature}`, expiresAt: new Date(payload.e).toISOString() };
}

function verifiedVideoChallenge(userId: string, challenge: string, token: string): ChallengePayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = createHmac("sha256", key()).update(encoded).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as ChallengePayload;
    return payload.u === userId && payload.c === challenge && payload.e > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

export function verifyVideoChallenge(userId: string, challenge: string, token: string) {
  return verifiedVideoChallenge(userId, challenge, token) != null;
}

export function videoChallengeExpiry(userId: string, challenge: string, token: string) {
  const payload = verifiedVideoChallenge(userId, challenge, token);
  return payload ? new Date(payload.e) : null;
}

function privateDir() {
  const directory = path.resolve(process.env.PRIVATE_UPLOAD_DIR || path.join(process.cwd(), "data", "kyc"));
  const publicDirectory = path.resolve(process.cwd(), "public");
  const relativeToPublic = path.relative(publicDirectory, directory);
  if (!relativeToPublic || (!relativeToPublic.startsWith("..") && !path.isAbsolute(relativeToPublic))) {
    throw new Error("PRIVATE_UPLOAD_DIR debe estar fuera de public/.");
  }
  return directory;
}

export async function saveKycDocument(file: File, expected: "image" | "video" = "image") {
  const spec = TYPES[file.type];
  if (!spec || spec.kind !== expected) throw new Error(expected === "video" ? "El video debe ser MP4 o WEBM." : "Solo se aceptan imágenes JPG, PNG o WEBP.");
  const max = expected === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (!file.size || file.size > max) throw new Error(expected === "video" ? "El video debe pesar hasta 25 MB." : "Cada imagen debe pesar hasta 8 MB.");
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!spec.valid(buffer)) throw new Error(`El ${expected === "video" ? "video" : "archivo"} no coincide con su formato.`);
  const filename = `${randomBytes(24).toString("hex")}.${spec.ext}`;
  await mkdir(privateDir(), { recursive: true });
  await writeFile(path.join(privateDir(), filename), buffer, { flag: "wx" });
  return { filename, mimeType: file.type, size: file.size };
}

export async function readKycDocument(filename: string) {
  if (!/^[a-f0-9]{48}\.(jpg|png|webp|webm|mp4)$/.test(filename)) throw new Error("Documento inválido.");
  return readFile(path.join(privateDir(), filename));
}

/** Elimina un documento privado reemplazado; no falla si ya no existe. */
export async function removeKycDocument(filename: string) {
  if (!/^[a-f0-9]{48}\.(jpg|png|webp|webm|mp4)$/.test(filename)) return;
  await unlink(path.join(privateDir(), filename)).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") console.error("[kyc] no se pudo eliminar un archivo reemplazado:", error);
  });
}
