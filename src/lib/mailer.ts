import nodemailer from "nodemailer";

/**
 * El único lugar que manda correo. Antes esto vivía enterrado en
 * `email-verification.ts` y solo sabía mandar códigos de verificación; ahora
 * también lo usa el restablecimiento de contraseña.
 *
 * Sin `SMTP_HOST`, en desarrollo escribe por consola en vez de fallar: así el
 * flujo se puede probar entero sin configurar nada.
 *
 * El remitente y el destino de las respuestas son dos casillas distintas a
 * propósito: `no-reply@servired.ar` sale por el servicio de envío (Brevo), que
 * es el que aguanta el volumen sin caer en spam, y las respuestas van a
 * `consultas@servired.ar`, que es una casilla de verdad que alguien lee. Si
 * saliera todo de la casilla de consultas, los rebotes de cada tanda le
 * arruinarían la reputación.
 */
export function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function sendMail({ to, subject, text, html, devNote, headers }: { to: string; subject: string; text: string; html?: string; devNote?: string; headers?: Record<string, string> }) {
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
  // Sin `EMAIL_REPLY_TO` no se manda el encabezado: mejor que responder a
  // `no-reply@` rebote a que caiga en una casilla que nadie mira.
  const replyTo = process.env.EMAIL_REPLY_TO?.trim();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "ServiRed <no-reply@servired.ar>",
    to,
    ...(replyTo ? { replyTo } : {}),
    subject,
    text,
    html,
    headers,
  });
}
