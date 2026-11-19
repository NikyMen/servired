import assert from "node:assert/strict";
import test from "node:test";
import { errorContacto, tieneTelefono } from "../src/lib/contacto";

test("bloquea celulares escritos de cualquier forma", () => {
  for (const texto of [
    "llamame al 3794123456",
    "mi cel 3794 12-3456",
    "+54 9 379 412-3456",
    "(0379) 15 4123456",
    "15-4123456",
    "11 2345 6789",
    "3794.12.34.56",
    "escribime 3 7 9 4 1 2 3 4 5 6",
    "tres siete nueve cuatro uno dos tres cuatro",
    "Tres Siete Nueve Cuatro, uno dos, tres cuatro",
    "3794 1o 2345 6",
    "wsp: wa.me/5493794123456",
    "te paso el link https://api.whatsapp.com/send?phone=549379",
  ]) {
    assert.equal(tieneTelefono(texto), true, texto);
  }
});

test("deja pasar precios, fechas, direcciones y medidas", () => {
  for (const texto of [
    "El presupuesto es $150.000",
    "Serían $ 15.000.000 en total",
    "Te cobro 1.500.000 pesos",
    "Paso el 12/05/2026 a las 10:30",
    "Nos vemos el 12-05-26",
    "Vivo en Av. Corrientes 1234, piso 3",
    "Son 2 baños de 3x4 y una cocina de 2,5 x 3",
    "Tardo 2 o 3 días",
    "Hola, uno de estos días paso, son dos horas de trabajo",
    "",
  ]) {
    assert.equal(tieneTelefono(texto), false, texto);
  }
});

test("errorContacto revisa varios campos y devuelve el aviso", () => {
  assert.equal(errorContacto("Arreglo de techo", null, undefined), null);
  assert.match(errorContacto("Arreglo de techo", "llamame 3794123456") ?? "", /teléfono/);
});

test("una lista de precios con comas no es un teléfono", () => {
  assert.equal(tieneTelefono("Opciones: 150.000, 200.000 o 300.000"), false);
});
