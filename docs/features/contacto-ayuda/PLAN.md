# PLAN: Mensaje predeterminado de WhatsApp y botón "Necesito ayuda"

**SPEC de referencia:** [SPEC.md](SPEC.md)
**Versión de la spec revisada:** Aprobada el 2026-09-18 (rama `tanda-lanzamiento`, después de `48f4093`)
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
| Perfil público del profesional | `src/app/(client)/profesionales/[id]/page.tsx` | Muestra "WhatsApp" (l.123) solo si el pro tiene teléfono y quien mira puede interactuar (`puedeVerTelefono`, l.57). Tiene su propio `whatsappLink(phone)` local (l.328) **sin texto**: limpia a dígitos y antepone `549` si no empieza con `54`. |
| Placa de publicidad | `src/components/AdPlate.tsx` | Otro `whatsappLink(phone, message)` local (l.5): `wa.me/549{phone}?text=…`. Se conserva el comportamiento. |
| Placas en la base | `prisma/schema.prisma` → `model Ad` | Fila por `slot` único, con `whatsappPhone` (10 dígitos locales), `whatsappMessage` y `enabled`. Sirve tal cual para guardar el soporte sin cambiar el esquema. |
| Guardado de placas | `src/app/admin/actions.ts` → `saveAdAction` (l.151) | Valida el WhatsApp como 4 + 6 dígitos y, si no cumple, **lo guarda en null sin avisar**. No se reusa para el soporte, porque la spec pide mostrar el motivo (CA-05). |
| Acción con error visible | `src/app/admin/actions.ts` → `loginAdminAction` + `AdminAuthState` (l.17-37) | Patrón `useActionState` que devuelve `{ error }`. Es el molde para la acción del soporte. |
| Panel de administración | `src/app/admin/page.tsx` | Pestañas en `TABS` (l.18) y `TabLink`; carga los datos en un `Promise.all`. |
| Layouts con flotantes | `src/app/(client)/layout.tsx`, `src/app/pro/layout.tsx` | Async; ya montan `AsistenteIA` (`fixed right-4 bottom-24 md:bottom-6 z-40`) y, con sesión, `MensajesFlotante` (`right-4 bottom-[7.5rem] md:bottom-22 z-40`). **El lado izquierdo está libre.** |
| Layout de cuenta | `src/app/(auth)/layout.tsx` | Sincrónico, sin flotantes (entrar, crear cuenta, verificar, etc.). |
| Barras inferiores del celular | `src/components/BottomNav.tsx` (`fixed bottom-0 z-40 md:hidden`), `src/components/ContratarSheet.tsx` (`fixed bottom-0 z-40 lg:hidden`, en el perfil) | El asistente ya se apoya en `bottom-24` para quedar encima de las dos: se usa la misma altura. |
| URL pública | `src/lib/mailer.ts` → `appUrl()` | No hace falta: el mensaje aprobado no lleva enlace. |

**Convenciones y patrón de referencia:**
- Helpers puros en `src/lib` testeados con `node:test` en `tests/rules.test.ts`.
- Server actions de admin con `requireAdmin()` y `revalidatePath`.
- Componentes de cliente solo donde hace falta estado.
- Comentarios que explican el porqué, en español rioplatense.

## Solución propuesta

<!-- Explica el enfoque y sus motivos. Describe las responsabilidades y el
recorrido de datos y eventos hasta la interfaz. Usa un diagrama si aporta claridad. -->

1. **Un solo armador de enlaces de WhatsApp.** Nuevo `src/lib/whatsapp.ts`, puro:
   - `waLink(phone, message?)`: deja solo los dígitos, saca un `0` inicial de larga distancia, antepone `549` si no trae el `54` y agrega `?text=` codificado si hay mensaje.
   - `validSupportPhone(value)`: exige 10 dígitos que no empiecen con 0 ni con 15 y devuelve los dígitos o null.
   - `saludoPerfil(nombre)`: el texto aprobado.
   - `AYUDA_DEFAULT`: "Hola, necesito ayuda con ServiRed.".
   - Reemplaza los dos `whatsappLink` locales (el del perfil y el de `AdPlate`), con el mismo resultado para los números que ya andan.
