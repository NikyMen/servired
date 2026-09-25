import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { appUrl, sendMail } from "../src/lib/mailer";
import { listPreinscriptions, type Preinscription, type PreinscriptionType } from "../src/lib/preinscripciones";
import { prisma } from "../src/lib/prisma";
import { telefonoLegible, validSupportPhone, waLink } from "../src/lib/whatsapp";

/**
 * Correo a los preinscriptos avisando que ServiRed ya está en línea y que
 * tienen que crear su cuenta (la preinscripción no creó ninguna).
 *
 *   pnpm preinscriptos:invitar                       → cuenta a quiénes les llegaría, sin mandar nada
 *   pnpm preinscriptos:invitar --vista-previa        → escribe los dos correos en output/invitacion/
 *   pnpm preinscriptos:invitar --prueba=vos@mail.com → manda las dos versiones solo a esa casilla
 *   pnpm preinscriptos:invitar --enviar [--limite=250]
 *
 * - Saltea a quien ya tiene cuenta con ese correo: ya se registró.
 * - Anota cada envío en `invitaciones-enviadas.txt` y no le vuelve a mandar a
 *   nadie de esa lista. El plan gratis de Brevo son 300 correos por día y los
 *   códigos de verificación salen de la misma cuota: por eso el límite de 250
 *   y la idea de correrlo un día más si no alcanza.
 * - En el server hay que cargar los .env antes (tsx no los lee solo):
 *   `set -a; . ./.env; [ -f .env.local ] && . ./.env.local; set +a`
 * - Las imágenes salen de `public/email/` del sitio, así que tienen que estar
 *   deployadas antes de mandar.
 */

const REGISTRO = "invitaciones-enviadas.txt";
const LIMITE_POR_DEFECTO = 250;
const PAUSA_MS = 1200;

const MARINO = "#13294b";
const AZUL = "#2563eb";
const VERDE = "#059669";
const TEXTO = "#334155";
const SUAVE = "#64748b";
const FUENTE = "'Segoe UI', Roboto, 'Helvetica Neue', Helvetica, Arial, sans-serif";

type Imagenes = { logo: string; marca: string; isotipo: string };

type Variante = {
  asunto: (nombre: string) => string;
  preheader: string;
  intro: string;
  beneficios: string[];
  boton: string;
  ruta: string;
  ultimoPaso: string;
  color: string;
  fondo: string;
};

const VARIANTES: Record<PreinscriptionType, Variante> = {
  cliente: {
    asunto: (nombre) => `${nombre}, ServiRed ya está en línea: creá tu cuenta`,
    preheader: "Gracias por preinscribirte. Ya podés crear tu cuenta y encontrar al profesional que necesitás.",
    intro: "Ya podés encontrar profesionales de confianza para lo que necesites en tu casa, tu negocio o tu día a día.",
    beneficios: [
      "Profesionales y oficios verificados, cerca tuyo.",
      "Publicá lo que necesitás y recibí presupuestos.",
      "Chateá con el profesional desde la plataforma.",
      "Pagá de forma segura con Mercado Pago.",
    ],
    boton: "Crear mi cuenta",
    ruta: "/crear-cuenta",
    ultimoPaso: "Buscá el servicio que necesitás y pedí tu presupuesto.",
    color: AZUL,
    fondo: "#eff6ff",
  },
  profesional: {
    asunto: (nombre) => `${nombre}, ServiRed ya está en línea: sumate como profesional`,
    preheader: "Gracias por preinscribirte. Ya podés crear tu cuenta y empezar a recibir clientes.",
    intro: "Ya podés ofrecer tus servicios y conectar con clientes de tu zona que buscan exactamente lo que hacés.",
    beneficios: [
      "Recibí solicitudes de clientes de tu rubro y tu zona.",
      "Mandá presupuestos y chateá desde la plataforma.",
      "Cobrá tus trabajos con Mercado Pago.",
      "Sumá calificaciones y hacé crecer tu reputación.",
    ],
    boton: "Crear mi cuenta profesional",
    ruta: "/crear-cuenta?role=profesional",
    ultimoPaso: "Completá tu perfil y la verificación de identidad para empezar a recibir solicitudes.",
    color: VERDE,
    fondo: "#ecfdf5",
  },
};

