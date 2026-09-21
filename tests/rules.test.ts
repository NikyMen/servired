import assert from "node:assert/strict";
import test from "node:test";
import { createVideoChallenge, cuilMatchesDni, parsePaymentHandle, validCuil, validCvu, validDni, validPhone, verifyVideoChallenge } from "../src/lib/kyc";
import { ACTIVE_JOB_STATUSES, PROPOSAL_TTL_MS, proposalIsActive } from "../src/lib/workflow";
import { canRevealPaymentDetails } from "../src/lib/payments";
import { MAX_REPUBLISH, REQUEST_TTL_MS, requestDaysLeft, requestIsLastDay } from "../src/lib/solicitudes";
import { PROPOSAL_TTL_LABEL, jobProgress, validEstimatedDays } from "../src/lib/trabajo";
import { parseTexto } from "../src/lib/site-text";
import { AYUDA_DEFAULT, saludoPerfil, validSupportPhone, waLink } from "../src/lib/whatsapp";
import { CAPITAL, LOCALIDADES_BASE, validarLocalidad, validarPunto, zonaDe } from "../src/lib/localidades";
import { pendienteDeAlta } from "../src/lib/auth";
import { PLAZO_MENSAJES_MS, debeAvisarMensaje, firmaBaja, firmaValida, puedeRecibir } from "../src/lib/avisos-correo";
import { validarCredencial } from "../src/lib/matriculas";
import { formatoPorContenido } from "../src/lib/kyc";
import { RADIO_KM, agruparPuntos, formatoDistancia, haversineKm, leerPuntoCookie, puntoDePro, valorCookieUbicacion } from "../src/lib/geo";
import { rankProfessionals } from "../src/lib/search";
import { crearFreno, ipCliente } from "../src/lib/intentos";
import { ENCUADRE_NEUTRO, LADO_PLACA, PLACAS, SLOTS, SLOTS_VIEJOS, esSlotDePlaca, necesitaReencuadre, nombreDeSlot, placaDeSlot } from "../src/lib/publicidad";

test("valida CUIL por formato y dígito verificador", () => {
  assert.equal(validCuil("20-12345678-6"), true);
  assert.equal(validCuil("20-12345678-5"), false);
  assert.equal(validDni("12345678"), true);
  assert.equal(validDni("123"), false);
  assert.equal(cuilMatchesDni("20-12345678-6", "12345678"), true);
  assert.equal(cuilMatchesDni("20-12345678-6", "87654321"), false);
});

test("valida teléfono y CVU con sus dígitos verificadores", () => {
  assert.equal(validPhone("+54 9 379 412-3456"), true);
  assert.equal(validPhone("123"), false);
  assert.equal(validCvu("2850590940090418135201"), true);
  assert.equal(validCvu("2850590940090418135202"), false);
});

test("un solo campo de cobro distingue CVU de alias", () => {
  assert.deepEqual(parsePaymentHandle("2850590940090418135201"), { handle: "2850590940090418135201", kind: "cvu" });
  assert.deepEqual(parsePaymentHandle(" 2850-5909-4009-0418-1352-01 "), { handle: "2850590940090418135201", kind: "cvu" });
  assert.deepEqual(parsePaymentHandle("juan.perez.mp"), { handle: "juan.perez.mp", kind: "alias" });
  // Un CVU con el verificador cambiado no se degrada a alias: es un error de tipeo.
  assert.equal(parsePaymentHandle("2850590940090418135202"), null);
  assert.equal(parsePaymentHandle("12345678"), null);
  assert.equal(parsePaymentHandle("corto"), null);
  assert.equal(parsePaymentHandle(""), null);
});

test("el desafío de video está firmado y vinculado al usuario", () => {
  const issued = createVideoChallenge("user-1");
  assert.equal(verifyVideoChallenge("user-1", issued.challenge, issued.token), true);
  assert.equal(verifyVideoChallenge("user-2", issued.challenge, issued.token), false);
  assert.equal(verifyVideoChallenge("user-1", `${issued.challenge}0`, issued.token), false);
  assert.equal(verifyVideoChallenge("user-1", issued.challenge, `${issued.token}x`), false);
});

