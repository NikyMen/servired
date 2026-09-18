# TASKS: Términos y condiciones y localidad al crear la cuenta

**SPEC:** [SPEC.md](SPEC.md) (Aprobada) · **PLAN:** [PLAN.md](PLAN.md) (Aprobado)
**Autorización para implementar:** dada por el usuario el 2026-09-18.

Leyenda: `[ ]` pendiente · `[x]` hecha y validada · `[!]` bloqueada (con motivo) · `[~]` hecha, con una parte que valida el usuario.

## Tareas

- [x] **T1 · Versión de términos y "al día"**
  - Objetivo: versión vigente, aceptación guardada por usuario y bloqueo de escrituras sin estar al día.
  - Alcance: esquema (`SiteText.version`, `User.termsVersion`, `User.termsAcceptedAt`); `site-text.ts` (`getTermsVersion`, `guardarTextoLegal`); `auth.ts` (`termsOk`, `pendienteDeAlta`, `interactionAccess`); las 5 rutas con chequeo manual; tests.
  - Depende de: —
  - Resuelve: RF-04, RF-06, RF-07 · CA-06
  - Validación: `db:push`; `pnpm test`; 403 en `POST /api/solicitudes` y en mensajes con un usuario desactualizado.

- [x] **T2 · Pantalla de aceptación**
  - Objetivo: completar el alta o re-aceptar desde cualquier página de cliente o pro.
  - Alcance: `TextoLegal.tsx` (compartido con `/terminos`), `CompletarAlta.tsx`, `completarAltaAction`, layouts `(client)` y `pro`.
  - Depende de: T1
  - Resuelve: RF-03, RF-06, RF-07 · CA-03, CA-05, CA-07
  - Validación: HTML con la pantalla para un usuario tipo OAuth, para `maria@servired.test` y tras una versión nueva; aceptar por la UI; sin pantalla para invitados y usuarios al día.

- [x] **T3 · Alta con email**
  - Objetivo: casilla obligatoria y localidad al crear la cuenta, sin perder lo cargado.
  - Alcance: `crear-cuenta/page.tsx`, `RegisterForm.tsx`, `registerAction`, `createPendingUser`, `AuthState.values`.
  - Depende de: T1
  - Resuelve: RF-01, RF-02, RF-04 · CA-01, CA-02
  - Validación: UI en el panel del navegador (sin casilla: frena el navegador y el servidor; completa: usuario con versión, fecha y Goya).

- [~] **T4 · Admin y configuración de producción**
  - Objetivo: publicar una versión nueva a propósito; documentar las claves de Google y Facebook.
  - Alcance: `saveSiteTextAction` → `guardarTextoLegal`, casilla y versión en la pestaña Legales; checklist en LANZAMIENTO y README.
  - Depende de: T1
  - Resuelve: RF-05, RF-08 · CA-04, CA-08
  - Validación: script con `guardarTextoLegal` (con y sin versión nueva). Pantalla de admin y login real con Google/Facebook: los prueba el usuario.

- [x] **T5 · Cierre**
  - Objetivo: build, regresiones y limpieza.
  - Alcance: `pnpm test`, `tsc`, `pnpm build` con el dev apagado; `/terminos` igual; usuarios de prueba borrados; demo restaurada.
  - Depende de: T1–T4
  - Resuelve: regresiones del plan
  - Validación: salida registrada abajo.

## Evidencia

<!-- Resultados reales de cada validación: comando o pasos, resultado observado y fecha. -->

Todo en local el 2026-09-18, con copia de `dev.db` guardada antes del `db push`.
Cuentas de prueba (`tmp-g4-*`) creadas por script con sesión por cookie; la
cuenta demo `maria@servired.test` y el texto de términos se restauraron al final
(María sin aceptar, sin localidad; la fila de términos borrada, versión 1).

