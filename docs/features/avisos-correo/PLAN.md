# PLAN: Avisos por correo

**SPEC de referencia:** [SPEC.md](SPEC.md)
**Versión de la spec revisada:** Aprobada el 2026-09-18 por autorización general (rama `tanda-lanzamiento`, después de `3ee1d50`)
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

## Contexto técnico verificado

<!-- Qué existe hoy y cómo participa en la funcionalidad. -->

| Componente o archivo existente | Ruta verificada | Responsabilidad y uso previsto |
| --- | --- | --- |
| Envío de correo | `src/lib/mailer.ts` → `sendMail`, `appUrl` | Nodemailer por SMTP. Sin `SMTP_HOST`, en dev escribe a consola y en prod tira error. **No acepta headers.** |
| Avisos de la campanita | `src/lib/notificaciones.ts` → `notificar`, `notificarA`, `notificarMensaje` | Los mails salen en los mismos puntos donde hoy se notifica. |
| Presupuesto recibido | `api/contrataciones/[id]/route.ts` (l.40) y `api/conversaciones/[id]/acuerdo/route.ts` (l.52-58) | `notificar(..., kind: "propuesta")` al cliente. |
| Presupuesto resuelto | `api/contrataciones/[id]/route.ts`: rechazo (l.50) y aceptación (l.70) | `notificar(..., "propuesta_resuelta")` al profesional. |
| Solicitud nueva | `api/solicitudes/route.ts` (l.61-76) | Busca los pros aprobados con el rubro (`categoryLinks`) y los avisa por campanita, **cortado en 50**. |
| Lectura de mensajes | `Conversation.leidoCliente` / `leidoPro`; `src/lib/mensajes.ts` (`contarNoLeidos`) | Un mensaje del otro lado posterior a la marca de lectura es "sin leer". |
| Firma HMAC | `src/lib/pending-verification.ts` | Mismo patrón para el enlace de baja (`EMAIL_VERIFICATION_SECRET`, con fallback). |
| Perfiles | `src/app/(client)/mi-perfil/page.tsx`, `src/app/pro/mi-perfil/page.tsx` | Ahí van los interruptores. |
| Tareas programadas | — | **No hay.** El servidor es un proceso Node largo con pm2 en el VPS. |

**Convenciones y patrón de referencia:** lógica en `src/lib`, reglas puras en `tests/rules.test.ts`, route handlers que solo exportan métodos. `after()` de `next/server` (estable desde Next 15.1; el proyecto usa 15.5.22) para trabajo que no tiene que demorar la respuesta.

## Solución propuesta

<!-- Explica el enfoque y sus motivos. Describe las responsabilidades y el
recorrido de datos y eventos hasta la interfaz. Usa un diagrama si aporta claridad. -->

1. **Módulo `src/lib/avisos-correo.ts`:**
   - `TIPOS = mensajes | solicitudes | propuestas`, cada uno con su preferencia en `User`.
   - `puedeRecibir(user)`: cuenta aprobada, email verificado y no `@pending.servired.invalid` (RF-07).
   - `mandarAviso(userId, tipo, contenido)`: mira la preferencia y la elegibilidad, arma texto y HTML simples con el botón al destino y el pie de baja, y agrega `List-Unsubscribe` + `List-Unsubscribe-Post`. **Nunca tira:** registra el error con `console.error("[avisos-correo]")` (CA-09).
   - Firma de baja: `firmaBaja(userId, tipo)` / `firmaValida(...)` con HMAC, y `enlaceBaja` (página) / `enlaceBajaUnClic` (POST).
   - Regla pura `debeAvisarMensaje({ primerNoLeido, leido, avisado, now })`:
     - hay un mensaje del otro lado sin leer desde hace más de 12 h y de menos de 7 días;
     - y no se avisó después de la última lectura.

     Con eso sale un mail por tanda sin leer (RF-01, RF-02).
   - `barrerMensajesSinContestar(now)`: recorre las conversaciones con actividad en los últimos 7 días, aplica la regla para cada lado y sella `mailAvisoClienteAt` / `mailAvisoProAt` antes de mandar. Así una corrida repetida o simultánea no duplica.
