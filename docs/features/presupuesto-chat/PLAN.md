# PLAN: Presupuesto del chat pensado para el celular

**SPEC de referencia:** [SPEC.md](SPEC.md)
**Versión de la spec revisada:** Aprobada el 21/10/2026
**Estado:** Aprobado <!-- Borrador | En revisión | Aprobado -->

<!-- PARA LA PERSONA
Copia esta plantilla como PLAN.md junto a la SPEC.md aprobada.
Este documento define la solución técnica. Una vez revisado, el agente puede
derivar TASKS.md con tareas, dependencias y comprobaciones.
-->

<!-- PARA EL AGENTE
- Lee la SPEC.md aprobada, las instrucciones del proyecto y MOBILE_GUIDELINES.md.
  Si falta un documento necesario o la spec no está aprobada, indícalo antes de avanzar.
- Inspecciona el repositorio. Referencia rutas verificadas y distingue las nuevas propuestas.
- Propón una solución proporcional al alcance y coherente con el proyecto.
  Reutiliza lo existente y justifica nuevas dependencias o cambios de arquitectura.
- Distingue hechos, decisiones confirmadas y propuestas. Consulta las decisiones
  no resueltas; haz pocas preguntas por vez y actualiza el plan con las respuestas.
- Referencia los requisitos y criterios por su ID, sin copiar toda la spec.
- Si una decisión cambia el comportamiento o alcance, vuelve a la spec y solicita
  confirmación. No resuelvas una duda de producto mediante una suposición técnica.
- Conserva estos comentarios. No implementes durante la planificación.
- Solicita aprobación antes de marcar el plan como Aprobado. La autorización
  para implementar debe ser explícita; no se deduce del estado de los documentos.
-->

Autorización: el 21/10/2026 el usuario aprobó la spec y pidió seguir "sin parar
hasta dejarlo andando en servired.consultoriadigital.io", sin tocar servired.ar.

## Contexto técnico verificado

<!-- Qué existe hoy y cómo participa en la funcionalidad. -->

| Componente o archivo existente | Ruta verificada | Responsabilidad y uso previsto |
| --- | --- | --- |
| Chat | `src/components/Chat.tsx` | Lista + hilo, poll de mensajes cada 5 s. Hoy pinta 💰/📋 con `TarjetaAcuerdo` (parte el texto por ` · `). Recibe la franja, la tarjeta nueva y el **+**. |
| Acuerdo del hilo | `src/components/PaymentControls.tsx` | `useAcuerdo` (poll de 5 s a `/api/conversaciones/[id]/acuerdo`), `estadoAcuerdo()` y el botón + panel. El panel queda; el botón sale de la barra de escribir. |
| Acciones del trabajo | `src/components/BookingActions.tsx` | Aceptar, rechazar, cerrar, pagar, calificar. También lo usa `/contrataciones`. Llama a `router.refresh()`. |
| API del acuerdo | `src/app/api/conversaciones/[id]/acuerdo/route.ts` | GET del acuerdo abierto; POST `propose` crea booking + propuesta + mensaje 💰. |
| API de contrataciones | `src/app/api/contrataciones/[id]/route.ts` | PATCH `send_proposal`, `accept_proposal`, `reject_proposal`, `finish`, `confirm_payment`, `cancel`. El estado se chequea fuera de la transacción. |
| Mensajes | `src/app/api/conversaciones/[id]/mensajes/route.ts`, `src/app/api/conversaciones/route.ts`, `src/app/(client)/mensajes/page.tsx`, `src/app/pro/mensajes/page.tsx` | Serializan `ChatMessage`; suman `proposalId`. |
| Reglas | `src/lib/workflow.ts`, `src/lib/trabajo.ts` | `OPEN_BOOKING_STATUSES`, `proposalIsActive`, `PROPOSAL_TTL_*`, `jobProgress`. Se reusan. |
| Redirección de dominios | `src/middleware.ts` | Manda `servired.consultoriadigital.io` a `servired.ar`. |
| Correo | `src/lib/mailer.ts` | Único punto de envío. |
| VPS | `/var/www/servired`, pm2 `servired` en :3655, Traefik `/docker/n8n/dynamic/servired.yml` | Producción. No se toca salvo el monitoreo. |

**Convenciones y patrón de referencia:** componentes cliente con Tailwind y las
clases `glass*`; lógica pura en `src/lib/*` con tests en `tests/*.test.ts`
(`node:test` vía `pnpm test`); textos en español rioplatense; esquema con
`prisma db push` (solo agregar).

## Solución propuesta

### Módulos y componentes afectados

