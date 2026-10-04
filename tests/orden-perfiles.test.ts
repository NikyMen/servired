import assert from "node:assert/strict";
import test from "node:test";
import { mismoOrden, ubicarPerfil, validarOrdenPerfiles } from "../src/lib/orden-perfiles-utils";

test("reordenar un fijado no duplica ni pierde otros perfiles", () => {
  const original = ["a", "b", "c", "d"];
  assert.deepEqual(ubicarPerfil(original, "a", 2), ["b", "c", "a", "d"]);
  assert.deepEqual(ubicarPerfil(original, "d", 0), ["d", "a", "b", "c"]);
  assert.deepEqual(original, ["a", "b", "c", "d"]);
});

test("incorpora automáticos en cualquier posición y permite soltarlos", () => {
  assert.deepEqual(ubicarPerfil(["a", "b"], "nuevo", 1), ["a", "nuevo", "b"]);
  assert.deepEqual(ubicarPerfil([], "nuevo", 0), ["nuevo"]);
  assert.deepEqual(ubicarPerfil(["a", "b", "c"], "b", null), ["a", "c"]);
  assert.deepEqual(ubicarPerfil(["a"], "a", null), []);
  assert.deepEqual(ubicarPerfil(["a", "b"], "a", 999), ["b", "a"]);
});

test("validación rechaza duplicados, tipos incorrectos e identificadores inválidos", () => {
  assert.equal(validarOrdenPerfiles({ ids: ["a", "b"], anteriores: ["b"] }), true);
  assert.equal(validarOrdenPerfiles({ ids: [], anteriores: ["a"] }), true);
  for (const value of [null, {}, { ids: "a", anteriores: [] }, { ids: ["a", "a"], anteriores: [] }, { ids: [3], anteriores: [] }, { ids: [""], anteriores: [] }, { ids: ["a"], anteriores: ["b", "b"] }, { ids: ["a".repeat(129)], anteriores: [] }]) {
    assert.equal(validarOrdenPerfiles(value), false);
  }
});

test("el control de concurrencia distingue reordenamientos, altas y bajas", () => {
  assert.equal(mismoOrden(["a", "b"], ["a", "b"]), true);
  assert.equal(mismoOrden(["a", "b"], ["b", "a"]), false);
  assert.equal(mismoOrden(["a"], ["a", "b"]), false);
  assert.equal(mismoOrden([], []), true);
});
