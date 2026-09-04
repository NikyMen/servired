import { createHash, randomBytes, randomInt } from "node:crypto";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

const TTL_MS = 15 * 60 * 1000;
const RESEND_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function digest(value: string) {
  const secret = process.env.EMAIL_VERIFICATION_SECRET || process.env.ADMIN_SESSION_SECRET || "servired-dev-email";
  return createHash("sha256").update(`${secret}:${value}`).digest("hex");
}

function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

async function deliver(to: string, code: string, token: string) {
  const url = `${appUrl()}/verificar-email?token=${encodeURIComponent(token)}`;
  const host = process.env.SMTP_HOST;
  if (!host) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email-verification] ${to}: código ${code} · ${url}`);
      return;
    }
    throw new Error("El envío de correo no está configurado.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "ServiRed <no-reply@servired.consultoriadigital.io>",
    to,
    subject: "Verificá tu correo de ServiRed",
    text: `Tu código es ${code}. También podés abrir ${url}. Vence en 15 minutos.`,
    html: `<p>Tu código de ServiRed es:</p><p style="font-size:28px;font-weight:700;letter-spacing:5px">${code}</p><p><a href="${url}">Verificar mi correo</a></p><p>Vence en 15 minutos.</p>`,
  });
}

export async function issueEmailVerification(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.emailVerifiedAt) return { ok: true as const };

  const recent = await prisma.emailVerification.findFirst({
    where: { userId, createdAt: { gt: new Date(Date.now() - RESEND_MS) } },
    orderBy: { createdAt: "desc" },
  });
  if (recent) return { ok: false as const, error: "Esperá un minuto antes de reenviar." };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const token = randomBytes(32).toString("hex");
  const verification = await prisma.$transaction(async (tx) => {
    await tx.emailVerification.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
    return tx.emailVerification.create({
      data: {
        userId,
        codeHash: digest(code),
        tokenHash: digest(token),
        expiresAt: new Date(Date.now() + TTL_MS),
      },
    });
  });

  try {
    await deliver(user.email, code, token);
  } catch (error) {
    console.error("[email-verification] no se pudo enviar el correo", { userId, email: user.email, error });
    // Invalida la fila recién creada para que un reintento no choque con el cooldown de RESEND_MS
    // por un envío que nunca salió.
    await prisma.emailVerification.update({ where: { id: verification.id }, data: { usedAt: new Date() } });
    return { ok: false as const, error: "No pudimos enviar el correo. Probá de nuevo en unos minutos." };
  }

  return {
    ok: true as const,
    ...(process.env.NODE_ENV !== "production" ? { devCode: code, devToken: token } : {}),
  };
}

export async function consumeEmailVerification(userId: string, value: string) {
  const clean = value.trim();
  const byCode = /^\d{6}$/.test(clean);
  const verification = await prisma.emailVerification.findFirst({
    where: {
      userId,
      usedAt: null,
      expiresAt: { gt: new Date() },
      ...(byCode ? { codeHash: digest(clean) } : { tokenHash: digest(clean) }),
    },
    orderBy: { createdAt: "desc" },
  });

  if (!verification) {
    const latest = await prisma.emailVerification.findFirst({
      where: { userId, usedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (latest && latest.attempts < MAX_ATTEMPTS) {
      await prisma.emailVerification.update({ where: { id: latest.id }, data: { attempts: { increment: 1 } } });
    }
    return { ok: false as const, error: "El código o enlace no es válido, venció o ya fue usado." };
  }
  if (verification.attempts >= MAX_ATTEMPTS) {
    return { ok: false as const, error: "Superaste los intentos permitidos. Pedí un código nuevo." };
  }

  await prisma.$transaction([
    prisma.emailVerification.update({ where: { id: verification.id }, data: { usedAt: new Date() } }),
    prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date(), accountStatus: "approved" },
    }),
  ]);
  return { ok: true as const };
}