| Componente o ruta | Acción | Cambio y responsabilidad | Requisito relacionado |
| --- | --- | --- | --- |
| `src/lib/presupuesto.ts` | Crear | Lógica pura: `estadoAcuerdo()` ampliado (rechazado/vencido + `franja`), `estadoPropuesta()` para la tarjeta, `montoDesdeTexto()`/`montoConMiles()`, `esMensajeDeSistema()`. | RF-01, RF-04, RF-05, RF-07, RF-11 |
| `src/components/chat/TarjetaPresupuesto.tsx` | Crear | Tarjeta con estado y botones del cliente; fallback a la tarjeta vieja si el mensaje no tiene propuesta. | RF-01, RF-02, RF-12 |
| `src/components/chat/FranjaAcuerdo.tsx` | Crear | Franja bajo el encabezado con su botón. | RF-04 |
| `src/components/chat/HojaPresupuesto.tsx` | Crear | Formulario de presupuesto: pantalla completa en el celu, ventana en `md`; borrador en `sessionStorage`; alto atado a `visualViewport`. Elige la ruta: `propose` sin acuerdo, `send_proposal` con acuerdo `requested`. | RF-07, RF-09 |
| `src/components/chat/HojaConfirmar.tsx` | Crear | Hoja de confirmación (aceptar / rechazar). | RF-03 |
| `src/components/PaymentControls.tsx` | Modificar | Sin botón propio: panel controlado desde el Chat (`open`, `onClose`, `accionInicial`). Reexporta `estadoAcuerdo` desde `lib/presupuesto`. `useAcuerdo` devuelve también `propuestas`. | RF-08, RF-09 |
| `src/components/BookingActions.tsx` | Modificar | Prop `onDone` (default `router.refresh()`), `inicial` para abrir cerrar/calificar, botones `min-h-11` a lo ancho, estrellas tocables. | RF-08, RF-09 |
| `src/components/Chat.tsx` | Modificar | **+** con menú para el oferente, clip para el cliente; franja; tarjeta nueva; líneas del sistema; estado del encabezado abre el panel; refresco inmediato del hilo después de cada acción. | RF-04, RF-06, RF-09, RF-11 |
| `src/app/api/conversaciones/[id]/acuerdo/route.ts` | Modificar | GET suma `propuestas` (todas las de la pareja cliente–oferente, últimas 50). POST guarda `proposalId` en el mensaje y rechaza un segundo acuerdo abierto creado en paralelo. | RF-01, RF-10, RF-12 |
| `src/app/api/contrataciones/[id]/route.ts` | Modificar | `send_proposal` guarda `proposalId`; `accept_proposal` y `reject_proposal` cambian la propuesta con `updateMany where status="pending" and expiresAt > ahora` dentro de la transacción y salen con 409 si no cambió ninguna fila (sin mensaje ni aviso). | RF-10 |
| Serializadores de mensajes (4 rutas de arriba) | Modificar | Agregan `proposalId`. | RF-01 |
| `prisma/schema.prisma` | Modificar | `Message.proposalId String?` + índice. | RF-01 |
| `prisma/vincular-presupuestos.ts` | Crear | Una corrida, idempotente: vincula los 💰 viejos con su propuesta (misma pareja, mismo monto, creada a menos de 2 min). | RF-12 |
| `src/middleware.ts` | Modificar | Con `ENTORNO_PRUEBA=1` no redirige. | RF-13 |
| `src/app/layout.tsx` + `src/components/FranjaPrueba.tsx` | Modificar / crear | Con `ENTORNO_PRUEBA=1`: franja fija "Entorno de prueba" y `robots: noindex`. | RF-16 |
| `src/lib/mailer.ts` | Modificar | `MAIL_REDIRIGIR_A`: todo va ahí con el destinatario original en el asunto. Con `ENTORNO_PRUEBA=1` y sin esa variable, no manda (log). | RF-14 |
| `prisma/anonimizar-prueba.ts` | Crear | Solo corre con `ENTORNO_PRUEBA=1`: reemplaza correos y teléfonos, borra sesiones, tokens, verificaciones, documentos KYC, cuentas de MP y preinscripciones, y vuelve ilegibles CUIL/DNI. | RF-14 |

### Datos y contratos

- `Message.proposalId String?` (sin relación de Prisma, para no tocar el borrado
  en cascada). Los mensajes viejos quedan en `null` hasta correr el script.
- GET `/api/conversaciones/[id]/acuerdo` → `{ booking, propuestas: [{ id, amount, estimatedDays, message, status, expiresAt, bookingId }] }`. `booking` no cambia.
- `ChatMessage.proposalId?: string | null`.
- Env nuevas, solo en la prueba: `ENTORNO_PRUEBA="1"`, `MAIL_REDIRIGIR_A`.

