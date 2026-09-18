import { PrismaClient } from "@prisma/client";
import { CAPITAL, asegurarLocalidades } from "../src/lib/localidades";

/**
 * Se corre una vez al deployar las localidades. Hasta ahora el alta de
 * oferente solo aceptaba Corrientes Capital, así que a quien la eligió en su
 * KYC y todavía no tiene localidad en la cuenta se le asigna esa. No toca a
 * nadie que ya tenga una, así que correrlo de nuevo no cambia nada.
 */
const prisma = new PrismaClient();

async function main() {
  await asegurarLocalidades();
  const capital = await prisma.locality.findUniqueOrThrow({ where: { name_province: CAPITAL } });
  const result = await prisma.user.updateMany({
    where: { localityId: null, professional: { isNot: null }, kycCase: { is: { locality: CAPITAL.name, province: CAPITAL.province } } },
    data: { localityId: capital.id },
  });
  console.log(`Profesionales asignados a ${CAPITAL.name}: ${result.count}.`);
}

main().finally(() => prisma.$disconnect());
