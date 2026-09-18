# PLAN: Matrícula o certificado con aprobación de administración

**SPEC de referencia:** [SPEC.md](SPEC.md)
**Versión de la spec revisada:** Aprobada el 2026-09-18 por autorización general (rama `tanda-lanzamiento`, después de `a4ac451`)
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
| Archivos privados | `src/lib/kyc.ts` → `TYPES` (l.7), `saveKycDocument` (l.159), `readKycDocument`, `removeKycDocument` | Guardan en `PRIVATE_UPLOAD_DIR` (fuera de `public/`) validando el tipo y los primeros bytes. Solo imágenes y video; las regex de nombre no aceptan `.pdf`. |
| Visor de admin | `src/app/api/admin/kyc-documents/[id]/route.ts` | Sirve un documento privado solo con sesión de admin (`isAdminAuthenticated`), con `Cache-Control: private, no-store`. Molde del visor de matrículas. |
| Revisión de KYC | `src/app/admin/actions.ts` → `reviewKycAction(decision, formData)` | Decisión atada con `.bind` (gotcha de React 19), motivo de al menos 5 caracteres y aviso `notificar(..., "kyc")`. Mismo patrón. |
| Panel de admin | `src/app/admin/page.tsx` | Pestañas en `TABS`, con contador de pendientes en KYC y denuncias. |
| Insignia | `src/components/ui.tsx` → `VerifiedBadge` | Se suma `MatriculadoBadge` al lado. |
| Tarjeta | `src/components/ProfessionalCard.tsx`; `src/lib/types.ts` → `ProCard`; armado en `src/app/(client)/page.tsx` (~l.187) | Muestra `verified`; se agrega `matriculado`. |
| Perfil público | `src/app/(client)/profesionales/[id]/page.tsx` (l.89 y l.99) | Muestra la insignia de verificado; ahí va "Matriculado · rubro". |
| Perfil del pro | `src/app/pro/mi-perfil/page.tsx` | Solo con perfil aprobado; ahí va la sección "Matrícula y certificados". |
| Avisos | `src/lib/notificaciones.ts` (`AvisoKind`), `src/components/Campanita.tsx` (`ICONOS_AVISO`) | Se suma el tipo `matricula`. |
| Baja de cuenta | `src/lib/baja-cuenta.ts` | Borra los archivos del KYC antes de la fila; se suman los de matrículas. |

**Convenciones y patrón de referencia:**
- Lógica en `src/lib`; route handlers delgados con `interactionAccess()`.
- Acciones de admin con decisión bindeada.
- Reglas puras testeadas en `tests/rules.test.ts`.

## Solución propuesta

<!-- Explica el enfoque y sus motivos. Describe las responsabilidades y el
recorrido de datos y eventos hasta la interfaz. Usa un diagrama si aporta claridad. -->

1. **Datos.**
   - Modelo `Credential`: `professionalId` (cascade), `categoryId?` (SetNull), `kind` (`matricula` | `certificado`), `number?`, `issuer?`, `filename`, `mimeType`, `size`, `status` (`pending` | `approved` | `rejected`), `reviewReason?`, `reviewedAt?`, timestamps, `@@index([status])`.
   - `Professional.matriculado Boolean @default(false)`, desnormalizado como `verified`, para que las tarjetas no hagan joins.
2. **Archivos.** `kyc.ts` suma `application/pdf` a `TYPES` (kind `document`, valida `%PDF-`). `saveCredentialFile(file)` acepta imagen o PDF de hasta 8 MB. Las regex de lectura y borrado aceptan `.pdf`.
3. **Lógica** en `src/lib/matriculas.ts`:
   - `validarCredencial` (pura): tipo, largo de número y emisor, rubro entre los del pro.
   - `crearCredencial`, `borrarCredencial` (solo pendiente o rechazada), `revisarCredencial(id, decision, motivo)`.
   - `recalcularMatriculado(professionalId)`: la insignia depende de tener al menos una aprobada.
4. **API del profesional.**
   - `GET/POST /api/pro/matriculas` (listar, subir en multipart).
   - `GET/DELETE /api/pro/matriculas/[id]` (ver el archivo propio, borrar).
   - Solo con perfil aprobado y `interactionAccess()`. El GET del archivo comprueba que sea del dueño (RF-07).
5. **UI del profesional.** `src/components/pro/Matriculas.tsx` en `/pro/mi-perfil`: lista con estado y motivo, formulario (tipo, rubro opcional, número, emisor, archivo con `accept="image/*,application/pdf"`) y borrar.
6. **Admin.**
   - Pestaña **Matrículas** con contador de pendientes.
   - Lista con el enlace al archivo (visor `GET /api/admin/matriculas/[id]`), datos, motivo y botones Aprobar/Rechazar con `formAction={reviewCredentialAction.bind(null, …)}`.
   - `reviewCredentialAction` delega en `revisarCredencial`, que avisa a la campanita (`matricula`).