### Estado, operaciones y errores

- Estado de la tarjeta: `pending` vigente → Pendiente; `pending` vencida por
  fecha o `expired` → Vencido; `accepted` → Aceptado; `rejected` → Rechazado.
- Después de una acción: `reload()` del acuerdo + traer los mensajes del hilo en
  el acto (RF-09). Botón en "Enviando…" mientras tanto.
- 409 al aceptar o rechazar: se muestra el error del servidor y se recarga
  el acuerdo (la tarjeta pasa al estado real).
- Borrador del formulario: `sessionStorage["presupuesto:<conversación>"]`,
  envuelto en try/catch; se borra al enviar bien.

### Dependencias y configuración

Sin dependencias nuevas.

**Entorno de prueba en el VPS** (propuesto, sin tocar producción):

1. Clon en `/var/www/servired-prueba`, rama `presupuesto-chat`.
2. `.env` propio: copia del de producción con `APP_URL=https://servired.consultoriadigital.io`, `ENTORNO_PRUEBA="1"`, `MAIL_REDIRIGIR_A="consultas@servired.ar"`, secretos de sesión nuevos, `PRIVATE_UPLOAD_DIR` vacío propio, `KYC_ENCRYPTION_KEY` nueva, **sin** `MONGODB_*`, `MP_*` ni `CRON_SECRET`.
3. Base: copia de `prisma/dev.db` → `db push` → `anonimizar-prueba.ts` → `vincular-presupuestos.ts`. Fotos: copia de `public/uploads`.
4. pm2 `servired-prueba` en :3656 con su `ecosystem.prueba.config.js`, arrancado con `env -i` (trampa de `--update-env`).
5. Traefik: archivo nuevo `/docker/n8n/dynamic/servired-prueba.yml` con un router `Host(servired.consultoriadigital.io) && !PathPrefix(/api/mercadopago)` de prioridad alta y middleware `basicAuth` con `usersFile` (el usuario genera el archivo). El router de producción no cambia, así no se reemite su certificado.
6. Monitoreo: `servired-demo` pasa a esperar 401 y se suma `servired-prueba-3656` (200).

## Estrategia de validación

| Criterio | Método y test existente o propuesto | Entorno y datos necesarios | Evidencia prevista |
| --- | --- | --- | --- |
| CA-01, CA-07, CA-05 | Tests de `estadoAcuerdo`/`estadoPropuesta` en `tests/presupuesto.test.ts` + recorrido en el navegador | Local, base de desarrollo | `pnpm test` en verde; TASKS |
| CA-02, CA-03, CA-14, CA-15 | Navegador (pane) a 375 px como cliente y oferente | Local con datos de prueba | Lectura de la página / capturas |
| CA-04, CA-06, CA-08, CA-09, CA-10, CA-11, CA-12 | Navegador a 375 px; altura de botones medida con JS | Local | Resultado de la medición en TASKS |
| CA-13 | Dos PATCH `accept_proposal` en paralelo por script | Local | Un solo mensaje ✅ y una notificación |
| CA-16, CA-19 | `curl` a los dos dominios y a :3656 | VPS | Códigos y encabezados |
| CA-17 | Contar filas / buscar correos en la base de prueba; log del mailer | VPS | Salida del script |
| CA-18 | `curl -X POST` a `servired.consultoriadigital.io/api/mercadopago/webhook` llega a :3655 (log de pm2 `servired`) | VPS | Línea del log |

Además: `pnpm exec tsc --noEmit`, `pnpm test` y `pnpm build`.

## Orden de implementación

1. Esquema y lógica pura con tests.
2. API (proposalId, propuestas, idempotencia).
3. Componentes nuevos y cambios en Chat / PaymentControls / BookingActions.
4. Entorno de prueba en el código (middleware, franja, mailer, scripts).
5. Validación local y commit en `presupuesto-chat`; push de la rama.
6. Montar la prueba en el VPS y validar ahí.

## Riesgos y decisiones pendientes

- **Webhook de Mercado Pago:** si el panel apunta al dominio viejo, igual llega
  a producción por la exclusión de `/api/mercadopago`. Riesgo bajo.
- **Certificado:** el router nuevo pide su propio certificado para
  `servired.consultoriadigital.io`; si falla, solo se cae la prueba.
- **Clave de acceso:** hasta que el usuario genere el archivo de usuarios,
  Traefik no sirve la prueba (falla cerrada).
- **Mercado Pago en prueba:** apagado hasta que el usuario cargue credenciales
  de prueba.
- Pasar a producción (`main` → `servired.ar`) necesita otra aprobación;
  incluye correr `vincular-presupuestos.ts` después del `db push`.