test("el desafío es una frase legible, sin dígitos", () => {
  for (let intento = 0; intento < 50; intento += 1) {
    const { challenge } = createVideoChallenge("user-1");
    assert.match(challenge, /^Hola ServiRed, /);
    assert.equal(/\d/.test(challenge), false);
    assert.ok(challenge.split(" ").length >= 8);
  }
});

test("una propuesta solo está activa si está pendiente y no venció", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  assert.equal(PROPOSAL_TTL_MS, 5 * 24 * 60 * 60 * 1000);
  assert.equal(PROPOSAL_TTL_LABEL, "5 días");
  assert.equal(proposalIsActive({ status: "pending", expiresAt: new Date("2026-01-01T00:00:01Z") }, now), true);
  assert.equal(proposalIsActive({ status: "pending", expiresAt: now }, now), false);
  assert.equal(proposalIsActive({ status: "rejected", expiresAt: new Date("2026-01-02T00:00:00Z") }, now), false);
});

test("los trabajos activos incluyen todo lo que todavía no se cobró y calificó", () => {
  assert.deepEqual(ACTIVE_JOB_STATUSES, ["in_progress", "finished", "payment_reported", "paid_awaiting_review"]);
});

test("los datos de cobro se revelan recién al terminar", () => {
  assert.equal(canRevealPaymentDetails("requested"), false);
  assert.equal(canRevealPaymentDetails("in_progress"), false);
  for (const status of ["finished", "payment_reported", "paid_awaiting_review", "completed"]) {
    assert.equal(canRevealPaymentDetails(status), true);
  }
});

test("una solicitud vive 7 días y avisa el último", () => {
  const ahora = new Date("2026-01-08T12:00:00Z");
  assert.equal(REQUEST_TTL_MS, 7 * 24 * 60 * 60 * 1000);
  assert.equal(MAX_REPUBLISH, 5);
  assert.equal(requestDaysLeft(new Date("2026-01-15T12:00:00Z"), ahora), 7);
  assert.equal(requestDaysLeft(new Date("2026-01-09T11:00:00Z"), ahora), 1);
  // Vencida no devuelve negativos: cero es cero.
  assert.equal(requestDaysLeft(new Date("2026-01-01T12:00:00Z"), ahora), 0);
  assert.equal(requestIsLastDay(new Date("2026-01-09T11:00:00Z"), ahora), true);
  assert.equal(requestIsLastDay(new Date("2026-01-10T12:00:00Z"), ahora), false);
});

test("el plazo del trabajo se cuenta en días enteros y se pasa a rojo al vencer", () => {
  const inicio = new Date("2026-03-01T09:00:00Z");
  const fin = new Date("2026-03-08T09:00:00Z");

  // Recién aceptado ya es el día 1 de 7, no el cero.
  const arranque = jobProgress(inicio, fin, new Date("2026-03-01T10:00:00Z"));
  assert.equal(arranque.totalDays, 7);
  assert.equal(arranque.elapsedDays, 1);
  assert.equal(arranque.remainingDays, 7);
  assert.equal(arranque.overdue, false);

  const mitad = jobProgress(inicio, fin, new Date("2026-03-04T09:00:00Z"));
  assert.equal(mitad.elapsedDays, 3);
  assert.equal(mitad.percent, 43);

  const tarde = jobProgress(inicio, fin, new Date("2026-03-11T09:00:00Z"));
  assert.equal(tarde.overdue, true);
  assert.equal(tarde.percent, 100);
  assert.equal(tarde.remainingDays, 0);

  // Un plazo de un día no divide por cero.
  const cortito = jobProgress(inicio, new Date("2026-03-02T09:00:00Z"), new Date("2026-03-01T21:00:00Z"));
  assert.equal(cortito.totalDays, 1);
  assert.equal(cortito.elapsedDays, 1);

  assert.equal(validEstimatedDays("5"), 5);
  assert.equal(validEstimatedDays(0), null);
  assert.equal(validEstimatedDays(400), null);
  assert.equal(validEstimatedDays("varios"), null);
});

