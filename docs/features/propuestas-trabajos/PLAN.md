# PLAN: Propuestas a 5 días y sin tope de trabajos en curso

**SPEC de referencia:** [SPEC.md](SPEC.md)
**Versión de la spec revisada:** Aprobada el 2026-09-18 (sin commit todavía; base `69cd1e3`)
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
| Reglas del flujo de trabajo | `src/lib/workflow.ts` | Define `PROPOSAL_TTL_MS = 72 h` (l.7), `proposalIsActive` (l.9), `hasJobCapacity` (`< 3`, l.13), `expirePendingProposals` (l.17) y `activeJobsCount` (l.24, sin uso). Importa `prisma`, así que **no se puede usar desde componentes de cliente**. |
| Plazo del trabajo, sin base | `src/lib/trabajo.ts` | Módulo puro (no importa nada) con `DIA_MS` interno, `validEstimatedDays` y `jobProgress`. Lo usan componentes de cliente. Va a alojar la regla de vigencia. |
| Presupuesto desde el pedido y aceptación | `src/app/api/contrataciones/[id]/route.ts` | `send_proposal` crea la propuesta con `PROPOSAL_TTL_MS` (l.36) y escribe "Vence en 3 días" en el chat (l.39). `accept_proposal` cuenta los trabajos activos dentro de la transacción y tira `CAPACITY` (l.59-61). El 409 "tres trabajos en curso" está en l.68. |
| Propuesta desde el chat | `src/app/api/conversaciones/[id]/acuerdo/route.ts` | Crea Booking + Proposal con `PROPOSAL_TTL_MS` (l.49) y el mensaje "Vence en 3 días" (l.50). |
| Panel de contrataciones | `src/components/BookingActions.tsx` | Botón "Enviar propuesta (vence en 3 días)" (l.29). Del lado del cliente ya muestra la fecha real de vencimiento ("Vence {fecha}"). |
| Panel del acuerdo en el chat | `src/components/PaymentControls.tsx` | Ayuda "… Vence en 3 días. …" debajo del formulario del profesional (l.132). |
| Tests de reglas | `tests/rules.test.ts` | Fija `PROPOSAL_TTL_MS` en 72 h (l.56) y `hasJobCapacity(2/3)` (l.64-65); importa `hasJobCapacity` en l.4. |
| Script de migración histórica | `prisma/migrate-servired.ts` | Tiene su propio `TTL = 72 h` (l.4) para migrar contrataciones del modelo viejo. **No es re-ejecutable sin daño:** vuelve a calcular el vencimiento de todas las solicitudes e ignora las republicadas. No se usa para este cambio. |
| Otros usos de `ACTIVE_JOB_STATUSES` | `src/app/pro/mi-perfil/page.tsx:19`, `src/app/api/onboarding/route.ts:62`, `src/lib/baja-cuenta.ts:40` | Cuentan trabajos activos para otras cosas (perfil, bloqueo de la baja). **Se conservan.** |

**Convenciones y patrón de referencia:** las reglas puras viven en `src/lib` sin dependencias, para poder testearlas con `tsx --test` y usarlas desde componentes de cliente (el patrón de `trabajo.ts` y `solicitudes.ts`, que exporta `REQUEST_TTL_MS`). Los comentarios explican el porqué, en español rioplatense. Los route handlers solo exportan sus métodos (gotcha: otra `export` rompe `next build`).

## Solución propuesta

<!-- Explica el enfoque y sus motivos. Describe las responsabilidades y el
recorrido de datos y eventos hasta la interfaz. Usa un diagrama si aporta claridad. -->

1. **Una sola regla para la vigencia (RF-01, RF-02).**
   - En `src/lib/trabajo.ts` se agregan `PROPOSAL_TTL_DAYS = 5`, `PROPOSAL_TTL_MS` (derivado de `DIA_MS`) y el texto `PROPOSAL_TTL_LABEL = "5 días"` (derivado del número).
   - `workflow.ts` deja de definir su propio valor y reexporta `PROPOSAL_TTL_MS` desde `trabajo.ts`. Así los imports actuales de las dos rutas no cambian.
   - Los cuatro textos que dicen "3 días" pasan a usar `PROPOSAL_TTL_LABEL`: las dos rutas y los dos componentes de cliente. Los componentes pueden importarlo porque `trabajo.ts` no arrastra `prisma`.
