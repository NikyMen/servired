# PLAN: Publicidad: placas al pie, laterales que acompañan y carga simple

**SPEC de referencia:** [SPEC.md](SPEC.md)
**Versión de la spec revisada:** Aprobada el 2026-09-18 por autorización general (rama `tanda-lanzamiento`, después de `1908428`)
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
| Placas en la portada | `src/app/(client)/page.tsx` | Laterales `left-1/2`, `right-1/2`: dos columnas `absolute inset-y-0` al costado del hero (solo `xl`), así que miden lo que el hero y desaparecen al bajar. `mobile-1..4`: grilla 2×2 debajo del hero (oculta desde `xl`). |
| Placa | `src/components/AdPlate.tsx` | `object-contain` con `transform` de escala, desplazamiento y estiramiento; muestra "ADS" si está vacía; con WhatsApp es un enlace (`waLink`, grupo 2). |
| Editor | `src/components/AdImageEditor.tsx` | Acercar, mover y **estirar** libre sobre un recuadro que cambia de forma según la pantalla. Se reemplaza. |
| Guardado | `src/app/admin/actions.ts` → `saveAdAction` | Upsert por `slot` (acepta cualquier texto), guarda la imagen con `saveUpload`, los cinco números del encuadre y el WhatsApp 4 + 6. No borra la imagen anterior. |
| Panel | `src/app/admin/page.tsx`, pestaña `publicidad` | Lista fija de 8 slots en una grilla sin agrupar. |
| Slot reservado | `Ad.slot = "ayuda"` (grupo 2) | Lo usa el botón de ayuda; queda fuera del catálogo de placas. |
| Contenedores de la portada | `src/app/globals.css` | Ningún ancestro de la portada tiene `overflow: hidden`: `position: sticky` funciona. |

**Convenciones y patrón de referencia:** catálogo puro en `src/lib`, testeado; acciones de admin con `requireAdmin()`; componentes de cliente con estado propio.

## Solución propuesta

<!-- Explica el enfoque y sus motivos. Describe las responsabilidades y el
recorrido de datos y eventos hasta la interfaz. Usa un diagrama si aporta claridad. -->

1. **Catálogo (`src/lib/publicidad.ts`, puro):**
   - `TIPOS_PLACA`:
     - `lateral`: 1:2, 600 × 1200, slots `left-1`, `left-2`, `right-1`, `right-2`;
     - `superior`: 2:1, 1200 × 600, slots `mobile-1..4` (mismas claves que hoy);
     - `pie`: 1:1, 800 × 800, slots `bottom-1..4`.
   - `tipoDeSlot(slot)`, `esSlotDePlaca(slot)` (excluye `ayuda`) y `necesitaReencuadre(ad)` (escala, desplazamiento o estiramiento distinto del neutro).
   - Los consejos de carga.
2. **`AdPlate` (RF-03):**
   - recibe el tipo y aplica `aspect-ratio` fijo, el mismo en todos los tamaños;
   - la imagen va con `object-cover` a tamaño completo, sin `transform`: siempre llena la placa y nunca se deforma;
   - "ADS" en laterales y superiores vacías; en el pie, las vacías no se dibujan.
3. **Portada:**
   - Las laterales salen del bloque del hero y pasan a dos rieles `absolute inset-y-0` a los costados de **toda** la portada. Cada riel tiene un hijo `sticky top-24` con sus dos placas, así acompañan el scroll sin tapar el centro (RF-02).
   - Fila del pie después del CTA: 2 × 2 en el celular y 4 en fila desde `md` (RF-01).
4. **Recorte (`src/components/AdCropper.tsx`, reemplaza a `AdImageEditor`) (RF-04, RF-05, RF-06):**
   - marco con la proporción del tipo, la imagen se arrastra y se acerca con un control de zoom que nunca deja huecos (escala mínima = cubrir);
   - al lado, la vista previa "Celular" y "Escritorio" con los anchos reales de cada placa;
   - medida recomendada y consejos, y aviso si la imagen es más chica que la mitad de la medida (se va a ver borrosa; no impide guardar);
   - al enviar, un `<canvas>` exporta el recorte **al tamaño recomendado** en JPEG y lo pone en el input `image` con `DataTransfer`, así se sube una sola imagen ya recortada y liviana;
   - "Re-encuadrar la imagen actual" carga la imagen que ya está (misma URL de `/uploads`).
