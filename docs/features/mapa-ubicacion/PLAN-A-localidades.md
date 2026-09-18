# PLAN: Mapa y ubicación, parte A: localidades

**SPEC de referencia:** [SPEC.md](SPEC.md) (RF-01, RF-02, RF-03 · CA-01, CA-02). La parte B tiene su propio plan.
**Versión de la spec revisada:** Aprobada el 2026-09-18 (rama `tanda-lanzamiento`, después de `68920c0`)
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
| Esquema | `prisma/schema.prisma` | `User` no tiene ubicación. `KycCase` guarda `country`/`province`/`locality` como texto (defaults "Argentina"/"Corrientes"/"Corrientes Capital"). `Professional.zone` es texto obligatorio; `latitude`/`longitude` opcionales. |
| Alta de oferente (API) | `src/app/api/onboarding/route.ts` | l.24-26 lee `country`/`province`/`locality` del form; **l.39 rechaza todo lo que no sea "Corrientes Capital, Corrientes, Argentina"**; l.111-112 fija `zone: "Corrientes Capital, Corrientes"` al crear y al actualizar el `Professional`. El orden de validación es: datos personales → localidad → CUIL/DNI → rubros → foto → archivos → frase del video. |
| Alta de oferente (form) | `src/components/ProfessionalOnboardingForm.tsx` | l.166 manda país, provincia y localidad fijos; l.207 muestra tres `<select>` deshabilitados con esos valores. |
| Página que monta el form | `src/app/pro/page.tsx` (l.30-40) | Arma `initial` con los datos del KYC anterior; ahí se agregan la lista de localidades y la del usuario. |
| Edición del perfil | `src/app/api/perfil/route.ts` (l.49) | Pisa `zone: "Corrientes"` en cada guardado (se pierde lo que dejó el alta). |
| Selector de punto | `src/components/MapPicker.tsx` + `MapPickerInner.tsx` | Leaflet con `ssr:false`; recibe `latitude`, `longitude`, `onChange`. Se reusa en administración. |
| Frase del video | `src/app/api/kyc/video-challenge/route.ts` → `createVideoChallenge` | La emite el servidor para la sesión: permite probar el alta completa sin conocer secretos. |
| Validación de archivos KYC | `src/lib/kyc.ts` → `saveKycDocument` (l.159) | Mira `file.type` y los primeros bytes; se puede probar con archivos mínimos válidos. |
| Seed | `prisma/seed.ts` | **Borra tablas**: nunca se corre en producción. Las localidades base no pueden depender de él. |
| Patrón de admin con error visible | `src/components/AdminSoporte.tsx` + `saveSoporteAction` | `useActionState` que devuelve `{ error, values }` (del grupo 2). Se repite para el alta de localidades. |

**Convenciones y patrón de referencia:**
- Lógica con base en `src/lib/*` y acciones delgadas que agregan `requireAdmin()` y `revalidatePath`, como `soporte.ts` y `saveSoporteAction`.
- Reglas puras testeadas en `tests/rules.test.ts`.
- `pnpm db:push` para cambios de esquema, con campos opcionales o con default, y después reiniciar el dev.

## Solución propuesta

<!-- Explica el enfoque y sus motivos. Describe las responsabilidades y el
recorrido de datos y eventos hasta la interfaz. Usa un diagrama si aporta claridad. -->

1. **Modelo `Locality` (RF-01).**
   - Campos: `id`, `name`, `province`, `latitude`, `longitude`, `active` (default true), `sortOrder` (default 0), `createdAt`, `@@unique([name, province])`.
   - `User.localityId String?` con relación `onDelete: SetNull`. Es opcional porque las cuentas existentes no tienen localidad; el grupo 4 se la pide.
   - Se agrega ahora porque el alta de oferente ya tiene que guardarla (RF-03), y el grupo 4 (alta) y la parte B (mapa) la leen de ahí.
