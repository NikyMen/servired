# TASKS: Mensaje predeterminado de WhatsApp y botón "Necesito ayuda"

**SPEC:** [SPEC.md](SPEC.md) (Aprobada) · **PLAN:** [PLAN.md](PLAN.md) (Aprobado)
**Autorización para implementar:** dada por el usuario el 2026-09-18.

Leyenda: `[ ]` pendiente · `[x]` hecha y validada · `[!]` bloqueada (con motivo) · `[~]` hecha, con una parte que valida el usuario.

## Tareas

- [x] **T1 · Armador único de enlaces de WhatsApp**
  - Objetivo: una sola función pura para `wa.me`, el saludo del perfil, el mensaje de ayuda por defecto y la validación del número de soporte.
  - Alcance: `src/lib/whatsapp.ts` (nuevo) y tests en `tests/rules.test.ts`.
  - Depende de: —
  - Resuelve: RF-01, RF-03, RF-04 · CA-01, CA-05 (parte lógica)
  - Validación: `pnpm test` con casos de `waLink` (con y sin 54, con 0 inicial, con mensaje) y de `validSupportPhone`.

- [x] **T2 · Perfil y placas usan el armador**
  - Objetivo: el WhatsApp del perfil sale con el saludo; las placas siguen igual.
  - Alcance: `profesionales/[id]/page.tsx` y `components/AdPlate.tsx` (se borran sus helpers locales).
  - Depende de: T1
  - Resuelve: RF-01 · CA-01
  - Validación: `href` en el HTML del perfil con sesión de cliente; test de regresión del formato de las placas.

- [~] **T3 · Configuración del soporte**
  - Objetivo: administración carga número, mensaje y activo; un número inválido muestra el motivo y no se guarda.
  - Alcance: `src/lib/soporte.ts`, `saveSoporteAction` en `admin/actions.ts`, `components/AdminSoporte.tsx`, pestaña "Soporte" en `admin/page.tsx`.
  - Depende de: T1
  - Resuelve: RF-04 · CA-04, CA-05
  - Validación: tests de validación; cambios en la fila `ayuda` reflejados en el HTML. Pantalla de admin: la prueba el usuario.

- [x] **T4 · Botón flotante en todo el sitio**
  - Objetivo: "Necesito ayuda" a la izquierda en cliente, pro y cuenta, también para invitados, sin pisar otros elementos.
  - Alcance: `components/AyudaFlotante.tsx`, ícono en `components/icons.tsx`, layouts `(client)`, `pro`, `(auth)`.
  - Depende de: T3
  - Resuelve: RF-02, RF-03, RF-05 · CA-02, CA-03, CA-06
  - Validación: HTML de 5 páginas × 3 sesiones; rectángulos en 360 px y 1280 px.

- [x] **T5 · Cierre**
  - Objetivo: build, regresiones y limpieza.
  - Alcance: `pnpm test`, `tsc`, `pnpm build` con el dev apagado; borrar filas y scripts temporales.
  - Depende de: T1–T4
  - Resuelve: regresiones del plan
  - Validación: salida de los comandos registrada abajo.

## Evidencia

<!-- Resultados reales de cada validación: comando o pasos, resultado observado y fecha. -->

Todo en local el 2026-09-18, contra `next dev` en :3000, con sesiones de
`maria@servired.test` (cliente) y `martin@servired.test` (pro) insertadas por
cookie. La fila `ayuda` se guardó con `guardarSoporte`, la misma función que
llama `saveSoporteAction`. Sesiones, fila y script temporal borrados al final;
copia de `dev.db` guardada antes de empezar.

| Tarea / criterio | Qué se hizo | Resultado observado |
| --- | --- | --- |
| T1 | `corepack pnpm test` con los casos nuevos de `waLink` y `validSupportPhone`. | 13 tests, 13 pass. |
| T2 · CA-01 | HTML de `/profesionales/{Carlos López}` con sesión de cliente. | `https://wa.me/5493794000000?text=Hola%20Carlos%20L%C3%B3pez%2C%20te%20encontr%C3%A9%20en%20ServiRed%20y%20quer%C3%ADa%20consultarte%20por%20un%20trabajo.` |
| T2 · regresión | Perfil como invitado; test del formato de las placas (`waLink("3794123456", msg)`). | Invitado: sin enlace de WhatsApp (el teléfono sigue oculto). Placas: mismo `wa.me/549…?text=` que antes. |
| T3 · CA-05 (lógica) | `guardarSoporte` con "12345678". | `{ error: "El número tiene que tener 10 dígitos…" }` y la fila no se creó. |
| T3 · CA-04 | Guardar 3794111222 → cambiar a 3624555666 con mensaje propio → apagar → volver a guardar. | El `href` del botón pasó a `wa.me/5493624555666?text=Hola%2C%20tengo%20un%20problema…`; apagado: 0 botones en la portada. |
| T3 · pantalla de admin | **No ejecutado por el agente:** `/admin?tab=soporte` pide la contraseña de administración. | Pendiente del usuario: guardar "12345678" (tiene que mostrar el motivo y dejar lo escrito) y un número válido (tiene que decir "Guardado."). El build de `/admin` compila. |
| T4 · CA-02, CA-03 | Portada, perfil, `/mensajes`, `/pro` y `/entrar` × invitado, cliente y pro (15 pedidos). Sin fila de soporte, antes. | 15/15 con el botón y `wa.me/5493794111222?text=Hola%2C%20necesito%20ayuda%20con%20ServiRed.`. Sin fila: 0 botones. |
| T4 · CA-06, 360 × 780 | Rectángulos con `getBoundingClientRect` en la portada con sesión, en el perfil y en `/entrar` como invitado. | Ayuda 16–68 × 632–684; IA 292–344 × 632–684; Mensajes 292–344 × 608–660; barra inferior desde 721; barra "Contratar" desde 707: sin intersecciones. En `/entrar`: 712–764, único elemento fijo. |
| T4 · CA-06, 1280 × 800 | Lo mismo, recargando después del cambio de tamaño. | Píldora "¿Necesitás ayuda?" 24–222 × 728–776, texto visible; IA y Mensajes a la derecha, sin intersecciones. |
| T5 | `tsc --noEmit`, `corepack pnpm test`, `rm -rf .next && corepack pnpm build` con el dev apagado; `preview_logs` nivel error. | Sin errores de tipos; 13/13; build completo; sin errores del servidor. |

**Notas del entorno:** en el panel del navegador las animaciones quedan en el
primer cuadro, así que `main` queda con `translateY(10px)` y los `fixed` de
adentro (la barra "Contratar") se ven corridos. Para medir se apagó la
animación con `style.animation = "none"`; en un navegador real termina sola.
Después de cambiar el tamaño hubo que recargar para que se aplicaran las
media queries.

**Hallazgo fuera de alcance:** en el celular, los botones de ServiRed IA
(632–684) y Mensajes (608–660) se superponen 28 px entre sí. Ya pasaba antes
de este cambio.
