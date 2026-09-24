import { readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { encryptFile, isEncryptedFile, privateDir } from "../src/lib/kyc";

/**
 * Cifra los DNI, videos y matrículas que se guardaron antes de que la carpeta
 * privada pasara a cifrarse. Se corre una vez por servidor.
 *
 * - Saltea los que ya están cifrados: correrlo dos veces no cambia nada.
 * - Escribe a un temporal y lo renombra encima, así un corte a la mitad no
 *   deja un archivo roto.
 * - Necesita la MISMA KYC_ENCRYPTION_KEY que usa el server (tsx no lee
 *   .env.local: hay que exportarla antes). Con otra clave, el server no podría
 *   abrir los archivos.
 */
async function main() {
  if (process.env.NODE_ENV === "production" && !process.env.KYC_ENCRYPTION_KEY) {
    throw new Error("Exportá KYC_ENCRYPTION_KEY antes de correr el script.");
  }
  const dir = privateDir();
  const nombres = await readdir(dir).catch(() => [] as string[]);
  let cifrados = 0;
  let yaEstaban = 0;
  for (const nombre of nombres) {
    if (!/^[a-f0-9]{48}\.(jpg|png|webp|webm|mp4|pdf)$/.test(nombre)) continue;
    const ruta = path.join(dir, nombre);
    const data = await readFile(ruta);
    if (isEncryptedFile(data)) {
      yaEstaban++;
      continue;
    }
    const temporal = `${ruta}.tmp`;
    await writeFile(temporal, encryptFile(data), { flag: "wx" });
    await rename(temporal, ruta);
    cifrados++;
  }
  console.log(`[kyc:cifrar] ${cifrados} archivos cifrados, ${yaEstaban} ya estaban cifrados, en ${dir}`);
}

main().catch((error) => {
  console.error("[kyc:cifrar]", error);
  process.exit(1);
});