2. **Saludo del perfil (RF-01):** el botón del perfil pasa a `waLink(pro.phone, saludoPerfil(pro.name))`.
3. **Configuración del soporte (RF-04):**
   - Se guarda en la tabla `Ad` con `slot = "ayuda"`: usa `whatsappPhone`, `whatsappMessage` y `enabled`, no necesita `db push` y no aparece en la lista de placas, que es fija.
   - `src/lib/soporte.ts` expone `getSoporte()` (con `cache` de React, una consulta por request). Devuelve `{ href }` solo si la fila está activa y tiene número; si no, null.
   - Pestaña nueva **Soporte** en `/admin`, con el componente de cliente `src/components/AdminSoporte.tsx` (`useActionState`). La acción nueva `saveSoporteAction(prev, formData)` valida con `validSupportPhone`: si falla devuelve `{ error }` y **no guarda**; si pasa, hace upsert y revalida el layout.
   - El campo tiene además `pattern="\d{10}"` para que el navegador avise antes de enviar.
4. **Botón flotante (RF-02, RF-03, RF-05):**
   - Componente de servidor `src/components/AyudaFlotante.tsx`: un `<a>` a `wa.me` en pestaña nueva.
   - A la **izquierda**: `fixed left-4 bottom-24 md:left-6 md:bottom-6`. En el celular es un círculo del tamaño de los otros (`size-13`); desde `md` es una píldora "¿Necesitás ayuda?". Tiene `aria-label="Necesito ayuda por WhatsApp"`.
   - `z-30`, debajo de los fondos de IA y Mensajes (`z-40`/`z-50`): cuando uno de esos se abre, lo tapa en vez de quedar flotando arriba.
   - Se monta en los layouts de `(client)`, `pro` y `(auth)` (este último pasa a `async`). En `(auth)` va con `bottom-4`, porque ahí no hay barra inferior.
   - No va en `/admin` ni en `/landing-preinscripcion`: el primero es interno y el segundo es la portada de preinscripción, que se reemplaza al lanzar.

