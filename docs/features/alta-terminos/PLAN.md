# PLAN: Términos y condiciones y localidad al crear la cuenta

**SPEC de referencia:** [SPEC.md](SPEC.md)
**Versión de la spec revisada:** Aprobada el 2026-09-18 (rama `tanda-lanzamiento`, después de `9371ec5`)
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
| Formulario de alta | `src/components/auth/RegisterForm.tsx` | Botones de Google y Facebook, nombre, email y contraseña, con `useActionState(registerAction)`. **Sin términos ni localidad.** Los inputs no son controlados: React 19 los vacía después de un error. |
| Página de alta | `src/app/(auth)/crear-cuenta/page.tsx` | Arma `next` y `providerType` y monta el form. Ahí se agrega la lista de localidades. |
| Acción de alta | `src/app/(auth)/actions.ts` → `registerAction` (l.62), `createPendingUser` (l.94) | Crea el usuario en `email_pending` **sin sesión** y manda el código. `createPendingUser` retoma una fila sin verificar (rama P2002, l.103-113). `AuthState = { error?, field? }` (l.12). |
| Alta por Google/Facebook | `src/app/api/auth/callback/[provider]/route.ts` (l.55-66) | Crea el usuario `cliente` sin pedir nada más y, si el email viene verificado, crea la sesión. **No se toca:** el alta se completa al entrar al sitio (ver solución). |
| Sesión | `src/lib/auth.ts` → `getSessionUser` (cacheado por request), `interactionAccess()` (l.112) | `SessionUser` ya trae `localityId` (grupo 3). `interactionAccess` da 403 si `!canInteract`. La usan 14 rutas de escritura. |
| Rutas que miran `canInteract` a mano | `api/conversaciones/[id]/acuerdo` (l.32), `api/conversaciones/[id]/mensajes` (l.59), `api/pagos/[id]/resena` (l.9), `api/perfil` (l.11), `api/pro/perfil` (l.28) | Escriben sin pasar por `interactionAccess`: también necesitan el chequeo de términos. |
| Texto legal | `src/lib/site-text.ts` → `getSiteText`, `parseTexto`, `TERMS_SLUG`, `TERMS_DEFAULT`; modelo `SiteText` | Texto editable, sin número de versión. `parseTexto` arma los bloques que dibuja `/terminos`. |
| Página de términos | `src/app/(client)/terminos/page.tsx` | Dibuja los bloques; su render se reusa en la pantalla de aceptación. |
| Guardado del texto | `src/app/admin/actions.ts` → `saveSiteTextAction` (l.45); pestaña `legales` en `admin/page.tsx` | Upsert por `slug`, sin versión. |
| Localidades | `src/lib/localidades.ts` → `getLocalidades`, `resolverLocalidad` (grupo 3) | Lista para el `<select>` y validación de la elegida. |
| Layouts con sesión | `src/app/(client)/layout.tsx`, `src/app/pro/layout.tsx` | Ya leen `getSessionUser()`; ahí se monta la pantalla de aceptación. |
| Salir | `logoutAction` en `(auth)/actions.ts` (l.148), usado por `UserMenu` | Se reusa en la pantalla de aceptación. |

**Convenciones y patrón de referencia:**
- Lógica en `src/lib`, acciones delgadas y reglas puras testeadas en `tests/rules.test.ts`.
- `useActionState` que devuelve lo enviado para no perderlo (grupos 2 y 3).
- Campos nuevos opcionales o con default para `db push`.

## Solución propuesta

<!-- Explica el enfoque y sus motivos. Describe las responsabilidades y el
recorrido de datos y eventos hasta la interfaz. Usa un diagrama si aporta claridad. -->

