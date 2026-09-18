# TASKS: Avisos por correo

**SPEC:** [SPEC.md](SPEC.md) (Aprobada) · **PLAN:** [PLAN.md](PLAN.md) (Aprobado)
**Autorización para implementar:** autorización general del usuario del 2026-09-18 ("sin parar hasta el último").

Leyenda: `[ ]` pendiente · `[x]` hecha y validada · `[!]` bloqueada (con motivo) · `[~]` hecha, con una parte que valida el usuario.

## Tareas

- [x] **T1 · Base de los avisos por correo**
  - Objetivo: preferencias, sellos, envío seguro con baja y reglas puras.
  - Alcance: esquema; `mailer.ts` (`headers`); `src/lib/avisos-correo.ts`; tests.
  - Depende de: —
  - Resuelve: RF-02, RF-06, RF-07 · CA-02, CA-08 (lógica)
  - Validación: `db:push`; `pnpm test`.

- [x] **T2 · Envíos en el momento**
  - Objetivo: mails de presupuesto recibido/resuelto y de solicitud nueva del rubro.
  - Alcance: `api/contrataciones/[id]`, `api/conversaciones/[id]/acuerdo`, `api/solicitudes`.
  - Depende de: T1
  - Resuelve: RF-03, RF-04, RF-05 · CA-04, CA-05, CA-06, CA-09
  - Validación: log del mailer en dev; `next start` sin SMTP para CA-09.

- [x] **T3 · Barrido de mensajes sin contestar**
  - Objetivo: recordatorio a las 12 h, uno por tanda, aunque nadie navegue.
  - Alcance: `barrerMensajesSinContestar`, `POST /api/cron/avisos`, README y `.env.example`.
  - Depende de: T1
  - Resuelve: RF-01, RF-02, RF-07, RF-08 · CA-01, CA-02, CA-03, CA-08
  - Validación: conversaciones armadas por script y corridas del barrido.

- [x] **T4 · Baja y preferencias**
  - Objetivo: dejar de recibir un tipo desde el mail o desde el perfil.
  - Alcance: `/avisos-correo` + acción, `POST /api/avisos/correo-baja`, `AvisosCorreo.tsx` + acción, los dos perfiles.
  - Depende de: T1
  - Resuelve: RF-06 · CA-07
  - Validación: GET no da de baja; confirmar sí; firma mala 400; interruptores.

- [x] **T5 · Cierre**
  - Objetivo: build, regresiones y limpieza.
  - Alcance: `pnpm test`, `tsc`, `pnpm build`; datos de prueba borrados.
  - Depende de: T1–T4
  - Resuelve: regresiones
  - Validación: salida registrada abajo.

## Evidencia

<!-- Resultados reales de cada validación: comando o pasos, resultado observado y fecha. -->

Todo en local el 2026-09-18, con copia de `dev.db` guardada antes del `db push`.
Sin SMTP: en `next dev` el mailer escribe `[mailer] destinatario: aviso … · destino · baja: …`
en el log, que es lo que se usó como evidencia de qué sale y a quién. Cuentas de
prueba `tmp-g5-*` (cliente; plomero aprobado; plomero pendiente; electricista;
cuenta suspendida; cuenta sin verificar) creadas por script y borradas al final;
`CRON_SECRET` de prueba en un `.env.development.local` temporal, borrado.

| Tarea / criterio | Qué se hizo | Resultado observado |
| --- | --- | --- |
| T1 | `db push`; `corepack pnpm test` con `debeAvisarMensaje`, la firma de baja y `puedeRecibir`. | Sin pérdida; 19/19. |
| T2 · CA-05, CA-06 | Por la API: el plomero presupuesta, el cliente rechaza, presupuesta otra vez y el cliente acepta. | 4 mails: al cliente "plomero te mandó un presupuesto" (×2, a `/contrataciones`), al plomero "Rechazaron tu presupuesto" y "¡Aceptaron tu presupuesto!" (a `/pro`). |
| T2 · CA-04 | El cliente publica una solicitud de Plomería. | Mail a los dos plomeros aprobados (el de prueba y `carlos@servired.test`); **ninguno** al plomero pendiente ni al electricista. |
| T2 · CA-09 | `next start` sin `SMTP_HOST` (en producción el mailer tira error); el plomero presupuesta. | 201 y la propuesta guardada; en el log, `[avisos-correo] propuestas … El envío de correo no está configurado.` |
| T3 · CA-01 | `POST /api/cron/avisos` con la clave: mensaje del cliente de hace 13 h sin leer. | Mail al plomero "Tenés mensajes sin contestar de cliente" con enlace a `/pro/mensajes?conversacion=…`. También salió uno real de la demo: Carlos tenía sin leer un mensaje de Martín dentro de la ventana (correcto; su sello se volvió a null al limpiar). |
| T3 · CA-02 | Dos corridas más; después, lectura posterior al mail y un mensaje nuevo de hace 14 h; dos corridas. | 2 → 0 → 0; con la tanda nueva, 1 → 0. |
| T3 · CA-03 | Conversación con un mensaje de hace 2 h. | Ningún mail. |
| T3 · CA-08 | El pro les escribió hace 13 h a una cuenta suspendida y a una sin verificar. | Ningún mail a ninguna de las dos. |
| T3 · seguridad | Sin clave y con clave equivocada. | 401 "No autorizado." (sin `CRON_SECRET` la ruta responde 503). |
| T4 · CA-07 | GET del enlace del mail; confirmar en la UI; firma adulterada; `POST` de un clic con firma mala, GET y firma buena; nueva solicitud; interruptores del perfil. | El GET muestra "¿Dejar de recibir estos avisos?" y **no** cambia nada; al confirmar, "Listo…" y `mailSolicitudes = false`. Firma adulterada: "El enlace no es válido". Un clic: firma mala 400, GET 405, buena 200 → `mailPropuestas = false`. La solicitud siguiente ya no le llega a ese plomero pero sí a Carlos. En `/mi-perfil`, cambiar dos interruptores y guardar: "Guardado." y la base queda igual a lo que se ve. |
| T5 | `tsc --noEmit`, `corepack pnpm test`, `rm -rf .next && corepack pnpm build`; logs de `next start`. | Sin errores; 19/19; build completo. En el dev apareció una vez `SyntaxError: Unexpected end of JSON input` en `/`, sin `JSON.parse` propio en esa ruta y sin repetirse en `next start`: se atribuye a las recompilaciones del dev (ver nota del grupo 4). |

**Pendiente fuera de este entorno:** entrega real con el SMTP de producción (y
SPF/DKIM), y el crontab del VPS con `CRON_SECRET`.
