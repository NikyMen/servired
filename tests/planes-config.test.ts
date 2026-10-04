import assert from "node:assert/strict";
import test from "node:test";
import { PLANES_DEFAULT, precioAnual, sanearPlanes } from "../src/lib/planes-config";

test("la maqueta original pasa el saneado sin cambios", () => {
  assert.deepEqual(sanearPlanes(PLANES_DEFAULT), PLANES_DEFAULT);
});

test("basura o nada no tira y deja todo vacío", () => {
  for (const crudo of [null, "hola", 3, [], { planes: "x", faqs: {} }]) {
    const config = sanearPlanes(crudo);
    assert.deepEqual(config.planes, []);
    assert.equal(config.publicado, false);
  }
});

test("planes: sin nombre se descartan, precios e íconos se acomodan y los ids no se repiten", () => {
  const config = sanearPlanes({
    planes: [
      { name: "Básico", monthlyPrice: "1500.4", icon: "inventado", features: ["  uno ", "", "dos"] },
      { name: "", monthlyPrice: 10 },
      { id: "basico", name: "Otro básico", monthlyPrice: -50 },
    ],
  });
  assert.deepEqual(config.planes.map((p) => [p.id, p.monthlyPrice, p.icon]), [["basico", 1500, "check"], ["basico-2", 0, "check"]]);
  assert.deepEqual(config.planes[0].features, ["uno", "dos"]);
});

test("la comparación tiene una celda por plan, y las vacías son «no»", () => {
  const config = sanearPlanes({
    planes: [{ id: "a", name: "A" }, { id: "b", name: "B" }],
    comparacion: { filas: [{ label: "Algo", values: { a: "si", b: "", c: "sobra" } }, { label: "", values: {} }] },
  });
  assert.deepEqual(config.comparacion.filas, [{ label: "Algo", values: { a: "si", b: "no" } }]);
});

test("el anual cobra los meses configurados", () => {
  const config = sanearPlanes({ ...PLANES_DEFAULT, anual: { activo: true, mesesPagos: 99, etiqueta: "" } });
  assert.equal(config.anual.mesesPagos, 12);
  assert.equal(precioAnual(config.planes[1], config), 4900 * 12);
});