1. **Versión de los términos (RF-04, RF-05).**
   - Esquema: `SiteText.version Int @default(1)`; `User.termsVersion Int?` y `User.termsAcceptedAt DateTime?`.
   - En `site-text.ts`: `getTermsVersion()` (cacheada por request; vale 1 si la fila no existe) y `guardarTextoLegal({ slug, title, body, nuevaVersion })`, que suma 1 a `version` solo si `nuevaVersion`.
   - `saveSiteTextAction` pasa a delegar en `guardarTextoLegal`.
   - La pestaña Legales muestra "Versión vigente: N" y la casilla "Publicar como versión nueva (todos vuelven a aceptar)", destildada por defecto.
2. **"Al día" en la sesión (RF-06, RF-07).**
   - `getSessionUser` suma `termsOk = (user.termsVersion ?? 0) >= vigente`.
   - Regla pura nueva en `auth.ts`: `pendienteDeAlta(user)`. Devuelve `"Aceptá los términos actualizados para seguir."` si falta aceptar, `"Elegí tu localidad para seguir."` si falta la localidad, o null.
   - `interactionAccess()` la aplica después de `canInteract`, con 403. Las 5 rutas que miran `canInteract` a mano suman la misma línea.
   - Las cuentas existentes tienen `termsVersion = null`, así que no están al día: RF-07 sale solo, sin migración.
3. **Pantalla de aceptación (RF-03, RF-06, RF-07).**
   - Componente de cliente `src/components/CompletarAlta.tsx`, montado por los layouts de `(client)` y `pro` cuando hay sesión y `pendienteDeAlta(user)` no es null. Recién ahí se leen el texto y las localidades.
   - Es un diálogo a pantalla completa (`fixed inset-0 z-[60]`, `role="dialog" aria-modal`, bloquea el scroll de fondo).
   - Título: "Completá tu alta" si nunca aceptó; "Actualizamos los términos" si aceptó una versión anterior.
   - Contenido: el texto con scroll propio, la casilla (nunca tildada de antemano), el `<select>` de localidad solo si falta, "Aceptar y seguir" y "Cerrar sesión" (`logoutAction`).
   - Acción nueva `completarAltaAction` en `(auth)/actions.ts`:
     - exige sesión y la casilla;
     - si le falta localidad, la valida con `resolverLocalidad`;
     - compara la versión que se mostró (campo oculto) con la vigente: si cambió en el medio, devuelve "Los términos cambiaron, revisalos de nuevo" y no guarda;
     - guarda `termsVersion`, `termsAcceptedAt` y `localityId`, y hace `revalidatePath("/", "layout")`.
   - Así se cubre la primera entrada con Google o Facebook sin tocar el callback: el usuario nuevo llega con `termsVersion = null`.
4. **Alta con email (RF-01, RF-02).**
   - `crear-cuenta/page.tsx` pasa `getLocalidades()` al form.
   - `RegisterForm` suma el `<select name="localityId">` (arranca en Capital) y la casilla `acceptTerms` con `required`. El enlace "términos y condiciones" abre `/terminos` en otra pestaña, así no se pierde lo cargado.
   - `registerAction` valida los dos del lado del servidor. `createPendingUser` guarda `termsVersion` (la vigente), `termsAcceptedAt` y `localityId`, también en la rama que retoma un alta sin verificar.
   - `AuthState` suma `values` (nombre, email y localidad; **nunca la contraseña**) y el form los repone con `defaultValue` + `key`, así un error del servidor no borra lo escrito.
5. **Configuración de Google y Facebook en producción (RF-08).** No lleva código. Se documenta en la checklist de LANZAMIENTO y en el README:
   - `APP_URL`, `OAUTH_STATE_SECRET` y las claves de los dos proveedores;
   - las URL de retorno registradas;
   - la app de Facebook en modo Live.

