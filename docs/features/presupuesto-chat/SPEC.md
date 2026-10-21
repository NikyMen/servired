# SPEC: Presupuesto del chat pensado para el celular

**Estado:** Aprobada (21/10/2026) <!-- Borrador | En revisión | Aprobada -->

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

Propuesta visual con prototipo: [propuesta.html](propuesta.html) (también
publicada como artifact privado: https://claude.ai/artifact/VDCVWFT431BK7JYwGDuCze).

## Qué construimos y para quién

<!-- Qué necesidad resolvemos, quién tiene esa necesidad y qué podrá hacer.
Describe el objetivo en lenguaje de producto. -->

El cliente del negocio pidió mejorar el presupuesto dentro del chat porque **en
el celular no se ve bien**. Lo usan los dos lados de la conversación:

- **El oferente**, para mandar el presupuesto (monto, días y qué incluye) y
  después cerrar el trabajo.
- **El cliente**, para entender qué le proponen, aceptarlo o rechazarlo, pagar
  y calificar.

El objetivo es que el presupuesto se vea y se maneje dentro de la conversación:
una tarjeta que dice en qué está, un aviso fijo cuando a alguien le toca hacer
algo y botones cómodos para el dedo.

Los cambios se prueban primero en **servired.consultoriadigital.io**;
**servired.ar** no cambia hasta que se apruebe.

## Situación actual

<!-- Comportamiento actual relevante, limitación que queremos resolver y
comportamientos existentes que deben conservarse. No describas la arquitectura. -->

Comprobado en el código el 20/10/2026:

- Para llegar al presupuesto hay que tocar un **ícono de maletín sin texto** que
  está en la barra de escribir. Con el clip, el maletín y el botón de enviar, el
  campo de texto queda muy angosto en pantallas de 360 px.
- La tarjeta del presupuesto que queda en el chat **no tiene botones** y **no
  cambia**: sigue en ámbar después de que la aceptan, la rechazan o vence. Si el
  detalle trae un punto medio (·), se parte mal.
- El panel del acuerdo usa los mismos controles que la lista de contrataciones
  de la compu: alineados a la derecha, con anchos fijos y botones de unos 30 px
  de alto. El monto aparece dos veces.
- El monto se carga en un campo de número sin $ ni separador de miles y los días
  se escriben a mano. Con el teclado abierto, "Enviar propuesta" queda tapado.
- **Aceptar no pide confirmación**, y el plazo del trabajo empieza a correr en
  ese momento.
- Después de aceptar o rechazar, el panel puede seguir mostrando los botones
  hasta 5 segundos. El servidor no frena un segundo toque: puede repetir el
  mensaje y el aviso.
- Cuando el presupuesto se rechaza o vence, el encabezado dice "Acuerdo
  abierto", que no explica qué pasó.
- Los mensajes de aceptado, rechazado y terminado se ven como burbujas de una de
  las personas y no como avisos del sistema.
- **Hoy los dos dominios son el mismo sitio.** `servired.consultoriadigital.io`
  redirige a `servired.ar`, salvo las direcciones `/api/`, que se contestan en
  los dos. No existe un entorno de prueba aparte.

Se conserva:

- Una sola propuesta vigente por conversación; vence a los 5 días; el plazo del
  trabajo arranca al aceptar.
- Solo el oferente propone, solo el cliente acepta o rechaza; después de un
  rechazo o un vencimiento el oferente puede mandar otra.
- El cierre del trabajo, el pago por Mercado Pago, la calificación obligatoria y
  los avisos (campanita y correo).
- La lista de `/contrataciones` y el panel del oferente siguen funcionando igual.

## Dentro del alcance

<!-- Requisitos concretos, con identificadores estables para vincularlos a
criterios, decisiones del plan y tareas. -->

**Presupuesto en el chat**

- **RF-01:** La tarjeta del presupuesto muestra el monto, los días de trabajo, el detalle y su estado con texto: *Pendiente* (con la fecha en que vence), *Aceptado*, *Rechazado* o *Vencido*. Mientras la conversación está abierta, el estado se actualiza solo.
- **RF-02:** Mientras el presupuesto está pendiente, el cliente puede aceptarlo o rechazarlo desde la tarjeta. El oferente ve la misma tarjeta, sin esos botones.
- **RF-03:** Aceptar pide confirmación con un resumen: monto, días y fecha en que termina el plazo si se acepta hoy. Rechazar también pide confirmación y avisa que el oferente puede mandar otro.
- **RF-04:** Debajo del encabezado aparece una franja con el estado y, si a quien mira le toca hacer algo, el botón para hacerlo. Lo que dice en cada estado y lado está en la tabla de *Datos y reglas*.
- **RF-05:** El estado bajo el nombre de la otra persona distingue *rechazado* y *vencido*; deja de decir "Acuerdo abierto".
- **RF-06:** El oferente manda el presupuesto desde un botón **+** junto al campo de texto, que ofrece "Adjuntar" y "Enviar presupuesto". Si ya hay uno pendiente o un trabajo en marcha, la opción aparece desactivada y dice por qué. El cliente ve solo el botón de adjuntar.
- **RF-07:** El formulario de presupuesto ocupa toda la pantalla en el celular y es una ventana centrada en la compu. Tiene el monto con $ y separador de miles, los días con opciones rápidas (1, 2, 3, 5, 7 y "Otro") y el detalle opcional. Muestra una vista previa de cómo lo va a ver el cliente, y el botón de enviar dice el monto. El mismo formulario sirve para el primer presupuesto y para los siguientes.
- **RF-08:** Las acciones del acuerdo (aceptar, rechazar, cerrar el trabajo, pagar, calificar) tienen botones de al menos 44 px de alto y se apilan a lo ancho. La calificación se elige tocando estrellas.
- **RF-09:** Después de cualquier acción, el chat muestra el estado nuevo apenas responde el servidor, sin recargar ni esperar la próxima actualización.
- **RF-10:** Una misma acción repetida (doble toque, dos pestañas o los dos celulares a la vez) tiene un solo efecto: un solo cambio de estado, un mensaje en el chat y un aviso.
- **RF-11:** Los mensajes del acuerdo (aceptado, rechazado, trabajo terminado y pago confirmado) se ven como avisos del sistema, centrados.
- **RF-12:** Los presupuestos que se mandaron antes de este cambio se siguen viendo bien en el chat. Si no se pueden mostrar con su estado, la acción que corresponda sigue disponible desde la franja.

**Publicación en el entorno de prueba**

- **RF-13:** `servired.consultoriadigital.io` muestra la versión nueva y ya no redirige a `servired.ar`. `servired.ar` sigue con la versión actual hasta que el usuario apruebe pasarla.
- **RF-14:** Lo que se haga en el entorno de prueba no toca a los usuarios reales: no usa ni modifica la base de producción, no manda correos a usuarios reales y no cobra plata real.
- **RF-15:** Los pagos, las vinculaciones de Mercado Pago y los inicios de sesión de producción siguen funcionando igual después de separar los dominios.
- **RF-16:** El entorno de prueba muestra que lo es, con una franja fija que dice "Entorno de prueba", y pide usuario y clave para entrar.

## Fuera de alcance

<!-- Exclusiones acordadas, no deducidas por el agente. Si no hay exclusiones
adicionales, indícalo tras revisarlo con la persona. -->

- Presupuesto por ítems, retirar un presupuesto pendiente y fotos adjuntas al
  presupuesto: quedan afuera de esta tanda (aprobado el 21/10/2026). Se
  consultan con el cliente; si las pide, van en otra spec.
- Cambiar las reglas del acuerdo: vencimiento, una sola propuesta vigente y
  quién puede hacer cada cosa siguen como están.
- Publicar en `servired.ar`: necesita otra aprobación.

## Flujo de usuario

<!-- Cómo se inicia, qué hace el usuario y qué resultado obtiene.
Incluye pantallas afectadas, navegación y alternativas relevantes. -->

1. El cliente y el oferente charlan en Mensajes. Si todavía no hay presupuesto,
   el oferente ve la franja "¿Ya sabés cuánto sale?" con el botón **Enviar
   presupuesto**; el cliente no ve franja.
2. El oferente abre el formulario desde la franja o desde el **+**. Carga monto,
   días y detalle, mira la vista previa y lo manda. El formulario se cierra y
   aparece la tarjeta *Pendiente* en el chat.
3. El cliente ve la franja ámbar "Presupuesto de $X · vence el …". Al tocar
   **Ver**, el chat lo lleva a la tarjeta y la resalta.
4. El cliente toca **Aceptar** y confirma. La tarjeta pasa a *Aceptado*, aparece
   el aviso "Aceptaste el presupuesto" y la franja muestra "Día 1 de N" con una
   barra. Si toca **Rechazar** y confirma, la tarjeta pasa a *Rechazado* con el
   monto tachado y el oferente ve **Mandar otro**.
5. Si el cliente no responde en 5 días, la tarjeta pasa a *Vencido* y el
   oferente ve **Mandar otro**.
6. Con el trabajo en curso, el oferente toca **Terminé** en la franja, confirma
   el monto final y qué hizo. El cliente ve "Total $X" y **Pagar con Mercado
   Pago**.
7. Al volver de Mercado Pago con el pago acreditado, el cliente ve **Calificar**.
   Elige las estrellas y publica. El acuerdo se cierra y la conversación queda
   lista para otro presupuesto.

Alternativas:

- Si el oferente no tiene Mercado Pago vinculado, en lugar de **Terminé** la
  franja lo manda a vincularlo (como hoy).
- Si el presupuesto vence mientras el cliente tiene abierta la confirmación,
  aceptar falla con "El presupuesto venció" y la tarjeta pasa a *Vencido*.

## Datos y reglas de negocio

<!-- Información que necesita el usuario, campos obligatorios, validaciones,
límites y reglas como duplicados u orden de presentación. Describe significado
y comportamiento, sin diseñar tablas, DTO, DAO ni almacenamiento. -->

- **Monto:** obligatorio, entero en pesos, entre $100 y $100.000.000 (los
  límites de hoy). Se muestra con separador de miles (`$150.000`).
- **Días:** obligatorio, entre 1 y 365 (como hoy). Cuentan desde que el cliente
  acepta.
- **Detalle:** opcional, hasta 2000 caracteres (como hoy).
- **Vencimiento:** 5 días desde el envío; la tarjeta muestra la fecha.
- Cada tarjeta corresponde a **un** presupuesto, y su estado sale de ese
  presupuesto, no del texto del mensaje.

Lo que dice la franja en cada estado:

| Estado | Cliente | Oferente |
| --- | --- | --- |
| Sin presupuesto | No aparece | "¿Ya sabés cuánto sale?" · **Enviar presupuesto** |
| Pendiente | "Presupuesto de $X · vence el …" · **Ver** | "Esperando que responda · vence el …" |
| Rechazado | "Rechazaste el presupuesto. Te puede mandar otro." | "Rechazó el presupuesto" · **Mandar otro** |
| Vencido | "El presupuesto venció. Pedile uno nuevo." | "Venció sin respuesta" · **Mandar otro** |
| En curso | "Día N de M" con barra | "Día N de M" con barra · **Terminé** (o "Vinculá Mercado Pago") |
| Terminado | "Total $X" · **Pagar con Mercado Pago** | "Esperando el pago" |
| Pagado | "¿Cómo fue el trabajo?" · **Calificar** | "Pagado. Falta que te califique." |

## Comportamiento mobile y casos alternativos

<!-- Adapta la tabla usando MOBILE_GUIDELINES.md. Añade escenarios relevantes.
Marca No aplica con su motivo cuando corresponda. No presupongas soporte offline
ni conservación de todo el estado. Expresa resultados, no mecanismos técnicos. -->

| Situación | Comportamiento esperado |
| --- | --- |
| Carga o acción en curso | El botón tocado dice "Enviando…" y queda desactivado hasta que responde el servidor; no se puede mandar dos veces. |
| Sin datos | Sin presupuesto, el oferente ve la franja para mandar uno y el cliente ve el chat normal, sin tarjeta ni franja. |
| Entrada inválida | El botón de enviar queda desactivado y dice qué falta ("Completá el monto y los días"). Si el servidor rechaza un dato, el error aparece en el formulario sin borrar lo cargado. |
| Error o espera excesiva | Se muestra un error que explica qué pasó, con "Reintentar", y la pantalla queda como estaba. |
| Sin conexión o conexión interrumpida | Si se corta mientras se manda, se informa el error sin perder lo escrito. Al reintentar no se duplica el presupuesto ni la aceptación (RF-10). |
| Cancelar o volver atrás | Cerrar el formulario o la confirmación no cambia nada. Si se cierra el formulario con datos cargados, al abrirlo de nuevo en la misma conversación siguen ahí. |
| Pasar a segundo plano y regresar | Al volver a la pestaña, el estado se actualiza en el acto (por ejemplo, si el cliente aceptó mientras tanto). |
| Recrear la pantalla | Al recargar, la tarjeta y la franja muestran el estado real. Lo cargado en el formulario sin enviar se conserva mientras dure la pestaña. |
| Reabrir después de terminarse el proceso | Se ve el estado real del servidor; un formulario sin enviar puede perderse. |
| Teclado abierto | El botón de enviar del formulario queda a la vista, arriba del teclado. Los campos usan letra de 16 px o más para que iOS no haga zoom. |
| Texto grande del sistema | Nada se corta: los textos bajan de línea y las tarjetas crecen. |
| El estado cambia mientras se mira | Si el presupuesto vence o la otra parte responde, la tarjeta y la franja se actualizan y los botones que ya no corresponden desaparecen. |
| Accesibilidad | El estado siempre se dice con texto, no solo con el color. Las ventanas se anuncian como diálogo, toman el foco al abrir, se cierran con Escape y devuelven el foco al cerrarse. Áreas táctiles de al menos 44 px. |

**Puntos de la guía no aplicables y motivo:** Permisos del dispositivo (no se
usa cámara, ubicación ni otros permisos: adjuntar sigue igual que hoy); trabajo
en segundo plano (no hay tareas nuevas fuera de la pantalla: el vencimiento ya
lo resuelve el servidor); idiomas (el sitio es solo en español de Argentina,
pesos y fechas `es-AR`).

## Restricciones del pedido

<!-- Condiciones ya impuestas: compatibilidad, límites de alcance, requisitos
de accesibilidad o rendimiento medibles, o una tecnología expresamente exigida.
Ejemplo: Usar Room puede ser una restricción; el diseño de entidades va en PLAN.md.
No conviertas una preferencia del agente en una restricción. -->

- **Pedido del usuario (21/10/2026):** los cambios se publican en
  `servired.consultoriadigital.io` y **no** en `servired.ar`. Pasarlos a
  `servired.ar` necesita su aprobación aparte.
- Mismo stack y mismo VPS de hoy; no se suma infraestructura paga.
- La lista de `/contrataciones` y el panel del oferente tienen que seguir
  funcionando como hoy.

## Criterios de aceptación

<!-- Resultados observables que permitan decidir si se cumple cada requisito.
Incluye los casos alternativos acordados. No uses Funciona correctamente.
Repite el formato según sea necesario. -->

- **CA-01 · RF-01:** Dado un presupuesto pendiente, cuando el cliente lo acepta desde otro dispositivo, entonces en el chat abierto del oferente la tarjeta pasa de *Pendiente* a *Aceptado* sin recargar.
- **CA-02 · RF-01:** Dado un presupuesto cuyo detalle trae "·", cuando se muestra la tarjeta, entonces el detalle se ve completo y el monto no cambia de lugar.
- **CA-03 · RF-02:** Dado un presupuesto pendiente, cuando lo mira el cliente, entonces la tarjeta tiene **Aceptar** y **Rechazar**; cuando lo mira el oferente, no los tiene.
- **CA-04 · RF-03:** Dado un presupuesto de $150.000 por 2 días, cuando el cliente toca **Aceptar**, entonces ve una confirmación con $150.000, 2 días y la fecha de fin, y si toca **Volver** nada cambia.
- **CA-05 · RF-04:** Para cada fila de la tabla de la franja, dado ese estado, cuando mira cada lado, entonces la franja dice ese texto y tiene ese botón.
- **CA-06 · RF-04:** Dado un presupuesto pendiente, cuando el cliente toca **Ver** en la franja, entonces el chat se desplaza hasta la tarjeta y la resalta.
- **CA-07 · RF-05:** Dado un presupuesto rechazado (o vencido), cuando se abre la conversación, entonces bajo el nombre dice "Presupuesto rechazado" (o "El presupuesto venció") y no "Acuerdo abierto".
- **CA-08 · RF-06:** Dado un presupuesto pendiente, cuando el oferente abre el **+**, entonces "Enviar presupuesto" aparece desactivado con el texto "Ya hay uno esperando respuesta". El cliente no ve el **+**, solo el clip.
- **CA-09 · RF-07:** Dado un celular de 360 px, cuando el oferente escribe "150000" en el monto, entonces ve "150.000", la vista previa muestra $150.000 y el botón dice "Enviar presupuesto · $150.000".
- **CA-10 · RF-07:** Dado un presupuesto rechazado, cuando el oferente toca **Mandar otro**, entonces se abre el mismo formulario y el nuevo presupuesto queda *Pendiente*.
- **CA-11 · RF-08:** Dado un celular de 360 px, cuando se mide cada botón del acuerdo, entonces todos tienen al menos 44 px de alto y ninguno se sale de la pantalla.
- **CA-12 · RF-09:** Dado un presupuesto pendiente, cuando el cliente confirma **Aceptar**, entonces los botones de la tarjeta desaparecen apenas responde el servidor.
- **CA-13 · RF-10:** Dado un presupuesto pendiente, cuando se mandan dos pedidos de aceptar casi al mismo tiempo, entonces queda un solo mensaje "aceptado" en el chat y el oferente recibe un solo aviso.
- **CA-14 · RF-11:** Dado un presupuesto aceptado, cuando se abre el chat, entonces "Aceptaste el presupuesto" (o "aceptó", para el oferente) se ve centrado como aviso del sistema.
- **CA-15 · RF-12:** Dada una conversación con un presupuesto mandado antes del cambio, cuando se abre, entonces se lee el monto y los días, y si está pendiente el cliente puede aceptarlo (desde la tarjeta o la franja).
- **CA-16 · RF-13:** Cuando se entra a `servired.consultoriadigital.io/mensajes`, entonces se ve la versión nueva sin redirección; cuando se entra a `servired.ar/mensajes`, entonces se ve la versión actual.
- **CA-17 · RF-14:** Dado un presupuesto aceptado en el entorno de prueba, cuando se mira `servired.ar`, entonces ese presupuesto no existe, y ningún usuario real recibió un correo por él.
- **CA-18 · RF-15:** Después de separar los dominios, cuando se hace un pago real de prueba controlada (o se revisa el último aviso de Mercado Pago), entonces llega a `servired.ar` y el trabajo pasa a pagado.
- **CA-19 · RF-16:** Cuando se abre cualquier página del entorno de prueba, entonces se ve la franja "Entorno de prueba"; en `servired.ar` no se ve.

## Cómo se comprueba el comportamiento

<!-- Una fila por criterio: escenario y resultado que debemos comprobar.
La selección de tests, herramientas, comandos y evidencias se desarrolla en PLAN.md.
No marques los criterios como superados durante la especificación. -->

| Criterio | Condiciones y pasos | Resultado esperado |
| --- | --- | --- |
| CA-01 | Cliente y oferente con el chat abierto en dos navegadores; el cliente acepta. | La tarjeta del oferente cambia sola en menos de 10 s. |
| CA-02 | Presupuesto con detalle "Cartucho · flexibles · mano de obra". | Detalle completo en un solo bloque. |
| CA-03 | Abrir la misma conversación como cliente y como oferente. | Botones solo del lado del cliente. |
| CA-04 | Tocar Aceptar y luego Volver. | Confirmación con los datos; el estado sigue *Pendiente*. |
| CA-05 | Recorrer los 7 estados con los dos lados. | Texto y botón según la tabla. |
| CA-06 | Conversación larga con el presupuesto arriba; tocar Ver. | La tarjeta queda a la vista y resaltada. |
| CA-07 | Un presupuesto rechazado y otro vencido. | El encabezado dice cada caso. |
| CA-08 | Abrir el + con un presupuesto pendiente, como oferente y como cliente. | Opción desactivada con motivo; el cliente no ve el +. |
| CA-09 | Celular 360 px (o emulación), escribir el monto. | Miles, vista previa y botón con el monto. |
| CA-10 | Rechazar y mandar otro desde la franja. | Nueva tarjeta *Pendiente*. |
| CA-11 | Celular 360 px, todos los estados con botones. | Alto ≥ 44 px y sin desbordes. |
| CA-12 | Aceptar con la red lenta simulada. | "Enviando…" y luego sin botones. |
| CA-13 | Dos pedidos de aceptar en paralelo. | Un mensaje y un aviso. |
| CA-14 | Abrir un chat con presupuesto aceptado. | Aviso del sistema centrado. |
| CA-15 | Copia de la base con presupuestos viejos. | Se leen; el pendiente se puede aceptar. |
| CA-16 | Abrir las dos direcciones. | Prueba con lo nuevo, producción sin cambios. |
| CA-17 | Aceptar un presupuesto en prueba y buscarlo en producción. | No existe; sin correos a usuarios reales. |
| CA-18 | Revisar en Mercado Pago a qué dirección llegan los avisos y ver un pago acreditado después del cambio. | Llega a servired.ar. |
| CA-19 | Abrir páginas en los dos dominios. | Franja solo en prueba. |

## Decisiones pendientes

<!-- Al resolverlas, actualiza las secciones afectadas. Escribe Ninguna cuando
no queden pendientes funcionales ni restricciones por decidir. -->

Ninguna. Decisiones tomadas el 21/10/2026 (aprobó el usuario):

- **Datos de prueba:** copia de la base de producción **anonimizada**: correos y
  teléfonos reemplazados, documentos de identidad ilegibles, sin cuentas de
  Mercado Pago vinculadas ni sesiones abiertas. Las preinscripciones (Mongo)
  no se copian. Para probar se crean cuentas nuevas en la prueba.
- **Correos:** todos los correos de la prueba van a una sola casilla del equipo
  (`consultas@servired.ar`), con el destinatario original en el asunto. Si
  falta esa casilla, la prueba no manda ningún correo.
- **Mercado Pago:** con credenciales de prueba de Mercado Pago, que carga el
  usuario en el servidor. Hasta que estén, el pago queda apagado en la prueba.
- **Acceso:** usuario y clave en la puerta, que genera el usuario en el
  servidor. Sin eso, la prueba no abre (falla cerrada). Además no se indexa.
- **Login con Google y Facebook:** producción no tiene esas claves cargadas, así
  que la prueba tampoco; se entra con correo y contraseña.
- **Avisos de Mercado Pago a la dirección vieja:** las direcciones
  `/api/mercadopago/` de `servired.consultoriadigital.io` siguen yendo a
  producción, así los pagos reales se acreditan aunque el webhook todavía
  apunte ahí (RF-15). Conviene igual pasarlo a `servired.ar` en el panel de
  Mercado Pago.

<!-- ANTES DE SOLICITAR APROBACIÓN
Comprueba que el alcance está acordado, los flujos son coherentes, los puntos
mobile relevantes están cubiertos y cada requisito tiene criterios comprobables.
Resuelve las dudas y los marcadores pendientes. Mantén el diseño técnico en PLAN.md.
-->
