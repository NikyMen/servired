# SPEC: Publicidad: placas al pie, laterales que acompañan y carga simple

**Estado:** Aprobada <!-- Borrador | En revisión | Aprobada -->

> **Cambio posterior (2026-09-20), pedido directo del cliente.** Lo de abajo
> quedó viejo en un punto: la portada ya **no** tiene tres grupos distintos.
> Hay **9 placas iguales** (`portada-1`…`portada-9`) debajo de la portada, las
> mismas en el celular y en la compu (3 filas de 3 en el celular; una fila de 9
> a todo el ancho desde `lg`), más las **4 del pie**, que siguen igual. Ya no
> existen las laterales que acompañan el scroll (RF-02, CA-02) ni las de solo
> celular. Una placa de portada sin imagen **invita a contratarla** por el
> WhatsApp de soporte en vez de mostrar "ADS". Todo lo demás —placa cuadrada de
> 800 × 800, una sola imagen, recorte fijo con vista previa, WhatsApp y título
> por placa— sigue valiendo. Ver la nota del 2026-09-20 en
> [LANZAMIENTO.md](../LANZAMIENTO.md).

<!-- PARA LA PERSONA
Copia esta plantilla como SPEC.md en una carpeta de la funcionalidad.
Pide al agente que la complete contigo usando MOBILE_GUIDELINES.md.
SPEC.md define qué debe cumplirse; PLAN.md desarrolla cómo implementarlo;
TASKS.md organiza los pasos de ejecución.
-->

<!-- PARA EL AGENTE
- Lee las instrucciones del proyecto y MOBILE_GUIDELINES.md. Inspecciona el
  repositorio para comprobar el comportamiento actual. Si falta la guía, pide su ubicación.
- Completa esta spec con la persona: investiga lo comprobable y consulta las
  decisiones pendientes. Haz pocas preguntas por vez y actualiza las respuestas.
- No inventes requisitos ni exclusiones. Distingue propuestas de decisiones
  confirmadas y marca como PENDIENTE lo que aún no esté resuelto.
- Aplica las consideraciones mobile relevantes sin ampliar el alcance automáticamente.
- No incluyas diseño de clases, tablas, componentes, archivos o algoritmos:
  esos detalles pertenecen a PLAN.md. Sí registra restricciones explícitas del pedido.
- Mantén el documento breve y proporcional a la funcionalidad. Conserva los comentarios.
- Un documento completo no está aprobado automáticamente. Solicita aprobación
  antes de marcarlo como Aprobada. No implementes durante esta etapa.
-->

## Qué construimos y para quién

<!-- Qué necesidad resolvemos, quién tiene esa necesidad y qué podrá hacer.
Describe el objetivo en lenguaje de producto. -->

La publicidad es una fuente de ingresos de ServiRed y **la administra el
cliente** desde su panel. Queremos:

- **Más espacio:** 4 placas nuevas al pie de la portada, en celular y en compu.
- **Más visibilidad:** en la compu, las placas de los costados **acompañan el
  scroll** en vez de quedarse arriba.
- **Que se vea bien sin esfuerzo:** hoy la misma imagen se ve distinta en el
  celular y en la compu, y el editor (acercar, mover, estirar) es difícil. La
  carga nueva es simple. Cada tipo de placa tiene **una forma fija, igual en
  celular y compu**. Se sube una imagen, se encuadra dentro de un marco fijo y
  se ve **cómo va a quedar en el celular y en la compu**, con la medida
  recomendada y consejos.

## Situación actual

<!-- Comportamiento actual relevante, limitación que queremos resolver y
comportamientos existentes que deben conservarse. No describas la arquitectura. -->

- Hay 8 placas administrables:
  - **4 a los costados del título** de la portada (2 a cada lado), visibles solo en pantallas anchas. Quedan arriba y desaparecen al bajar.
  - **4 "móviles"** en una grilla de 2×2 debajo del título, visibles solo en el celular y en pantallas medianas.
- Cada placa tiene: imagen, título opcional, WhatsApp de contacto con mensaje
  opcional (la placa entera abre ese WhatsApp) y un interruptor de activa.
  Una placa inactiva o vacía muestra "ADS".
- El editor del panel permite acercar, alejar, mover y **estirar** la imagen.
  Como las placas cambian de forma según la pantalla, el resultado no es
  predecible.
- Se conserva el WhatsApp por placa, el título opcional y el interruptor de activa.

## Dentro del alcance

<!-- Requisitos concretos, con identificadores estables para vincularlos a
criterios, decisiones del plan y tareas. -->