```
Alta email ─registerAction─▶ User{termsVersion, termsAcceptedAt, localityId}
Google/FB ─callback (sin cambios)─▶ User{termsVersion:null} ─┐
Cuenta vieja / versión nueva ────────────────────────────────┤
                                                              ▼
layouts ─pendienteDeAlta(user)?─▶ <CompletarAlta> ─completarAltaAction─▶ User al día
API de escritura ─interactionAccess / chequeo manual─▶ 403 "Aceptá los términos…"
Admin › Legales ─guardarTextoLegal(nuevaVersion)─▶ SiteText.version++
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
| `prisma/schema.prisma` | Modificar | `SiteText.version`, `User.termsVersion`, `User.termsAcceptedAt`. | RF-04, RF-05 |
| `src/lib/site-text.ts` | Modificar | `getTermsVersion`, `guardarTextoLegal`. | RF-04, RF-05 |
| `src/lib/auth.ts` | Modificar | `termsOk` en la sesión, `pendienteDeAlta`, chequeo en `interactionAccess`. | RF-06, RF-07 |
| 5 rutas con chequeo manual (ver contexto) | Modificar | Una línea: `pendienteDeAlta(user)` → 403. | RF-06 |
| `src/components/CompletarAlta.tsx` | Crear | Pantalla de aceptación. | RF-03, RF-06, RF-07 |
| `src/components/TextoLegal.tsx` | Crear | Render de los bloques de `parseTexto`, compartido con `/terminos`. | RF-03, RF-06 |
| `src/app/(client)/terminos/page.tsx` | Modificar | Usa `TextoLegal` (sin cambio visible). | — (reuso) |
| `src/app/(client)/layout.tsx`, `src/app/pro/layout.tsx` | Modificar | Montan `CompletarAlta` cuando corresponde. | RF-03, RF-06, RF-07 |
| `src/app/(auth)/actions.ts` | Modificar | `registerAction`/`createPendingUser` con términos y localidad; `AuthState.values`; `completarAltaAction`. | RF-01, RF-02, RF-04 |
| `src/components/auth/RegisterForm.tsx`, `src/app/(auth)/crear-cuenta/page.tsx` | Modificar | Localidad, casilla y valores repuestos. | RF-01, RF-02 |
| `src/app/admin/actions.ts`, `src/app/admin/page.tsx` | Modificar | Casilla "versión nueva" y versión vigente. | RF-05 |
| `tests/rules.test.ts` | Modificar | `pendienteDeAlta` (puro). | RF-06, RF-07 |
| `docs/features/LANZAMIENTO.md`, `README.md` | Modificar | Configuración de OAuth en producción. | RF-08 |

## Datos y contratos

<!-- Completa solo lo aplicable. Si un punto no aplica, indica el motivo. -->

- **Modelos y contratos de entrada y salida:**
  - `registerAction` recibe además `localityId` y `acceptTerms`.
  - `completarAltaAction` recibe `acceptTerms`, `version` y `localityId`; devuelve `{ error? }`.
  - Las rutas de escritura suman un 403 con mensaje propio.
- **Identificadores, relaciones y restricciones:** `User.termsVersion` guarda el número de versión aceptado; se compara con `>=` contra la vigente.
- **Origen de los datos mostrados y transformaciones:** el texto y la versión salen de `SiteText` (o del texto por defecto, versión 1).
- **Persistencia, consultas y actualizaciones:** una consulta más por request (la versión vigente), cacheada; el texto y las localidades se leen solo cuando hay que mostrar la pantalla.
- **Convivencia entre datos locales y remotos:** no aplica.
- **Compatibilidad y migraciones de datos existentes:**
  - `db push` agrega tres columnas opcionales o con default, sin pérdida.
  - No hay migración de datos: que las cuentas existentes queden sin versión es justamente lo que dispara RF-07.

## Estado, operaciones y errores

<!-- Cómo se implementan los comportamientos aprobados en la spec.
Referencia RF/CA y aplica las consideraciones relevantes de MOBILE_GUIDELINES.md. -->

- **Gestión del estado de interfaz y navegación:**
  - La pantalla de aceptación está en el layout, así que aparece en cualquier ruta de cliente o pro, incluso al volver atrás o recargar, hasta aceptar.
  - Las pantallas de `(auth)`, `/admin` y la landing no la muestran.
- **Conservación y restauración del estado:**
  - En el alta, un error del servidor repone nombre, email y localidad. La contraseña se vuelve a escribir, a propósito: no se devuelve al navegador.
  - La casilla vacía o la localidad sin elegir las frena el navegador antes de enviar (`required`), así que no se pierde nada.
- **Ejecución, concurrencia y cancelación de operaciones:**
  - Botones deshabilitados mientras `pending`: dos toques no crean dos cuentas ni dos aceptaciones.
  - Si la versión cambió mientras se leía, se pide releer.
- **Errores, reintentos y prevención de duplicados:** mensajes junto al formulario y se puede reintentar; la aceptación es idempotente.
- **Otras consideraciones mobile aplicables y su solución:**
  - En 360 px el texto tiene scroll propio y los botones quedan fijos al pie del diálogo.
  - La casilla va dentro de un `<label>` para tener un área táctil cómoda.

## Dependencias y configuración

<!-- Librerías, servicios, permisos o configuración afectados. Verifica compatibilidad
con el proyecto y justifica las incorporaciones. No agregues dependencias por defecto. -->

- Sin dependencias nuevas.
- Producción (RF-08, checklist): `APP_URL=https://…`, `OAUTH_STATE_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `FACEBOOK_CLIENT_ID/SECRET` en `.env.local` del VPS. Las URL de retorno `…/api/auth/callback/google` y `…/facebook` registradas en las consolas; la app de Facebook en Live con permiso de email.
- Deploy: `npx prisma db push` (tres columnas nuevas).

