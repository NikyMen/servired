# TASKS: Mapa y ubicación, parte A: localidades

**SPEC:** [SPEC.md](SPEC.md) (Aprobada) · **PLAN:** [PLAN-A-localidades.md](PLAN-A-localidades.md) (Aprobado)
**Autorización para implementar:** dada por el usuario el 2026-09-18, con las dos decisiones (corregir el punto; asignar Corrientes Capital a los pros existentes).

Leyenda: `[ ]` pendiente · `[x]` hecha y validada · `[!]` bloqueada (con motivo) · `[~]` hecha, con una parte que valida el usuario.

## Tareas

- [x] **T1 · Modelo y lista base**
  - Objetivo: que existan las localidades con su punto y que cada usuario pueda tener la suya.
  - Alcance: `Locality` y `User.localityId` en `prisma/schema.prisma`; `src/lib/localidades.ts` (lista base, asegurar, listar, resolver, zona, validación); tests puros.
  - Depende de: —
  - Resuelve: RF-01
  - Validación: `db:push` sin pérdida; `pnpm test`; la lista base se crea sola al primer pedido y no se duplica.

- [x] **T2 · Alta de oferente con localidad**
  - Objetivo: elegir cualquier localidad activa y guardarla en la cuenta, el expediente y la zona.
  - Alcance: `ProfessionalOnboardingForm.tsx`, `pro/page.tsx`, `api/onboarding/route.ts`; `api/perfil/route.ts` deja de pisar `zone`.
  - Depende de: T1
  - Resuelve: RF-03 · CA-01 (alta de oferente)
  - Validación: `<select>` en el HTML de `/pro`; `POST /api/onboarding` completo con Goya (200 y datos guardados); con localidad inactiva o inventada (422).

- [~] **T3 · Administración de localidades**
  - Objetivo: agregar, corregir el punto y activar/desactivar desde el panel.
  - Alcance: funciones en `localidades.ts`; `createLocalityAction`, `toggleLocalityAction`, `moveLocalityAction`; `AdminLocalidades.tsx`; pestaña en `admin/page.tsx`.
  - Depende de: T1
  - Resuelve: RF-02 · CA-02
  - Validación: script sobre las mismas funciones (alta, duplicado, mover, desactivar, conservar, reactivar); tests de validación. Pantalla: la prueba el usuario.

- [x] **T4 · Localidad de los profesionales existentes**
  - Objetivo: dejar a los pros existentes en Corrientes Capital.
  - Alcance: `prisma/asignar-localidad-pros.ts` (idempotente) y nota de deploy en el README.
  - Depende de: T1
  - Resuelve: decisión confirmada del plan
  - Validación: dos corridas en dev (N y 0).

- [x] **T5 · Cierre**
  - Objetivo: build, regresiones y limpieza.
  - Alcance: `pnpm test`, `tsc`, `pnpm build` con el dev apagado; editar el perfil de un pro sin que se pierda `zone`; borrar usuarios, archivos y localidades de prueba.
  - Depende de: T1–T4
  - Resuelve: regresiones del plan
  - Validación: salida registrada abajo.

## Evidencia

<!-- Resultados reales de cada validación: comando o pasos, resultado observado y fecha. -->

Todo en local el 2026-09-18, contra `next dev` en :3000, con una copia de
`dev.db` guardada antes del `db push`. Usuarios, sesiones, archivos del KYC,
foto y localidades de prueba borrados al final; scripts temporales borrados.

| Tarea / criterio | Qué se hizo | Resultado observado |
| --- | --- | --- |
| T1 | `corepack pnpm db:push`; `corepack pnpm test` con los tests nuevos (lista base y validación). Primer pedido de localidades. | El esquema suma la tabla `Locality` y `User.localityId`, sin pérdida. 15 tests, 15 pass. Se crearon 30 localidades, todas activas, y no se duplican al volver a pedir. |
| T2 · CA-01 | Payload que recibe el form de `/pro` con un usuario sin perfil. | Recibe exactamente las 30 activas (Capital primero, después por nombre, Chaco incluido); no incluye la desactivada. El desplegable está en el paso 2, que se dibuja del lado del navegador, por eso se miró el payload y no el HTML. |
| T2 · CA-01 | `POST /api/onboarding` completo (frase del video pedida a la API, PNG y WebM mínimos, CUIL/DNI de prueba, rubro Plomería). | Id inventado: 422 "Elegí una localidad de la lista."; localidad desactivada: 422 igual; **Goya: 200 `pending`**, con `User.locality = Goya`, `KycCase` Argentina / Corrientes / Goya y `Professional.zone = "Goya, Corrientes"`. |
| T2 · regresión | `PATCH /api/perfil` con el pro demo, sin localidad y después con Goya (restaurado al final). | Sin localidad: la zona queda como estaba ("CABA y alrededores"; antes se pisaba con "Corrientes"). Con Goya: "Goya, Corrientes". |
| T3 · CA-02 (lógica) | Script sobre `crearLocalidad`, `moverLocalidad`, `cambiarLocalidadActiva`, `getLocalidades` y `resolverLocalidad`, que son las funciones que llaman las acciones. | Alta ok; duplicada: "Ya existe…"; sin punto o fuera de Argentina: "Marcá el punto…"; mover guarda el punto nuevo; desactivada: fuera de la lista general pero presente para quien la tiene; `resolverLocalidad` la acepta solo si es la del usuario. |
| T3 · pantalla de admin | **No ejecutado por el agente:** `/admin?tab=localidades` pide la contraseña de administración. | Pendiente del usuario: agregar una marcando el mapa, intentar sin marcar (tiene que mostrar el motivo), corregir un punto y desactivar/activar. `/admin` compila en el build. |
| T4 | `pnpm exec tsx prisma/asignar-localidad-pros.ts` dos veces. | 1.ª: 2 asignados (los dos pros con KYC en Corrientes Capital); 2.ª: 0. Los pros del seed no tienen KYC y quedan sin localidad: la parte B los ubica por su punto o por Capital. |
| T5 | `tsc --noEmit`, `corepack pnpm test`, `rm -rf .next && corepack pnpm build` con el dev apagado; `preview_logs` nivel error. | Sin errores de tipos; 15/15; build completo; sin errores del servidor. |

**Ajuste durante la validación:** un alta duplicada dejaba un `prisma:error` en
el log aunque se manejaba bien. Ahora se busca antes de crear; el `catch` del
error de unicidad queda por si dos altas iguales llegan a la vez.
