# TASKS: Publicidad

**SPEC:** [SPEC.md](SPEC.md) (Aprobada) · **PLAN:** [PLAN.md](PLAN.md) (Aprobado)
**Autorización para implementar:** autorización general del usuario del 2026-09-18 ("sin parar hasta el último").

Leyenda: `[ ]` pendiente · `[x]` hecha y validada · `[!]` bloqueada (con motivo) · `[~]` hecha, con una parte que valida el usuario.

## Tareas

- [x] **T1 · Catálogo y placa**
  - Objetivo: tipos con proporción fija y placa que siempre llena sin deformar.
  - Alcance: `src/lib/publicidad.ts`, `AdPlate.tsx`, tests.
  - Depende de: —
  - Resuelve: RF-03, RF-08 (regla)
  - Validación: `pnpm test`.

- [x] **T2 · Portada**
  - Objetivo: laterales que acompañan el scroll y 4 placas al pie.
  - Alcance: `(client)/page.tsx`.
  - Depende de: T1
  - Resuelve: RF-01, RF-02 · CA-01, CA-02, CA-03
  - Validación: geometría a 360, 1280 y 1440 px con placas de prueba.

- [x] **T3 · Recorte y guardado**
  - Objetivo: subir una imagen, encuadrarla en un marco fijo, ver celular y escritorio, y guardar el recorte al tamaño recomendado.
  - Alcance: `AdCropper.tsx` (reemplaza `AdImageEditor.tsx`), `saveAdAction`.
  - Depende de: T1
  - Resuelve: RF-04, RF-05, RF-06, RF-09 · CA-04…CA-07
  - Validación: recorte montado en una página temporal.

- [~] **T4 · Panel agrupado**
  - Objetivo: placas por ubicación con miniatura, estado y marca de re-encuadre.
  - Alcance: pestaña Publicidad de `admin/page.tsx`.
  - Depende de: T1, T3
  - Resuelve: RF-07, RF-08 · CA-08, CA-09
  - Validación: regla por script; pantalla del admin: el usuario.

- [x] **T5 · Cierre**
  - Objetivo: build, regresiones y limpieza.
  - Alcance: `pnpm test`, `tsc`, `pnpm build`; placas y página temporales borradas.
  - Depende de: T1–T4
  - Resuelve: regresiones
  - Validación: salida registrada abajo.

## Evidencia

<!-- Resultados reales de cada validación: comando o pasos, resultado observado y fecha. -->

Todo en local el 2026-09-18 contra `next start` (build de producción). Placas de
prueba en los 12 slots con `/apple-icon.png` (`bottom-4` apagada, `left-2` con
encuadre viejo), creadas por script y borradas al final (la base local no tenía
placas). El recorte se probó montado en una página temporal `/prueba-recorte`,
borrada al final, porque `/admin` pide la contraseña de administración.

| Tarea / criterio | Qué se hizo | Resultado observado |
| --- | --- | --- |
| T1 | Tests del catálogo (tipos, proporciones, slot `ayuda` fuera) y de `necesitaReencuadre`. | 29/29. |
| T2 · CA-01 | Portada con 3 placas del pie activas y 1 apagada, a 360 y 1440 px. | Al final, antes del pie de página: 2 × 2 en el celu (158 × 158) y en fila en la compu (239 × 239). La apagada no deja hueco. |
| T2 · CA-02 | Portada a 1440 × 860: rieles laterales. | Cada riel mide lo que toda la portada (2159 px) y sus placas están en `position: sticky; top: 96px` (464 px de alto, entran en el viewport), sin ancestros con overflow oculto y sin superponerse al centro (laterales 88–200 y 1224–1336 px; centro 216–1208). **En el panel no se puede scrollear**, así que el movimiento no se vio: lo que lo garantiza es el CSS medido. Verlo moverse queda para el usuario. |
| T2 · CA-03 | La misma placa del pie en 360 y 1440 px; estilos computados. | 1:1 en los dos anchos; `object-fit: cover`, `transform: none`. Las de arriba 2:1 (158 × 79). |
| T3 · CA-04, CA-05 | Cargar una imagen de 1600 × 900 en el recorte del pie y arrastrarla 300 px. | Arranca cubriendo el marco y centrada; el arrastre frena en el borde (left 0), sin huecos; el zoom mínimo es "cubrir"; no hay forma de estirar. Las dos vistas previas (Celular y Compu) cambian con el encuadre. |
| T3 · CA-06, CA-07 | Medida, consejos y archivo resultante. | "Medida recomendada: 800 × 800 px", 4 consejos; el input `image` queda con `placa-pie.jpg`, JPEG de 800 × 800 (5 KB). Imagen de 200 × 200: "La imagen es chica…"; GIF: "Subí una imagen JPG, PNG o WEBP." |
| T3 · guardado | `saveAdAction`. | Solo acepta slots del catálogo; con imagen nueva vuelve el encuadre a neutro y borra el archivo anterior (revisado en el código; guardarla desde el panel queda para el usuario). |
| T4 · CA-08, CA-09 | Pestaña Publicidad agrupada en Costados, Arriba y Pie con miniatura, estado y la marca "Conviene volver a encuadrar". | **No ejecutado por el agente** (pide la contraseña de administración). La regla de la marca está testeada y `/admin` compila. |
| T5 | `tsc --noEmit`, `corepack pnpm test`, `rm -rf .next && corepack pnpm build`; logs de `next start`. | Sin errores; 29/29; build completo; sin errores del servidor. |
