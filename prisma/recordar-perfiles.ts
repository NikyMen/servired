import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { appUrl, sendMail } from "../src/lib/mailer";
import { prisma } from "../src/lib/prisma";
import { telefonoLegible, validSupportPhone, waLink } from "../src/lib/whatsapp";

/**
 * Correo a quienes empezaron y no terminaron su perfil, para que vuelvan a
 * entrar. Cuatro casos, cada uno con su texto y su botón:
 *
 *   verificar → se registró y nunca puso el código de 6 dígitos (no tiene sesión).
 *   alta      → confirmó el correo pero le falta aceptar los términos o elegir localidad.
 *   cambios   → administración le pidió cambios en la verificación de Ofrezco.
 *   oferente  → se registró para ofrecer (tildó ofertas en relación de
 *               dependencia, que solo aparece en ese alta) y nunca mandó la verificación.
 *
 *   pnpm perfiles:recordar                         → cuenta a quiénes les llegaría, sin mandar nada
 *   pnpm perfiles:recordar --vista-previa          → escribe un correo por caso en output/recordatorio/
 *   pnpm perfiles:recordar --prueba=vos@mail.com   → manda los cuatro casos solo a esa casilla
 *   pnpm perfiles:recordar --enviar [--limite=250] [--grupo=verificar]
 *
 * - Las cuentas suspendidas no reciben nada, y a quien se registró hace menos
 *   de 2 horas tampoco (todavía puede estar con el código en la mano).
 * - Anota cada envío en `recordatorios-perfil.txt` (correo, caso y fecha) y no
 *   le repite el recordatorio a nadie antes de `--cada=7` días.
 * - Brevo gratis son 300 correos por día, y los códigos de verificación salen
 *   de la misma cuota: por eso el límite de 250.
 * - En el server hay que cargar los .env antes (tsx no los lee solo):
 *   `set -a; . ./.env; [ -f .env.local ] && . ./.env.local; set +a`
 */

const REGISTRO = "recordatorios-perfil.txt";
const LIMITE_POR_DEFECTO = 250;
const PAUSA_MS = 1200;
const RECIEN_MS = 2 * 60 * 60 * 1000;

const MARINO = "#13294b";
const AZUL = "#2563eb";
const VERDE = "#059669";
const TEXTO = "#334155";
const SUAVE = "#64748b";
const FUENTE = "'Segoe UI', Roboto, 'Helvetica Neue', Helvetica, Arial, sans-serif";

const GRUPOS = ["verificar", "alta", "cambios", "oferente"] as const;
type Grupo = (typeof GRUPOS)[number];

type Caso = { asunto: string; titulo: string; cuerpo: string[]; boton: string; ruta: string; color: string };

const CASOS: Record<Grupo, Caso> = {
  verificar: {
    asunto: "te falta un paso para activar tu cuenta de ServiRed",
    titulo: "Tu cuenta está casi lista",
    cuerpo: [
      "Empezaste a crear tu cuenta en ServiRed pero todavía no confirmaste tu correo.",
      "Entrá con tu correo y la contraseña que elegiste: te mandamos un código nuevo de 6 dígitos y en un minuto quedás adentro.",
    ],
    boton: "Terminar mi alta",
    ruta: "/entrar",
    color: AZUL,
  },
  alta: {
    asunto: "terminá de completar tu perfil en ServiRed",
    titulo: "Te falta muy poco",
    cuerpo: [
      "Tu cuenta de ServiRed ya está creada, pero todavía no terminaste el alta: falta aceptar los términos o elegir tu localidad.",
      "Entrá y completalo en un paso: así te mostramos los profesionales y trabajos que tenés cerca.",
    ],
    boton: "Completar mi perfil",
    ruta: "/entrar",
    color: AZUL,
  },
  cambios: {
    asunto: "tu perfil de ServiRed necesita unos cambios",
    titulo: "Revisá tu perfil para empezar a ofrecer",
    cuerpo: [
      "Revisamos tu verificación para ofrecer servicios en ServiRed y te pedimos algunos cambios.",
      "Entrá a tu panel de Ofrezco: ahí vas a ver qué hay que corregir. Apenas lo mandes de nuevo lo revisamos.",
    ],
    boton: "Ver qué falta",
    ruta: "/pro",
    color: VERDE,
  },
  oferente: {
    asunto: "terminá tu perfil y empezá a recibir clientes",
    titulo: "Tus clientes te están buscando",
    cuerpo: [
      "Te registraste en ServiRed para ofrecer tus servicios, pero todavía no terminaste tu perfil.",
      "Completá tus rubros y la verificación de identidad: cuando la aprobemos, aparecés en la portada y en el mapa y empezás a recibir solicitudes. Si querés, también podés marcar tu zona de trabajo.",
    ],
    boton: "Terminar mi perfil",
    ruta: "/pro",
    color: VERDE,
  },
};