test("el texto legal se lee con subtítulos, listas y párrafos", () => {
  const bloques = parseTexto("Primer párrafo\nen dos renglones.\n\n## Un título\n- uno\n- dos\n\nCierre.");
  assert.deepEqual(bloques, [
    { tipo: "parrafo", texto: "Primer párrafo en dos renglones." },
    { tipo: "titulo", texto: "Un título" },
    { tipo: "lista", items: ["uno", "dos"] },
    { tipo: "parrafo", texto: "Cierre." },
  ]);
  assert.deepEqual(parseTexto("   \n\n  "), []);
});

test("los enlaces de WhatsApp llevan país, número limpio y el texto codificado", () => {
  // Las placas guardan 10 dígitos locales: tiene que salir igual que antes.
  assert.equal(waLink("3794123456", "Hola, vi tu aviso"), "https://wa.me/5493794123456?text=Hola%2C%20vi%20tu%20aviso");
  assert.equal(waLink("3794123456"), "https://wa.me/5493794123456");
  // Perfiles: formato libre, con 0 de larga distancia o ya con el 54.
  assert.equal(waLink("(0379) 412-3456"), "https://wa.me/5493794123456");
  assert.equal(waLink("+54 9 379 412 3456"), "https://wa.me/5493794123456");
  assert.equal(
    waLink("3794123456", saludoPerfil("Martín")),
    "https://wa.me/5493794123456?text=" + encodeURIComponent("Hola Martín, te encontré en ServiRed y quería consultarte por un trabajo."),
  );
  assert.equal(AYUDA_DEFAULT, "Hola, necesito ayuda con ServiRed.");
});

test("el número de soporte son 10 dígitos sin 0 ni 15 adelante", () => {
  assert.equal(validSupportPhone("3794123456"), "3794123456");
  assert.equal(validSupportPhone("379 412-3456"), "3794123456");
  assert.equal(validSupportPhone("12345678"), null);
  assert.equal(validSupportPhone("03794123456"), null);
  assert.equal(validSupportPhone("0379412345"), null);
  assert.equal(validSupportPhone("1541234567"), null);
  assert.equal(validSupportPhone("37941234567"), null);
  assert.equal(validSupportPhone("abc"), null);
});

test("la lista base de localidades arranca por Capital, sin repetidos y con puntos en la zona", () => {
  assert.deepEqual({ name: LOCALIDADES_BASE[0].name, province: LOCALIDADES_BASE[0].province }, CAPITAL);
  const claves = LOCALIDADES_BASE.map((l) => `${l.name}|${l.province}`);
  assert.equal(new Set(claves).size, claves.length);
  // Corrientes y el Gran Resistencia caen entre estos límites.
  for (const l of LOCALIDADES_BASE) {
    assert.ok(l.latitude < -27 && l.latitude > -30.5, l.name);
    assert.ok(l.longitude < -55.9 && l.longitude > -59.7, l.name);
  }
  assert.equal(zonaDe(CAPITAL), "Corrientes Capital, Corrientes");
});

test("una localidad nueva necesita nombre, provincia y un punto en Argentina", () => {
  assert.deepEqual(validarLocalidad({ name: "  Goya  Norte ", province: "Corrientes", latitude: -29.1, longitude: -59.2 }), { data: { name: "Goya Norte", province: "Corrientes", latitude: -29.1, longitude: -59.2 } });
  assert.ok("error" in validarLocalidad({ name: "G", province: "Corrientes", latitude: -29.1, longitude: -59.2 }));
  assert.ok("error" in validarLocalidad({ name: "Goya", province: "", latitude: -29.1, longitude: -59.2 }));
  assert.ok("error" in validarPunto(40.4, -3.7));
  assert.ok("error" in validarPunto(Number.NaN, -58.8));
  assert.ok("data" in validarPunto(-27.46, -58.83));
});