## Estrategia de validación

<!-- Una fila por criterio de la spec. Selecciona el método capaz de demostrarlo:
test unitario, integración, UI o prueba manual. No todos requieren todos los métodos.
Identifica tests existentes y separa los nuevos propuestos. Incluye regresiones relevantes.
Una captura aislada no demuestra persistencia ni ausencia de peticiones de red. -->

| Criterio | Método y test existente o propuesto | Entorno y datos necesarios | Evidencia prevista |
| --- | --- | --- | --- |
| CA-01 | UI en el panel del navegador con `javascript_tool`: en `/crear-cuenta`, completar todo menos la casilla y enviar (el navegador lo frena); después sacar el `required` y enviar (el servidor lo frena, con los datos repuestos). | Dev :3000, sin sesión. | `validity.valueMissing`; mensaje del servidor; ningún usuario creado; nombre y email repuestos. |
| CA-02 | UI: alta completa con Goya y la casilla. | Igual; email temporal. | Usuario con `termsVersion` = vigente, `termsAcceptedAt` y `localityId` = Goya; redirige a `/onboarding`. |
| CA-03 | Integración: usuario creado como lo crea el callback (verificado, sin versión ni localidad) con sesión por cookie; HTML de `/` y `POST /api/solicitudes`. **El flujo real con Google no se puede probar en local: no hay claves.** | Dev; usuario temporal. | HTML con "Completá tu alta" y el `<select>` de localidad; la API da 403. |
| CA-04 | Script con `guardarTextoLegal` sin `nuevaVersion`, y el HTML de un usuario al día. Pantalla de admin: la prueba el usuario. | Dev. | La versión no cambia; sin pantalla de aceptación. |
| CA-05 | Script con `nuevaVersion`; el HTML del mismo usuario; aceptar desde la pantalla (UI con `requestSubmit` y la cookie de sesión). | Dev. | Versión N+1; aparece "Actualizamos los términos" sin `<select>`; al aceptar queda N+1 y la pantalla desaparece. |
| CA-06 | Integración: con el usuario desactualizado, `POST /api/solicitudes` y `POST /api/conversaciones/{id}/mensajes`. Unitarios de `pendienteDeAlta`. | Dev. | 403 "Aceptá los términos actualizados para seguir."; tests en verde. |
| CA-07 | Integración: sesión de `maria@servired.test` (cuenta existente, sin versión ni localidad). | Dev. | "Completá tu alta" con casilla y localidad. |
| CA-08 | **Manual en producción**, después de cargar las claves: entrar con Google y con Facebook. | VPS con claves. | Queda como pendiente del usuario en TASKS. |

