# TASKS: Presupuesto del chat pensado para el celular

**SPEC:** [SPEC.md](SPEC.md) (Aprobada) · **PLAN:** [PLAN.md](PLAN.md) (Aprobado)
**Autorización para implementar:** dada por el usuario el 2026-10-21 ("aprobar y seguir" hasta dejarlo en servired.consultoriadigital.io).
**Rama:** `presupuesto-chat` (no va a `main` hasta otra aprobación).

Leyenda: `[ ]` pendiente · `[x]` hecha y validada · `[~]` hecha, falta algo fuera del entorno · `[!]` bloqueada (con motivo).

## Tareas

- [x] **T1 · Esquema y lógica pura**
  - Alcance: `Message.proposalId`; `src/lib/presupuesto.ts`; `tests/presupuesto.test.ts`.
  - Resuelve: RF-01, RF-04, RF-05, RF-07, RF-11 · CA-05, CA-07
  - Validación: `pnpm test`.

- [x] **T2 · API**
  - Alcance: `proposalId` al crear los 💰; `propuestas` en el GET del acuerdo; aceptar/rechazar idempotentes; serializadores de mensajes.
  - Depende de: T1
  - Resuelve: RF-01, RF-10, RF-12 · CA-13
  - Validación: script con dos aceptaciones en paralelo.

- [x] **T3 · Pantalla del chat**
  - Alcance: tarjeta, franja, hoja de presupuesto, confirmaciones, **+**, panel controlado, `BookingActions` para el dedo, líneas del sistema.
  - Depende de: T2
  - Resuelve: RF-01 a RF-09, RF-11, RF-12 · CA-01 a CA-12, CA-14, CA-15
  - Validación: navegador a 375 px como cliente y oferente.

- [x] **T4 · Entorno de prueba en el código**
  - Alcance: middleware, franja "Entorno de prueba" + noindex, desvío de correo, `anonimizar-prueba.ts`, `vincular-presupuestos.ts`.
  - Resuelve: RF-13, RF-14, RF-16 · CA-16, CA-17, CA-19
  - Validación: tests del desvío; correr los scripts sobre una copia local.

- [x] **T5 · Verificación local y commit**
  - Alcance: `tsc`, `pnpm test`, `pnpm build`; commit y push de `presupuesto-chat`.

- [~] **T6 · Prueba en el VPS** (falta la clave propia y, si se quiere, Mercado Pago de prueba: ver abajo)
  - Alcance: clon, `.env`, base anonimizada, pm2 :3656, router de Traefik con clave, monitoreo.
  - Depende de: T5
  - Resuelve: RF-13 a RF-16 · CA-16 a CA-19
  - Validación: `curl` a los dominios y a :3656; log del webhook en producción.

## Pedidos sueltos sumados a la rama (21/10/2026)

Los pidió el usuario en medio de la tanda; van en la misma rama y salen juntos a la prueba.

- [x] **P1 · Términos con casilla obligatoria en el alta de oferente.** En el
  último paso, "Al enviar seguís aceptando…" pasó a ser una casilla que hay que
  tildar; sin tildarla el botón dice "Aceptá los términos para enviar" y está
  apagado. El servidor también lo exige (`aceptaTerminos`), 422 si falta.
  Evidencia: `POST /api/onboarding` sin la casilla → `{"error":"Para enviar tenés que aceptar los términos y condiciones."}`.
- [x] **P2 · "Muestra" del perfil público.** Cada trabajo es una tarjeta con
  foto de portada y cantidad de fotos (antes: 5 columnitas con un "Denunciar"
  encima de cada una). Tocarla abre un visor a pantalla completa: flechas,
  deslizar, teclado, miniaturas, descripción y "Denunciar" por foto.
  Evidencia (375 px): tarjetas de igual alto (242 px), visor "Foto 2 de 5",
  5 miniaturas, "Denunciar" dentro de la foto, cerrar de 44 px, Escape cierra.

## Evidencia

- **T1:** `pnpm test` → 63/63 (9 nuevos en `tests/presupuesto.test.ts` + desvío de correo).
- **T2 · CA-13:** dos `accept_proposal` en paralelo → 200 y 409; un solo mensaje ✅ y una sola notificación nueva.
- **T3 (local, 375 px, como oferente y como cliente):**
  - CA-08: el **+** (44 px) muestra "Enviar presupuesto · Ya hay uno esperando respuesta" apagado con uno pendiente; el cliente ve solo el clip. Campo de texto: 262 px de ancho.
  - CA-09: "150000" → "150.000"; botón "Enviar presupuesto · $150.000"; vista previa igual a la tarjeta; chips de días de 44 px. El borrador vuelve al cerrar y abrir.
  - CA-01/02/03: la tarjeta aparece *Pendiente* al instante, con el detalle "Cartucho · flexibles · mano de obra" entero; botones solo para el cliente (44 px).
  - CA-04: confirmación con $150.000, 2 días y la fecha de fin; "Volver" no cambia nada.
  - CA-05/07/11/14: al rechazar, la tarjeta pasa a *Rechazado* con el monto tachado, el encabezado dice "Presupuesto rechazado", la franja "Rechazaste el presupuesto" y el ❌ va centrado. Con trabajo en curso, la franja muestra "Día 1 de 1" con barra; el oferente sin MP ve "Vincular MP" y va a su perfil.
  - Un 403 del servidor (términos sin aceptar en la base local) se muestra dentro de la confirmación y la tarjeta no cambia.
