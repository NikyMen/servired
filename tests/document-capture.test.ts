import assert from "node:assert/strict";
import { test } from "node:test";
import { analizarDocumento, recorteDocumento } from "../src/lib/document-capture";

const width = 320, height = 202;
function imagen(pixel: (x: number, y: number) => number) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = pixel(x, y); data[i + 3] = 255;
  }
  return data;
}

test("no captura oscuridad, reflejos ni superficies sin detalle", () => {
  for (const valor of [15, 255, 160]) {
    const data = imagen(() => valor);
    const previo = analizarDocumento(data, width, height);
    assert.ok(analizarDocumento(data, width, height, previo.gris).mensaje);
  }
});

test("requiere una imagen enfocada y estable entre fotogramas", () => {
  const data = imagen((x, y) => x % 13 < 3 && y % 16 < 9 ? 45 : 190);
  const primero = analizarDocumento(data, width, height);
  assert.ok(primero.mensaje);
  assert.equal(analizarDocumento(data, width, height, primero.gris).mensaje, null);
  const movida = imagen((x, y) => (x + 5) % 13 < 3 && y % 16 < 9 ? 45 : 190);
  assert.match(analizarDocumento(movida, width, height, primero.gris).mensaje!, /quietos/);
});

test("el recorte coincide con un marco centrado de DNI en ambas orientaciones", () => {
  for (const [w, h] of [[1920, 1080], [1080, 1920]]) {
    const crop = recorteDocumento(w, h);
    assert.ok(crop.x > 0 && crop.y > 0);
    assert.ok(crop.width <= w && crop.height <= h);
    assert.ok(Math.abs(crop.width / crop.height - 1.586) < 0.001);
    assert.equal(crop.x * 2 + crop.width, w);
    assert.equal(crop.y * 2 + crop.height, h);
  }
});
