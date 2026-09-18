# SPEC: Avisos por correo

**Estado:** Borrador <!-- Borrador | En revisión | Aprobada -->

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

Hoy los avisos solo se ven si la persona entra al sitio. Si un cliente escribe
y el profesional no entra, el contacto se enfría. Queremos que las novedades
importantes **lleguen por correo**:

- "Tenés mensajes sin contestar", a quien tiene un mensaje sin leer hace un rato.
- "Hay una solicitud nueva de tu rubro", **solo** a los profesionales de esa categoría.
- "Te mandaron un presupuesto" al cliente, y "Aceptaron / rechazaron tu presupuesto" al profesional.

Cada persona puede darse de baja de cada tipo de aviso.

## Situación actual

<!-- Comportamiento actual relevante, limitación que queremos resolver y
comportamientos existentes que deben conservarse. No describas la arquitectura. -->

- Existe la **campanita** de avisos y la página de notificaciones: mensaje nuevo,
  propuesta recibida, propuesta aceptada o rechazada, solicitud nueva del rubro,
  solicitud por vencer, verificación de identidad y denuncias.
- El aviso de solicitud nueva **ya se manda solo a los profesionales aprobados
  que tienen ese rubro**, pero solo en la campanita (y a un máximo de 50).
- El sitio solo manda mails para verificar el correo y restablecer la contraseña.
  En producción, sin proveedor de correo configurado, esos envíos fallan.
- No hay tareas programadas: todo lo que vence se revisa cuando alguien carga una página.
- Se conserva la campanita tal como está.

## Dentro del alcance

<!-- Requisitos concretos, con identificadores estables para vincularlos a
criterios, decisiones del plan y tareas. -->

- **RF-01:** Si una persona tiene en una conversación un mensaje sin leer desde hace más de X horas, recibe **un** mail "Tenés mensajes sin contestar de {nombre}" con enlace a esa conversación.
- **RF-02:** No se repite el mail de una misma conversación hasta que la persona la lea. Si después le vuelven a escribir y otra vez pasa el plazo sin leer, recibe uno nuevo.
- **RF-03:** Al publicarse una solicitud con rubro, los profesionales aprobados que tienen ese rubro reciben un mail con el título, la zona y un enlace. Los de otros rubros no reciben nada.
- **RF-04:** El cliente recibe un mail cuando un profesional le manda un presupuesto.
- **RF-05:** El profesional recibe un mail cuando el cliente acepta o rechaza su presupuesto.
- **RF-06:** Cada mail tiene un enlace para dejar de recibir **ese tipo** de aviso. Desde su perfil, la persona puede activar y desactivar cada tipo.
- **RF-07:** No se mandan avisos a cuentas suspendidas ni a correos sin verificar.
- **RF-08:** Los avisos por tiempo (RF-01) salen aunque nadie esté navegando el sitio.

## Fuera de alcance

<!-- Exclusiones acordadas, no deducidas por el agente. Si no hay exclusiones
adicionales, indícalo tras revisarlo con la persona. -->

- Avisos por WhatsApp: se dejan afuera por ahora.
- Notificaciones push del navegador.
- Mails por los demás avisos de la campanita (solicitud por vencer, identidad, denuncias, pagos).
- Resúmenes diarios o semanales.

## Flujo de usuario

<!-- Cómo se inicia, qué hace el usuario y qué resultado obtiene.
Incluye pantallas afectadas, navegación y alternativas relevantes. -->

1. Un cliente le escribe a un profesional. Pasan X horas y el profesional no abrió la conversación: le llega un mail con el nombre del cliente y el botón "Ver mensaje". Lo toca, entra (si hace falta inicia sesión) y cae en la conversación.
2. Un cliente publica una solicitud de Plomería. A los plomeros aprobados les llega un mail "Nueva solicitud de Plomería en {zona}" con enlace a la solicitud.
3. Un profesional manda un presupuesto: al cliente le llega un mail con el monto y el enlace. Cuando el cliente lo acepta o rechaza, al profesional le llega el mail correspondiente.
4. Al pie de cada mail, "No quiero recibir más estos avisos" lleva a una página que confirma la baja de ese tipo con un botón. En "Mi perfil" están los interruptores de los tres tipos.

## Datos y reglas de negocio

<!-- Información que necesita el usuario, campos obligatorios, validaciones,
límites y reglas como duplicados u orden de presentación. Describe significado
y comportamiento, sin diseñar tablas, DTO, DAO ni almacenamiento. -->

- Tipos de aviso por correo, cada uno activable por separado y activos por
  defecto: **mensajes sin contestar**, **solicitudes de mi rubro**, **presupuestos**.
- Plazo X para mensajes sin contestar: **12 horas**.
- La revisión de mensajes sin contestar corre cada 15 minutos.
  El mail puede llegar hasta ese intervalo después de cumplirse el plazo.
- Solicitudes: el aviso se manda una sola vez por solicitud y solo para
  solicitudes publicadas después de activar la función (para no mandar en masa
  las viejas el día del lanzamiento).
- El "rubro" es exacto: la categoría de la solicitud tiene que estar entre los
  rubros del profesional.
- La baja se confirma con un botón, no solo por abrir el enlace (los filtros de
  spam abren los enlaces solos).
- Los mails no incluyen el contenido completo de los mensajes, solo quién
  escribió y el enlace (privacidad).
- Remitente y dominio: **PENDIENTE** (proveedor de correo de producción).

## Comportamiento mobile y casos alternativos

<!-- Adapta la tabla usando MOBILE_GUIDELINES.md. Añade escenarios relevantes.
Marca No aplica con su motivo cuando corresponda. No presupongas soporte offline
ni conservación de todo el estado. Expresa resultados, no mecanismos técnicos. -->

