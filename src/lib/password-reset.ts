import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { appUrl, sendMail } from "@/lib/mailer";
import { hashPassword } from "@/lib/password";

const TTL_MS = 30 * 60 * 1000;
const RESEND_MS = 60 * 1000;

/** Mismo molde que la verificación de email: en la base va el hash, nunca el token. */
function digest(value: string) {
  const secret = process.env.EMAIL_VERIFICATION_SECRET || process.env.ADMIN_SESSION_SECRET || "servired-dev-email";
  return createHash("sha256").update(`${secret}:reset:${value}`).digest("hex");
}

/**
 * Emite el enlace para elegir una contraseña nueva.
 *
 * Devuelve lo mismo exista o no la cuenta: quien prueba emails ajenos no se
 * tiene que enterar de cuáles están registrados. En desarrollo, sin SMTP, el
 * enlace sale por la consola del servidor.
 */
export async function issuePasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true, email: true } });
  if (!user) return { ok: true as const };

  const recent = await prisma.passwordReset.findFirst({
    where: { userId: user.id, usedAt: null, createdAt: { gt: new Date(Date.now() - RESEND_MS) } },
    orderBy: { createdAt: "desc" },
  });
  if (recent) return { ok: true as const };

  const token = randomBytes(32).toString("hex");
  const reset = await prisma.$transaction(async (tx) => {
    // Un pedido nuevo invalida los anteriores: si alguien pidió dos, vale el último.
    await tx.passwordReset.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
    return tx.passwordReset.create({ data: { userId: user.id, tokenHash: digest(token), expiresAt: new Date(Date.now() + TTL_MS) } });
  });

  const url = `${appUrl()}/nueva-clave?token=${encodeURIComponent(token)}`;
  try {
    await sendMail({
      to: user.email,
      subject: "Restablecé tu contraseña de ServiRed",
      text: `Abrí ${url} para elegir una contraseña nueva. El enlace vence en 30 minutos. Si no lo pediste, ignorá este correo.`,
      html: `<p>Pediste restablecer tu contraseña de ServiRed.</p><p><a href="${url}">Elegir una contraseña nueva</a></p><p>El enlace vence en 30 minutos. Si no lo pediste, ignorá este correo.</p>`,
      devNote: `restablecer contraseña · ${url}`,
    });
  } catch (error) {
    console.error("[password-reset] no se pudo enviar el correo", { userId: user.id, error });
    // Se invalida el token para que el reintento no choque con el enfriamiento
    // por un correo que nunca salió.
    await prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } });
    return { ok: false as const, error: "No pudimos enviar el correo. Probá de nuevo en unos minutos." };
  }
  return { ok: true as const };
}

/**
 * Cambia la contraseña y devuelve el usuario para abrirle sesión.
 *
 * Al pasar por acá se borran todas las sesiones abiertas: es el sentido de
 * tener el token de sesión en la base y no un JWT. Y si la cuenta todavía no
 * tenía el correo verificado, queda verificada: abrir este enlace lo prueba.
 */
export async function consumePasswordReset(token: string, password: string) {
  const reset = await prisma.passwordReset.findUnique({
    where: { tokenHash: digest(token.trim()) },
    select: { id: true, userId: true, usedAt: true, expiresAt: true },
  });
  if (!reset || reset.usedAt || reset.expiresAt <= new Date()) {
    return { ok: false as const, error: "El enlace venció o ya se usó. Pedí uno nuevo." };
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction(async (tx) => {
    await tx.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } });
    await tx.session.deleteMany({ where: { userId: reset.userId } });
    const user = await tx.user.findUniqueOrThrow({ where: { id: reset.userId }, select: { emailVerifiedAt: true, accountStatus: true } });
    await tx.user.update({
      where: { id: reset.userId },
      data: {
        passwordHash,
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        accountStatus: user.accountStatus === "suspended" ? "suspended" : "approved",
      },
    });
  });
  return { ok: true as const, userId: reset.userId };
}