2. **Sin tope de trabajos (RF-03, RF-04).**
   - Se borran `hasJobCapacity` y `activeJobsCount` de `workflow.ts`.
   - En `accept_proposal` se quitan el `count`, el `throw "CAPACITY"`, su `.catch` y el 409.
   - La transacción se conserva: sigue haciendo atómicos "propuesta aceptada" y "trabajo en curso con su reloj".
   - `ACTIVE_JOB_STATUSES` queda porque lo usan otras pantallas.
3. **Propuestas pendientes ya enviadas (decisión confirmada en la spec).**
   - Script nuevo, que se corre una sola vez en el deploy: `prisma/extender-propuestas.ts`.
   - Toma las propuestas con `status = "pending"` y les pone `expiresAt = createdAt + PROPOSAL_TTL_MS`, solo si ese valor es mayor que el actual.
   - Es idempotente: correrlo dos veces no cambia nada. No toca las que ya figuran `expired`, `accepted` ni `rejected`.

```
trabajo.ts (PROPOSAL_TTL_DAYS=5 → _MS, _LABEL)
   ├─ workflow.ts reexporta _MS ─→ contrataciones/[id] · acuerdo  (expiresAt + texto del chat)
   └─ _LABEL ────────────────────→ BookingActions · PaymentControls (ayudas en pantalla)
```

## Módulos y componentes afectados

<!-- Si el proyecto está modularizado, identifica los módulos afectados, sus
responsabilidades y la dirección de sus dependencias. Respeta los límites
existentes y justifica cualquier módulo o dependencia nueva. Si no está
modularizado, describe las carpetas o componentes afectados sin introducir
modularización fuera del alcance; marca la tabla de módulos como No aplica. -->

| Módulo | Existe / nuevo | Responsabilidad y cambios | Dependencias afectadas |
| --- | --- | --- | --- |
| No aplica | — | El proyecto es una sola app Next.js sin módulos; se tocan `src/lib`, dos route handlers, dos componentes, un test y un script. | — |

<!-- Distingue lo que se reutiliza, modifica o crea. Las rutas nuevas son propuestas.
Señala impacto sobre modelos, contratos o componentes compartidos. -->

| Componente o ruta | Acción | Cambio y responsabilidad | Requisito relacionado |
| --- | --- | --- | --- |
| `src/lib/trabajo.ts` | Modificar | Suma `PROPOSAL_TTL_DAYS`, `PROPOSAL_TTL_MS` y `PROPOSAL_TTL_LABEL`. | RF-01, RF-02 |
| `src/lib/workflow.ts` | Modificar | Reexporta `PROPOSAL_TTL_MS`; borra `hasJobCapacity` y `activeJobsCount`. | RF-01, RF-03 |
| `src/app/api/contrataciones/[id]/route.ts` | Modificar | Texto del chat con el label (l.39); saca el tope y el 409 (l.59-68) y el import de `hasJobCapacity`/`ACTIVE_JOB_STATUSES`. | RF-02, RF-03, RF-04 |
| `src/app/api/conversaciones/[id]/acuerdo/route.ts` | Modificar | Texto del chat con el label (l.50). | RF-02 |
| `src/components/BookingActions.tsx` | Modificar | "Enviar propuesta (vence en {label})" (l.29). | RF-02 |
| `src/components/PaymentControls.tsx` | Modificar | Ayuda "Vence en {label}" (l.132). | RF-02 |
| `tests/rules.test.ts` | Modificar | TTL = 5 días y label "5 días"; borra el test del cupo y su import. | RF-01, RF-02, RF-03 |
| `prisma/extender-propuestas.ts` | Crear | Extensión única e idempotente de las pendientes. | RF-01 |
| `README.md` | Modificar | Nota del paso de deploy para correr el script una vez. | RF-01 |

## Datos y contratos

<!-- Completa solo lo aplicable. Si un punto no aplica, indica el motivo. -->

