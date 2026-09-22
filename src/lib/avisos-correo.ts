import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { appUrl, sendMail } from "@/lib/mailer";
import { type TipoAviso, esTipoAviso } from "@/lib/avisos-correo-tipos";

export { ETIQUETA_AVISO, TIPOS_AVISO, esTipoAviso, type TipoAviso } from "@/lib/avisos-correo-tipos";

/**
 * Avisos por correo: mensajes nuevos o sin contestar, solicitudes del rubro y
 * presupuestos. La campanita sigue igual; esto es lo que llega a quien no
 * está entrando al sitio. Cada tipo se puede apagar por separado.
 */

const CAMPO = { mensajes: "mailMensajes", solicitudes: "mailSolicitudes", propuestas: "mailPropuestas" } as const;

/** Cuánto tiene que esperar un mensaje sin leer antes de avisar por mail. */
export const PLAZO_MENSAJES_MS = 12 * 60 * 60 * 1000;
/** No se avisa por charlas viejas: el día del lanzamiento no sale una tanda de mails por chats de hace meses. */
export const VENTANA_MENSAJES_MS = 7 * 24 * 60 * 60 * 1000;

/** Cuentas suspendidas, sin verificar o con el email provisorio de Facebook no reciben nada. */
export function puedeRecibir(user: { accountStatus: string; emailVerifiedAt: Date | null; email: string }) {
  return user.accountStatus === "approved" && user.emailVerifiedAt != null && !user.email.endsWith("@pending.servired.invalid");
}

/**
 * ¿Hay que mandarle a este lado el mail de "tenés mensajes sin contestar"?
 * Sí, si el primer mensaje que no leyó tiene entre 12 h y 7 días, y todavía no
 * se le avisó después de la última vez que abrió el hilo. Así sale uno por
 * tanda: hasta que lo lea no se repite, y si después le vuelven a escribir y
 * otra vez pasa el plazo, sale otro.
 */
export function debeAvisarMensaje({ primerNoLeido, leido, avisado, now }: { primerNoLeido: Date | null; leido: Date | null; avisado: Date | null; now: Date }) {
  if (!primerNoLeido) return false;
  const edad = now.getTime() - primerNoLeido.getTime();
  if (edad < PLAZO_MENSAJES_MS || edad > VENTANA_MENSAJES_MS) return false;
  if (avisado && (!leido || avisado > leido)) return false;
  return true;
}

// Enlace de baja. No vence: tiene que servir en un mail viejo. Lo único que
// permite es apagar un tipo de aviso de esa cuenta.

function secreto() {
  return process.env.EMAIL_VERIFICATION_SECRET || process.env.ADMIN_SESSION_SECRET || "servired-dev-email";
}

export function firmaBaja(userId: string, tipo: TipoAviso) {
  return createHmac("sha256", secreto()).update(`baja:${userId}:${tipo}`).digest("hex");
}

export function firmaValida(userId: string, tipo: string, firma: string) {
  if (!userId || !esTipoAviso(tipo) || !/^[a-f0-9]{64}$/.test(firma)) return false;
  const esperada = Buffer.from(firmaBaja(userId, tipo), "hex");
  const recibida = Buffer.from(firma, "hex");
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}

function consulta(userId: string, tipo: TipoAviso) {
  return `u=${encodeURIComponent(userId)}&tipo=${tipo}&t=${firmaBaja(userId, tipo)}`;
}

/** La página que pide confirmar: abrir el enlace no da de baja (los antispam abren todo). */
export function enlaceBaja(userId: string, tipo: TipoAviso) {
  return `${appUrl()}/avisos-correo?${consulta(userId, tipo)}`;
}

/** Baja en un clic desde el cliente de correo (List-Unsubscribe-Post, RFC 8058). */
export function enlaceBajaUnClic(userId: string, tipo: TipoAviso) {
  return `${appUrl()}/api/avisos/correo-baja?${consulta(userId, tipo)}`;
}

export async function darDeBajaAviso(userId: string, tipo: TipoAviso) {
  const r = await prisma.user.updateMany({ where: { id: userId }, data: { [CAMPO[tipo]]: false } });
  return r.count > 0;
}

export async function preferenciasAvisos(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { mailMensajes: true, mailSolicitudes: true, mailPropuestas: true } });
  return { mensajes: u?.mailMensajes ?? true, solicitudes: u?.mailSolicitudes ?? true, propuestas: u?.mailPropuestas ?? true };
}

export async function guardarPreferenciasAvisos(userId: string, prefs: Record<TipoAviso, boolean>) {
  await prisma.user.update({ where: { id: userId }, data: { mailMensajes: prefs.mensajes, mailSolicitudes: prefs.solicitudes, mailPropuestas: prefs.propuestas } });
}

