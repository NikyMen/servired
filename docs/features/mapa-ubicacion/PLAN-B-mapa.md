# PLAN: Mapa y ubicación, parte B: mapa, ubicación en tiempo real y 20 km

**SPEC de referencia:** [SPEC.md](SPEC.md) (RF-04 a RF-15 · CA-03 a CA-13). La parte A está en [PLAN-A-localidades.md](PLAN-A-localidades.md).
**Versión de la spec revisada:** Aprobada el 2026-09-18 (rama `tanda-lanzamiento`, después de `e3079a0`)
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
| Portada | `src/app/(client)/page.tsx` → `getData` | Trae los pros aprobados (filtro por rubro y tipo), las solicitudes abiertas y las fotos de trabajos. Rankea con `rankProfessionals` y arma el "Mapa de oportunidades" **para todos**. Los pros sin punto caen en coordenadas inventadas (`index % 4 * 0.008`). |
| Ranking | `src/lib/search.ts` → `rankProfessionals(pros, q)` | Ordena por puntaje; sin texto, por destacado y calificación. Se le suma un desempate opcional. |
| Mapa | `src/components/MapView.tsx` + `MapInner.tsx` | Leaflet con `ssr:false`; marcadores `divIcon` por tipo y popup. Sin agrupamiento ni punto propio. |
| Tarjetas | `src/components/ProfessionalCard.tsx`, `ProCard` en `src/lib/types.ts` | Muestran la zona; se agregan la localidad y la distancia. |
| Solicitudes | `src/components/ClientResultSwitch.tsx` → `src/components/pro/SolicitudCard.tsx`; `src/app/(client)/solicitudes/page.tsx` | El detalle de una solicitud dibuja un `MapView` con su punto: las coordenadas viajan al navegador **aunque sea un invitado**. |
| Navegación | `src/components/Header.tsx` (`clientNav`), `src/components/BottomNav.tsx` (`clientItems`, `COLUMNAS` hasta 4) | Se suma "Mapa". |
| Localidades | `src/lib/localidades.ts`, `User.localityId`, `SessionUser.localityId` (grupos 3 y 4) | Respaldo de la ubicación del usuario y punto del pro sin coordenadas. |
| Login con destino | `src/app/(auth)/actions.ts` → `safeNext` | `/entrar?next=/mapa` vuelve al mapa después de entrar. |
| Layout de cliente | `src/app/(client)/layout.tsx` | Sabe si hay sesión; ahí se monta el seguimiento de la ubicación. |

**Convenciones y patrón de referencia:**
- Leaflet por `dynamic(..., { ssr: false })`.
- Reglas puras en `src/lib` con tests.
- Server components que calculan y pasan datos planos a los componentes de cliente.

## Solución propuesta

<!-- Explica el enfoque y sus motivos. Describe las responsabilidades y el
recorrido de datos y eventos hasta la interfaz. Usa un diagrama si aporta claridad. -->

1. **Geografía pura (`src/lib/geo.ts`):**
   - `RADIO_KM = 20`, `haversineKm`, `formatoDistancia` ("a menos de 1 km", "3,2 km", "12 km").
   - `leerPuntoCookie` (valida y redondea).
   - `agruparPuntos(puntos, zoom)`: agrupa en una grilla de 56 px sobre la proyección web Mercator, recalculada con cada zoom. **Sin dependencia nueva**; ver la decisión 1.
2. **Ubicación del usuario (servidor, `src/lib/ubicacion.ts`).** `resolverUbicacion(user)`:
   - primero, la cookie `servired_ubic` (lat,lng redondeados a 3 decimales, unos 100 m) que escribe el navegador con el GPS;
   - si no hay, la localidad del usuario;
   - si tampoco, Corrientes Capital.

   Devuelve el punto, el origen (`gps` / `localidad`) y el nombre de la localidad. La ubicación exacta **no se guarda en la base** (regla de privacidad).
3. **Ubicación en vivo (cliente, `src/components/UbicacionEnVivo.tsx`):** proveedor montado en el layout de cliente, solo con sesión.
   - Con la página visible, `watchPosition`: actualiza el punto del contexto (el puntito se mueve).
   - Si el usuario se movió más de 1 km de lo que tiene la cookie (o no hay cookie), la reescribe y hace `router.refresh()`: la lista y las distancias se recalculan en el servidor (RF-07).
   - Con la pestaña oculta corta el seguimiento (batería).
   - Si se niega el permiso, borra la cookie y queda en "denegado".
   - `ubicarmeAhora()` pide la posición una vez (RF-08).
   - `AvisoUbicacion` muestra "Buscando tu ubicación…" o "Usando tu localidad: X" con el botón "Ubicarme ahora", que si el permiso está negado explica cómo habilitarlo (RF-09).
