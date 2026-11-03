/** Analiza el recorte del encuadre, sin enviar imágenes a servicios externos. */
export function analizarDocumento(data: Uint8ClampedArray, width: number, height: number, anterior?: Uint8Array) {
  const gris = new Uint8Array(width * height);
  let luz = 0, blancos = 0, movimiento = 0, detalle = 0, bordes = 0;
  for (let i = 0; i < gris.length; i++) {
    gris[i] = Math.round(data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114);
    luz += gris[i];
    if (gris[i] > 248) blancos++;
    if (anterior) movimiento += Math.abs(gris[i] - anterior[i]);
  }
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const i = y * width + x;
    const laplaciano = 4 * gris[i] - gris[i - 1] - gris[i + 1] - gris[i - width] - gris[i + width];
    detalle += laplaciano * laplaciano;
    if (Math.abs(gris[i] - gris[i - 1]) > 22) bordes++;
  }
  const n = gris.length;
  const mensaje = luz / n < 55 ? "Buscá más luz, sin flash."
    : luz / n > 225 || blancos / n > 0.18 ? "Evitá reflejos y luz directa."
    : detalle / n < 100 || bordes / n < 0.025 ? "Acercá el DNI al marco y esperá que enfoque."
    : !anterior || movimiento / n > 3.5 ? "Mantené el DNI y la cámara quietos."
    : null;
  return { gris, mensaje };
}

/** Marco con proporción de tarjeta; el video usa object-fit: contain. */
export function recorteDocumento(width: number, height: number) {
  const w = Math.min(width * 0.88, height * 0.78 * 1.586);
  const h = w / 1.586;
  return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h };
}