type Persona = { email: string; name: string; grupo: Grupo };

function escapar(texto: string) {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** "maría josé PÉREZ" → "María": el primer nombre, bien escrito. */
function primerNombre(nombre: string) {
  const primero = nombre.trim().split(/\s+/)[0] ?? "";
  return primero ? primero.charAt(0).toLocaleUpperCase("es-AR") + primero.slice(1).toLocaleLowerCase("es-AR") : "";
}

function ocultar(email: string) {
  const [usuario, dominio] = email.split("@");
  return `${usuario.slice(0, 2)}${"*".repeat(Math.max(1, usuario.length - 2))}@${dominio}`;
}

export function armarRecordatorio(persona: Persona, logo: string) {
  const c = CASOS[persona.grupo];
  const nombre = primerNombre(persona.name);
  const url = `${appUrl()}${c.ruta}`;
  const sitio = appUrl().replace(/^https?:\/\//, "");
  const phone = validSupportPhone(process.env.SOPORTE_WHATSAPP ?? "");
  const wa = phone ? { href: waLink(phone, "Hola, estoy terminando mi perfil en ServiRed y tengo una consulta."), telefono: telefonoLegible(phone) } : null;
  const ayuda = wa
    ? `Respondé este correo o escribinos por <a href="${wa.href}" style="color:${c.color};font-weight:600;text-decoration:none;">WhatsApp al ${escapar(wa.telefono)}</a>.`
    : "Respondé este correo y te ayudamos.";
  const parrafos = c.cuerpo
    .map((p) => `<tr><td style="padding:0 0 14px 0;font-family:${FUENTE};font-size:16px;line-height:25px;color:${TEXTO};">${escapar(p)}</td></tr>`)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapar(c.titulo)}</title>
<style>
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  @media (max-width:620px) { .tarjeta { width:100% !important; } .lados { padding-left:24px !important; padding-right:24px !important; } .boton a { display:block !important; } }
</style>
</head>
<body style="margin:0;padding:0;background:#eef2f7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapar(c.cuerpo[0])}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eef2f7" style="background:#eef2f7;">
<tr><td align="center" style="padding:32px 12px;">
  <table role="presentation" class="tarjeta" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #dde4ee;border-radius:16px;overflow:hidden;">
    <tr><td style="font-size:0;line-height:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="62%" height="6" bgcolor="#1e63b0" style="height:6px;background:#1e63b0;">&nbsp;</td>
        <td width="38%" height="6" bgcolor="#3fa34d" style="height:6px;background:#3fa34d;">&nbsp;</td>
      </tr></table>
    </td></tr>
    <tr><td align="center" class="lados" style="padding:30px 48px 6px 48px;">
      <a href="${appUrl()}" target="_blank"><img src="${logo}" width="220" alt="ServiRed" style="display:block;width:220px;max-width:100%;height:auto;border:0;"></a>
    </td></tr>
    <tr><td class="lados" style="padding:18px 48px 30px 48px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding:0 0 20px 0;font-family:${FUENTE};font-size:26px;line-height:32px;font-weight:800;color:${MARINO};">${escapar(c.titulo)}</td></tr>
        <tr><td style="padding:0 0 14px 0;font-family:${FUENTE};font-size:16px;line-height:25px;color:${TEXTO};">${nombre ? `Hola <strong style="color:${MARINO};">${escapar(nombre)}</strong>:` : "Hola:"}</td></tr>
        ${parrafos}
        <tr><td align="center" class="boton" style="padding:10px 0 14px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td align="center" bgcolor="${c.color}" style="border-radius:10px;background:${c.color};">
              <a href="${url}" target="_blank" style="display:inline-block;padding:15px 34px;font-family:${FUENTE};font-size:16px;font-weight:700;line-height:20px;color:#ffffff;text-decoration:none;border-radius:10px;">${escapar(c.boton)} &rarr;</a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td align="center" style="font-family:${FUENTE};font-size:13px;line-height:20px;color:${SUAVE};">Entrá con este correo: <strong style="color:${MARINO};">${escapar(persona.email)}</strong></td></tr>
      </table>
    </td></tr>
    <tr><td class="lados" style="padding:0 48px;"><div style="height:1px;line-height:1px;font-size:0;background:#e2e8f0;">&nbsp;</div></td></tr>
    <tr><td class="lados" style="padding:20px 48px 28px 48px;font-family:${FUENTE};font-size:14px;line-height:22px;color:${TEXTO};">
      <strong style="color:${MARINO};">¿Tenés alguna duda?</strong> ${ayuda}<br>
      <span style="color:${SUAVE};">— El equipo de ServiRed</span>
    </td></tr>
  </table>
  <table role="presentation" class="tarjeta" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
    <tr><td align="center" style="padding:18px 36px 8px 36px;font-family:${FUENTE};font-size:11px;line-height:17px;color:#94a3b8;">
      Recibís este correo porque empezaste a crear tu cuenta en <a href="${appUrl()}" style="color:#94a3b8;">${escapar(sitio)}</a> con ${escapar(persona.email)}.<br>
      Si no querés recibir más recordatorios, respondé este correo con la palabra BAJA.
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    nombre ? `Hola ${nombre}:` : "Hola:",
    "",
    ...c.cuerpo.flatMap((p) => [p, ""]),
    `${c.boton}: ${url}`,
    `Entrá con este correo: ${persona.email}`,
    "",
    wa ? `¿Dudas? Respondé este correo o escribinos por WhatsApp al ${wa.telefono}.` : "¿Dudas? Respondé este correo y te ayudamos.",
    "",
    "El equipo de ServiRed",
    "",
    "--",
    `Recibís este correo porque empezaste a crear tu cuenta en ServiRed con ${persona.email}. Si no querés recibir más recordatorios, respondé con la palabra BAJA.`,
  ].join("\n");

  return { subject: nombre ? `${nombre}, ${c.asunto}` : c.asunto.charAt(0).toLocaleUpperCase("es-AR") + c.asunto.slice(1), html, text };
}

