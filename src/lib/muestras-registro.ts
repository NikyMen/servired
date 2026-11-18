/**
 * Muestras que el oferente elige al crear la cuenta.
 *
 * En ese momento todavía no hay sesión (la cuenta queda pendiente hasta que
 * confirma el código del email), así que las fotos no se pueden subir. Se
 * guardan en IndexedDB de este navegador y, cuando entra al alta de oferente
 * ya verificado, el formulario las sube y las suma a sus muestras.
 * Solo se usan si el email coincide con el de la cuenta que inició sesión.
 */

export type MuestraRegistro = { title: string; description: string; files: File[] };
export type MuestrasRegistro = { email: string; muestras: MuestraRegistro[] };

const DB = "servired-registro";
const STORE = "muestras";
const KEY = "pendientes";

function abrir(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onerror = () => resolve(null);
      request.onsuccess = () => resolve(request.result);
    } catch { resolve(null); }
  });
}

export async function guardarMuestrasRegistro(data: MuestrasRegistro | null): Promise<void> {
  const db = await abrir();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    if (data && data.muestras.length) tx.objectStore(STORE).put(data, KEY); else tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => resolve(); tx.onerror = () => resolve(); tx.onabort = () => resolve();
  });
  db.close();
}

export async function leerMuestrasRegistro(): Promise<MuestrasRegistro | null> {
  const db = await abrir();
  if (!db) return null;
  const data = await new Promise<unknown>((resolve) => {
    const get = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
    get.onsuccess = () => resolve(get.result); get.onerror = () => resolve(null);
  });
  db.close();
  if (!data || typeof data !== "object") return null;
  const d = data as Partial<MuestrasRegistro>;
  if (typeof d.email !== "string" || !Array.isArray(d.muestras)) return null;
  const muestras = d.muestras.filter((m): m is MuestraRegistro => !!m && typeof m.title === "string" && Array.isArray(m.files) && m.files.every((f) => f instanceof File));
  return { email: d.email, muestras };
}

/** Al enviar el registro: ata las muestras guardadas al email de la cuenta nueva. */
export async function atarMuestrasRegistro(email: string): Promise<void> {
  const data = await leerMuestrasRegistro();
  if (data?.muestras.length) await guardarMuestrasRegistro({ email: email.trim().toLowerCase(), muestras: data.muestras });
}
