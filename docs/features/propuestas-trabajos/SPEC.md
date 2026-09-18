# SPEC: Propuestas a 5 días y sin tope de trabajos en curso

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

El cliente del negocio pidió que el cliente que busca tenga más tiempo para
decidir: el presupuesto que manda un profesional va a seguir vigente **5 días**.
También pidió que un profesional pueda aceptar **todos los trabajos que quiera**
a la vez: se quita el tope de trabajos en curso.

## Situación actual

<!-- Comportamiento actual relevante, limitación que queremos resolver y
comportamientos existentes que deben conservarse. No describas la arquitectura. -->

- El presupuesto del profesional vence a las **72 horas**. El mensaje que queda
  en el chat y la ayuda del panel de la propuesta dicen "Vence en 3 días".
- Un presupuesto vencido deja de poder aceptarse y el profesional puede mandar otro.
- Existe un tope de **3** trabajos en curso por profesional (en la reunión se
  habló de 5, pero el sistema tiene 3). Recién salta cuando el **cliente** acepta
  el presupuesto: le aparece "El profesional ya tiene tres trabajos en curso" y
  no puede contratarlo. El profesional nunca se entera.
- Se conserva todo lo demás: una sola propuesta vigente por pedido, el cliente
  acepta o rechaza, el plazo del trabajo arranca al aceptar y la solicitud que
  publica el cliente sigue durando 7 días.

## Dentro del alcance

<!-- Requisitos concretos, con identificadores estables para vincularlos a
criterios, decisiones del plan y tareas. -->

- **RF-01:** Todo presupuesto que envía un profesional, desde el pedido de trabajo o desde el chat, vence a los 5 días de enviado.
- **RF-02:** Todos los textos que informan el vencimiento (mensaje del chat y ayudas de pantalla) dicen "5 días", y hay una sola regla que define el plazo.
- **RF-03:** Un cliente puede aceptar un presupuesto sin importar cuántos trabajos en curso tenga el profesional.
- **RF-04:** Desaparece el mensaje "El profesional ya tiene tres trabajos en curso".

## Fuera de alcance

<!-- Exclusiones acordadas, no deducidas por el agente. Si no hay exclusiones
adicionales, indícalo tras revisarlo con la persona. -->

- La duración de la solicitud que publica el cliente (sigue en 7 días).
- Un tope configurable desde administración: se eligió sacarlo del todo.

## Flujo de usuario

<!-- Cómo se inicia, qué hace el usuario y qué resultado obtiene.
Incluye pantallas afectadas, navegación y alternativas relevantes. -->

1. El profesional arma un presupuesto (monto, días de trabajo y detalle) y lo envía.
2. En el chat queda el mensaje de la propuesta con "Vence en 5 días".
3. Dentro de esos 5 días el cliente la acepta o la rechaza. Si acepta, el trabajo pasa a "en curso" aunque el profesional ya tenga otros en curso.
4. Si pasan 5 días sin respuesta, la propuesta figura como vencida y el profesional puede mandar otra.

## Datos y reglas de negocio

<!-- Información que necesita el usuario, campos obligatorios, validaciones,
límites y reglas como duplicados u orden de presentación. Describe significado
y comportamiento, sin diseñar tablas, DTO, DAO ni almacenamiento. -->

- Vigencia del presupuesto: 5 días corridos (120 h) desde que se envía.
- Sigue habiendo una sola propuesta vigente por pedido.
- No hay límite de trabajos en curso por profesional.
- Propuestas pendientes enviadas antes del cambio: se extienden a 5 días desde
  su envío, para no mezclar dos reglas (decisión confirmada).

## Comportamiento mobile y casos alternativos

<!-- Adapta la tabla usando MOBILE_GUIDELINES.md. Añade escenarios relevantes.
Marca No aplica con su motivo cuando corresponda. No presupongas soporte offline
ni conservación de todo el estado. Expresa resultados, no mecanismos técnicos. -->