function escapar(texto: string) {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** "maría josé PÉREZ" → "María": el primer nombre, bien escrito. */
function primerNombre(nombre: string) {
  const primero = nombre.trim().split(/\s+/)[0] ?? "";
  return primero ? primero.charAt(0).toLocaleUpperCase("es-AR") + primero.slice(1).toLocaleLowerCase("es-AR") : "Hola";
}

function soporte() {
  const phone = validSupportPhone(process.env.SOPORTE_WHATSAPP ?? "");
  return phone ? { href: waLink(phone, "Hola, me preinscribí en ServiRed y tengo una consulta."), telefono: telefonoLegible(phone) } : null;
}

export function armarCorreo(persona: Pick<Preinscription, "name" | "email" | "type">, imagenes: Imagenes) {
  const v = VARIANTES[persona.type];
  const nombre = primerNombre(persona.name);
  const url = `${appUrl()}${v.ruta}`;
  const sitio = appUrl().replace(/^https?:\/\//, "");
  const wa = soporte();
  const n = escapar(nombre);
  const correo = escapar(persona.email);

  const beneficios = v.beneficios
    .map(
      (b) => `<tr>
        <td width="30" valign="top" style="padding:0 0 12px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="22" height="22" align="center" valign="middle" bgcolor="${v.color}" style="width:22px;height:22px;border-radius:11px;background:${v.color};color:#ffffff;font-family:${FUENTE};font-size:13px;font-weight:700;line-height:22px;">&#10003;</td></tr></table>
        </td>
        <td valign="top" style="padding:1px 0 12px 0;font-family:${FUENTE};font-size:15px;line-height:22px;color:${TEXTO};">${escapar(b)}</td>
      </tr>`,
    )
    .join("");

  const pasos = ["Creá tu cuenta con tu nombre, tu correo y una contraseña.", "Confirmá tu correo con el código de 6 dígitos que te mandamos.", v.ultimoPaso]
    .map(
      (p, i) => `<tr>
        <td width="34" valign="top" style="padding:0 0 10px 0;font-family:${FUENTE};font-size:20px;font-weight:700;line-height:22px;color:${v.color};">${i + 1}</td>
        <td valign="top" style="padding:0 0 10px 0;font-family:${FUENTE};font-size:14px;line-height:22px;color:${TEXTO};">${escapar(p)}</td>
      </tr>`,
    )
    .join("");

  const ayuda = wa
    ? `Respondé este correo o escribinos por <a href="${wa.href}" style="color:${v.color};font-weight:600;text-decoration:none;">WhatsApp al ${escapar(wa.telefono)}</a>.`
    : "Respondé este correo y te ayudamos.";

  const html = `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>ServiRed ya está en línea</title>
<style>
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  a { text-decoration:none; }
  @media (max-width:620px) {
    .tarjeta { width:100% !important; }
    .lados { padding-left:24px !important; padding-right:24px !important; }
    .titulo { font-size:26px !important; line-height:32px !important; }
    .boton a { display:block !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#eef2f7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${escapar(v.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eef2f7" style="background:#eef2f7;">
<tr><td align="center" style="padding:32px 12px;">

  <table role="presentation" class="tarjeta" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #dde4ee;border-radius:16px;overflow:hidden;">
    <tr><td style="font-size:0;line-height:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="62%" height="6" bgcolor="#1e63b0" style="height:6px;background:#1e63b0;font-size:0;line-height:0;">&nbsp;</td>
        <td width="38%" height="6" bgcolor="#3fa34d" style="height:6px;background:#3fa34d;font-size:0;line-height:0;">&nbsp;</td>
      </tr></table>
    </td></tr>

    <tr><td align="center" class="lados" style="padding:34px 48px 10px 48px;">
      <a href="${appUrl()}" target="_blank"><img src="${imagenes.logo}" width="260" alt="ServiRed · Servicios profesionales conectados" style="display:block;width:260px;max-width:100%;height:auto;border:0;"></a>
    </td></tr>

    <tr><td class="lados" background="${imagenes.marca}" bgcolor="#ffffff" style="background-color:#ffffff;background-image:url('${imagenes.marca}');background-repeat:no-repeat;background-position:center 150px;padding:18px 48px 34px 48px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding:0 0 18px 0;">
          <span style="display:inline-block;padding:6px 14px;border-radius:999px;background:${v.fondo};color:${v.color};font-family:${FUENTE};font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Ya estamos en línea</span>
        </td></tr>
        <tr><td align="center" class="titulo" style="padding:0 0 22px 0;font-family:${FUENTE};font-size:30px;line-height:36px;font-weight:800;color:${MARINO};">
          ¡ServiRed ya está funcionando!
        </td></tr>
        <tr><td style="padding:0 0 14px 0;font-family:${FUENTE};font-size:16px;line-height:25px;color:${TEXTO};">
          Hola <strong style="color:${MARINO};">${n}</strong>:
        </td></tr>
        <tr><td style="padding:0 0 14px 0;font-family:${FUENTE};font-size:16px;line-height:25px;color:${TEXTO};">
          Gracias por preinscribirte y acompañarnos desde el principio. Te contamos que la plataforma ya está abierta en <a href="${appUrl()}" style="color:${v.color};font-weight:600;text-decoration:none;">${escapar(sitio)}</a>. ${escapar(v.intro)}
        </td></tr>
        <tr><td style="padding:0 0 24px 0;font-family:${FUENTE};font-size:16px;line-height:25px;color:${TEXTO};">
          La preinscripción fue el primer paso: <strong style="color:${MARINO};">para empezar a usar ServiRed tenés que crear tu cuenta</strong>. Es gratis y te lleva un par de minutos.
        </td></tr>

        <tr><td style="padding:0 0 26px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:12px;">
            <tr><td style="padding:20px 22px 8px 22px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${beneficios}</table>
            </td></tr>
          </table>
        </td></tr>

        <tr><td align="center" class="boton" style="padding:0 0 14px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td align="center" bgcolor="${v.color}" style="border-radius:10px;background:${v.color};">
              <a href="${url}" target="_blank" style="display:inline-block;padding:15px 34px;font-family:${FUENTE};font-size:16px;font-weight:700;line-height:20px;color:#ffffff;text-decoration:none;border-radius:10px;">${escapar(v.boton)} &rarr;</a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td align="center" style="padding:0 0 30px 0;font-family:${FUENTE};font-size:13px;line-height:20px;color:${SUAVE};">
          Te recomendamos usar el mismo correo con el que te preinscribiste:<br><strong style="color:${MARINO};">${correo}</strong>
        </td></tr>

        <tr><td style="padding:0 0 14px 0;font-family:${FUENTE};font-size:13px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${MARINO};">
          Cómo empezar
        </td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${pasos}</table>
        </td></tr>
      </table>
    </td></tr>

    <tr><td class="lados" style="padding:0 48px;"><div style="height:1px;line-height:1px;font-size:0;background:#e2e8f0;">&nbsp;</div></td></tr>
    <tr><td class="lados" style="padding:22px 48px 30px 48px;font-family:${FUENTE};font-size:14px;line-height:22px;color:${TEXTO};">
      <strong style="color:${MARINO};">¿Tenés alguna duda?</strong> ${ayuda}<br>
      <span style="color:${SUAVE};">— El equipo de ServiRed</span>
    </td></tr>
  </table>

  <table role="presentation" class="tarjeta" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
    <tr><td align="center" style="padding:26px 24px 6px 24px;">
      <img src="${imagenes.isotipo}" width="36" height="36" alt="" style="display:block;width:36px;height:36px;border:0;border-radius:18px;">
    </td></tr>
    <tr><td align="center" style="padding:4px 24px 0 24px;font-family:${FUENTE};font-size:13px;line-height:20px;color:${SUAVE};">
      <strong style="color:${MARINO};">ServiRed</strong> · Servicios profesionales conectados<br>
      <a href="${appUrl()}" style="color:${SUAVE};text-decoration:underline;">${escapar(sitio)}</a>
    </td></tr>
    <tr><td align="center" style="padding:14px 36px 8px 36px;font-family:${FUENTE};font-size:11px;line-height:17px;color:#94a3b8;">
      Recibís este correo porque te preinscribiste en ServiRed con ${correo}.<br>
      Si no querés recibir más novedades, respondé este correo con la palabra BAJA.
    </td></tr>
  </table>

</td></tr>
</table>
</body>
</html>`;

  const text = [
    `Hola ${nombre}:`,
    "",
    `Gracias por preinscribirte en ServiRed. La plataforma ya está abierta en ${sitio}. ${v.intro}`,
    "",
    "La preinscripción fue el primer paso: para empezar a usar ServiRed tenés que crear tu cuenta. Es gratis y te lleva un par de minutos.",
    "",
    ...v.beneficios.map((b) => `- ${b}`),
    "",
    `${v.boton}: ${url}`,
    `Te recomendamos usar el mismo correo con el que te preinscribiste: ${persona.email}`,
    "",
    "Cómo empezar:",
    "1. Creá tu cuenta con tu nombre, tu correo y una contraseña.",
    "2. Confirmá tu correo con el código de 6 dígitos que te mandamos.",
    `3. ${v.ultimoPaso}`,
    "",
    wa ? `¿Dudas? Respondé este correo o escribinos por WhatsApp al ${wa.telefono}.` : "¿Dudas? Respondé este correo y te ayudamos.",
    "",
    "El equipo de ServiRed",
    "",
    "--",
    `Recibís este correo porque te preinscribiste en ServiRed con ${persona.email}. Si no querés recibir más novedades, respondé con la palabra BAJA.`,
  ].join("\n");

  return { subject: v.asunto(nombre), html, text };
}

const HEADERS = { "List-Unsubscribe": "<mailto:consultas@servired.ar?subject=BAJA>" };

function imagenesPublicadas(): Imagenes {
  return { logo: `${appUrl()}/email/servired-logo.png`, marca: `${appUrl()}/email/marca-agua.png`, isotipo: `${appUrl()}/email/servired-isotipo.png` };
}

async function imagenesEmbebidas(): Promise<Imagenes> {
  const dataUri = async (archivo: string) => `data:image/png;base64,${(await readFile(path.join("public", "email", archivo))).toString("base64")}`;
  return { logo: await dataUri("servired-logo.png"), marca: await dataUri("marca-agua.png"), isotipo: await dataUri("servired-isotipo.png") };
}

function ocultar(email: string) {
  const [usuario, dominio] = email.split("@");
  return `${usuario.slice(0, 2)}${"*".repeat(Math.max(1, usuario.length - 2))}@${dominio}`;
}

const EJEMPLOS: Record<PreinscriptionType, Pick<Preinscription, "name" | "email" | "type">> = {
  cliente: { name: "María", email: "maria@ejemplo.com", type: "cliente" },
  profesional: { name: "Martín", email: "martin@ejemplo.com", type: "profesional" },
};

async function main() {
  const args = process.argv.slice(2);
  const valor = (flag: string) => args.find((a) => a.startsWith(`${flag}=`))?.slice(flag.length + 1);

  if (args.some((a) => a.startsWith("--vista-previa"))) {
    const dir = valor("--vista-previa") ?? path.join("output", "invitacion");
    await mkdir(dir, { recursive: true });
    const imagenes = await imagenesEmbebidas();
    for (const tipo of ["cliente", "profesional"] as const) {
      const { subject, html } = armarCorreo(EJEMPLOS[tipo], imagenes);
      const archivo = path.join(dir, `invitacion-${tipo}.html`);
      await writeFile(archivo, html);
      console.log(`[invitar] ${archivo} · asunto: ${subject}`);
    }
    return;
  }

  const prueba = valor("--prueba");
  if (prueba) {
    for (const tipo of ["cliente", "profesional"] as const) {
      const { subject, html, text } = armarCorreo({ ...EJEMPLOS[tipo], email: prueba }, imagenesPublicadas());
      await sendMail({ to: prueba, subject: `[Prueba ${tipo}] ${subject}`, html, text, headers: HEADERS });
      console.log(`[invitar] prueba ${tipo} enviada a ${prueba}`);
    }
    return;
  }

  const registro = valor("--registro") ?? REGISTRO;
  const yaEnviados = new Set((await readFile(registro, "utf8").catch(() => "")).split("\n").map((l) => l.trim().toLowerCase()).filter(Boolean));
  const conCuenta = new Set((await prisma.user.findMany({ select: { email: true } })).map((u) => u.email.trim().toLowerCase()));
  const todos = await listPreinscriptions();
  const registrados = todos.filter((p) => conCuenta.has(p.email.toLowerCase()));
  const enviados = todos.filter((p) => !conCuenta.has(p.email.toLowerCase()) && yaEnviados.has(p.email.toLowerCase()));
  const pendientes = todos.filter((p) => !conCuenta.has(p.email.toLowerCase()) && !yaEnviados.has(p.email.toLowerCase()));
  const porTipo = (lista: Preinscription[], tipo: PreinscriptionType) => lista.filter((p) => p.type === tipo).length;

  console.log(`[invitar] ${todos.length} preinscriptos · ${registrados.length} ya tienen cuenta · ${enviados.length} ya recibieron la invitación`);
  console.log(`[invitar] ${pendientes.length} por invitar (${porTipo(pendientes, "cliente")} clientes, ${porTipo(pendientes, "profesional")} profesionales)`);

  if (!args.includes("--enviar")) {
    console.log("[invitar] No se mandó nada. Para mandar: --enviar (o --prueba=tu@correo para verlo antes).");
    return;
  }

  const limite = Number(valor("--limite") ?? LIMITE_POR_DEFECTO);
  const tanda = pendientes.slice(0, limite);
  const imagenes = imagenesPublicadas();
  let ok = 0;
  let fallaron = 0;
  for (const persona of tanda) {
    const { subject, html, text } = armarCorreo(persona, imagenes);
    try {
      await sendMail({ to: persona.email, subject, html, text, headers: HEADERS });
      await appendFile(registro, `${persona.email.toLowerCase()}\n`);
      ok++;
      console.log(`[invitar] ${ok}/${tanda.length} ${ocultar(persona.email)} (${persona.type})`);
    } catch (error) {
      fallaron++;
      console.error(`[invitar] falló ${ocultar(persona.email)}:`, error instanceof Error ? error.message : error);
    }
    await new Promise((r) => setTimeout(r, PAUSA_MS));
  }
  console.log(`[invitar] listo: ${ok} enviados, ${fallaron} fallaron, ${pendientes.length - tanda.length} quedan para otra tanda.`);
}

main()
  .catch((error) => {
    console.error("[invitar]", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit();
  });