function escapar(texto: string) {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

type Contenido = { asunto: string; titulo: string; texto: string; url: string; boton: string };

type AvisoMensaje = {
  conversationId: string;
  paraUserId: string;
  paraRol: "cliente" | "profesional";
  deNombre: string;
};

/**
 * Manda un aviso si la cuenta puede y quiere recibirlo. Nunca tira: un fallo
 * del correo no puede tirar abajo lo que la persona estaba haciendo (mandar
 * un presupuesto, publicar una solicitud). Devuelve si salió.
 */
export async function mandarAviso(userId: string, tipo: TipoAviso, contenido: Contenido) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, accountStatus: true, emailVerifiedAt: true, mailMensajes: true, mailSolicitudes: true, mailPropuestas: true } });
    if (!user || !puedeRecibir(user) || !user[CAMPO[tipo]]) return false;
    const destino = `${appUrl()}${contenido.url}`;
    const baja = enlaceBaja(user.id, tipo);
    const text = `${contenido.titulo}\n\n${contenido.texto}\n\n${contenido.boton}: ${destino}\n\n—\nNo quiero recibir más estos avisos: ${baja}`;
    const html = `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;color:#0f172a">
<h1 style="font-size:20px;margin:0 0 12px">${escapar(contenido.titulo)}</h1>
<p style="font-size:15px;line-height:1.5;color:#334155">${escapar(contenido.texto)}</p>
<p><a href="${escapar(destino)}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 18px;border-radius:12px;text-decoration:none;font-weight:600">${escapar(contenido.boton)}</a></p>
<p style="font-size:12px;color:#94a3b8;margin-top:28px">Recibís este correo porque tenés activados los avisos de ServiRed. <a href="${escapar(baja)}" style="color:#64748b">No quiero recibir más estos avisos</a>.</p>
</div>`;
    await sendMail({
      to: user.email,
      subject: contenido.asunto,
      text,
      html,
      devNote: `aviso ${tipo} · "${contenido.asunto}" · ${destino} · baja: ${baja}`,
      headers: { "List-Unsubscribe": `<${enlaceBajaUnClic(user.id, tipo)}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    return true;
  } catch (error) {
    console.error("[avisos-correo]", tipo, userId, error instanceof Error ? error.message : error);
    return false;
  }
}

/** Avisa un mensaje nuevo y sella el hilo para que el barrido no duplique el correo. */
export async function mandarAvisoMensaje(opciones: AvisoMensaje) {
  const salio = await mandarAviso(opciones.paraUserId, "mensajes", {
    asunto: `${opciones.deNombre} te mandó un mensaje en ServiRed`,
    titulo: `Tenés un mensaje de ${opciones.deNombre}`,
    texto: "Ingresá a ServiRed para verlo y responder.",
    url: `${opciones.paraRol === "profesional" ? "/pro" : ""}/mensajes?conversacion=${opciones.conversationId}`,
    boton: "Ver mensaje",
  });
  if (!salio) return false;

  await prisma.conversation.updateMany({
    where: { id: opciones.conversationId },
    data: opciones.paraRol === "cliente"
      ? { mailAvisoClienteAt: new Date() }
      : { mailAvisoProAt: new Date() },
  });
  return true;
}

/**
 * El barrido que corre cada 15 minutos. Sella antes de mandar y solo si el
 * sello no cambió desde que se leyó: dos corridas pisándose no mandan dos
 * mails. Si el envío falla, el sello queda: se prefiere perder un recordatorio
 * a duplicarlo.
 */
export async function barrerMensajesSinContestar(now = new Date()) {
  const desde = new Date(now.getTime() - VENTANA_MENSAJES_MS);
  const conversaciones = await prisma.conversation.findMany({
    where: { messages: { some: { createdAt: { gte: desde } } } },
    select: {
      id: true, userId: true, clientName: true, leidoCliente: true, leidoPro: true, mailAvisoClienteAt: true, mailAvisoProAt: true,
      professional: { select: { userId: true, name: true } },
      messages: { where: { createdAt: { gte: desde } }, orderBy: { createdAt: "asc" }, select: { sender: true, createdAt: true } },
    },
  });

  let enviados = 0;
  for (const c of conversaciones) {
    for (const lado of ["cliente", "profesional"] as const) {
      const esCliente = lado === "cliente";
      const leido = esCliente ? c.leidoCliente : c.leidoPro;
      const avisado = esCliente ? c.mailAvisoClienteAt : c.mailAvisoProAt;
      const otro = esCliente ? "profesional" : "cliente";
      const primerNoLeido = c.messages.find((m) => m.sender === otro && (!leido || m.createdAt > leido))?.createdAt ?? null;
      if (!debeAvisarMensaje({ primerNoLeido, leido, avisado, now })) continue;
      const destinatario = esCliente ? c.userId : c.professional.userId;
      if (!destinatario) continue;
      const sellado = await prisma.conversation.updateMany({
        where: esCliente ? { id: c.id, mailAvisoClienteAt: avisado } : { id: c.id, mailAvisoProAt: avisado },
        data: esCliente ? { mailAvisoClienteAt: now } : { mailAvisoProAt: now },
      });
      if (!sellado.count) continue;
      const de = esCliente ? c.professional.name : c.clientName;
      const salio = await mandarAviso(destinatario, "mensajes", {
        asunto: `Tenés mensajes sin contestar de ${de}`,
        titulo: `${de} te escribió`,
        texto: `Tenés mensajes de ${de} en ServiRed que todavía no leíste.`,
        url: `${esCliente ? "" : "/pro"}/mensajes?conversacion=${c.id}`,
        boton: "Ver mensaje",
      });
      if (salio) enviados += 1;
    }
  }
  return { revisadas: conversaciones.length, enviados };
}