```
Admin › Soporte ──saveSoporteAction──▶ Ad{slot:"ayuda"} ──getSoporte()──▶ layouts ──▶ <AyudaFlotante href=waLink(...)>
Perfil ──waLink(pro.phone, saludoPerfil(nombre))──▶ botón WhatsApp
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
| `src/lib/whatsapp.ts` | Crear | `waLink`, `validSupportPhone`, `saludoPerfil`, `AYUDA_DEFAULT` (puro). | RF-01, RF-03, RF-04 |
| `src/lib/soporte.ts` | Crear | `getSoporte()` lee `Ad{slot:"ayuda"}` y arma el enlace. | RF-02, RF-03 |
| `src/app/(client)/profesionales/[id]/page.tsx` | Modificar | Botón WhatsApp con saludo; se borra el `whatsappLink` local. | RF-01 |
| `src/components/AdPlate.tsx` | Modificar | Usa `waLink`; se borra el helper local (sin cambio visible). | — (reuso) |
| `src/components/AyudaFlotante.tsx` | Crear | Botón flotante izquierdo. | RF-02, RF-03, RF-05 |
| `src/app/(client)/layout.tsx`, `src/app/pro/layout.tsx`, `src/app/(auth)/layout.tsx` | Modificar | Montan `AyudaFlotante` si `getSoporte()` devuelve algo. | RF-02 |
| `src/app/admin/actions.ts` | Modificar | `saveSoporteAction` + tipo de estado. | RF-04 |
| `src/components/AdminSoporte.tsx` | Crear | Formulario con número, mensaje, activo y error visible. | RF-04 |
| `src/app/admin/page.tsx` | Modificar | Pestaña "Soporte" en `TABS`, lectura de la fila `ayuda`. | RF-04 |
| `tests/rules.test.ts` | Modificar | Tests de `waLink` y `validSupportPhone`. | RF-01, RF-03, RF-04 |

## Datos y contratos

<!-- Completa solo lo aplicable. Si un punto no aplica, indica el motivo. -->

- **Modelos y contratos de entrada y salida:**
  - Sin cambios de esquema.
  - `saveSoporteAction` recibe `phone`, `message` y `enabled`, y devuelve `{ error?: string, ok?: true }`.
  - El formulario de soporte pide el número en un solo campo de 10 dígitos (característica + número, sin 0 ni 15). Es más claro que el 4 + 6 de las placas, que solo sirve para característica de 4 dígitos.
- **Identificadores, relaciones y restricciones:** `Ad.slot = "ayuda"` queda reservado. La spec de Publicidad (grupo 8) tiene que excluirlo de su catálogo de placas; se anota en sus riesgos.
- **Origen de los datos mostrados y transformaciones:**
  - El número del perfil es el que cargó el profesional (formato libre, validado de 8 a 15 dígitos por `validPhone`); `waLink` lo normaliza.
  - El del soporte se guarda como 10 dígitos locales.
- **Persistencia, consultas y actualizaciones:** una consulta `ad.findUnique` por request en los layouts, memorizada con `cache`. `revalidatePath("/", "layout")` al guardar.
- **Convivencia entre datos locales y remotos:** no aplica.
- **Compatibilidad y migraciones de datos existentes:** no hay datos previos de soporte; mientras no se cargue un número, el botón no aparece (regla de la spec).

## Estado, operaciones y errores

<!-- Cómo se implementan los comportamientos aprobados en la spec.
Referencia RF/CA y aplica las consideraciones relevantes de MOBILE_GUIDELINES.md. -->

- **Gestión del estado de interfaz y navegación:** los enlaces abren WhatsApp con `target="_blank" rel="noopener noreferrer"`, así ServiRed queda en su pestaña (fila "Cancelar o volver atrás").
- **Conservación y restauración del estado:** no aplica.
- **Ejecución, concurrencia y cancelación de operaciones:** el formulario de soporte deshabilita el botón mientras `isPending`.
- **Errores, reintentos y prevención de duplicados:**
  - Un número inválido devuelve el motivo y conserva lo escrito (CA-05).
  - Un número con formato raro en el perfil queda en manos de `waLink`. Si igual resulta inválido, WhatsApp muestra su propio aviso. Es el mismo riesgo que hoy.
- **Otras consideraciones mobile aplicables y su solución:**
  - Área táctil de 52 px (`size-13`) y contraste del verde de marca.
  - `aria-label` explícito.
  - No se superpone con los flotantes de la derecha ni con las barras inferiores, porque está a la izquierda y en la misma altura que el asistente (CA-06).

## Dependencias y configuración

<!-- Librerías, servicios, permisos o configuración afectados. Verifica compatibilidad
con el proyecto y justifica las incorporaciones. No agregues dependencias por defecto. -->

- Sin dependencias ni variables nuevas.
- El ícono de WhatsApp se agrega como SVG en `src/components/icons.tsx`, igual que `FacebookIcon` e `InstagramIcon`.
- Configuración de producción: cargar el número de soporte desde `/admin?tab=soporte` (ya está en la checklist de LANZAMIENTO).

## Estrategia de validación

<!-- Una fila por criterio de la spec. Selecciona el método capaz de demostrarlo:
test unitario, integración, UI o prueba manual. No todos requieren todos los métodos.
Identifica tests existentes y separa los nuevos propuestos. Incluye regresiones relevantes.
Una captura aislada no demuestra persistencia ni ausencia de peticiones de red. -->

| Criterio | Método y test existente o propuesto | Entorno y datos necesarios | Evidencia prevista |
| --- | --- | --- | --- |
| CA-01 | Unitario nuevo: `waLink("3794 123456", saludo)` → `wa.me/5493794123456?text=Hola%20…`. Integración: HTML de `/profesionales/{id}` con sesión de cliente. | Dev :3000; sesión por cookie (fila `Session` temporal) de `maria@servired.test`; pro demo con teléfono. | `href` con el número y el saludo con el nombre del pro. |
| CA-02 | Integración: pedir el HTML de portada, perfil, `/mensajes`, `/pro` y `/entrar` como invitado, cliente y pro; buscar el `aria-label` del botón. | Fila `ayuda` activa creada con un script temporal usando la misma función de guardado. | El botón aparece en las 15 combinaciones. |
| CA-03 | Integración: `href` del botón en el HTML. | Igual que CA-02. | `wa.me/549{número}?text=` con el mensaje de soporte. |
| CA-04 | Integración: cambiar el número y el mensaje, y desactivar la fila; volver a pedir la portada. **La pantalla de admin la recorre el usuario:** el agente no ingresa la contraseña de administración. | Dev; fila `ayuda` modificada por script vía la lógica de la acción. | El `href` cambia; desactivado, el botón no está en el HTML. |
| CA-05 | Unitario nuevo: `validSupportPhone` rechaza 8 dígitos, con 0 o 15 adelante y con letras; acepta 10. Manual (usuario): guardar "12345678" en la pestaña Soporte. | `pnpm test`; `/admin` con sesión de administración del usuario. | Tests en verde; en pantalla, el motivo y nada guardado. |
| CA-06 | UI: con `javascript_tool`, en 360 px y en 1280 px, `getBoundingClientRect` del botón contra IA, Mensajes, `BottomNav` y `ContratarSheet`. Portada con sesión y perfil de un pro. | Preview pane (no pinta, pero ejecuta JS); `resize_window` a 360 × 780. | Ninguna intersección de rectángulos. |

**Comprobaciones de regresión:**
- Las placas de publicidad siguen armando el mismo `wa.me/549…?text=` (unitario con un caso de `AdPlate`).
- El teléfono sigue oculto para invitados en el perfil.
- `pnpm build`.

**Comandos verificados para compilar y ejecutar tests:** `corepack pnpm test`, `corepack pnpm exec tsc --noEmit`, `rm -rf .next && corepack pnpm build` con el dev apagado (verificados en el grupo 1, 2026-09-18).

**Pruebas en dispositivo, emulador o simulador:** que "wa.me" abra la app de WhatsApp en un celular real es comportamiento de WhatsApp. Se sugiere que el usuario lo pruebe una vez con el número real de soporte.

**Limitaciones del entorno:**
- El preview pane no pinta capturas, así que CA-06 se mide con coordenadas.
- El agente no se loguea en `/admin` porque requiere ingresar la contraseña del administrador: la parte visual de CA-04 y CA-05 queda para el usuario.

<!-- Esta sección planifica la validación. Durante la implementación, registra
en TASKS.md o en el informe de validación acordado los resultados y evidencias
reales. Distingue pruebas ejecutadas, fallidas, no ejecutadas y bloqueadas.
Compilar o tener tests en verde no sustituye revisar los criterios de la spec. -->

## Orden de implementación

<!-- Etapas y dependencias principales. El desglose ejecutable se escribe en TASKS.md.
Incluye puntos de comprobación para avanzar con cambios pequeños. -->

1. **Helper puro** `whatsapp.ts` + tests. Comprobación: `pnpm test`.
2. **Perfil y AdPlate** pasan a `waLink`. Comprobación: CA-01 y la regresión de las placas.
3. **Soporte en la base y en admin:** `soporte.ts`, `saveSoporteAction`, `AdminSoporte`, pestaña. Comprobación: CA-04 y CA-05 por script y tests; la parte visual queda para el usuario.
4. **Botón flotante** y montaje en los tres layouts. Comprobación: CA-02, CA-03 y CA-06.
5. **Cierre:** `pnpm build`, limpiar los datos temporales y registrar la evidencia en TASKS.md.

**Subagentes:** no hacen falta.

## Riesgos y decisiones pendientes

<!-- Riesgos concretos de esta solución y cómo se resolverán, sin listas genéricas.
Escribe Ninguna en las decisiones pendientes cuando estén resueltas. -->

- **Riesgos y medidas acordadas:**
  - **Teléfonos del perfil con "15":** `waLink` saca el 0 inicial pero no un "15" metido en el medio (ej. "379 15 4123456"). Se deja así: `validPhone` ya acepta formato libre y adivinar el "15" puede romper números buenos. Si aparecen casos, se normaliza al guardar el perfil (cambio aparte).
  - **Slot reservado:** `Ad.slot = "ayuda"` lo tiene que excluir el catálogo del grupo 8. Se anota en esa spec cuando llegue su plan.
  - **Hasta que el cliente pase el número**, el botón no se ve en producción. Está en la checklist de lanzamiento.
- **Decisiones pendientes:** Ninguna (el número real lo carga el cliente desde administración).

<!-- ANTES DE SOLICITAR APROBACIÓN
Comprueba que el plan cubre los requisitos, respeta las exclusiones, reutiliza
componentes verificados y permite demostrar todos los criterios de aceptación.
Resuelve dudas y marcadores pendientes. Si la spec cambió, revisa su impacto.
Tras aprobar el plan, deriva TASKS.md con IDs, dependencias, referencias a RF/CA
y comprobaciones. No marques una tarea terminada sin realizar su validación;
si está bloqueada, registra el motivo.
-->