- **Modelos y contratos de entrada y salida:** sin cambios de esquema. La API de `PATCH /api/contrataciones/[id]` deja de devolver el 409 de cupo; el resto de las respuestas quedan iguales.
- **Identificadores, relaciones y restricciones:** sin cambios.
- **Origen de los datos mostrados y transformaciones:** el vencimiento que ve el cliente sale de `Proposal.expiresAt` (ya se muestra como fecha); los textos fijos salen de `PROPOSAL_TTL_LABEL`.
- **Persistencia, consultas y actualizaciones:** las propuestas nuevas nacen con `expiresAt = now + 5 d`. El script ajusta una vez las `pending` existentes.
- **Convivencia entre datos locales y remotos:** no aplica: no hay estado local.
- **Compatibilidad y migraciones de datos existentes:**
  - No hace falta `db push`.
  - Los mensajes de chat viejos van a seguir diciendo "3 días": son historial y no se reescriben.
  - Las propuestas que el barrido perezoso ya pasó a `expired` no se reviven. Queda así porque la decisión habla de las pendientes.

## Estado, operaciones y errores

<!-- Cómo se implementan los comportamientos aprobados en la spec.
Referencia RF/CA y aplica las consideraciones relevantes de MOBILE_GUIDELINES.md. -->

- **Gestión del estado de interfaz y navegación:** sin cambios; los componentes siguen haciendo `router.refresh()` después de cada acción.
- **Conservación y restauración del estado:** no aplica (estado en el servidor).
- **Ejecución, concurrencia y cancelación de operaciones:** la aceptación sigue en una transacción. Sin el `count` no aparece ninguna carrera nueva: el guardado de `booking.status === "requested"` fuera de la transacción queda como hoy.
- **Errores, reintentos y prevención de duplicados:** se mantiene la regla de una sola propuesta vigente por pedido (`ACTIVE_PROPOSAL`). Se mantiene el botón deshabilitado mientras `busy`.
- **Otras consideraciones mobile aplicables y su solución:** "Pasar a segundo plano y regresar" se resuelve con el vencimiento perezoso que ya existe (`expirePendingProposals` al cargar) más `proposalIsActive`.

## Dependencias y configuración

<!-- Librerías, servicios, permisos o configuración afectados. Verifica compatibilidad
con el proyecto y justifica las incorporaciones. No agregues dependencias por defecto. -->

- Sin dependencias nuevas ni variables de entorno.
- El script usa `tsx` (ya es devDependency, igual que `migrate:servired`). Prisma lee `DATABASE_URL` de `.env`; no necesita secretos de `.env.local`.

## Estrategia de validación

<!-- Una fila por criterio de la spec. Selecciona el método capaz de demostrarlo:
test unitario, integración, UI o prueba manual. No todos requieren todos los métodos.
Identifica tests existentes y separa los nuevos propuestos. Incluye regresiones relevantes.
Una captura aislada no demuestra persistencia ni ausencia de peticiones de red. -->

| Criterio | Método y test existente o propuesto | Entorno y datos necesarios | Evidencia prevista |
| --- | --- | --- | --- |
| CA-01 | Unitario (modificado en `rules.test.ts`): `PROPOSAL_TTL_MS === 5 días`. Integración manual: `PATCH send_proposal` y leer `expiresAt`. | Dev en :3000; sesión del pro demo (`martin@servired.test`) insertando una fila `Session` y mandando la cookie `servired_session` con `curl`. | Salida de `pnpm test`; `expiresAt - createdAt = 120 h` leído de la base. |
| CA-02 | Integración manual: propuesta con `createdAt`/`expiresAt` de hace 6 días (script temporal `./tmp-propuestas.ts`); GET `/contrataciones` como cliente y `PATCH accept_proposal`. | Dev; sesión de `maria@servired.test`. | La propuesta queda `expired`; el PATCH devuelve 409 "La propuesta venció…". |
| CA-03 | Integración manual: propuesta con envío de hace 4 días (vence en 1 día); `PATCH accept_proposal`. | Igual que CA-02. | 200 y `booking.status = in_progress`. |
| CA-04 | `grep -rn "3 días"` sobre `src` (ya no aparece en propuestas). Integración: enviar por las dos vías y leer el último `Message.text`. Revisar los dos textos de UI en el HTML servido. | Dev con sesiones demo. | Sin coincidencias de "3 días"; los mensajes dicen "Vence en 5 días". |
| CA-05 | Integración manual: el profesional demo con 3 bookings `in_progress` (script temporal); el cliente acepta un cuarto. | Dev; datos creados por script y borrados después. | 200, cuatro trabajos en curso; no aparece el texto "tres trabajos". |
| Script de extensión | Manual: correr `extender-propuestas.ts` dos veces sobre una propuesta pendiente de hace 2 días. | Dev. | Primera corrida: `expiresAt = createdAt + 5 d`; segunda: 0 cambios. |