const HEADERS = { "List-Unsubscribe": "<mailto:consultas@servired.ar?subject=BAJA>" };

/** Quiénes están a medio camino, cada uno en un solo caso (el primero que aplica). */
async function pendientes(): Promise<Persona[]> {
  const usuarios = await prisma.user.findMany({
    where: { accountStatus: { not: "suspended" }, createdAt: { lt: new Date(Date.now() - RECIEN_MS) } },
    orderBy: { createdAt: "asc" },
    select: {
      email: true, name: true, emailVerifiedAt: true, termsVersion: true, localityId: true, ofertasDependencia: true,
      professional: { select: { profileStatus: true } },
    },
  });
  const personas: Persona[] = [];
  for (const u of usuarios) {
    const grupo: Grupo | null = !u.emailVerifiedAt
      ? "verificar"
      : u.termsVersion == null || !u.localityId
        ? "alta"
        : u.professional?.profileStatus === "changes_requested"
          ? "cambios"
          : !u.professional && u.ofertasDependencia
            ? "oferente"
            : null;
    if (grupo) personas.push({ email: u.email.trim().toLowerCase(), name: u.name, grupo });
  }
  return personas;
}

/** Último envío a cada correo, según el registro. */
async function ultimosEnvios(registro: string) {
  const ultimos = new Map<string, number>();
  for (const linea of (await readFile(registro, "utf8").catch(() => "")).split("\n")) {
    const [email, , fecha] = linea.trim().split("\t");
    const ms = Date.parse(fecha ?? "");
    if (email && Number.isFinite(ms)) ultimos.set(email.toLowerCase(), Math.max(ultimos.get(email.toLowerCase()) ?? 0, ms));
  }
  return ultimos;
}