test("una cuenta está al día con los términos vigentes aceptados y una localidad", () => {
  assert.equal(pendienteDeAlta({ termsOk: true, localityId: "loc" }), null);
  assert.equal(pendienteDeAlta({ termsOk: false, localityId: "loc" }), "Aceptá los términos actualizados para seguir.");
  assert.equal(pendienteDeAlta({ termsOk: true, localityId: null }), "Elegí tu localidad para seguir.");
  // Los términos van primero: son los que la pantalla de aceptación muestra arriba.
  assert.equal(pendienteDeAlta({ termsOk: false, localityId: null }), "Aceptá los términos actualizados para seguir.");
});

test("el mail de mensajes sin contestar sale una vez por tanda sin leer", () => {
  const now = new Date("2026-03-10T12:00:00Z");
  const hace = (horas: number) => new Date(now.getTime() - horas * 3600 * 1000);
  assert.equal(PLAZO_MENSAJES_MS, 12 * 3600 * 1000);
  // Nada sin leer, o sin leer desde hace poco: no.
  assert.equal(debeAvisarMensaje({ primerNoLeido: null, leido: null, avisado: null, now }), false);
  assert.equal(debeAvisarMensaje({ primerNoLeido: hace(2), leido: null, avisado: null, now }), false);
  // Más de 12 h sin leer y sin aviso previo: sí.
  assert.equal(debeAvisarMensaje({ primerNoLeido: hace(13), leido: null, avisado: null, now }), true);
  // Ya avisado y no lo leyó: no se repite.
  assert.equal(debeAvisarMensaje({ primerNoLeido: hace(30), leido: null, avisado: hace(10), now }), false);
  assert.equal(debeAvisarMensaje({ primerNoLeido: hace(30), leido: hace(40), avisado: hace(10), now }), false);
  // Lo leyó después del aviso y le volvieron a escribir hace más de 12 h: sale otro.
  assert.equal(debeAvisarMensaje({ primerNoLeido: hace(14), leido: hace(20), avisado: hace(30), now }), true);
  // Charlas de más de 7 días: no.
  assert.equal(debeAvisarMensaje({ primerNoLeido: hace(24 * 8), leido: null, avisado: null, now }), false);
});

test("el enlace de baja solo sirve para esa cuenta y ese tipo", () => {
  const firma = firmaBaja("u1", "solicitudes");
  assert.equal(firmaValida("u1", "solicitudes", firma), true);
  assert.equal(firmaValida("u2", "solicitudes", firma), false);
  assert.equal(firmaValida("u1", "mensajes", firma), false);
  assert.equal(firmaValida("u1", "otro", firma), false);
  assert.equal(firmaValida("u1", "solicitudes", "abc"), false);
});

test("solo reciben avisos las cuentas aprobadas con email verificado y real", () => {
  const base = { accountStatus: "approved", emailVerifiedAt: new Date(), email: "ana@mail.com" };
  assert.equal(puedeRecibir(base), true);
  assert.equal(puedeRecibir({ ...base, accountStatus: "suspended" }), false);
  assert.equal(puedeRecibir({ ...base, emailVerifiedAt: null }), false);
  assert.equal(puedeRecibir({ ...base, email: "facebook-1@pending.servired.invalid" }), false);
});

test("una matrícula pide el tipo y deja rubro, número y emisor opcionales", () => {
  assert.deepEqual(validarCredencial({ kind: "matricula" }, []), { data: { kind: "matricula", categoryId: null, number: null, issuer: null } });
  assert.deepEqual(validarCredencial({ kind: "certificado", categoryId: "plo", number: " 123 ", issuer: "Colegio" }, ["plo"]), { data: { kind: "certificado", categoryId: "plo", number: "123", issuer: "Colegio" } });
  assert.ok("error" in validarCredencial({ kind: "diploma" }, []));
  assert.ok("error" in validarCredencial({ kind: "matricula", categoryId: "ajeno" }, ["plo"]));
  assert.ok("error" in validarCredencial({ kind: "matricula", number: "x".repeat(61) }, []));
});

