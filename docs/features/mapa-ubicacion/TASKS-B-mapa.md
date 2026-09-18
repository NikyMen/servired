# TASKS: Mapa y ubicación, parte B

**SPEC:** [SPEC.md](SPEC.md) (Aprobada) · **PLAN:** [PLAN-B-mapa.md](PLAN-B-mapa.md) (Aprobado)
**Autorización para implementar:** autorización general del usuario del 2026-09-18 ("sin parar hasta el último").

Leyenda: `[ ]` pendiente · `[x]` hecha y validada · `[!]` bloqueada (con motivo) · `[~]` hecha, con una parte que valida el usuario.

## Tareas

- [x] **T1 · Geografía y ubicación del usuario**
  - Objetivo: distancia, formato, cookie de ubicación, agrupamiento y pros cercanos.
  - Alcance: `geo.ts`, `ubicacion.ts`, `cercanos.ts`, desempate en `search.ts`; tests.
  - Depende de: parte A
  - Resuelve: RF-10, RF-11, RF-12 (lógica)
  - Validación: `pnpm test`.

- [x] **T2 · Portada con 20 km e invitado sin mapa**
  - Objetivo: resultados y mapa a ≤ 20 km con sesión; invitado con el recuadro y sin coordenadas.
  - Alcance: `(client)/page.tsx`, `ProfessionalCard`, `ProCard`, `MapaBloqueado`, `SolicitudCard`, `ClientResultSwitch`, `(client)/solicitudes/page.tsx`.
  - Depende de: T1
  - Resuelve: RF-10…RF-15 · CA-08…CA-13
  - Validación: HTML con cookie en Goya y en Esquina, y sin sesión.

- [x] **T3 · Ubicación en vivo**
  - Objetivo: puntito que se mueve, refresco al alejarse más de 1 km, "Ubicarme ahora" y aviso sin permiso.
  - Alcance: `UbicacionEnVivo.tsx` (proveedor y contexto), `AvisoUbicacion.tsx`, layout de cliente, puntito en `MapInner`.
  - Depende de: T1
  - Resuelve: RF-07, RF-08, RF-09 · CA-05, CA-06, CA-07
  - Validación: geolocalización simulada en el panel.

- [x] **T4 · Sección Mapa y navegación**
  - Objetivo: `/mapa` a pantalla completa con buscador, pines agrupados, círculo, lista y resumen; "Mapa" en el nav.
  - Alcance: `(client)/mapa/page.tsx`, `mapa/MapaCompleto*.tsx`, `ListaCercanos.tsx`, `Header`, `BottomNav`.
  - Depende de: T1, T3
  - Resuelve: RF-04, RF-05, RF-06, RF-13 · CA-03, CA-04, CA-06, CA-11
  - Validación: DOM y geometría a 360 y 1280 px; redirección del invitado.

- [x] **T5 · Cierre**
  - Objetivo: build, regresiones y limpieza.
  - Alcance: `pnpm test`, `tsc`, `pnpm build`; datos de prueba borrados.
  - Depende de: T1–T4
  - Resuelve: regresiones
  - Validación: salida registrada abajo.

## Evidencia

<!-- Resultados reales de cada validación: comando o pasos, resultado observado y fecha. -->

Todo en local el 2026-09-18. Cliente de prueba con localidad Capital y sesión por
cookie; cuatro pros de prueba de Plomería: uno con punto propio en Capital, uno
solo con localidad Resistencia, uno con punto en Goya y uno sin punto ni
localidad. Portada y accesos contra `next dev`; `/mapa` y la ubicación en vivo
contra `next start` (build de producción). Datos borrados al final.

| Tarea / criterio | Qué se hizo | Resultado observado |
| --- | --- | --- |
| T1 | `corepack pnpm test` con haversine, formato de distancia, cookie, punto del pro, agrupamiento y desempate por distancia. | 27/27. |
| T2 · CA-08 | Portada con la cookie de ubicación en Goya. | Solo aparece el pro de Goya ("a menos de 1 km"); ninguno de Capital ni de Resistencia. |
| T2 · CA-09, CA-10 | Portada con la cookie en Capital y sin cookie. | Pro de Capital "a menos de 1 km"; pro sin punto ubicado en su localidad: "Resistencia • 15 km" (16 km sin cookie, desde el punto de la localidad); pro sin nada, en Capital. El de Goya no aparece. |
| T2 · CA-13 | Cookie en Esquina. | "No encontramos profesionales a 20 km" con el botón "Publicar solicitud". |
| T2 · CA-12 | Portada con sesión. | Mapa compacto con el círculo y "Ver mapa completo". |
| T2 · CA-11 | Portada, `/solicitudes` y `/mapa` sin sesión. | Recuadro "Iniciá sesión para ver el mapa"; 0 coordenadas en la respuesta de la portada y de `/solicitudes`; las tarjetas sin distancia; `/mapa` → 307 a `/entrar?next=/mapa`. |
| T3 · CA-07 | Sin cookie: aviso. Con el GPS simulado devolviendo `PERMISSION_DENIED`. | "Usando tu localidad: Corrientes Capital." con "Ubicarme ahora"; al negar, la cookie se borra y aparece la explicación de cómo habilitar el permiso. |
| T3 · CA-05 | GPS simulado: posición en Capital y después un salto de ~2 km. | La cookie pasa a `-27.470\|-58.831` y después a `-27.451\|-58.831`; aparece el puntito; tras el refresco la lista muestra "2,0 km". Aviso "Mostrando lo que está a 20 km de tu ubicación." |
| T4 · CA-03 | `/mapa` a 1280 px. | Buscador, círculo de 20 km, "Ubicarme ahora", hoja "Profesionales cerca tuyo · 11 a 20 km o menos" con foto, nombre, oficio, localidad y distancia; los 11 pines se ven como 2 (un grupo "10 profesionales" y uno suelto). "Mapa" en el header. |
| T4 · CA-04 | Tocar un ítem de la hoja. | Resumen "Prueba resistencialoc · Plomero · Resistencia • 16 km" con "Ver perfil" → `/profesionales/{id}`. |
| T4 · 360 × 780 | Geometría de `/mapa`. | Mapa 265–675 px; la hoja plegada al pie del mapa; la barra inferior (721–780) con Buscar, Mapa, Solicitudes, Propuestas, Mensajes; sin scroll horizontal. |
| T4 · CA-06 | "Ubicarme ahora" | El botón está y llama a la geolocalización (con el GPS simulado actualiza la posición). El recentrado visual no se puede comprobar en el panel, que no pinta. |
| T5 | `tsc --noEmit`, `corepack pnpm test`, `rm -rf .next && corepack pnpm build`; logs de `next start`. | Sin errores; 27/27; build completo (`/mapa` 4,36 kB); sin errores del servidor. |

**Pendiente fuera de este entorno:** probar en un celular real, con el sitio en
HTTPS, el pedido de permiso y el seguimiento mientras la persona se mueve.