2. **Solicitudes y presupuestos (RF-03, RF-04, RF-05):** se mandan en el momento, con `after(() => …)` al lado de cada `notificar`, y no desde el barrido.
   - Una solicitud nueva le escribe a **todos** los pros aprobados del rubro (sin el corte de 50 de la campanita).
   - "Una vez por solicitud" y "solo las nuevas" salen solos, porque se manda al publicar.
3. **Barrido periódico (RF-08):** ruta `POST /api/cron/avisos` con `Authorization: Bearer $CRON_SECRET`. Sin `CRON_SECRET`, responde 503 y no hace nada. En el VPS, un crontab cada 15 minutos le pega por `127.0.0.1:3655`; queda documentado en el README.
4. **Baja (RF-06):**
   - Página `/avisos-correo?u&tipo&t` con el botón "Dejar de recibir estos avisos", que es un server action: la baja se hace recién al confirmar, no al abrir el enlace.
   - `POST /api/avisos/correo-baja?u&tipo&t` para la baja en un clic de los clientes de correo (RFC 8058).
   - Componente `AvisosCorreo.tsx` con los tres interruptores en los dos perfiles, guardados con un server action que exige sesión.
5. **`sendMail`** suma el parámetro opcional `headers`.

```
contrataciones/acuerdo ─notificar + after(mandarAviso propuestas)─▶ SMTP
solicitudes POST ─notificarA + after(mandarAviso solicitudes × pros del rubro)─▶ SMTP
crontab 15 min ─POST /api/cron/avisos─▶ barrerMensajesSinContestar ─sella + mandarAviso mensajes─▶ SMTP
mail ─"No quiero recibir más"─▶ /avisos-correo (confirma) · List-Unsubscribe ─▶ POST /api/avisos/correo-baja
```

## Módulos y componentes afectados

<!-- Si el proyecto está modularizado, identifica los módulos afectados, sus
responsabilidades y la dirección de sus dependencias. Respeta los límites
existentes y justifica cualquier módulo o dependencia nueva. Si no está
modularizado, describe las carpetas o componentes afectados sin introducir
modularización fuera del alcance; marca la tabla de módulos como No aplica. -->

| Módulo | Existe / nuevo | Responsabilidad y cambios | Dependencias afectadas |
| --- | --- | --- | --- |
| No aplica | — | Una sola app Next.js sin módulos. | — |

<!-- Distingue lo que se reutiliza, modifica o crea. Las rutas nuevas son propuestas.
Señala impacto sobre modelos, contratos o componentes compartidos. -->

| Componente o ruta | Acción | Cambio y responsabilidad | Requisito relacionado |
| --- | --- | --- | --- |
| `prisma/schema.prisma` | Modificar | `User.mailMensajes/mailSolicitudes/mailPropuestas` (default true); `Conversation.mailAvisoClienteAt/mailAvisoProAt`. | RF-02, RF-06 |
| `src/lib/mailer.ts` | Modificar | `headers` opcional. | RF-06 |
| `src/lib/avisos-correo.ts` | Crear | Tipos, elegibilidad, envío, firma de baja, regla y barrido. | RF-01…RF-08 |
| `src/app/api/cron/avisos/route.ts` | Crear | Barrido protegido con `CRON_SECRET`. | RF-08 |
| `src/app/api/avisos/correo-baja/route.ts` | Crear | Baja en un clic (POST). | RF-06 |
| `src/app/(client)/avisos-correo/page.tsx` + acción | Crear | Confirmar la baja desde el enlace del mail. | RF-06 |
| `src/components/AvisosCorreo.tsx` + acción | Crear | Interruptores en los perfiles. | RF-06 |
| `src/app/(client)/mi-perfil/page.tsx`, `src/app/pro/mi-perfil/page.tsx` | Modificar | Montan los interruptores. | RF-06 |
| `api/contrataciones/[id]/route.ts`, `api/conversaciones/[id]/acuerdo/route.ts` | Modificar | `after(mandarAviso(... "propuestas"))`. | RF-04, RF-05 |
| `api/solicitudes/route.ts` | Modificar | `after(mandarAviso(... "solicitudes"))` a los pros del rubro. | RF-03 |
| `tests/rules.test.ts` | Modificar | `debeAvisarMensaje`, firma de baja, `puedeRecibir`. | RF-01, RF-02, RF-06, RF-07 |
| `.env.example`, `README.md` | Modificar | `CRON_SECRET`, crontab, SMTP. | RF-08 |