- **RF-01:** Hay 4 placas nuevas al pie de la portada, después del contenido y antes del pie de página, visibles en celular y compu, administrables como las demás.
- **RF-02:** En pantallas anchas, las placas laterales quedan visibles mientras se hace scroll por la portada y no tapan el contenido central.
- **RF-03:** Cada tipo de placa (lateral, superior y pie) tiene **una proporción fija** que es la misma en celular y compu. La imagen siempre llena la placa, sin deformarse.
- **RF-04:** Al cargar una placa, administración sube **una sola imagen** y la encuadra arrastrándola y acercándola dentro de un marco con la proporción de esa placa. No se puede estirar ni dejar huecos.
- **RF-05:** Mientras encuadra, administración ve una **vista previa lado a lado** de cómo queda la placa en el celular y en la compu (las laterales, solo en compu).
- **RF-06:** Para cada tipo de placa se muestra la **medida recomendada** en píxeles y consejos breves: dejar el texto importante lejos de los bordes, letra grande, buen contraste y poco peso.
- **RF-07:** El panel agrupa las placas por ubicación (costados, arriba y pie) con una miniatura de cada una y su estado (activa, inactiva, sin imagen).
- **RF-08:** Las placas ya cargadas siguen funcionando después del cambio. Las que usaban el editor viejo quedan marcadas "Conviene volver a encuadrar".
- **RF-09:** Se elimina el editor de estirar y escalar libre.

## Fuera de alcance

<!-- Exclusiones acordadas, no deducidas por el agente. Si no hay exclusiones
adicionales, indícalo tras revisarlo con la persona. -->

- Una imagen distinta para celular y compu: se eligió una sola imagen.
- Fondo publicitario de toda la página ("skin"): no se eligió.
- Estadísticas de clics, rotación de anuncios o venta de espacios con pago en línea.

## Flujo de usuario

<!-- Cómo se inicia, qué hace el usuario y qué resultado obtiene.
Incluye pantallas afectadas, navegación y alternativas relevantes. -->

1. Administración entra a "Publicidad" y ve las placas agrupadas: Costados (4), Arriba (4) y Pie (4), cada una con su miniatura y estado.
2. Toca una placa del pie. Ve "Medida recomendada: 800 × 800 px" y los consejos.
3. Sube la imagen. Aparece dentro del marco cuadrado; la arrastra y la acerca hasta que queda bien. A la derecha ve cómo queda en el celular y en la compu.
4. Carga (opcional) el título, el WhatsApp y el mensaje, deja la placa activa y guarda.
5. En la portada, la placa aparece al pie tal como en la vista previa. En la compu, al bajar por la portada, las laterales la acompañan.

## Datos y reglas de negocio

<!-- Información que necesita el usuario, campos obligatorios, validaciones,
límites y reglas como duplicados u orden de presentación. Describe significado
y comportamiento, sin diseñar tablas, DTO, DAO ni almacenamiento. -->

- Tipos de placa, cantidad y proporción:
  | Tipo | Cantidad | Dónde | Proporción | Medida recomendada |
  | --- | --- | --- | --- | --- |
  | Costados | 4 | Compu ancha, a los lados, acompañan el scroll | vertical 1:2 | 600 × 1200 px |
  | Arriba | 4 | Celular y tablet, debajo del título (las actuales "móviles") | apaisada 2:1 | 1200 × 600 px |
  | Pie | 4 | Todas las pantallas, al final de la portada | cuadrada 1:1 | 800 × 800 px |
- Placas del pie: 2×2 en el celular y 4 en fila en la compu.
- Formatos aceptados: JPG, PNG o WebP. La imagen que se guarda queda del tamaño
  recomendado, así pesa poco sin importar lo que se suba.
- Título, WhatsApp y mensaje: igual que hoy (el WhatsApp es un celular argentino de 10 dígitos).
- Placa inactiva o sin imagen: en los costados y arriba se muestra el lugar
  "ADS" como hoy; en el pie se oculta, para que la portada no termine con huecos.

## Comportamiento mobile y casos alternativos

<!-- Adapta la tabla usando MOBILE_GUIDELINES.md. Añade escenarios relevantes.
Marca No aplica con su motivo cuando corresponda. No presupongas soporte offline
ni conservación de todo el estado. Expresa resultados, no mecanismos técnicos. -->

| Situación | Comportamiento esperado |
| --- | --- |
| Carga o acción en curso | Al guardar, "Guardando…" y el botón deshabilitado; al terminar, la miniatura se actualiza. |
| Sin datos | Placa sin imagen: marco vacío con "Subí una imagen de {medida}". |
| Entrada inválida | Formato no aceptado, imagen más chica que la mitad de la medida recomendada (aviso de que se va a ver borrosa) o WhatsApp inválido: mensaje claro. El aviso de tamaño no impide guardar. |
| Error o espera excesiva | Si falla el guardado, mensaje y se puede reintentar sin volver a encuadrar. |
| Sin conexión o conexión interrumpida | El guardado falla con mensaje; el encuadre se conserva en pantalla. |
| Cancelar o volver atrás | Cancelar deja la placa como estaba. |
| Pasar a segundo plano y regresar | El encuadre en curso sigue en pantalla. |
| Recrear la pantalla | Al recargar se pierde un encuadre sin guardar (se avisa antes de salir con cambios). |
| Reabrir después de terminarse el proceso | Igual que recrear. |
| Otros puntos aplicables de la guía | **Pantallas:** en la portada, las placas no generan scroll horizontal en 360 px; las laterales solo aparecen si hay lugar sin tapar el contenido. **Rendimiento:** las placas del pie cargan cuando se acercan a la vista. **Accesibilidad:** cada placa con título tiene texto alternativo; la que abre WhatsApp lo indica. |