test("un PDF se reconoce por su contenido, no por el nombre", () => {
  assert.equal(formatoPorContenido("application/pdf", Buffer.from("%PDF-1.7 prueba")), "document");
  assert.equal(formatoPorContenido("application/pdf", Buffer.from("MZ ejecutable")), null);
  assert.equal(formatoPorContenido("image/png", Buffer.from([0x89, 0x50, 0x4e, 0x47])), "image");
});

test("las distancias entre localidades dan lo que dan en el mapa", () => {
  const capital = { lat: -27.4692, lng: -58.8306 };
  const resistencia = { lat: -27.4514, lng: -58.9867 };
  const goya = { lat: -29.1439, lng: -59.2651 };
  const aResistencia = haversineKm(capital, resistencia);
  assert.ok(aResistencia > 14 && aResistencia < 17, String(aResistencia));
  assert.ok(haversineKm(capital, goya) > 150);
  assert.equal(haversineKm(capital, capital), 0);
  assert.equal(RADIO_KM, 10);
});

test("la distancia se muestra corta y en castellano", () => {
  assert.equal(formatoDistancia(0.4), "a menos de 1 km");
  assert.equal(formatoDistancia(3.24), "3,2 km");
  assert.equal(formatoDistancia(15.6), "16 km");
});

test("la cookie de ubicación se lee redondeada y solo si cae en Argentina", () => {
  const valor = valorCookieUbicacion({ lat: -27.46921, lng: -58.83061 });
  assert.equal(valor, "-27.469|-58.831");
  assert.deepEqual(leerPuntoCookie(valor), { lat: -27.469, lng: -58.831 });
  assert.deepEqual(leerPuntoCookie(encodeURIComponent(valor)), { lat: -27.469, lng: -58.831 });
  assert.equal(leerPuntoCookie("40.4|-3.7"), null);
  assert.equal(leerPuntoCookie("hola"), null);
  assert.equal(leerPuntoCookie(undefined), null);
});

test("un profesional sin punto propio se ubica en su localidad, y si no tiene, en el respaldo", () => {
  const localidad = { lat: -29.14, lng: -59.26 };
  const respaldo = { lat: -27.47, lng: -58.83 };
  assert.deepEqual(puntoDePro({ latitude: -27.5, longitude: -58.8 }, localidad, respaldo), { lat: -27.5, lng: -58.8 });
  assert.deepEqual(puntoDePro({ latitude: null, longitude: null }, localidad, respaldo), localidad);
  assert.deepEqual(puntoDePro({ latitude: null, longitude: null }, null, respaldo), respaldo);
});

test("los pines cercanos se agrupan de lejos y se separan al acercarse", () => {
  const puntos = [{ lat: -27.469, lng: -58.83 }, { lat: -27.47, lng: -58.831 }, { lat: -29.14, lng: -59.26 }];
  assert.equal(agruparPuntos(puntos, 8).length, 2);
  assert.equal(agruparPuntos(puntos, 18).length, 3);
  const grupo = agruparPuntos(puntos, 8).find((g) => g.items.length === 2)!;
  assert.ok(Math.abs(grupo.lat - -27.4695) < 1e-9);
});

test("a igual relevancia va primero el más cerca", () => {
  const base = { headline: "Plomero", bio: null, zone: "", category: { slug: "plomeria", name: "Plomería" }, categories: [], services: [], verified: false, featured: false, rating: 4 };
  const lejos = { ...base, id: "lejos", name: "Ana", distanciaKm: 12 };
  const cerca = { ...base, id: "cerca", name: "Bea", distanciaKm: 2 };
  const orden = rankProfessionals([lejos, cerca], "", (a, b) => a.distanciaKm - b.distanciaKm).map((p) => p.id);
  assert.deepEqual(orden, ["cerca", "lejos"]);
});