**Comprobaciones de regresión:**
- Un usuario al día no ve la pantalla y sigue publicando.
- Un invitado no la ve.
- `/terminos` se ve igual.
- El login sigue andando.
- `pnpm test` y `pnpm build`.

**Comandos verificados para compilar y ejecutar tests:** `corepack pnpm db:push` (reiniciar el dev después), `corepack pnpm test`, `corepack pnpm exec tsc --noEmit`, `rm -rf .next && corepack pnpm build` con el dev apagado.

**Pruebas en dispositivo, emulador o simulador:** no hacen falta dispositivos; el diálogo en 360 px se mide con `javascript_tool` (texto con scroll, botones visibles).

**Limitaciones del entorno:**
- Sin claves de Google ni Facebook en local, el callback real no se ejecuta: se simula el usuario que crea.
- `/admin` pide la contraseña de administración: la casilla de versión nueva la prueba el usuario; la lógica, por script.

<!-- Esta sección planifica la validación. Durante la implementación, registra
en TASKS.md o en el informe de validación acordado los resultados y evidencias
reales. Distingue pruebas ejecutadas, fallidas, no ejecutadas y bloqueadas.
Compilar o tener tests en verde no sustituye revisar los criterios de la spec. -->

## Orden de implementación

<!-- Etapas y dependencias principales. El desglose ejecutable se escribe en TASKS.md.
Incluye puntos de comprobación para avanzar con cambios pequeños. -->

1. **Esquema, versión y "al día"** (`site-text.ts`, `auth.ts`, las 5 rutas, tests). Comprobación: `db:push`, `pnpm test`, CA-06.
2. **Pantalla de aceptación** (`TextoLegal`, `CompletarAlta`, `completarAltaAction`, layouts). Comprobación: CA-03, CA-05 y CA-07.
3. **Alta con email** (form, página, acción). Comprobación: CA-01 y CA-02.
4. **Admin y documentación** (casilla de versión, checklist de OAuth). Comprobación: CA-04 por script.
5. **Cierre:** build, limpieza y evidencia.

**Subagentes:** no hacen falta.

## Riesgos y decisiones pendientes

<!-- Riesgos concretos de esta solución y cómo se resolverán, sin listas genéricas.
Escribe Ninguna en las decisiones pendientes cuando estén resueltas. -->

- **Riesgos y medidas acordadas:**
  - **Al desplegar, todas las cuentas existentes ven la pantalla** en su próxima visita (es RF-07). Conviene avisarle al cliente para que no lo tome como un error.
  - **Una cuenta sin email verificado que entra por Facebook** ve la pantalla arriba de `/onboarding`. Puede aceptar y seguir verificando; no rompe el flujo.
  - **Rutas de escritura que no pasen por `interactionAccess`** en el futuro se saltearían el chequeo. Se deja documentado en `pendienteDeAlta`; las 5 actuales quedan cubiertas.
- **Decisiones pendientes:** Ninguna (las claves de producción las carga el cliente; están en la checklist).

<!-- ANTES DE SOLICITAR APROBACIÓN
Comprueba que el plan cubre los requisitos, respeta las exclusiones, reutiliza
componentes verificados y permite demostrar todos los criterios de aceptación.
Resuelve dudas y marcadores pendientes. Si la spec cambió, revisa su impacto.
Tras aprobar el plan, deriva TASKS.md con IDs, dependencias, referencias a RF/CA
y comprobaciones. No marques una tarea terminada sin realizar su validación;
si está bloqueada, registra el motivo.
-->