| Situación | Comportamiento esperado |
| --- | --- |
| Carga o acción en curso | Sin cambios: el botón de aceptar o enviar queda deshabilitado mientras se procesa. |
| Sin datos | No aplica: no cambia ningún listado. |
| Entrada inválida | Sin cambios en las validaciones del presupuesto. |
| Error o espera excesiva | Si falla la aceptación, se muestra el error y se puede reintentar. Ya no existe el error por tope de trabajos. |
| Sin conexión o conexión interrumpida | Sin cambios respecto de hoy. |
| Cancelar o volver atrás | Sin cambios. |
| Pasar a segundo plano y regresar | Al volver, una propuesta que venció mientras tanto figura como vencida. |
| Recrear la pantalla | No aplica: web sin estado local para este flujo. |
| Reabrir después de terminarse el proceso | No aplica: el estado vive en el servidor. |
| Otros puntos aplicables de la guía | Doble toque en "Aceptar": no crea dos trabajos (se conserva el comportamiento actual). |

**Puntos de la guía no aplicables y motivo:** permisos, trabajo en segundo
plano e idiomas no aplican: el cambio es una regla de negocio y un texto.

## Restricciones del pedido

<!-- Condiciones ya impuestas: compatibilidad, límites de alcance, requisitos
de accesibilidad o rendimiento medibles, o una tecnología expresamente exigida.
Ejemplo: Usar Room puede ser una restricción; el diseño de entidades va en PLAN.md.
No conviertas una preferencia del agente en una restricción. -->

- Los trabajos y propuestas existentes no se pierden ni cambian de estado por el despliegue (las propuestas pendientes solo ganan plazo).

## Criterios de aceptación

<!-- Resultados observables que permitan decidir si se cumple cada requisito.
Incluye los casos alternativos acordados. No uses Funciona correctamente.
Repite el formato según sea necesario. -->

- **CA-01 · RF-01:** Dado un profesional con un pedido de trabajo, cuando envía un presupuesto, entonces su vencimiento queda 5 días después del envío.
- **CA-02 · RF-01:** Dada una propuesta enviada hace más de 5 días sin respuesta, cuando el cliente abre sus contrataciones, entonces figura vencida y no se puede aceptar.
- **CA-03 · RF-01:** Dada una propuesta enviada hace 4 días, cuando el cliente la acepta, entonces el trabajo pasa a en curso.
- **CA-04 · RF-02:** Dado un presupuesto recién enviado desde el pedido o desde el chat, cuando se mira el chat y el panel de la propuesta, entonces los textos dicen "5 días" y ninguno dice "3 días".
- **CA-05 · RF-03, RF-04:** Dado un profesional con 3 o más trabajos en curso, cuando un cliente acepta un presupuesto suyo, entonces el trabajo pasa a en curso y no aparece ningún mensaje de tope.

## Cómo se comprueba el comportamiento

<!-- Una fila por criterio: escenario y resultado que debemos comprobar.
La selección de tests, herramientas, comandos y evidencias se desarrolla en PLAN.md.
No marques los criterios como superados durante la especificación. -->

| Criterio | Condiciones y pasos | Resultado esperado |
| --- | --- | --- |
| CA-01 | Enviar un presupuesto como profesional y mirar su vencimiento. | Vence a los 5 días del envío. |
| CA-02 | Propuesta con envío de hace 6 días; abrir contrataciones como cliente. | Figura vencida y no tiene botón de aceptar. |
| CA-03 | Propuesta con envío de hace 4 días; aceptarla. | El trabajo queda en curso. |
| CA-04 | Enviar un presupuesto por cada vía y leer el chat y el panel. | Solo aparece "5 días". |
| CA-05 | Profesional con 3 trabajos en curso; el cliente acepta un cuarto. | Se acepta sin error. |

## Decisiones pendientes

<!-- Al resolverlas, actualiza las secciones afectadas. Escribe Ninguna cuando
no queden pendientes funcionales ni restricciones por decidir. -->

Ninguna.

<!-- ANTES DE SOLICITAR APROBACIÓN
Comprueba que el alcance está acordado, los flujos son coherentes, los puntos
mobile relevantes están cubiertos y cada requisito tiene criterios comprobables.
Resuelve las dudas y los marcadores pendientes. Mantén el diseño técnico en PLAN.md.
-->