7. **Insignia (RF-04).** `MatriculadoBadge` en la tarjeta y en el perfil público. En el perfil dice "Matriculado · {rubros}" si las aprobadas tienen rubro. En el mapa entra con la parte B, que ya muestra `ProCard`.
8. **Baja de cuenta.** Borra también los archivos de las credenciales.

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
| `prisma/schema.prisma` | Modificar | `Credential`, `Professional.matriculado`. | RF-01, RF-02, RF-04 |
| `src/lib/kyc.ts` | Modificar | PDF y `saveCredentialFile`. | RF-01, RF-07 |
| `src/lib/matriculas.ts` | Crear | Validación, alta, borrado, revisión, insignia. | RF-01…RF-06 |
| `src/app/api/pro/matriculas/route.ts`, `…/[id]/route.ts` | Crear | API del profesional. | RF-01, RF-02, RF-06, RF-07 |
| `src/app/api/admin/matriculas/[id]/route.ts` | Crear | Visor para admin. | RF-03, RF-07 |
| `src/components/pro/Matriculas.tsx`, `src/app/pro/mi-perfil/page.tsx` | Crear / modificar | Sección del perfil. | RF-01, RF-02, RF-06 |
| `src/app/admin/actions.ts`, `src/app/admin/page.tsx` | Modificar | Acción de revisión y pestaña. | RF-03 |
| `src/components/ui.tsx`, `ProfessionalCard.tsx`, `lib/types.ts`, `(client)/page.tsx`, `profesionales/[id]/page.tsx` | Modificar | Insignia. | RF-04 |
| `src/lib/notificaciones.ts`, `src/components/Campanita.tsx` | Modificar | Aviso `matricula`. | RF-05 |
| `src/lib/baja-cuenta.ts` | Modificar | Borrar archivos. | RF-07 |
| `tests/rules.test.ts` | Modificar | `validarCredencial` y firma del PDF. | RF-01 |

## Datos y contratos

<!-- Completa solo lo aplicable. Si un punto no aplica, indica el motivo. -->

- **Modelos y contratos de entrada y salida:**
  - `POST /api/pro/matriculas` (multipart: `kind`, `categoryId?`, `number?`, `issuer?`, `file`) → 201 con la credencial o 422 con el motivo.
  - `DELETE` → 200, o 409 si está aprobada.
- **Identificadores, relaciones y restricciones:**
  - La credencial cuelga del `Professional`: si se borra, se borra en cascada.
  - Si se borra el rubro, queda sin rubro (`SetNull`).
- **Origen de los datos mostrados y transformaciones:** la insignia sale de `Professional.matriculado`; el detalle de rubros, de las credenciales aprobadas.
- **Persistencia, consultas y actualizaciones:** `matriculado` se recalcula en cada aprobación, rechazo o borrado.
- **Convivencia entre datos locales y remotos:** no aplica.
- **Compatibilidad y migraciones de datos existentes:** `db push` suma una tabla y una columna con default `false`. Nadie tiene matrícula al desplegar, que es lo correcto.

## Estado, operaciones y errores

<!-- Cómo se implementan los comportamientos aprobados en la spec.
Referencia RF/CA y aplica las consideraciones relevantes de MOBILE_GUIDELINES.md. -->

- **Gestión del estado de interfaz y navegación:** la sección hace `router.refresh()` después de subir o borrar.
- **Conservación y restauración del estado:** si la subida falla, el formulario conserva el tipo, el rubro, el número y el emisor (son estado de React) y muestra el error.
- **Ejecución, concurrencia y cancelación de operaciones:** el botón queda deshabilitado mientras sube ("Subiendo…").
- **Errores, reintentos y prevención de duplicados:**
  - Tipo o tamaño inválido: 422 con el motivo.
  - Si falla la base después de guardar el archivo, se borra el archivo.
- **Otras consideraciones mobile aplicables y su solución:**
  - `accept="image/*,application/pdf"` deja elegir galería, cámara o archivos.
  - Los archivos nunca quedan en `public/`.

## Dependencias y configuración

<!-- Librerías, servicios, permisos o configuración afectados. Verifica compatibilidad
con el proyecto y justifica las incorporaciones. No agregues dependencias por defecto. -->

- Sin dependencias ni variables nuevas (usa `PRIVATE_UPLOAD_DIR`, igual que el KYC).
- Deploy: `npx prisma db push`.

## Estrategia de validación

<!-- Una fila por criterio de la spec. Selecciona el método capaz de demostrarlo:
test unitario, integración, UI o prueba manual. No todos requieren todos los métodos.
Identifica tests existentes y separa los nuevos propuestos. Incluye regresiones relevantes.
Una captura aislada no demuestra persistencia ni ausencia de peticiones de red. -->

