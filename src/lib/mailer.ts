import nodemailer from "nodemailer";

/**
 * El único lugar que manda correo. Antes esto vivía enterrado en
 * `email-verification.ts` y solo sabía mandar códigos de verificación; ahora
 * también lo usa el restablecimiento de contraseña.
 *
 * Sin `SMTP_HOST`, en desarrollo escribe por consola en vez de fallar: así el
 * flujo se puede probar entero sin configurar nada.
 */
export function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function sendMail({ to, subject, text, html, devNote }: { to: string; subject: string; text: string; html?: string; devNote?: string }) {
  const host = process.env.SMTP_HOST;
  if (!host) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[mailer] ${to}: ${devNote ?? text}`);
      return;
    }
    throw new Error("El envío de correo no está configurado.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "ServiRed <no-reply@servired.consultoriadigital.io>",
    to,
    subject,
    text,
    html,
  });
}