test("las placas son todas iguales y lo único que cambia es el lugar", () => {
  assert.equal(LADO_PLACA, 800);
  assert.equal(placaDeSlot("portada-1")?.ubicacion, "portada");
  assert.equal(placaDeSlot("portada-9")?.ubicacion, "portada");
  assert.equal(placaDeSlot("bottom-4")?.ubicacion, "pie");
  // Los lugares viejos ya no existen: la portada es un solo grupo.
  assert.equal(placaDeSlot("left-1"), null);
  assert.equal(placaDeSlot("mobile-6"), null);
  assert.equal(placaDeSlot("ayuda"), null);
  assert.equal(esSlotDePlaca("cualquiera"), false);
  assert.equal(nombreDeSlot("portada-1"), "Portada 1");
  assert.equal(nombreDeSlot("bottom-2"), "Pie 2");
  assert.equal(nombreDeSlot("ayuda"), "ayuda");
  // La lista plana es exactamente la unión de los lugares, sin repetidos.
  const todos = Object.values(SLOTS).flat();
  assert.equal(PLACAS.length, todos.length);
  assert.equal(new Set(PLACAS.map((p) => p.slot)).size, PLACAS.length);
  assert.equal(SLOTS.portada.length, 9);
  assert.equal(SLOTS.pie.length, 4);
  assert.equal(PLACAS.length, 13);
  // Las 9 de portada son las mismas en el celular y en la compu: un solo grupo.
  assert.equal(new Set(PLACAS.map((p) => p.ubicacion)).size, 2);
  // Lo que rescata el script de mudanza no pisa ninguno de los lugares nuevos.
  assert.equal(SLOTS_VIEJOS.some((slot) => esSlotDePlaca(slot)), false);
  assert.equal(SLOTS_VIEJOS.length, 12);
});

test("una placa con el encuadre viejo queda marcada para re-encuadrar", () => {
  const base = { imageUrl: "/uploads/a.jpg", ...ENCUADRE_NEUTRO };
  assert.equal(necesitaReencuadre(base), false);
  assert.equal(necesitaReencuadre({ ...base, imageScale: 1.4 }), true);
  assert.equal(necesitaReencuadre({ ...base, imageStretchX: 2 }), true);
  assert.equal(necesitaReencuadre({ ...base, imageUrl: null, imageScale: 3 }), false);
});

test("el login se frena después de 5 fallos y se destraba solo", () => {
  const freno = crearFreno();
  const regla = { max: 5, ventanaMs: 15 * 60 * 1000 };
  const t0 = 1_000_000;
  for (let i = 0; i < 4; i++) freno.fallo("a", regla, t0);
  assert.equal(freno.frenado("a", regla, t0), null);
  freno.fallo("a", regla, t0);
  assert.equal(freno.frenado("a", regla, t0), 15);
  assert.equal(freno.frenado("otra", regla, t0), null);
  assert.equal(freno.frenado("a", regla, t0 + regla.ventanaMs + 1), null);
  freno.fallo("b", regla, t0);
  freno.limpiar("b");
  assert.equal(freno.frenado("b", regla, t0), null);
});

test("la IP sale de Traefik y no de lo que manda el cliente", () => {
  const h = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });
  assert.equal(ipCliente(h({ "x-real-ip": "1.1.1.1", "x-forwarded-for": "9.9.9.9, 1.1.1.1" })), "1.1.1.1");
  assert.equal(ipCliente(h({ "x-forwarded-for": "9.9.9.9, 2.2.2.2" })), "2.2.2.2");
  assert.equal(ipCliente(h({})), "local");
});

test("el teléfono de soporte se muestra como se escribe en Argentina", async () => {
  const { telefonoLegible } = await import("../src/lib/whatsapp");
  assert.equal(telefonoLegible("3794404086"), "+54 9 3794 40-4086");
});