| Tarea / criterio | Qué se hizo | Resultado observado |
| --- | --- | --- |
| T1 | `db push` (3 columnas); `corepack pnpm test` con `pendienteDeAlta`. | Sin pérdida de datos; 16/16. |
| T1 · CA-06 | `POST /api/solicitudes` con la cuenta tipo Google, con María y con la cuenta al día; `POST /api/conversaciones/{id}/mensajes` con María. | Desactualizadas: 403 "Aceptá los términos actualizados para seguir." en las dos rutas (una por `interactionAccess`, otra por chequeo manual). Al día: 201. |
| T2 · CA-03 | HTML de `/` con una cuenta creada como la crea la vuelta de Google (verificada, sin términos ni localidad). | Pantalla "Completá tu alta" con la casilla y el `<select>` de localidad. |
| T2 · CA-07 | HTML de `/` con `maria@servired.test` (cuenta existente). | "Completá tu alta" con casilla y localidad. |
| T2 · regresión | Invitado en `/`; cuenta al día en `/` y en `/pro`; `/terminos` como invitado. | Sin pantalla en los tres casos; `/terminos` sigue mostrando el texto (ahora con el componente compartido). |
| T2 · CA-05 (UI) | Con la cuenta al día y una versión nueva publicada: en el navegador, enviar sin tildar y después tildando. | Título "Actualizamos los términos" sin `<select>`; sin casilla, `valueMissing` frena el envío; al aceptar la pantalla se cierra y el scroll se libera. Con la cuenta tipo Google: aceptó eligiendo Goya → `termsVersion` vigente, Goya. |
| T2 · `next start` | Aceptar con María en el build de producción. | La pantalla se cierra en 500 ms. En `next dev` una vez quedó abierta: el dev recompila con cada escritura en `dev.db` (ruido del entorno, ver nota); al recargar ya no aparecía y el dato estaba guardado. |
| T2 · versión cambiada al leer | En `next start`: pantalla abierta con la versión 3, se publica la 4 por script, se acepta. | "Los términos cambiaron mientras los leías…"; la cuenta sigue en la versión 2. |
| T2 · 360 × 740 | Rectángulos de la pantalla en `/mensajes`. | Texto con scroll propio (1620 px en 351); localidad, casilla, "Aceptar" y "Cerrar sesión" dentro del viewport. |
| T3 · CA-01 | UI en `/crear-cuenta`: todo cargado menos la casilla; después sin `required` para llegar al servidor. | El navegador frena (`valueMissing`); el servidor responde "Para crear la cuenta tenés que aceptar…", no crea la cuenta y repone nombre, email y Goya (la contraseña no). El enlace abre `/terminos` en otra pestaña. |
| T3 · CA-02 | UI: alta completa con Goya y la casilla. | Redirige a `/onboarding`; la cuenta queda `email_pending` con `termsVersion` vigente, `termsAcceptedAt` y Goya. |
| T4 · CA-04 | `guardarTextoLegal` sin versión nueva; HTML de la cuenta al día. | La versión sigue en 1 y no aparece la pantalla. |
| T4 · CA-05 (lógica) | `guardarTextoLegal` con versión nueva. | Versión 2; la cuenta al día pasa a ver "Actualizamos los términos" y la API le da 403. |
| T4 · admin y OAuth real | **No ejecutado por el agente.** La casilla "Publicar como versión nueva" está en `/admin?tab=legales` (pide la contraseña de administración). Google/Facebook necesitan las claves de producción (CA-08). | Pendiente del usuario. Configuración documentada en el README y en la checklist de LANZAMIENTO. |
| T5 | `tsc --noEmit`, `corepack pnpm test`, `rm -rf .next && corepack pnpm build` con el dev apagado; logs de error de dev y de `next start`. | Sin errores; 16/16; build completo; sin errores del servidor. |

**Nota del entorno:** con `next dev`, cada escritura en `prisma/dev.db` (incluso
desde un script) dispara "Compiled" y un Fast Refresh en el navegador, que puede
abortar el `router.refresh()` de la pantalla. En `next start` no pasa. Las
pruebas de UI que dependen de refrescar se confirmaron con el build de producción.
