# SPEC: Mensaje predeterminado de WhatsApp y botón "Necesito ayuda"

**Estado:** Aprobada <!-- Borrador | En revisión | Aprobada -->

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

Dos atajos para hablar por WhatsApp:

- **Cliente → profesional:** al tocar el WhatsApp de un profesional, el chat
  se abre con un saludo ya escrito que dice que lo encontró en ServiRed. Así el
  profesional sabe de dónde viene el contacto y el cliente no arranca de cero.
- **Cualquiera → ServiRed:** un botón flotante **"Necesito ayuda"**, visible
  en todo el sitio (invitados, clientes y profesionales), que abre un WhatsApp
  con el soporte de ServiRed. Lo atiende una persona.

## Situación actual

<!-- Comportamiento actual relevante, limitación que queremos resolver y
comportamientos existentes que deben conservarse. No describas la arquitectura. -->

- El perfil público de un profesional con teléfono cargado muestra un botón de
  WhatsApp que abre el chat **vacío**.
- No hay ninguna vía de soporte: ni página de ayuda, ni contacto, ni WhatsApp de ServiRed.
- Ya flotan en la esquina inferior derecha el asistente de IA (para todos) y el
  acceso a mensajes (con sesión). En el celular también está la barra inferior
  de navegación y, en el perfil del profesional, la barra de "Contratar".
- Las placas de publicidad ya abren WhatsApp con un mensaje que configura
  administración. Se conservan tal cual.

## Dentro del alcance

<!-- Requisitos concretos, con identificadores estables para vincularlos a
criterios, decisiones del plan y tareas. -->

- **RF-01:** El botón de WhatsApp del perfil del profesional abre el chat con un mensaje precargado que incluye el nombre del profesional y dice que lo encontró en ServiRed. El usuario puede editarlo antes de enviarlo.
- **RF-02:** Un botón flotante "Necesito ayuda" aparece en todas las páginas del sitio para clientes, profesionales e invitados (incluidas las de entrar y crear cuenta).
- **RF-03:** El botón de ayuda abre WhatsApp con el número de soporte de ServiRed y un mensaje precargado.
- **RF-04:** Administración configura desde su panel el número de soporte, el mensaje precargado y si el botón se muestra o no.
- **RF-05:** El botón de ayuda no tapa ni lo tapan los otros flotantes, la barra inferior del celular ni la barra de "Contratar".

## Fuera de alcance

<!-- Exclusiones acordadas, no deducidas por el agente. Si no hay exclusiones
adicionales, indícalo tras revisarlo con la persona. -->

- Un chat de soporte propio, un formulario o preguntas frecuentes: se eligió WhatsApp.
- Cambios al asistente de IA.
- Mensaje precargado en "Pedir trabajo" y en "Responder solicitud": no se eligieron.

## Flujo de usuario

<!-- Cómo se inicia, qué hace el usuario y qué resultado obtiene.
Incluye pantallas afectadas, navegación y alternativas relevantes. -->

1. **Contactar a un profesional:** el cliente entra al perfil y toca WhatsApp. Se abre WhatsApp (app en el celular, web en la compu) con el chat del profesional y el saludo escrito. El cliente lo edita o lo envía.
2. **Pedir ayuda:** desde cualquier página, la persona toca "Necesito ayuda". Se abre WhatsApp con el soporte de ServiRed y el mensaje de ayuda escrito.
3. **Configurar:** administración entra a su panel, carga el número y el mensaje de soporte y lo activa. El botón aparece en todo el sitio.

## Datos y reglas de negocio

<!-- Información que necesita el usuario, campos obligatorios, validaciones,
límites y reglas como duplicados u orden de presentación. Describe significado
y comportamiento, sin diseñar tablas, DTO, DAO ni almacenamiento. -->

- Mensaje del perfil: "Hola {nombre}, te encontré en ServiRed y quería
  consultarte por un trabajo."
- Número de soporte: celular argentino de 10 dígitos (característica + número).
  El prefijo de país lo agrega el sistema, igual que en las placas de publicidad.
- Mensaje de ayuda: texto libre configurable. Por defecto: "Hola, necesito
  ayuda con ServiRed."
- Si no hay número de soporte cargado o el botón está desactivado, el botón no se muestra.
- El WhatsApp del perfil solo aparece si el profesional cargó su teléfono (como hoy).

## Comportamiento mobile y casos alternativos

<!-- Adapta la tabla usando MOBILE_GUIDELINES.md. Añade escenarios relevantes.
Marca No aplica con su motivo cuando corresponda. No presupongas soporte offline
ni conservación de todo el estado. Expresa resultados, no mecanismos técnicos. -->

