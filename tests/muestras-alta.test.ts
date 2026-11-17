import assert from "node:assert/strict";
import test from "node:test";
import { MAX_MUESTRAS_ALTA, leerMuestrasAlta } from "../src/lib/muestras-alta";

const URL_OK = /^\/uploads\/[a-f0-9]{32}\.[a-z]{3,4}$/;
const foto = (n: number) => `/uploads/${String(n).padStart(32, "0")}.jpg`;

test("sin muestras es válido: el paso es opcional", () => {
  assert.deepEqual(leerMuestrasAlta(null, URL_OK), { muestras: [] });
  assert.deepEqual(leerMuestrasAlta("", URL_OK), { muestras: [] });
  assert.deepEqual(leerMuestrasAlta("[]", URL_OK), { muestras: [] });
});

test("limpia título, descripción y fotos repetidas o ajenas a /uploads", () => {
  const raw = JSON.stringify([{ title: "  Pintura de living ", description: " dos manos ", urls: [foto(1), foto(1), "https://otro.sitio/x.jpg", foto(2)] }]);
  assert.deepEqual(leerMuestrasAlta(raw, URL_OK), { muestras: [{ title: "Pintura de living", description: "dos manos", urls: [foto(1), foto(2)] }] });
});

test("rechaza muestras sin título, sin fotos o con más de cinco", () => {
  assert.ok("error" in leerMuestrasAlta(JSON.stringify([{ title: "ab", urls: [foto(1)] }]), URL_OK));
  assert.ok("error" in leerMuestrasAlta(JSON.stringify([{ title: "Baño", urls: [] }]), URL_OK));
  assert.ok("error" in leerMuestrasAlta(JSON.stringify([{ title: "Baño", urls: [1, 2, 3, 4, 5, 6].map(foto) }]), URL_OK));
});

test("rechaza JSON roto y más muestras que el tope del alta", () => {
  assert.ok("error" in leerMuestrasAlta("{no", URL_OK));
  assert.ok("error" in leerMuestrasAlta(JSON.stringify({ title: "x" }), URL_OK));
  const demasiadas = Array.from({ length: MAX_MUESTRAS_ALTA + 1 }, (_, i) => ({ title: `Trabajo ${i}`, urls: [foto(i)] }));
  assert.ok("error" in leerMuestrasAlta(JSON.stringify(demasiadas), URL_OK));
});