5. **`saveAdAction`:**
   - rechaza slots que no sean del catálogo;
   - con imagen nueva, guarda los valores neutros del encuadre y borra la imagen anterior;
   - sin imagen nueva, conserva lo que había.
6. **Panel (RF-07, RF-08):** placas agrupadas en Costados, Arriba y Pie. Cada una con su miniatura en la proporción real, el estado (activa, inactiva o sin imagen) y la marca "Conviene volver a encuadrar" si viene del editor viejo.

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
| `src/lib/publicidad.ts` | Crear | Catálogo, tipos y reglas. | RF-01, RF-03, RF-06, RF-08 |
| `src/components/AdPlate.tsx` | Modificar | Proporción fija, `object-cover`, sin transform. | RF-03 |
| `src/app/(client)/page.tsx` | Modificar | Rieles sticky y fila del pie. | RF-01, RF-02 |
| `src/components/AdCropper.tsx` | Crear | Recorte, vistas previas, medida y consejos. | RF-04, RF-05, RF-06, RF-09 |
| `src/components/AdImageEditor.tsx` | Borrar | Reemplazado. | RF-09 |
| `src/app/admin/actions.ts`, `src/app/admin/page.tsx` | Modificar | Guardado validado y panel agrupado. | RF-07, RF-08 |
| `tests/rules.test.ts` | Modificar | Catálogo y re-encuadre. | RF-03, RF-08 |

## Datos y contratos

<!-- Completa solo lo aplicable. Si un punto no aplica, indica el motivo. -->

- **Modelos y contratos de entrada y salida:**
  - Sin cambios de esquema.
  - `imageScale/X/Y/StretchX/StretchY` quedan sin uso en la portada; solo sirven para marcar las placas viejas. Se pueden borrar en un `db push` posterior, igual que se hizo con `paymentAlias`.
- **Identificadores, relaciones y restricciones:** `slot` tiene que ser del catálogo; `ayuda` sigue siendo del soporte.
- **Origen de los datos mostrados y transformaciones:** la imagen se recorta en el navegador; el servidor guarda lo que llega (sigue validando tipo y tamaño con `saveUpload`).
- **Persistencia, consultas y actualizaciones:** al reemplazar una imagen se borra el archivo anterior de `/uploads`.
- **Convivencia entre datos locales y remotos:** no aplica.
- **Compatibilidad y migraciones de datos existentes:** las placas cargadas siguen apareciendo en su slot (RF-08), ahora con `object-cover`; las que tenían encuadre viejo se marcan para re-encuadrar.

## Estado, operaciones y errores

<!-- Cómo se implementan los comportamientos aprobados en la spec.
Referencia RF/CA y aplica las consideraciones relevantes de MOBILE_GUIDELINES.md. -->

- **Gestión del estado de interfaz y navegación:** el encuadre es estado local del recorte; el envío usa el form del server action que ya existe.
- **Conservación y restauración del estado:** si se sale con un recorte sin guardar, `beforeunload` pide confirmación (fila "Recrear la pantalla" de la spec).
- **Ejecución, concurrencia y cancelación de operaciones:** "Guardando…" mientras se exporta y se envía; "Cancelar" vuelve a la imagen guardada.
- **Errores, reintentos y prevención de duplicados:**
  - Un formato no aceptado se avisa al elegir el archivo.
  - Si falla el guardado, el recorte sigue en pantalla.
- **Otras consideraciones mobile aplicables y su solución:**
  - En la portada, las placas no generan scroll horizontal en 360 px.
  - Las laterales solo existen desde `xl`, donde hay lugar.
  - Las del pie llevan `loading="lazy"`.
  - Cada imagen tiene `alt` con el título, y la que abre WhatsApp lo dice en su `aria-label`.

## Dependencias y configuración

<!-- Librerías, servicios, permisos o configuración afectados. Verifica compatibilidad
con el proyecto y justifica las incorporaciones. No agregues dependencias por defecto. -->

- Sin dependencias nuevas (canvas y `DataTransfer` son del navegador).
- `bodySizeLimit` actual (20 MB) sobra para una imagen de 1200 px.

## Estrategia de validación

<!-- Una fila por criterio de la spec. Selecciona el método capaz de demostrarlo:
test unitario, integración, UI o prueba manual. No todos requieren todos los métodos.
Identifica tests existentes y separa los nuevos propuestos. Incluye regresiones relevantes.
Una captura aislada no demuestra persistencia ni ausencia de peticiones de red. -->

