const BA_TZ = "America/Argentina/Buenos_Aires";

function dateParts(date: Date | string, withTime: boolean) {
  const value = typeof date === "string" ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat("es-AR", {
    timeZone: BA_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit" as const, minute: "2-digit" as const, hourCycle: "h23" as const } : {}),
  });
  return Object.fromEntries(formatter.formatToParts(value).map((part) => [part.type, part.value]));
}

/** Formatea una fecha: siempre DD/MM/AAAA, sin depender del locale del navegador */
export function formatDate(date: Date | string): string {
  const p = dateParts(date, false);
  return `${p.day}/${p.month}/${p.year}`;
}

/** Formatea fecha y hora: siempre DD/MM/AAAA HH:mm */
export function formatDateTime(date: Date | string): string {
  const p = dateParts(date, true);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

/** "Plomería de Obra" -> "plomeria-de-obra". Para claves de URL y de catálogo */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Mes y año en palabras: "marzo de 2026". Para antigüedades, donde el día no aporta */
export function formatMonthYear(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-AR", { timeZone: BA_TZ, month: "long", year: "numeric" }).format(value);
}

/** Formatea un monto en pesos argentinos: 15000 -> "$15.000" */
export function formatARS(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Formatea un número grande: 1248 -> "1.248" */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-AR").format(n);
}

/** Formatea el peso de un archivo: 1536 -> "1,5 kB" */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0).replace(".", ",")} kB`;
  return `${(kb / 1024).toFixed(1).replace(".", ",")} MB`;
}

/** Devuelve las iniciales de un nombre: "Carlos López" -> "CL" */
export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