4. **Portada:**
   - **Con sesión:** cada pro se ubica en su punto o en el de su localidad (RF-11), se filtra a ≤ 20 km y se ordena por relevancia con la distancia como desempate (`rankProfessionals` suma el desempate opcional). Las solicitudes y fotos del mapa se filtran igual (RF-10). Las tarjetas muestran "{localidad} • {distancia}" (RF-12). Si no queda nadie, aparece "No encontramos profesionales a 20 km" con enlace a publicar solicitud (RF-15). El mapa compacto lleva "Ver mapa completo" (RF-14).
   - **Invitado:** sin filtro de distancia (decisión aprobada en la spec). No se consultan fotos ni se mandan coordenadas; en lugar del mapa aparece `MapaBloqueado` (recuadro borroso con "Iniciá sesión para ver el mapa") (RF-13). Las solicitudes viajan **sin** latitud y longitud, y `SolicitudCard` no dibuja el mapita si no las tiene; lo mismo en `/solicitudes`.
5. **Sección `/mapa` (RF-04, RF-05, RF-06).**
   - Sin sesión redirige a `/entrar?next=/mapa`.
   - Con sesión: bloque que ocupa el alto disponible (debajo del header, arriba de la barra inferior del celular) con:
     - buscador por oficio o nombre (`?q`, mismo ranking);
     - mapa con los pros a ≤ 20 km agrupados, el círculo de 20 km, el puntito en vivo y "Ubicarme ahora";
     - hoja "Profesionales cerca tuyo" (abajo en el celular, desplegable; al costado en compu) con foto, nombre, insignias, localidad y distancia.
   - Tocar un pin o un ítem muestra el resumen con "Ver perfil".
6. **Navegación:** "Mapa" en `Header` (cliente) y en `BottomNav` (cliente, 5 columnas) con `MapPinIcon`.