| Criterio | Método y test existente o propuesto | Entorno y datos necesarios | Evidencia prevista |
| --- | --- | --- | --- |
| CA-01 | HTML y geometría de la portada con 4 placas del pie activas (y una inactiva). | Filas `Ad` de prueba creadas por script. | Al final, antes del pie; la inactiva no deja hueco; 2 × 2 a 360 px y 4 en fila a 1280 px. |
| CA-02 | Geometría a 1440 px: scroll hasta el final y `getBoundingClientRect` de las laterales y del contenido. | Build de producción. | Siguen dentro del viewport y no se superponen con el centro. |
| CA-03 | Proporción de la misma placa del pie en 360 y 1440 px; `object-fit` computado. | Igual. | Misma proporción; `cover`, sin transform. |
| CA-04, CA-05, CA-06, CA-07 | UI del recorte, montado aislado en una página de prueba temporal (el panel pide la contraseña de admin): arrastrar, acercar, vistas previas, medida y consejos, zoom mínimo = cubrir. | Dev; imagen generada en el navegador. | Las vistas previas cambian con el encuadre; no se puede alejar más allá de cubrir. |
| CA-06 | Exportar: el archivo que queda en el input tiene el tamaño recomendado. | Igual. | 800 × 800 para el pie, JPEG. |
| CA-08 | Pestaña de admin agrupada: **la recorre el usuario**. | — | Pendiente del usuario. |
| CA-09 | Placa con encuadre viejo: portada y `necesitaReencuadre`. | Script. | Sigue visible; la regla la marca. |

**Comprobaciones de regresión:**
- El WhatsApp de las placas sigue armando el mismo enlace.
- `saveAdAction` rechaza un slot inventado.
- `pnpm test` y `pnpm build`.

**Comandos verificados para compilar y ejecutar tests:** los de siempre.

**Pruebas en dispositivo, emulador o simulador:** no hace falta; se mide la geometría.

**Limitaciones del entorno:**
- `/admin` pide la contraseña de admin: el recorte se prueba montado en una página temporal que se borra al final, y la pestaña la prueba el usuario.
- El panel no pinta: el aspecto se valida con medidas, no con capturas.

<!-- Esta sección planifica la validación. Durante la implementación, registra
en TASKS.md o en el informe de validación acordado los resultados y evidencias
reales. Distingue pruebas ejecutadas, fallidas, no ejecutadas y bloqueadas.
Compilar o tener tests en verde no sustituye revisar los criterios de la spec. -->

## Orden de implementación

<!-- Etapas y dependencias principales. El desglose ejecutable se escribe en TASKS.md.
Incluye puntos de comprobación para avanzar con cambios pequeños. -->

1. **Catálogo, tests y `AdPlate`.**
2. **Portada:** rieles sticky y pie. Comprobación: CA-01, CA-02 y CA-03.
3. **Recorte y guardado.** Comprobación: CA-04 a CA-07.
4. **Panel agrupado.** Comprobación: CA-09; CA-08 queda para el usuario.
5. **Cierre.**

**Subagentes:** no hacen falta.

## Riesgos y decisiones pendientes

<!-- Riesgos concretos de esta solución y cómo se resolverán, sin listas genéricas.
Escribe Ninguna en las decisiones pendientes cuando estén resueltas. -->

- **Riesgos y medidas acordadas:**
  - Las imágenes actuales pasan a `object-cover` y pueden quedar mal encuadradas hasta re-subirlas. Está en la checklist y marcado en el panel.
  - `DataTransfer` no existe en Safari muy viejo. En ese caso se sube la imagen sin recortar y la placa la recorta con `object-cover`; se ve bien, pero pesa más.
- **Decisiones tomadas con la autorización general** (para revisar):
  1. El recorte exporta en JPEG (calidad 0,88) al tamaño recomendado.
  2. Los rieles laterales quedan pegados a `top-24`, debajo del header.
- **Decisiones pendientes:** Ninguna.

<!-- ANTES DE SOLICITAR APROBACIÓN
Comprueba que el plan cubre los requisitos, respeta las exclusiones, reutiliza
componentes verificados y permite demostrar todos los criterios de aceptación.
Resuelve dudas y marcadores pendientes. Si la spec cambió, revisa su impacto.
Tras aprobar el plan, deriva TASKS.md con IDs, dependencias, referencias a RF/CA
y comprobaciones. No marques una tarea terminada sin realizar su validación;
si está bloqueada, registra el motivo.
-->