## Datos y contratos

<!-- Completa solo lo aplicable. Si un punto no aplica, indica el motivo. -->

- **Modelos y contratos de entrada y salida:**
  - `POST /api/cron/avisos` → `{ mensajes: n }`, o 401 sin la clave / 503 sin `CRON_SECRET`.
  - `POST /api/avisos/correo-baja` → 200 `{ ok }` o 400 si la firma no vale.
- **Identificadores, relaciones y restricciones:** la firma de baja es `HMAC(userId:tipo)`; no vence, porque el enlace tiene que servir en un mail viejo.
- **Origen de los datos mostrados y transformaciones:** los mails no incluyen el texto de los mensajes, solo quién escribió (regla de privacidad de la spec).
- **Persistencia, consultas y actualizaciones:** el barrido lee conversaciones con `updatedAt` en los últimos 7 días, con sus mensajes de esa ventana. Alcanza para el volumen actual y lo corta un índice natural.
- **Convivencia entre datos locales y remotos:** no aplica.
- **Compatibilidad y migraciones de datos existentes:** `db push` suma columnas con default, sin migrar datos. Las preferencias arrancan en true (la spec dice "activos por defecto").

## Estado, operaciones y errores

<!-- Cómo se implementan los comportamientos aprobados en la spec.
Referencia RF/CA y aplica las consideraciones relevantes de MOBILE_GUIDELINES.md. -->

- **Gestión del estado de interfaz y navegación:** los enlaces de los mails llevan a la pantalla exacta; si no hay sesión, la página ya pide entrar como hoy.
- **Conservación y restauración del estado:** los interruptores muestran el valor guardado y "Guardando…" mientras se envía.
- **Ejecución, concurrencia y cancelación de operaciones:**
  - El barrido sella antes de mandar con un `updateMany` condicional (solo si el sello no cambió). Dos corridas simultáneas no mandan dos veces.
  - `after()` no demora la respuesta.
- **Errores, reintentos y prevención de duplicados:**
  - Un fallo de SMTP se registra y la acción de la persona sigue (CA-09).
  - Un mail de mensajes que falló no se reintenta: el sello ya quedó puesto. Se prefiere perder un recordatorio a duplicarlo.
- **Otras consideraciones mobile aplicables y su solución:**
  - HTML de una columna, que se lee bien en el celular.
  - **Trabajo en segundo plano:** idempotente por sellos.

## Dependencias y configuración

<!-- Librerías, servicios, permisos o configuración afectados. Verifica compatibilidad
con el proyecto y justifica las incorporaciones. No agregues dependencias por defecto. -->

- Sin dependencias nuevas (`nodemailer` ya está).
- Variable nueva: `CRON_SECRET`.
- Producción:
  - SMTP (`SMTP_HOST`…`EMAIL_FROM`) con SPF/DKIM del dominio remitente.
  - Crontab: `*/15 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3655/api/cron/avisos`.
  - `db push`.

## Estrategia de validación

<!-- Una fila por criterio de la spec. Selecciona el método capaz de demostrarlo:
test unitario, integración, UI o prueba manual. No todos requieren todos los métodos.
Identifica tests existentes y separa los nuevos propuestos. Incluye regresiones relevantes.
Una captura aislada no demuestra persistencia ni ausencia de peticiones de red. -->

| Criterio | Método y test existente o propuesto | Entorno y datos necesarios | Evidencia prevista |
| --- | --- | --- | --- |
| CA-01 | Unitario de `debeAvisarMensaje`. Integración: conversación con un mensaje del cliente de hace 13 h sin leer; `POST /api/cron/avisos`. | Dev sin SMTP: el mailer escribe `[mailer] destinatario: …` en el log. `CRON_SECRET` de prueba en el entorno del dev. | Línea del log al pro correcto con el enlace a la conversación. |
| CA-02 | Correr el barrido dos veces más; después marcar como leído, agregar otro mensaje viejo y volver a correr. | Igual. | 1 mail, 0 y 0; después, 1 nuevo. |
| CA-03 | Mensaje de hace 2 h; barrido. | Igual. | Ningún mail. |
| CA-04 | Publicar una solicitud de Plomería (API) con plomeros aprobados, un pendiente y un electricista. | Dev. | Mail solo a los plomeros aprobados. |
| CA-05 / CA-06 | `send_proposal`, `accept_proposal` y `reject_proposal` por la API. | Dev. | Mail al cliente con el monto; mail al pro por cada resolución. |
| CA-07 | Enlace de baja: GET de la página (no da de baja), confirmar (baja); `POST` de un clic con firma buena y mala; interruptores en el perfil. | Dev. | Solo ese tipo queda en false; firma mala da 400; otro tipo sigue llegando. |
| CA-08 | Cuenta suspendida y cuenta sin verificar con mensaje sin leer; barrido. | Dev. | Ningún mail. |
| CA-09 | `next start` sin `SMTP_HOST` (el mailer tira error en producción); mandar un presupuesto. | Build de producción. | 201 y la propuesta guardada; `[avisos-correo]` en el log. |