**Comprobaciones de regresión:**
- `pnpm test` completo (11 tests hoy, 11 pasan): el de cupo se borra y el de propuestas cambia.
- `next build` (atrapa el gotcha de `export` en route handlers).
- Rechazar una propuesta sigue habilitando otra.
- Una segunda propuesta vigente sigue dando 409 `ACTIVE_PROPOSAL`.
- El perfil del profesional sigue contando sus trabajos activos.

**Comandos verificados para compilar y ejecutar tests:**
- `corepack pnpm test`: verificado el 2026-09-18, 11/11 en verde. La tool Bash no tiene `pnpm` en el PATH, por eso va con `corepack`.
- `corepack pnpm build`: **con el dev server apagado**, porque comparten `.next`.
- `corepack pnpm exec tsx prisma/extender-propuestas.ts`.

**Pruebas en dispositivo, emulador o simulador:** no hace falta dispositivo: los cambios de UI son solo textos. Se revisa el texto en el HTML servido.

**Limitaciones del entorno:** el preview pane no pinta (ver notas del proyecto), así que la validación de UI es por HTML/`fetch`, no por captura. Correr el script en producción queda como paso de deploy, a confirmar después de subir.

<!-- Esta sección planifica la validación. Durante la implementación, registra
en TASKS.md o en el informe de validación acordado los resultados y evidencias
reales. Distingue pruebas ejecutadas, fallidas, no ejecutadas y bloqueadas.
Compilar o tener tests en verde no sustituye revisar los criterios de la spec. -->

## Orden de implementación

<!-- Etapas y dependencias principales. El desglose ejecutable se escribe en TASKS.md.
Incluye puntos de comprobación para avanzar con cambios pequeños. -->

1. **Regla única:** `trabajo.ts` + reexport en `workflow.ts` + tests actualizados. Comprobación: `pnpm test` en verde.
2. **Textos:** las dos rutas y los dos componentes pasan a usar el label. Comprobación: grep sin "3 días" en el flujo de propuestas; CA-04.
3. **Sin tope:** borrar el cupo en `accept_proposal` y en `workflow.ts`. Comprobación: CA-05 y regresiones de aceptar/rechazar.
4. **Extensión de pendientes:** script idempotente + nota en el README. Comprobación: dos corridas en dev.
5. **Cierre:** CA-01 a CA-03, `pnpm build`, borrar los scripts temporales y los datos de prueba, y dejar la evidencia en `TASKS.md`.

**Subagentes:** no hacen falta; el cambio es chico y secuencial.

## Riesgos y decisiones pendientes

<!-- Riesgos concretos de esta solución y cómo se resolverán, sin listas genéricas.
Escribe Ninguna en las decisiones pendientes cuando estén resueltas. -->

- **Riesgos y medidas acordadas:**
  - Propuestas que el barrido ya marcó `expired` antes del deploy no se reviven. El profesional puede mandar otra; se acepta porque la decisión cubre solo las pendientes.
  - Olvidarse de correr el script en producción deja algunas pendientes con 72 h. Se agrega al README y a la checklist del deploy.
  - Sin tope, un profesional puede aceptar más de lo que puede cumplir. Es lo que pidió el cliente; el reloj de cada trabajo y las reseñas siguen marcando atrasos.
- **Decisiones pendientes:** Ninguna.

<!-- ANTES DE SOLICITAR APROBACIÓN
Comprueba que el plan cubre los requisitos, respeta las exclusiones, reutiliza
componentes verificados y permite demostrar todos los criterios de aceptación.
Resuelve dudas y marcadores pendientes. Si la spec cambió, revisa su impacto.
Tras aprobar el plan, deriva TASKS.md con IDs, dependencias, referencias a RF/CA
y comprobaciones. No marques una tarea terminada sin realizar su validación;
si está bloqueada, registra el motivo.
-->