- **T4:** el anonimizador se niega sin `ENTORNO_PRUEBA=1`; `vincular-presupuestos.ts` es idempotente (local: 0 de 1, ese mensaje ya no tiene presupuesto en la base y queda con la tarjeta vieja).
- **T5:** `tsc` limpio, `pnpm build` OK.
- No verificado visualmente: el panel del navegador no pinta bien las animaciones (capturas con transparencias raras); las medidas salen del DOM.
- **T6 (VPS, 21/10/2026):**
  - `/var/www/servired-prueba` (rama `presupuesto-chat`, `8ca3b64`), pm2 `servired-prueba` en :3656 arrancado con `env -i` (sin variables de los `.env` pegadas). `.env` y `.env.local` propios: secretos nuevos, sin Mongo, sin `MP_*`, sin `CRON_SECRET`, `ENTORNO_PRUEBA="1"`, `MAIL_REDIRIGIR_A="consultas@servired.ar"`, KYC en `/var/lib/servired-prueba/kyc`.
  - Base: copia de producción → `db push` → anonimizada (48 correos, 18 KYC, 54 documentos, 18 teléfonos, 4 cuentas MP, 57 sesiones, 3 preinscripciones) → 5 de 5 presupuestos viejos vinculados.
  - CA-16/19: :3656 → 200 con la marca y `noindex`; con el Host del dominio, 200 (antes 308). Producción :3655 → 200 sin la marca. `servired.ar` 200, `www` 308.
  - Traefik: `/docker/n8n/dynamic/servired-prueba.yml` (prioridad 1000, `basicAuth` con `servired-prueba.htpasswd`). El router de producción no se tocó. Dominio de prueba → 401 (cerrado con un usuario al azar que nadie conoce, hasta que se cargue la clave).
  - CA-18: `POST` sin clave a `servired.consultoriadigital.io/api/mercadopago/webhook` lo contesta la app ("Firma inválida."), no el 401 de Traefik: entra por la ruta de producción.
  - Monitoreo: `check-endpoints.sh` vigila `servired-prueba-3656` (200) y `servired-demo-mp` (webhook por el dominio de prueba, 405). Copia previa: `check-endpoints.sh.bak-20261021-prueba`.

## Producción

- [x] **Publicado en servired.ar (21/10/2026, 10:54)**, con aprobación del usuario. `servired.ar` 200, `www` 308, sin la marca de prueba, webhook de MP contestando, sin errores nuevos en el log después del restart.

## Lo que falta (lo hace el usuario)

1. **Clave de la prueba.** En el VPS (pide la clave dos veces y no queda en el historial):

   ```sh
   printf "servired:%s
" "$(openssl passwd -apr1)" > /docker/n8n/dynamic/servired-prueba.htpasswd
   ```

   Traefik la toma solo. El usuario es `servired` (se puede cambiar en el comando).
2. **Mercado Pago de prueba (opcional).** Antes: confirmar en el panel de MP que el webhook y la URL de retorno de la app de **producción** apuntan a `servired.ar`. Después: cargar las credenciales de prueba en `/var/www/servired-prueba/.env` (`MP_CLIENT_ID`, `MP_CLIENT_SECRET`, `MP_WEBHOOK_SECRET`, `MP_SANDBOX`), sacar `&& !PathPrefix(...)` de `servired-prueba.yml` (si no, los avisos y la vuelta de la vinculación van a producción) y `pm2 restart servired-prueba` (sin `--update-env`).

## Actualizar la prueba con cambios nuevos de la rama

```sh
cd /var/www/servired-prueba && git pull && pnpm install --frozen-lockfile && npx prisma db push && pnpm build && pm2 restart servired-prueba
```

(`pm2 restart` pelado, nunca con `--update-env`.)

## Sacar la prueba

Borrar `/docker/n8n/dynamic/servired-prueba.yml` (el dominio vuelve a redirigir a servired.ar), `pm2 delete servired-prueba && pm2 save`, y en `check-endpoints.sh` volver a la copia `.bak-20261021-prueba`.
