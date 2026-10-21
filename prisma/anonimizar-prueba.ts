import { PrismaClient } from "@prisma/client";

/**
 * Deja la copia de la base del entorno de prueba sin datos con los que se le
 * pueda escribir o llegar a una persona real. Se corre una vez, en
 * /var/www/servired-prueba, después de copiar la base de producción.
 *
 *   set -a; . ./.env; set +a; npx tsx prisma/anonimizar-prueba.ts [--conservar=a@x.com,b@y.com]
 *
 * --conservar deja esos correos como están (para entrar con una cuenta propia).
 * No corre si falta ENTORNO_PRUEBA=1 o si se lanza desde la carpeta de producción.
 */
const prisma = new PrismaClient();

async function main() {
  if (process.env.ENTORNO_PRUEBA !== "1") throw new Error("Falta ENTORNO_PRUEBA=1: esto solo se corre en la copia de prueba.");
  if (process.cwd().replace(/\/$/, "") === "/var/www/servired") throw new Error("Esta es la carpeta de producción. No se anonimiza.");

  const conservar = new Set(
    (process.argv.find((arg) => arg.startsWith("--conservar="))?.slice("--conservar=".length) ?? "")
      .split(",")
      .map((correo) => correo.trim().toLowerCase())
      .filter(Boolean)
  );

  const usuarios = await prisma.user.findMany({ select: { id: true, email: true } });
  let correos = 0;
  for (const usuario of usuarios) {
    if (conservar.has(usuario.email.toLowerCase())) continue;
    await prisma.user.update({ where: { id: usuario.id }, data: { email: `usuario-${usuario.id}@prueba.invalid`, passwordHash: null } });
    correos++;
  }

  const kyc = await prisma.kycCase.findMany({ select: { id: true } });
  for (const caso of kyc) {
    await prisma.kycCase.update({
      where: { id: caso.id },
      data: { phone: "0000000000", address: "Dirección de prueba", cuilEncrypted: "anonimizado", cuilHash: `anon-cuil-${caso.id}`, dniEncrypted: "anonimizado", dniHash: `anon-dni-${caso.id}` },
    });
  }

  const [telefonos, documentos, accesos, mp, sesiones, oauth, verificaciones, restablecer, preinscripciones] = await prisma.$transaction([
    prisma.professional.updateMany({ where: { phone: { not: null } }, data: { phone: null } }),
    prisma.kycDocument.deleteMany({}),
    prisma.documentAccessLog.deleteMany({}),
    prisma.mercadoPagoAccount.deleteMany({}),
    prisma.session.deleteMany({}),
    prisma.oAuthAccount.deleteMany({}),
    prisma.emailVerification.deleteMany({}),
    prisma.passwordReset.deleteMany({}),
    prisma.preregistration.deleteMany({}),
  ]);

  console.log([
    `Correos reemplazados: ${correos} (conservados: ${usuarios.length - correos}).`,
    `Casos KYC anonimizados: ${kyc.length}. Documentos borrados: ${documentos.count}. Registros de acceso: ${accesos.count}.`,
    `Teléfonos de perfil borrados: ${telefonos.count}. Cuentas de Mercado Pago: ${mp.count}.`,
    `Sesiones: ${sesiones.count}. Vínculos OAuth: ${oauth.count}. Verificaciones: ${verificaciones.count}. Restablecimientos: ${restablecer.count}. Preinscripciones: ${preinscripciones.count}.`,
  ].join("\n"));
}

main().finally(() => prisma.$disconnect());
