import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import test, { after, before, beforeEach } from "node:test";
import type { PrismaClient } from "@prisma/client";

const directory = mkdtempSync(join(tmpdir(), "servired-orden-"));
const databaseUrl = `file:${join(directory, "test.db").replaceAll("\\", "/")}`;
const originalUrl = process.env.DATABASE_URL;
let prisma: PrismaClient;
let guardar: typeof import("../src/lib/orden-perfiles").guardarOrdenPerfiles;
let listar: typeof import("../src/lib/orden-perfiles").listarOrdenPerfiles;

before(async () => {
  process.env.DATABASE_URL = databaseUrl;
  writeFileSync(join(directory, "test.db"), "");
  const require = createRequire(import.meta.url);
  execFileSync(process.execPath, [require.resolve("prisma/build/index.js"), "db", "push", "--schema", "prisma/schema.prisma", "--skip-generate"], {
    env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: "pipe",
  });
  prisma = (await import("../src/lib/prisma")).prisma;
  ({ guardarOrdenPerfiles: guardar, listarOrdenPerfiles: listar } = await import("../src/lib/orden-perfiles"));
  await prisma.category.create({ data: { id: "categoria-orden", slug: "orden", name: "Orden", icon: "test" } });
});

beforeEach(async () => {
  await prisma.professional.deleteMany();
  await prisma.professional.createMany({ data: [
    { id: "a", posicionFija: 1, profileStatus: "approved" },
    { id: "b", posicionFija: 4, profileStatus: "approved" },
    { id: "c", posicionFija: null, profileStatus: "approved" },
    { id: "rechazado", posicionFija: 2, profileStatus: "rejected" },
  ].map((row) => ({ ...row, name: row.id, headline: "Oficio", zone: "Prueba", priceFrom: 0, categoryId: "categoria-orden" })) });
});

after(async () => {
  if (prisma) await prisma.$disconnect();
  if (originalUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalUrl;
  const target = resolve(directory);
  if (target.startsWith(resolve(tmpdir()) + sep) && basename(target).startsWith("servired-orden-")) rmSync(target, { recursive: true, force: true });
});

const posiciones = () => prisma.professional.findMany({ orderBy: { id: "asc" }, select: { id: true, posicionFija: true } });

test("guardar persiste la prioridad, renumera y suelta los demás", async () => {
  assert.equal((await guardar({ ids: ["c", "a"], anteriores: ["a", "b"] })).ok, true);
  assert.deepEqual(await posiciones(), [
    { id: "a", posicionFija: 2 }, { id: "b", posicionFija: null }, { id: "c", posicionFija: 1 }, { id: "rechazado", posicionFija: null },
  ]);
  assert.deepEqual((await listar()).map((row) => row.id), ["c", "a", "b"]);
});

test("rechaza listas inválidas y conflictos sin tocar el orden guardado", async () => {
  const inicial = await posiciones();
  for (const input of [
    { ids: ["a", "a"], anteriores: ["a", "b"] },
    { ids: ["rechazado"], anteriores: ["a", "b"] },
    { ids: ["inexistente"], anteriores: ["a", "b"] },
    { ids: ["b", "a"], anteriores: ["b"] },
  ]) {
    assert.equal((await guardar(input)).ok, false);
    assert.deepEqual(await posiciones(), inicial);
  }
});

test("un error durante las escrituras revierte toda la transacción", async () => {
  const inicial = await posiciones();
  await prisma.$executeRawUnsafe("CREATE TRIGGER bloquear_orden BEFORE UPDATE OF posicionFija ON Professional WHEN NEW.id = 'c' AND NEW.posicionFija IS NOT NULL BEGIN SELECT RAISE(ABORT, 'save blocked'); END");
  try {
    await assert.rejects(guardar({ ids: ["c", "a"], anteriores: ["a", "b"] }));
    assert.deepEqual(await posiciones(), inicial);
  } finally {
    await prisma.$executeRawUnsafe("DROP TRIGGER bloquear_orden");
  }
});

test("un reintento del mismo guardado es seguro y se puede volver todo a automático", async () => {
  const input = { ids: ["c", "a"], anteriores: ["a", "b"] };
  assert.equal((await guardar(input)).ok, true);
  assert.equal((await guardar(input)).ok, true);
  assert.equal((await guardar({ ids: [], anteriores: ["c", "a"] })).ok, true);
  assert.ok((await posiciones()).every((row) => row.posicionFija === null));
});
