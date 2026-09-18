# TASKS: Propuestas a 5 días y sin tope de trabajos en curso

**SPEC:** [SPEC.md](SPEC.md) (Aprobada) · **PLAN:** [PLAN.md](PLAN.md) (Aprobado)
**Autorización para implementar:** dada por el usuario el 2026-09-18.

Leyenda: `[ ]` pendiente · `[x]` hecha y validada · `[!]` bloqueada (con motivo).

## Tareas

- [x] **T1 · Regla única de vigencia**
  - Objetivo: que el plazo de la propuesta esté definido en un solo lugar y valga 5 días.
  - Alcance: `src/lib/trabajo.ts` (suma `PROPOSAL_TTL_DAYS`, `PROPOSAL_TTL_MS`, `PROPOSAL_TTL_LABEL`) y `src/lib/workflow.ts` (reexporta `PROPOSAL_TTL_MS`).
  - Depende de: —
  - Resuelve: RF-01, RF-02 · CA-01
  - Validación: tests de `tests/rules.test.ts` actualizados (5 días y "5 días"); `pnpm test` en verde.

- [x] **T2 · Textos de vencimiento**
  - Objetivo: que ningún texto del flujo de propuestas diga "3 días".
  - Alcance: `api/contrataciones/[id]/route.ts` (mensaje del chat), `api/conversaciones/[id]/acuerdo/route.ts` (mensaje del chat), `components/BookingActions.tsx` y `components/PaymentControls.tsx` (ayudas).
  - Depende de: T1
  - Resuelve: RF-02 · CA-04
  - Validación: grep de "3 días" en `src` sin coincidencias en el flujo de propuestas; mensajes reales por las dos vías (T5).

- [x] **T3 · Sacar el tope de trabajos en curso**
  - Objetivo: que el cliente pueda aceptar sin importar cuántos trabajos tenga el profesional.
  - Alcance: `accept_proposal` en `api/contrataciones/[id]/route.ts` (sin count, sin `CAPACITY`, sin 409) y `workflow.ts` (borrar `hasJobCapacity` y `activeJobsCount`); test del cupo fuera.
  - Depende de: —
  - Resuelve: RF-03, RF-04 · CA-05
  - Validación: grep sin `hasJobCapacity` ni "tres trabajos"; aceptar un cuarto trabajo en dev (T5).

- [x] **T4 · Extender las propuestas pendientes ya enviadas**
  - Objetivo: que las pendientes previas al cambio también tengan 5 días desde su envío.
  - Alcance: `prisma/extender-propuestas.ts` (nuevo, idempotente) y nota de deploy en `README.md`.
  - Depende de: T1
  - Resuelve: RF-01 (decisión sobre pendientes)
  - Validación: dos corridas en dev; la primera ajusta, la segunda informa 0 cambios.

- [x] **T5 · Validación de criterios en dev**
  - Objetivo: comprobar CA-01 a CA-05 contra el servidor de desarrollo.
  - Alcance: script temporal `./tmp-propuestas.ts` para armar datos (propuestas de hace 4 y 6 días, pro con 3 trabajos en curso) y sesiones demo por cookie; borrar datos y script al final.
  - Depende de: T1–T4
  - Resuelve: CA-01 … CA-05
  - Validación: respuestas de la API y filas de la base registradas abajo.

- [x] **T6 · Build y regresiones**
  - Objetivo: que el build de producción pase y no se rompa lo vecino.
  - Alcance: `pnpm test`, `pnpm build` (con el dev apagado), rechazar → nueva propuesta, segunda propuesta vigente → 409.
  - Depende de: T5
  - Resuelve: regresiones del plan
  - Validación: salida de los comandos registrada abajo.

## Evidencia

<!-- Resultados reales de cada validación: comando o pasos, resultado observado y fecha. -->

Todo en local el 2026-09-18, contra `next dev` en :3000 con sesiones insertadas
por cookie (usuarios temporales `tmp-g1-*`, borrados al final junto con sus
trabajos y propuestas) y una copia de `dev.db` guardada antes de empezar.

| Tarea / criterio | Qué se hizo | Resultado observado |
| --- | --- | --- |
| T1 · CA-01 | `PATCH /api/contrataciones/{id}` `send_proposal` como el pro demo. | 201; `expiresAt − createdAt = 120,000 h`. Test `PROPOSAL_TTL_MS = 5 días` y `PROPOSAL_TTL_LABEL = "5 días"` en verde. |
| T2 · CA-04 | Propuesta por el pedido y por el chat (`POST /api/conversaciones/{id}/acuerdo`); lectura de `Message.text`. JS servido de `/mensajes`. | Los dos mensajes dicen "Vence en 5 días". Las dos ayudas de UI toman `PROPOSAL_TTL_LABEL`; `PROPOSAL_TTL_DAYS = 5` en el bundle; 0 apariciones de "3 días" en el JS y en `src`. |
| CA-02 | Aceptar una propuesta enviada hace 6 días. | 409 "La propuesta venció o ya no está disponible."; queda `expired`. |
| CA-03 | Aceptar una propuesta enviada hace 4 días. | 200; el trabajo pasa a `in_progress` con su reloj. |
| T3 · CA-05 | Pro con 3 trabajos en curso; el cliente acepta un cuarto (mismo pedido que CA-03). | 200; el pro queda con 4 en curso. Grep sin `hasJobCapacity`, `CAPACITY` ni "tres trabajos". |
| T4 | `extender-propuestas.ts` sobre una pendiente de hace 2 días con 72 h, dos corridas seguidas. | 1.ª: "Extendidas … 1" (queda en 120 h); 2.ª: "Extendidas … 0". Se agregó un margen de 1 min para no contar como extendidas las que ya nacieron con 5 días (en la primera prueba sumaba 2 ms y las contaba). |
| T6 · regresiones | Segunda propuesta con una vigente; rechazar y volver a proponer. | 409 "Ya hay una propuesta activa…"; rechazo 200 y la nueva 201. |
| T6 · tests | `corepack pnpm test` | 11 tests, 11 pass, 0 fail. |
| T6 · build | `rm -rf .next && corepack pnpm build` con el dev apagado. | Build completo sin errores. `tsc --noEmit` sin errores. |
| Logs | `preview_logs` del dev con nivel error. | Sin errores del servidor. |

**Pendiente fuera de este entorno:** correr `pnpm exec tsx prisma/extender-propuestas.ts`
una vez en producción después del deploy (anotado en el README).