**Comprobaciones de regresión:** la campanita sigue igual (mismo `notificar`); `pnpm test`; `pnpm build`.

**Comandos verificados para compilar y ejecutar tests:** los de siempre (`corepack pnpm test`, `tsc --noEmit`, `db:push`, `build` con el dev apagado).

**Pruebas en dispositivo, emulador o simulador:** no aplica; la entrega real de correos se prueba en producción con el SMTP del cliente.

**Limitaciones del entorno:**
- En local no hay SMTP: se verifica qué se manda y a quién por el log del mailer, no la entrega ni el aspecto en un cliente de correo.
- El crontab del VPS se configura en el deploy.

<!-- Esta sección planifica la validación. Durante la implementación, registra
en TASKS.md o en el informe de validación acordado los resultados y evidencias
reales. Distingue pruebas ejecutadas, fallidas, no ejecutadas y bloqueadas.
Compilar o tener tests en verde no sustituye revisar los criterios de la spec. -->

## Orden de implementación

<!-- Etapas y dependencias principales. El desglose ejecutable se escribe en TASKS.md.
Incluye puntos de comprobación para avanzar con cambios pequeños. -->

1. **Esquema, `mailer.headers`, `avisos-correo.ts`** y tests puros. Comprobación: `db:push`, `pnpm test`.
2. **Envíos en el momento:** presupuestos y solicitudes. Comprobación: CA-04, CA-05, CA-06 y CA-09.
3. **Barrido y ruta de cron.** Comprobación: CA-01, CA-02, CA-03 y CA-08.
4. **Baja y preferencias.** Comprobación: CA-07.
5. **Cierre:** README, `.env.example`, build y evidencia.

**Subagentes:** no hacen falta.

## Riesgos y decisiones pendientes

<!-- Riesgos concretos de esta solución y cómo se resolverán, sin listas genéricas.
Escribe Ninguna en las decisiones pendientes cuando estén resueltas. -->

- **Riesgos y medidas acordadas:**
  - **Reputación del remitente:** sin SPF/DKIM los mails van a spam. Está en la checklist.
  - **Rubros muy poblados:** una solicitud manda un mail por profesional del rubro. Con el volumen actual alcanza; si crece, pasar a un resumen diario.
  - **Sin `CRON_SECRET` en producción**, no salen los recordatorios de mensajes (los otros sí). Está en la checklist.
- **Decisiones tomadas con la autorización general** (para revisar):
  1. Solicitudes y presupuestos se mandan **en el momento** y no desde el barrido. Es más simple y cumple "una vez" y "solo las nuevas".
  2. Los recordatorios de mensajes miran solo mensajes de los **últimos 7 días**, para no mandar una tanda de mails por chats viejos el día del lanzamiento.
  3. Los interruptores están en los **dos perfiles** (cliente y pro); son las mismas tres preferencias de la cuenta.
  4. Si un mail de mensajes falla, **no se reintenta**.
- **Decisiones pendientes:** Ninguna (el proveedor SMTP lo define el cliente).

<!-- ANTES DE SOLICITAR APROBACIÓN
Comprueba que el plan cubre los requisitos, respeta las exclusiones, reutiliza
componentes verificados y permite demostrar todos los criterios de aceptación.
Resuelve dudas y marcadores pendientes. Si la spec cambió, revisa su impacto.
Tras aprobar el plan, deriva TASKS.md con IDs, dependencias, referencias a RF/CA
y comprobaciones. No marques una tarea terminada sin realizar su validación;
si está bloqueada, registra el motivo.
-->