const EJEMPLOS: Record<Grupo, Persona> = {
  verificar: { name: "María", email: "maria@ejemplo.com", grupo: "verificar" },
  alta: { name: "Lucía", email: "lucia@ejemplo.com", grupo: "alta" },
  cambios: { name: "Martín", email: "martin@ejemplo.com", grupo: "cambios" },
  oferente: { name: "Jorge", email: "jorge@ejemplo.com", grupo: "oferente" },
};

async function main() {
  const args = process.argv.slice(2);
  const valor = (flag: string) => args.find((a) => a.startsWith(`${flag}=`))?.slice(flag.length + 1);
  const logo = `${appUrl()}/email/servired-logo.png`;

  if (args.some((a) => a.startsWith("--vista-previa"))) {
    const dir = valor("--vista-previa") ?? path.join("output", "recordatorio");
    await mkdir(dir, { recursive: true });
    const logoEmbebido = `data:image/png;base64,${(await readFile(path.join("public", "email", "servired-logo.png"))).toString("base64")}`;
    for (const grupo of GRUPOS) {
      const { subject, html } = armarRecordatorio(EJEMPLOS[grupo], logoEmbebido);
      const archivo = path.join(dir, `recordatorio-${grupo}.html`);
      await writeFile(archivo, html);
      console.log(`[recordar] ${archivo} · asunto: ${subject}`);
    }
    return;
  }

  const prueba = valor("--prueba");
  if (prueba) {
    for (const grupo of GRUPOS) {
      const { subject, html, text } = armarRecordatorio({ ...EJEMPLOS[grupo], email: prueba }, logo);
      await sendMail({ to: prueba, subject: `[Prueba ${grupo}] ${subject}`, html, text, headers: HEADERS });
      console.log(`[recordar] prueba ${grupo} enviada a ${prueba}`);
    }
    return;
  }

  const grupoPedido = valor("--grupo");
  if (grupoPedido && !(GRUPOS as readonly string[]).includes(grupoPedido)) throw new Error(`--grupo tiene que ser uno de: ${GRUPOS.join(", ")}`);
  const registro = valor("--registro") ?? REGISTRO;
  const cadaDias = Number(valor("--cada") ?? 7);
  const limite = Number(valor("--limite") ?? LIMITE_POR_DEFECTO);
  const ultimos = await ultimosEnvios(registro);
  const corte = Date.now() - cadaDias * 24 * 60 * 60 * 1000;

  const todos = (await pendientes()).filter((p) => !grupoPedido || p.grupo === grupoPedido);
  const aMandar = todos.filter((p) => (ultimos.get(p.email) ?? 0) < corte);

  console.log(`[recordar] ${todos.length} con el perfil sin terminar · ${todos.length - aMandar.length} ya recibieron uno hace menos de ${cadaDias} días · ${aMandar.length} por mandar`);
  for (const grupo of GRUPOS) {
    const delGrupo = aMandar.filter((p) => p.grupo === grupo);
    if (delGrupo.length) console.log(`  ${grupo.padEnd(9)} ${delGrupo.length}: ${delGrupo.slice(0, 8).map((p) => ocultar(p.email)).join(", ")}${delGrupo.length > 8 ? ", …" : ""}`);
  }

  if (!args.includes("--enviar")) {
    console.log("[recordar] No se mandó nada. Para mandar: --enviar (probá antes con --prueba=tu@correo).");
    return;
  }

  let enviados = 0;
  let fallidos = 0;
  for (const persona of aMandar.slice(0, limite)) {
    try {
      const { subject, html, text } = armarRecordatorio(persona, logo);
      await sendMail({ to: persona.email, subject, html, text, headers: HEADERS });
      await appendFile(registro, `${persona.email}\t${persona.grupo}\t${new Date().toISOString()}\n`);
      enviados++;
      console.log(`[recordar] ${enviados}. ${ocultar(persona.email)} (${persona.grupo})`);
    } catch (error) {
      fallidos++;
      console.error(`[recordar] falló ${ocultar(persona.email)}:`, error instanceof Error ? error.message : error);
    }
    await new Promise((r) => setTimeout(r, PAUSA_MS));
  }
  console.log(`[recordar] Listo: ${enviados} enviados, ${fallidos} fallidos${aMandar.length > limite ? `, ${aMandar.length - limite} quedan para otra corrida` : ""}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