2. **Lista base sin seed.** `src/lib/localidades.ts`:
   - `LOCALIDADES_BASE`: las localidades de Corrientes más Resistencia y Barranqueras, con el punto aproximado del centro.
   - `asegurarLocalidades()`: si la tabla está vacía, crea la lista base (idempotente por `@@unique`).
   - `getLocalidades({ incluir? })`: activas ordenadas por `sortOrder` y nombre, más la del usuario aunque esté desactivada.
   - `resolverLocalidad(id, actualId)`: devuelve la localidad si está activa o si es la que el usuario ya tenía (RF-02: "la conservan").
   - `zonaDe(localidad)`: `"{nombre}, {provincia}"`.
   - Reglas puras de validación: nombre y provincia de 2 a 60 caracteres; lat/lng dentro de Argentina (lat −56…−21, lng −74…−53).
3. **Alta de oferente (RF-03).**
   - El form pasa a un solo `<select name="localityId">` con las localidades de la lista. Provincia y país se muestran como texto deducido de la elección. Por defecto queda la del usuario o Corrientes Capital.
   - La API cambia la regla de l.39 por `resolverLocalidad`.
   - Guarda en `KycCase` los textos `country: "Argentina"`, `province` y `locality` de la localidad elegida (el expediente sigue teniendo texto). También guarda `User.localityId` y `Professional.zone = zonaDe(localidad)`.
   - El form deja de mandar `country`/`province`/`locality` sueltos.
4. **Edición del perfil.** `api/perfil` deja de pisar `zone` con "Corrientes": toma `zonaDe` de la localidad del usuario y, si no tiene, conserva la que había.
5. **Administración (RF-02).**
   - Pestaña **Localidades** con un componente de cliente `AdminLocalidades.tsx`.
   - Alta: nombre, provincia (default "Corrientes") y punto con `MapPicker`. `useActionState` muestra el motivo si hay duplicado o datos inválidos.
   - Lista: nombre, provincia, cuántos usuarios la tienen, estado, un botón Activar/Desactivar (un form por fila, sin botones con `name`, por el gotcha de React 19) y **corregir el punto** (confirmado).
   - Acciones nuevas en `admin/actions.ts`: `createLocalityAction`, `toggleLocalityAction`, `moveLocalityAction`, que delegan en `localidades.ts`.