**Puntos de la guía no aplicables y motivo:** permisos, trabajo en segundo
plano e idiomas no aplican.

## Restricciones del pedido

<!-- Condiciones ya impuestas: compatibilidad, límites de alcance, requisitos
de accesibilidad o rendimiento medibles, o una tecnología expresamente exigida.
Ejemplo: Usar Room puede ser una restricción; el diseño de entidades va en PLAN.md.
No conviertas una preferencia del agente en una restricción. -->

- Una sola imagen por placa, con la misma forma en celular y compu.
- La administra el cliente sin ayuda técnica: tiene que ser simple.
- No se pierden las placas ya cargadas.

## Criterios de aceptación

<!-- Resultados observables que permitan decidir si se cumple cada requisito.
Incluye los casos alternativos acordados. No uses Funciona correctamente.
Repite el formato según sea necesario. -->

- **CA-01 · RF-01:** Dadas 4 placas del pie activas, cuando se abre la portada en el celular y en la compu, entonces se ven al final, antes del pie de página. Una placa del pie inactiva no deja hueco.
- **CA-02 · RF-02:** Dada una compu de 1440 px, cuando se baja hasta el final de la portada, entonces las placas laterales siguen visibles y no se superponen con el contenido.
- **CA-03 · RF-03:** Dada una misma placa, cuando se mira en 360 px y en 1440 px, entonces tiene la misma proporción y la imagen la llena sin deformarse.
- **CA-04 · RF-04, RF-09:** Dado el editor de una placa, cuando se sube una imagen, entonces solo se puede mover y acercar dentro del marco, sin estirar ni dejar huecos.
- **CA-05 · RF-05:** Dado un encuadre en curso, cuando se mueve la imagen, entonces las vistas previas de celular y compu se actualizan al instante.
- **CA-06 · RF-05, RF-03:** Dada una placa guardada, cuando se compara la vista previa con la portada real, entonces el encuadre coincide.
- **CA-07 · RF-06:** Dado el editor de cada tipo de placa, cuando se abre, entonces muestra su medida recomendada y los consejos.
- **CA-08 · RF-07:** Dado el panel de Publicidad, cuando se abre, entonces las placas están agrupadas por ubicación con miniatura y estado.
- **CA-09 · RF-08:** Dadas las placas cargadas antes del cambio, cuando se despliega, entonces siguen apareciendo en su lugar, y las que usaban el editor viejo muestran "Conviene volver a encuadrar".

## Cómo se comprueba el comportamiento

<!-- Una fila por criterio: escenario y resultado que debemos comprobar.
La selección de tests, herramientas, comandos y evidencias se desarrolla en PLAN.md.
No marques los criterios como superados durante la especificación. -->

| Criterio | Condiciones y pasos | Resultado esperado |
| --- | --- | --- |
| CA-01 | Activar las 4 del pie; mirar la portada en 360 px y en 1440 px. | Visibles al final. |
| CA-02 | Scrollear la portada en 1440 px. | Las laterales acompañan sin tapar. |
| CA-03 | Comparar una placa en los dos anchos. | Misma forma, sin deformación. |
| CA-04 | Intentar estirar o dejar huecos en el editor. | No es posible. |
| CA-05 | Mover la imagen en el editor. | Las vistas previas cambian al instante. |
| CA-06 | Guardar y comparar con la portada. | Coincide. |
| CA-07 | Abrir el editor de cada tipo. | Medida y consejos correctos. |
| CA-08 | Abrir Publicidad en el panel. | Grupos, miniaturas y estados. |
| CA-09 | Desplegar con placas existentes. | Siguen visibles; marca en las del editor viejo. |

## Decisiones pendientes

<!-- Al resolverlas, actualiza las secciones afectadas. Escribe Ninguna cuando
no queden pendientes funcionales ni restricciones por decidir. -->

Ninguna.

<!-- ANTES DE SOLICITAR APROBACIÓN
Comprueba que el alcance está acordado, los flujos son coherentes, los puntos
mobile relevantes están cubiertos y cada requisito tiene criterios comprobables.
Resuelve las dudas y los marcadores pendientes. Mantén el diseño técnico en PLAN.md.
-->
