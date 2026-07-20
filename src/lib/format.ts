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