```
LOCALIDADES_BASE ─asegurarLocalidades()─▶ Locality ◀─ Admin › Localidades (alta · activar · punto)
                                              │
            /pro (form de alta) ◀─getLocalidades()─┤
                  │ localityId                      │
                  ▼                                 │
       api/onboarding ─resolverLocalidad()─▶ User.localityId · KycCase textos · Professional.zone
       api/perfil ─zonaDe(user.locality)─▶ Professional.zone
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
| `prisma/schema.prisma` | Modificar | Modelo `Locality`; `User.localityId?` + relación. | RF-01 |
| `src/lib/localidades.ts` | Crear | Lista base, asegurar, listar, resolver, zona y validación. | RF-01, RF-02, RF-03 |
| `src/app/api/onboarding/route.ts` | Modificar | Localidad elegida en vez de la fija; guarda `localityId` y `zone`. | RF-03 |
| `src/components/ProfessionalOnboardingForm.tsx` | Modificar | `<select>` de localidad; resumen del paso 4 con la localidad. | RF-03 |
| `src/app/pro/page.tsx` | Modificar | Pasa `localidades` y `localityId` inicial al form. | RF-03 |
| `src/app/api/perfil/route.ts` | Modificar | `zone` desde la localidad del usuario. | RF-03 (coherencia) |
| `src/app/admin/actions.ts` | Modificar | `createLocalityAction`, `toggleLocalityAction`, `moveLocalityAction`. | RF-02 |
| `src/components/AdminLocalidades.tsx` | Crear | Alta con mapa, lista, activar/desactivar, mover el punto. | RF-02 |
| `src/app/admin/page.tsx` | Modificar | Pestaña "Localidades". | RF-02 |
| `tests/rules.test.ts` | Modificar | Validación y zona (puros). | RF-01, RF-02 |

## Datos y contratos

<!-- Completa solo lo aplicable. Si un punto no aplica, indica el motivo. -->

- **Modelos y contratos de entrada y salida:**
  - `POST /api/onboarding` pasa a recibir `localityId` en vez de `country`/`province`/`locality`. Si la localidad no existe o está inactiva (y no es la del usuario), responde 422 "Elegí una localidad de la lista.".
  - Las acciones de admin devuelven `{ error?, ok?, values }`, como la de soporte.
- **Identificadores, relaciones y restricciones:**
  - `Locality @@unique([name, province])`.
  - `User.locality` con `onDelete: SetNull`. No se borran localidades desde la UI, solo se desactivan.
- **Origen de los datos mostrados y transformaciones:**
  - Lista base en código; lo agregado por administración, en la base.
  - `zone` se deriva del nombre y la provincia.
  - Los puntos de la lista base son aproximados al centro de cada localidad. Alcanza para los 20 km de la parte B y se pueden corregir desde administración.
- **Persistencia, consultas y actualizaciones:** `getLocalidades` es una consulta chica (pocas decenas de filas), envuelta en `cache` por request. `asegurarLocalidades` hace un `count` y, solo si da 0, `createMany`.
- **Convivencia entre datos locales y remotos:** no aplica.
- **Compatibilidad y migraciones de datos existentes:**
  - `db push` agrega una tabla y una columna opcional, sin pérdida de datos. Vale para la base de prod, igual que en los grupos anteriores.
  - Los profesionales existentes quedan con `localityId` null y con el `zone` que ya tenían. La primera vez que editen el perfil, `zone` no se pisa. La parte B los ubica por su punto o por Corrientes Capital.
  - **Asignar Corrientes Capital a los profesionales existentes** (confirmado): todos entraron con esa localidad fija. Se hace con un script de una sola corrida, `prisma/asignar-localidad-pros.ts` (idempotente, solo donde `localityId` es null y el KYC dice "Corrientes Capital").

## Estado, operaciones y errores

<!-- Cómo se implementan los comportamientos aprobados en la spec.
Referencia RF/CA y aplica las consideraciones relevantes de MOBILE_GUIDELINES.md. -->

- **Gestión del estado de interfaz y navegación:** el `<select>` es parte del estado local del form multi-paso, que ya existe. Cambiar de paso no pierde la elección.
- **Conservación y restauración del estado:** al reentrar a `/pro` para re-verificar, el form arranca con la localidad guardada del usuario.
- **Ejecución, concurrencia y cancelación de operaciones:** en admin, el botón se deshabilita mientras `isPending`. Dos altas iguales simultáneas chocan con `@@unique`, y la segunda devuelve "Ya existe esa localidad en esa provincia.".
- **Errores, reintentos y prevención de duplicados:**
  - Si la lista viene vacía (no debería pasar), el form muestra "No pudimos cargar las localidades" y no deja avanzar al envío.
  - Si el mapa de admin no carga, el alta no se puede enviar porque exige un punto marcado.
- **Otras consideraciones mobile aplicables y su solución:**
  - `<select>` nativo, cómodo en el celular.
  - El mapa de admin es el mismo `MapPicker` que ya se usa en el perfil.

## Dependencias y configuración

<!-- Librerías, servicios, permisos o configuración afectados. Verifica compatibilidad
con el proyecto y justifica las incorporaciones. No agregues dependencias por defecto. -->

- Sin dependencias nuevas.
- Deploy:
  - `npx prisma db push` (como siempre, **nunca** `pnpm setup`).
  - Una vez, `pnpm exec tsx prisma/asignar-localidad-pros.ts`.
  - La lista base se crea sola la primera vez que se pide.

## Estrategia de validación

<!-- Una fila por criterio de la spec. Selecciona el método capaz de demostrarlo:
test unitario, integración, UI o prueba manual. No todos requieren todos los métodos.
Identifica tests existentes y separa los nuevos propuestos. Incluye regresiones relevantes.
Una captura aislada no demuestra persistencia ni ausencia de peticiones de red. -->

| Criterio | Método y test existente o propuesto | Entorno y datos necesarios | Evidencia prevista |
| --- | --- | --- | --- |
| CA-01 (alta de oferente) | Integración: HTML de `/pro` con un usuario sin perfil (el `<select>` trae todas las activas). `POST /api/onboarding` **completo** con localidad Goya: frase del video pedida a `/api/kyc/video-challenge` con la sesión, PNG y WebM mínimos válidos, CUIL/DNI de prueba. Después, `POST` con una localidad inactiva y con un id inventado. | Dev :3000; usuario temporal verificado con sesión por cookie; localidad de prueba desactivada. | Goya: 200 `pending`, `User.localityId` = Goya, `KycCase.locality` = "Goya", `Professional.zone` = "Goya, Corrientes". Inactiva o inventada: 422 con el motivo. |
| CA-01 (alta de usuario) | Queda para el grupo 4, que agrega el `<select>` al registro. | — | Se registra allá. |
| CA-02 | Script sobre las funciones de `localidades.ts` que usan las acciones: crear con punto, duplicar (error), desactivar (desaparece de `getLocalidades` y un usuario que la tenía la sigue viendo), reactivar. Unitarios de la validación. **La pantalla de admin la recorre el usuario** (pide su contraseña). | Dev; datos temporales. | Salidas del script; tests en verde. |
| Script de pros existentes | Correrlo dos veces en dev. | Dev con los pros del seed. | 1.ª corrida: N asignados; 2.ª: 0. |

**Comprobaciones de regresión:**
- Editar el perfil del pro sigue funcionando y ya no pisa `zone`.
- El alta con datos inválidos sigue devolviendo sus mensajes.
- `pnpm test` y `pnpm build`.
- Borrar los archivos KYC de prueba de `data/kyc` y la foto subida.

**Comandos verificados para compilar y ejecutar tests:**
- `corepack pnpm test` y `corepack pnpm exec tsc --noEmit`.
- `corepack pnpm db:push` y reiniciar el dev.
- `rm -rf .next && corepack pnpm build` con el dev apagado.

**Pruebas en dispositivo, emulador o simulador:** no hacen falta: es un `<select>` nativo y un mapa que ya se usa.

**Limitaciones del entorno:** `/admin` pide la contraseña de administración, que el agente no ingresa. La lógica se prueba por script y la pantalla la prueba el usuario.

<!-- Esta sección planifica la validación. Durante la implementación, registra
en TASKS.md o en el informe de validación acordado los resultados y evidencias
reales. Distingue pruebas ejecutadas, fallidas, no ejecutadas y bloqueadas.
Compilar o tener tests en verde no sustituye revisar los criterios de la spec. -->

## Orden de implementación

<!-- Etapas y dependencias principales. El desglose ejecutable se escribe en TASKS.md.
Incluye puntos de comprobación para avanzar con cambios pequeños. -->

1. **Esquema y `localidades.ts`**, con los tests puros. Comprobación: `db:push`, `pnpm test`, y la lista base creada al primer pedido.
2. **Alta de oferente** (form, página y API) y el `zone` del perfil. Comprobación: CA-01 completo por la API.
3. **Administración:** acciones, componente y pestaña. Comprobación: CA-02 por script.
4. **Script de pros existentes.** Comprobación: dos corridas.
5. **Cierre:** build, limpieza (usuarios, archivos, localidades de prueba) y evidencia en TASKS.

**Subagentes:** no hacen falta.

## Riesgos y decisiones pendientes

<!-- Riesgos concretos de esta solución y cómo se resolverán, sin listas genéricas.
Escribe Ninguna en las decisiones pendientes cuando estén resueltas. -->

- **Riesgos y medidas acordadas:**
  - **Puntos aproximados:** los de la lista base salen de las coordenadas públicas del centro de cada ciudad, con un error de uno o dos km. Alcanza para un radio de 20 km, y administración los puede corregir.
  - **`db push` en prod:** agrega tabla y columna opcional, sin riesgo de pérdida. Igual se hace el backup de la base, como en cada deploy.
  - **Alta de oferente con archivos de prueba:** quedan en `data/kyc` y en `public/uploads`; se borran al terminar y se registra en la evidencia.
- **Decisiones pendientes:** Ninguna. Confirmadas por el usuario el 2026-09-18: administración puede corregir el punto (RF-02 ajustado en la spec) y el script asigna Corrientes Capital a los profesionales existentes.

<!-- ANTES DE SOLICITAR APROBACIÓN
Comprueba que el plan cubre los requisitos, respeta las exclusiones, reutiliza
componentes verificados y permite demostrar todos los criterios de aceptación.
Resuelve dudas y marcadores pendientes. Si la spec cambió, revisa su impacto.
Tras aprobar el plan, deriva TASKS.md con IDs, dependencias, referencias a RF/CA
y comprobaciones. No marques una tarea terminada sin realizar su validación;
si está bloqueada, registra el motivo.
-->