| Situación | Comportamiento esperado |
| --- | --- |
| Carga o acción en curso | Al cambiar un interruptor en el perfil o confirmar la baja, se ve "Guardando…" y después el estado nuevo. |
| Sin datos | Si no hay nada pendiente, no sale ningún mail. |
| Entrada inválida | Un enlace de baja alterado o vencido muestra "El enlace no es válido" y ofrece ir al perfil. |
| Error o espera excesiva | Si el envío de un mail falla, la acción de la persona (mandar presupuesto, aceptar) igual se completa; el error queda registrado. |
| Sin conexión o conexión interrumpida | No aplica a los envíos (salen del servidor). En el perfil, un cambio que no llega se informa y se puede reintentar. |
| Cancelar o volver atrás | En la página de baja, volver atrás no da de baja nada. |
| Pasar a segundo plano y regresar | No aplica. |
| Recrear la pantalla | No aplica. |
| Reabrir después de terminarse el proceso | No aplica. |
| Otros puntos aplicables de la guía | **Trabajo en segundo plano:** si una revisión periódica se interrumpe o se corre dos veces, no se duplican mails. **Navegación desde notificaciones:** el enlace del mail lleva a la pantalla exacta, pasando por entrar si no hay sesión. Los mails se leen bien en el celular. |

**Puntos de la guía no aplicables y motivo:** permisos del dispositivo y
persistencia local no aplican: todo ocurre en el servidor y en el correo.

## Restricciones del pedido

<!-- Condiciones ya impuestas: compatibilidad, límites de alcance, requisitos
de accesibilidad o rendimiento medibles, o una tecnología expresamente exigida.
Ejemplo: Usar Room puede ser una restricción; el diseño de entidades va en PLAN.md.
No conviertas una preferencia del agente en una restricción. -->

- Solo correo electrónico; WhatsApp queda afuera.
- Requiere un proveedor de correo de producción configurado.

## Criterios de aceptación

<!-- Resultados observables que permitan decidir si se cumple cada requisito.
Incluye los casos alternativos acordados. No uses Funciona correctamente.
Repite el formato según sea necesario. -->

- **CA-01 · RF-01, RF-08:** Dado un profesional con un mensaje sin leer desde hace más de X horas y nadie navegando el sitio, cuando corre la revisión periódica, entonces recibe un mail con enlace a esa conversación.
- **CA-02 · RF-02:** Dado que ya recibió ese mail y no leyó, cuando corren dos revisiones más, entonces no recibe otro. Cuando lee, le vuelven a escribir y pasa el plazo, entonces recibe uno nuevo.
- **CA-03 · RF-01:** Dado un mensaje sin leer desde hace menos de X horas, cuando corre la revisión, entonces no sale mail.
- **CA-04 · RF-03:** Dada una solicitud nueva de Plomería, cuando se publica, entonces reciben mail los plomeros aprobados y no un electricista ni un plomero pendiente de aprobación.
- **CA-05 · RF-04:** Dado un cliente, cuando un profesional le manda un presupuesto, entonces recibe un mail con el monto y el enlace.
- **CA-06 · RF-05:** Dado un profesional con un presupuesto enviado, cuando el cliente lo acepta o lo rechaza, entonces recibe el mail correspondiente.
- **CA-07 · RF-06:** Dado un mail de solicitudes, cuando la persona toca "No quiero recibir más" y confirma, entonces deja de recibir mails de solicitudes pero sigue recibiendo los de mensajes. El interruptor de su perfil aparece apagado.
- **CA-08 · RF-07:** Dada una cuenta suspendida o sin correo verificado, cuando se cumple cualquier condición de aviso, entonces no se le manda mail.
- **CA-09 · RF-04, RF-05:** Dado un fallo del proveedor de correo, cuando el profesional manda un presupuesto, entonces el presupuesto se guarda igual.

## Cómo se comprueba el comportamiento

<!-- Una fila por criterio: escenario y resultado que debemos comprobar.
La selección de tests, herramientas, comandos y evidencias se desarrolla en PLAN.md.
No marques los criterios como superados durante la especificación. -->

| Criterio | Condiciones y pasos | Resultado esperado |
| --- | --- | --- |
| CA-01 | Mensaje sin leer con antigüedad mayor a X; disparar la revisión. | Sale un mail al destinatario correcto. |
| CA-02 | Repetir la revisión; después leer, recibir otro mensaje y esperar el plazo. | Un solo mail por ciclo de "sin leer". |
| CA-03 | Mensaje reciente; disparar la revisión. | Ningún mail. |
| CA-04 | Publicar una solicitud con rubro y mirar los destinatarios. | Solo los profesionales aprobados del rubro. |
| CA-05 | Mandar un presupuesto. | Mail al cliente. |
| CA-06 | Aceptar un presupuesto y rechazar otro. | Mail al profesional en cada caso. |
| CA-07 | Darse de baja desde un mail y revisar el perfil y los envíos siguientes. | Solo ese tipo queda apagado. |
| CA-08 | Cuenta suspendida con mensaje sin leer; disparar la revisión. | Ningún mail. |
| CA-09 | Proveedor de correo caído; mandar un presupuesto. | Presupuesto guardado; error registrado. |

## Decisiones pendientes

<!-- Al resolverlas, actualiza las secciones afectadas. Escribe Ninguna cuando
no queden pendientes funcionales ni restricciones por decidir. -->

- Proveedor de correo de producción, dirección remitente y dominio (SPF/DKIM).

<!-- ANTES DE SOLICITAR APROBACIÓN
Comprueba que el alcance está acordado, los flujos son coherentes, los puntos
mobile relevantes están cubiertos y cada requisito tiene criterios comprobables.
Resuelve las dudas y los marcadores pendientes. Mantén el diseño técnico en PLAN.md.
-->
