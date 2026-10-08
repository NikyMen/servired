import assert from "node:assert/strict";
import test from "node:test";
import { agruparProfesionales } from "../src/lib/grupos-profesionales";

const pro = (id: string, localidadId: string, localidadNombre: string, provinciaNombre: string, distanciaKm: number) => ({
  id, localidadId, localidadNombre, provinciaNombre, distanciaKm, zone: `${localidadNombre}, ${provinciaNombre}`,
});

test("muestra primero la localidad elegida y ordena las demás ciudades por cercanía", () => {
  const pros = [
    pro("corrientes-2", "ctes", "Corrientes Capital", "Corrientes", 510),
    pro("parana", "parana", "Paraná", "Entre Ríos", 0),
    pro("concordia", "concordia", "Concordia", "Entre Ríos", 190),
    pro("corrientes-1", "ctes", "Corrientes Capital", "Corrientes", 500),
  ];
  const grupos = agruparProfesionales(pros, "parana");
  assert.deepEqual(grupos.locales.map((p) => p.id), ["parana"]);
  assert.deepEqual(grupos.otras.map((g) => g.titulo), ["Concordia, Entre Ríos", "Corrientes Capital, Corrientes"]);
  assert.deepEqual(grupos.otras[1].pros.map((p) => p.id), ["corrientes-1", "corrientes-2"]);
});

test("si la localidad está vacía, mantiene visibles las demás", () => {
  const grupos = agruparProfesionales([pro("corrientes", "ctes", "Corrientes Capital", "Corrientes", 500)], "parana");
  assert.equal(grupos.locales.length, 0);
  assert.deepEqual(grupos.otras[0].pros.map((p) => p.id), ["corrientes"]);
});
