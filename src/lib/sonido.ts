/**
 * El "tin" de mensaje nuevo.
 *
 * Se sintetiza con WebAudio en vez de reproducir un mp3: son dos notas, no
 * justifica un archivo que haya que servir, versionar y esperar a que cargue
 * antes del primer aviso.
 */

const PREFERENCIA = "servired:sonido";

let ctx: AudioContext | null = null;

function contexto(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

/** ¿El usuario dejó el sonido prendido? Por defecto sí. */
export function sonidoActivo(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(PREFERENCIA) !== "off";
  } catch {
    // localStorage bloqueado (modo privado, cookies de terceros): que suene.
    return true;
  }
}

export function guardarSonido(activo: boolean) {
  try {
    window.localStorage.setItem(PREFERENCIA, activo ? "on" : "off");
  } catch {
    // Sin persistencia el usuario lo vuelve a apagar la próxima. No es grave.
  }
}

/**
 * Despierta el audio en el primer gesto del usuario.
 *
 * Los navegadores dejan el AudioContext suspendido hasta que alguien toca algo:
 * si no lo reanudamos ahí, el primer mensaje que llegue no suena.
 */
export function habilitarSonido() {
  const c = contexto();
  if (c && c.state === "suspended") void c.resume().catch(() => {});
}

/** Dos notas cortas, ascendentes. Suena a aviso, no a alarma. */
export function sonarNotificacion() {
  if (!sonidoActivo()) return;
  const c = contexto();
  if (!c) return;
  if (c.state === "suspended") void c.resume().catch(() => {});

  const ahora = c.currentTime;
  tono(c, 880, ahora, 0.12);
  tono(c, 1318, ahora + 0.1, 0.18);
}

function tono(c: AudioContext, hz: number, desde: number, dura: number) {
  const osc = c.createOscillator();
  const vol = c.createGain();

  osc.type = "sine";
  osc.frequency.value = hz;

  // La rampa no es adorno: un seno que arranca y corta de golpe hace "click".
  vol.gain.setValueAtTime(0.0001, desde);
  vol.gain.exponentialRampToValueAtTime(0.16, desde + 0.015);
  vol.gain.exponentialRampToValueAtTime(0.0001, desde + dura);

  osc.connect(vol).connect(c.destination);
  osc.start(desde);
  osc.stop(desde + dura + 0.02);
}