| Situación | Comportamiento esperado |
| --- | --- |
| Carga o acción en curso | No aplica: son enlaces que abren WhatsApp al instante. |
| Sin datos | Sin número de soporte, el botón de ayuda no aparece. Sin teléfono del profesional, no aparece su WhatsApp. |
| Entrada inválida | Administración no puede guardar un número que no tenga 10 dígitos y ve el motivo. |
| Error o espera excesiva | Si WhatsApp no está instalado, se abre WhatsApp Web (comportamiento propio de WhatsApp). |
| Sin conexión o conexión interrumpida | El enlace se abre igual; el envío depende de WhatsApp. |
| Cancelar o volver atrás | Al volver de WhatsApp, la persona sigue en la misma página de ServiRed. |
| Pasar a segundo plano y regresar | Igual que volver atrás. |
| Recrear la pantalla | No aplica. |
| Reabrir después de terminarse el proceso | No aplica. |
| Otros puntos aplicables de la guía | En pantallas de 360 px, el botón no tapa contenido ni otros botones y tiene un área táctil cómoda. Tiene una etiqueta legible por lectores de pantalla ("Necesito ayuda por WhatsApp"). |

**Puntos de la guía no aplicables y motivo:** persistencia, trabajo en segundo
plano y permisos no aplican: son enlaces salientes.

## Restricciones del pedido

<!-- Condiciones ya impuestas: compatibilidad, límites de alcance, requisitos
de accesibilidad o rendimiento medibles, o una tecnología expresamente exigida.
Ejemplo: Usar Room puede ser una restricción; el diseño de entidades va en PLAN.md.
No conviertas una preferencia del agente en una restricción. -->

- El soporte es por WhatsApp y lo atiende una persona.
- El botón está en todo el sitio, no solo en la portada.

## Criterios de aceptación

<!-- Resultados observables que permitan decidir si se cumple cada requisito.
Incluye los casos alternativos acordados. No uses Funciona correctamente.
Repite el formato según sea necesario. -->

- **CA-01 · RF-01:** Dado el perfil de un profesional con teléfono, cuando se toca WhatsApp, entonces se abre el chat con ese número y el saludo con su nombre ya escrito.
- **CA-02 · RF-02:** Dado un invitado, un cliente y un profesional, cuando recorren la portada, un perfil, sus mensajes, el panel del profesional y la pantalla de entrar, entonces ven el botón "Necesito ayuda" en todas.
- **CA-03 · RF-03:** Dado un número de soporte cargado, cuando se toca "Necesito ayuda", entonces se abre WhatsApp con ese número y el mensaje de ayuda.
- **CA-04 · RF-04:** Dado el panel de administración, cuando se cambia el número o el mensaje de soporte y se guarda, entonces el botón usa los datos nuevos. Cuando se desactiva, el botón desaparece.
- **CA-05 · RF-04:** Dado un número con menos de 10 dígitos, cuando administración intenta guardarlo, entonces no se guarda y ve el motivo.
- **CA-06 · RF-05:** Dado un celular de 360 px, cuando se mira la portada con sesión y el perfil de un profesional, entonces el botón de ayuda no se superpone con el asistente, mensajes, la barra inferior ni la barra de "Contratar".

## Cómo se comprueba el comportamiento

<!-- Una fila por criterio: escenario y resultado que debemos comprobar.
La selección de tests, herramientas, comandos y evidencias se desarrolla en PLAN.md.
No marques los criterios como superados durante la especificación. -->

| Criterio | Condiciones y pasos | Resultado esperado |
| --- | --- | --- |
| CA-01 | Abrir el perfil de un profesional con teléfono y revisar el enlace de WhatsApp. | Número correcto y texto con su nombre. |
| CA-02 | Recorrer las páginas nombradas con las tres sesiones. | El botón está en todas. |
| CA-03 | Tocar "Necesito ayuda". | Número y mensaje de soporte correctos. |
| CA-04 | Cambiar datos y desactivar desde administración. | El botón refleja cada cambio. |
| CA-05 | Guardar un número de 8 dígitos. | Rechazado, con el motivo a la vista. |
| CA-06 | Vista de 360 px en portada y perfil. | Ninguna superposición. |

## Decisiones pendientes

<!-- Al resolverlas, actualiza las secciones afectadas. Escribe Ninguna cuando
no queden pendientes funcionales ni restricciones por decidir. -->

- Número de WhatsApp de soporte (lo da el cliente; se carga desde administración y no bloquea la implementación).

<!-- ANTES DE SOLICITAR APROBACIÓN
Comprueba que el alcance está acordado, los flujos son coherentes, los puntos
mobile relevantes están cubiertos y cada requisito tiene criterios comprobables.
Resuelve las dudas y los marcadores pendientes. Mantén el diseño técnico en PLAN.md.
-->