```
navegador ─GPS (watchPosition)─▶ cookie servired_ubic (≈100 m) ─refresh si >1 km─▶ servidor
servidor ─resolverUbicacion: cookie > localidad > Capital─▶ distancias ≤ 20 km ─▶ portada / /mapa
invitado ─▶ sin coordenadas ─▶ MapaBloqueado · /mapa → /entrar?next=/mapa
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
| `src/lib/geo.ts` | Crear | Distancia, formato, cookie, agrupamiento. | RF-05, RF-10, RF-11, RF-12 |
| `src/lib/ubicacion.ts` | Crear | Ubicación del usuario en el servidor. | RF-09, RF-10 |
| `src/lib/cercanos.ts` | Crear | Pros (y capas del mapa) a ≤ 20 km con distancia; lo usan la portada y `/mapa`. | RF-10, RF-11 |
| `src/lib/search.ts` | Modificar | Desempate opcional en `rankProfessionals`. | RF-10 |
| `src/components/UbicacionEnVivo.tsx`, `AvisoUbicacion.tsx` | Crear | Seguimiento, contexto y aviso. | RF-07, RF-08, RF-09 |
| `src/components/mapa/MapaBloqueado.tsx`, `MapaCompleto.tsx`, `MapaCompletoInner.tsx`, `ListaCercanos.tsx` | Crear | Mapa del invitado y sección Mapa. | RF-05, RF-06, RF-13 |
| `src/components/MapInner.tsx`, `MapView.tsx` | Modificar | Puntito en vivo opcional y "Ubicarme ahora" en el mapa compacto. | RF-07, RF-14 |
| `src/app/(client)/page.tsx` | Modificar | Filtro, distancias, mensajes, invitado sin coordenadas. | RF-10…RF-15 |
| `src/app/(client)/mapa/page.tsx` | Crear | La sección. | RF-04, RF-05 |
| `src/app/(client)/layout.tsx` | Modificar | Proveedor de ubicación con sesión. | RF-07 |
| `ProfessionalCard.tsx`, `lib/types.ts` | Modificar | Localidad y distancia. | RF-12 |
| `SolicitudCard.tsx`, `ClientResultSwitch.tsx`, `(client)/solicitudes/page.tsx` | Modificar | Coordenadas opcionales; no para invitados. | RF-13 |
| `Header.tsx`, `BottomNav.tsx` | Modificar | "Mapa". | RF-04 |
| `tests/rules.test.ts` | Modificar | Haversine, formato, cookie, agrupamiento, desempate. | RF-05, RF-10, RF-12 |

## Datos y contratos

<!-- Completa solo lo aplicable. Si un punto no aplica, indica el motivo. -->

- **Modelos y contratos de entrada y salida:** sin cambios de esquema. Cookie `servired_ubic = "lat,lng"`: la escribe el navegador, dura 1 día, `SameSite=Lax`, y se valida al leerla (números en el rango de Argentina).
- **Identificadores, relaciones y restricciones:** el punto de un pro es el suyo, o el de la localidad de su cuenta, o Capital.
- **Origen de los datos mostrados y transformaciones:** las distancias se calculan en el servidor en cada pedido.
- **Persistencia, consultas y actualizaciones:** los pros se filtran en memoria después de la consulta, igual que el ranking (el catálogo es chico; el README ya marca el límite).
- **Convivencia entre datos locales y remotos:** la cookie es la única copia de la ubicación; no se guarda en la base.
- **Compatibilidad y migraciones de datos existentes:** ninguna.

## Estado, operaciones y errores

<!-- Cómo se implementan los comportamientos aprobados en la spec.
Referencia RF/CA y aplica las consideraciones relevantes de MOBILE_GUIDELINES.md. -->

- **Gestión del estado de interfaz y navegación:** la ubicación en vivo vive en el contexto del layout y sobrevive a la navegación entre páginas de cliente. Volver desde un perfil abierto desde el mapa regresa al mapa (historial normal).
- **Conservación y restauración del estado:** al recargar, el mapa se centra en la cookie o en la localidad; el zoom manual no se conserva (spec).
- **Ejecución, concurrencia y cancelación de operaciones:** el `refresh` solo se dispara si el usuario se movió más de 1 km, así que no entra en un bucle.
- **Errores, reintentos y prevención de duplicados:**
  - Sin respuesta del GPS en 10 s, queda el respaldo con el aviso.
  - Si el mapa no carga (tiles), Leaflet muestra el fondo gris y la lista sigue funcionando.
- **Otras consideraciones mobile aplicables y su solución:**
  - **Permisos:** solo se pide con sesión; si se niega, todo sigue con la localidad y hay un aviso con cómo habilitarlo.
  - **Batería:** se corta con la pestaña oculta y se usa `maximumAge` de 60 s.
  - **Pantalla:** la sección usa `100dvh` menos el header y la barra inferior.
  - **Accesibilidad:** la lista es navegable sin el mapa y el botón tiene etiqueta.

## Dependencias y configuración

<!-- Librerías, servicios, permisos o configuración afectados. Verifica compatibilidad
con el proyecto y justifica las incorporaciones. No agregues dependencias por defecto. -->

- **Sin dependencias nuevas:** el agrupamiento se hace con una función propia de unas 30 líneas en lugar de `leaflet.markercluster`.
- La geolocalización exige HTTPS en producción (está en la checklist de LANZAMIENTO).

## Estrategia de validación

<!-- Una fila por criterio de la spec. Selecciona el método capaz de demostrarlo:
test unitario, integración, UI o prueba manual. No todos requieren todos los métodos.
Identifica tests existentes y separa los nuevos propuestos. Incluye regresiones relevantes.
Una captura aislada no demuestra persistencia ni ausencia de peticiones de red. -->

| Criterio | Método y test existente o propuesto | Entorno y datos necesarios | Evidencia prevista |
| --- | --- | --- | --- |
| CA-03, CA-04 | UI con `javascript_tool` en `/mapa` a 360 px y 1280 px: buscador, pines o grupos, círculo, hoja con foto, nombre, localidad y distancia; clic en un ítem. | Dev; sesión por cookie; pros de prueba en Capital, Goya y Resistencia. | DOM con los elementos; el resumen tiene "Ver perfil" con el enlace correcto. |
| CA-05 | UI: geolocalización simulada con un *override* de `navigator.geolocation` que mueve la posición 2 km. | Dev (el panel no permite el permiso real). | La cookie cambia, el puntito se mueve y la lista se refresca con las distancias nuevas. |
| CA-06 | UI: mover el mapa y tocar "Ubicarme ahora". | Igual. | El centro vuelve a la posición. |
| CA-07 | UI con la geolocalización simulada devolviendo `PERMISSION_DENIED`; HTML sin cookie. | Dev. | "Usando tu localidad: {nombre}"; el centro es la localidad. |
| CA-08, CA-09 | Integración: HTML de la portada con la cookie en Goya; un pro sin punto propio con localidad cercana. Unitarios de haversine. | Dev con pros de prueba. | Nadie a más de 20 km; el pro sin punto aparece con distancia a su localidad. |
| CA-10 | HTML de las tarjetas. | Dev. | "{localidad} • {distancia}". |
| CA-11 | HTML y payload de la portada, `/solicitudes` y `/mapa` sin sesión. | Dev. | Recuadro "Iniciá sesión…"; sin coordenadas en la respuesta; `/mapa` → 307 a `/entrar?next=/mapa`; entrar vuelve a `/mapa`. |
| CA-12 | HTML de la portada con sesión. | Dev. | Mapa compacto y enlace "Ver mapa completo". |
| CA-13 | Búsqueda sin nadie a 20 km (cookie en Esquina). | Dev. | Mensaje con el enlace a publicar solicitud. |

**Comprobaciones de regresión:**
- Los invitados siguen viendo resultados sin filtro de distancia.
- La búsqueda por texto y rubro sigue igual.
- Las solicitudes siguen abriendo su detalle.
- `pnpm test` y `pnpm build`.

**Comandos verificados para compilar y ejecutar tests:** los de siempre.

**Pruebas en dispositivo, emulador o simulador:** el permiso real de ubicación y el movimiento real se prueban en un celular con el sitio en HTTPS. Queda para el usuario en producción. Acá se simula.

**Limitaciones del entorno:** el panel del navegador no pinta ni tiene GPS; el mapa se valida por DOM y geometría, no por captura.

<!-- Esta sección planifica la validación. Durante la implementación, registra
en TASKS.md o en el informe de validación acordado los resultados y evidencias
reales. Distingue pruebas ejecutadas, fallidas, no ejecutadas y bloqueadas.
Compilar o tener tests en verde no sustituye revisar los criterios de la spec. -->

## Orden de implementación

<!-- Etapas y dependencias principales. El desglose ejecutable se escribe en TASKS.md.
Incluye puntos de comprobación para avanzar con cambios pequeños. -->

1. **`geo.ts`, `ubicacion.ts`, `cercanos.ts` y el desempate**, con tests.
2. **Portada:** filtro, tarjetas, invitado sin coordenadas, `MapaBloqueado`, mensajes. Comprobación: CA-08…CA-13.
3. **Ubicación en vivo y aviso.** Comprobación: CA-05 y CA-07.
4. **Sección `/mapa` y navegación.** Comprobación: CA-03, CA-04 y CA-06.
5. **Cierre:** build, limpieza y evidencia.

**Subagentes:** no hacen falta.

## Riesgos y decisiones pendientes

<!-- Riesgos concretos de esta solución y cómo se resolverán, sin listas genéricas.
Escribe Ninguna en las decisiones pendientes cuando estén resueltas. -->

- **Riesgos y medidas acordadas:**
  - **Tiles de OpenStreetMap:** su política de uso limita el tráfico alto. Con el volumen del lanzamiento alcanza; si crece, hay que pasar a un proveedor con clave.
  - **Refrescos:** si el GPS es impreciso y salta más de 1 km, puede refrescar de más. Se usa `maximumAge` y el umbral de 1 km.
  - **Permiso de ubicación:** el navegador lo pide al entrar con sesión. Es lo que pide la spec ("tiempo real por defecto").
- **Decisiones tomadas con la autorización general** (para revisar):
  1. Agrupamiento de pines con una función propia en lugar de sumar `leaflet.markercluster`: menos dependencias y compatible con react-leaflet 5.
  2. Las fotos de trabajos y las solicitudes también se filtran a 20 km en el mapa con sesión, porque son capas del mismo mapa.
  3. Los invitados tampoco reciben coordenadas en `/solicitudes` (el mapita del detalle no se muestra sin sesión).
  4. Un pro sin punto ni localidad queda en Capital.
- **Decisiones pendientes:** Ninguna.

<!-- ANTES DE SOLICITAR APROBACIÓN
Comprueba que el plan cubre los requisitos, respeta las exclusiones, reutiliza
componentes verificados y permite demostrar todos los criterios de aceptación.
Resuelve dudas y marcadores pendientes. Si la spec cambió, revisa su impacto.
Tras aprobar el plan, deriva TASKS.md con IDs, dependencias, referencias a RF/CA
y comprobaciones. No marques una tarea terminada sin realizar su validación;
si está bloqueada, registra el motivo.
-->