| Criterio | Método y test existente o propuesto | Entorno y datos necesarios | Evidencia prevista |
| --- | --- | --- | --- |
| CA-01 | Integración: `POST` de un PDF real (cabecera `%PDF-`) con sesión de un pro aprobado; `GET` de la lista; HTML de `/pro/mi-perfil`. | Dev; pro temporal aprobado con rubro Plomería. | 201, estado `pending`, visible en su perfil. |
| CA-02 | Unitario del validador de PDF; integración: un texto con extensión `.pdf` y `type: application/pdf`, y un archivo de 9 MB. | Dev. | 422 con el motivo; no queda archivo guardado. |
| CA-03 | Script con `revisarCredencial` (la función de la acción). HTML de la pestaña: la prueba el usuario (contraseña de admin). | Dev. | Estados y avisos correctos. |
| CA-04 | Después de aprobar: HTML de `/` (tarjeta) y del perfil público; campanita del pro. | Dev. | "Matriculado" en los dos; "Matriculado · Plomería" en el perfil; aviso `matricula`. |
| CA-05 | Rechazo con motivo; HTML de `/pro/mi-perfil`; `DELETE` de la rechazada y nueva subida. | Dev. | Motivo visible; borrado 200; nueva pendiente. `DELETE` de una aprobada: 409. |
| CA-06 | `GET /api/pro/matriculas/{id}` como otro pro y sin sesión; `GET /api/admin/matriculas/{id}` sin admin. | Dev. | 404/401; el dueño recibe 200 `application/pdf`. |
| CA-07 | HTML de un pro sin aprobadas. | Dev. | Sin la insignia. |

**Comprobaciones de regresión:**
- El KYC sigue aceptando sus imágenes y video (el test existente de tipos sigue en verde).
- La tarjeta se ve igual sin la insignia.
- `pnpm test` y `pnpm build`.

**Comandos verificados para compilar y ejecutar tests:** los de siempre.

**Pruebas en dispositivo, emulador o simulador:** elegir un archivo desde el celular es comportamiento nativo del `<input type="file">`; no requiere dispositivo.

**Limitaciones del entorno:** `/admin` no se recorre (pide la contraseña de admin); la lógica de la revisión se prueba por script.

<!-- Esta sección planifica la validación. Durante la implementación, registra
en TASKS.md o en el informe de validación acordado los resultados y evidencias
reales. Distingue pruebas ejecutadas, fallidas, no ejecutadas y bloqueadas.
Compilar o tener tests en verde no sustituye revisar los criterios de la spec. -->

## Orden de implementación

<!-- Etapas y dependencias principales. El desglose ejecutable se escribe en TASKS.md.
Incluye puntos de comprobación para avanzar con cambios pequeños. -->

1. **Esquema, archivos y `matriculas.ts`**, con tests.
2. **API y sección del profesional.** Comprobación: CA-01, CA-02 y CA-06.
3. **Revisión en admin y avisos.** Comprobación: CA-03 y CA-05 por script.
4. **Insignia y baja de cuenta.** Comprobación: CA-04 y CA-07.
5. **Cierre:** build, limpieza y evidencia.

**Subagentes:** no hacen falta.

## Riesgos y decisiones pendientes

<!-- Riesgos concretos de esta solución y cómo se resolverán, sin listas genéricas.
Escribe Ninguna en las decisiones pendientes cuando estén resueltas. -->

- **Riesgos y medidas acordadas:**
  - Los archivos no se cifran en disco, igual que los del KYC hoy; están fuera de `public/` y solo se sirven con control de acceso.
  - Un PDF puede traer contenido activo. Se sirve con `Content-Disposition: inline`, `nosniff` y `private, no-store`, solo a admin o al dueño.
- **Decisiones tomadas con la autorización general** (para revisar):
  1. Solo pueden subir matrícula los profesionales con perfil **aprobado**, porque la sección está en `/pro/mi-perfil`, que ya exige aprobación.
  2. El rubro se elige entre los rubros del propio profesional.
  3. Hasta 10 documentos por profesional, para acotar abuso.
- **Decisiones pendientes:** Ninguna.

<!-- ANTES DE SOLICITAR APROBACIÓN
Comprueba que el plan cubre los requisitos, respeta las exclusiones, reutiliza
componentes verificados y permite demostrar todos los criterios de aceptación.
Resuelve dudas y marcadores pendientes. Si la spec cambió, revisa su impacto.
Tras aprobar el plan, deriva TASKS.md con IDs, dependencias, referencias a RF/CA
y comprobaciones. No marques una tarea terminada sin realizar su validación;
si está bloqueada, registra el motivo.
-->
