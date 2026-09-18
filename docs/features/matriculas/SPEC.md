# SPEC: Matrícula o certificado con aprobación de administración

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

Un profesional matriculado (gasista, electricista, abogado, contador…) o con un
certificado de curso quiere que se note. Podrá **subir su matrícula o
certificado**. Queda **pendiente de aprobación** hasta que administración lo
revise, y al aprobarse su perfil muestra la insignia **"Matriculado"**. Así el
cliente elige con más confianza. Es **opcional**: sin matrícula se sigue
trabajando igual.

## Situación actual

<!-- Comportamiento actual relevante, limitación que queremos resolver y
comportamientos existentes que deben conservarse. No describas la arquitectura. -->

- Para ofrecer servicios, el profesional ya pasa por una verificación de
  identidad (DNI de frente y dorso y un video) que administración aprueba,
  pide cambios o rechaza. Al aprobarse, el perfil muestra "Verificado".
- **No hay forma de cargar una matrícula ni un certificado.** Los términos
  vigentes ya mencionan matrículas o habilitaciones como responsabilidad del profesional.
- Los documentos de identidad se guardan en privado y solo administración los ve.
- Se conserva la verificación de identidad tal como está: la matrícula es un agregado.

## Dentro del alcance

<!-- Requisitos concretos, con identificadores estables para vincularlos a
criterios, decisiones del plan y tareas. -->

- **RF-01:** Desde su perfil, un profesional puede subir uno o más documentos (matrícula o certificado) en imagen o PDF, indicando el tipo y, opcionalmente, el rubro, el número y quién lo emitió.
- **RF-02:** Cada documento subido queda "Pendiente de aprobación", y el profesional ve el estado de cada uno.
- **RF-03:** Administración tiene una sección de matrículas pendientes donde ve el documento y los datos, y lo aprueba o lo rechaza con un motivo.
- **RF-04:** Con al menos un documento aprobado, el profesional muestra la insignia "Matriculado" en su tarjeta del listado, en su perfil público (con el rubro, si se indicó) y en el mapa.
- **RF-05:** El profesional recibe un aviso en la campanita cuando su documento se aprueba o se rechaza (con el motivo).
- **RF-06:** El profesional puede borrar un documento pendiente o rechazado y subir otro. Uno aprobado solo lo puede quitar administración.
- **RF-07:** Los documentos son privados: solo los ven el profesional dueño y administración. El público solo ve la insignia.

## Fuera de alcance

<!-- Exclusiones acordadas, no deducidas por el agente. Si no hay exclusiones
adicionales, indícalo tras revisarlo con la persona. -->

- Matrícula obligatoria, sea en todos los rubros o en algunos.
- Validación automática contra registros oficiales de matrícula.
- Vencimiento o renovación de matrículas.

## Flujo de usuario

<!-- Cómo se inicia, qué hace el usuario y qué resultado obtiene.
Incluye pantallas afectadas, navegación y alternativas relevantes. -->

1. El profesional entra a "Mi perfil", sección "Matrícula y certificados", y toca "Agregar".
2. Elige el tipo (matrícula o certificado), opcionalmente el rubro, el número y el emisor, adjunta la foto o el PDF y envía.
3. Ve el documento como "Pendiente de aprobación".
4. Administración abre "Matrículas" en su panel, revisa el documento y aprueba, o rechaza escribiendo el motivo.
5. El profesional recibe el aviso. Si fue aprobado, su perfil pasa a mostrar "Matriculado". Si fue rechazado, ve el motivo y puede borrarlo y subir otro.

## Datos y reglas de negocio

<!-- Información que necesita el usuario, campos obligatorios, validaciones,
límites y reglas como duplicados u orden de presentación. Describe significado
y comportamiento, sin diseñar tablas, DTO, DAO ni almacenamiento. -->

- Tipo: matrícula o certificado (obligatorio).
- Archivo: JPG, PNG, WebP o PDF, de hasta 8 MB (obligatorio). Se rechazan los
  archivos que no son realmente de esos tipos aunque tengan esa extensión.
- Rubro (uno de los rubros del profesional), número y emisor: opcionales.
- El motivo de rechazo es obligatorio, con un mínimo de 5 caracteres (igual que en la verificación de identidad).
- La insignia depende de tener al menos un documento aprobado. Si se borra o
  rechaza el último aprobado, la insignia desaparece.
- Un documento aprobado no lo puede borrar el profesional: solo administración.
- Si la cuenta se da de baja, sus documentos se borran junto con los de identidad.

## Comportamiento mobile y casos alternativos

<!-- Adapta la tabla usando MOBILE_GUIDELINES.md. Añade escenarios relevantes.
Marca No aplica con su motivo cuando corresponda. No presupongas soporte offline
ni conservación de todo el estado. Expresa resultados, no mecanismos técnicos. -->

| Situación | Comportamiento esperado |
| --- | --- |
| Carga o acción en curso | Durante la subida se ve el progreso y el botón queda deshabilitado; dos toques no suben dos documentos. |
| Sin datos | Sin documentos: texto que explica para qué sirve la insignia y botón "Agregar". Administración sin pendientes: "No hay matrículas para revisar". |
| Entrada inválida | Archivo de otro tipo o de más de 8 MB, o falta el tipo: mensaje junto al campo y no se envía. |
| Error o espera excesiva | Si la subida falla, mensaje de error y se puede reintentar sin volver a elegir los datos. |
| Sin conexión o conexión interrumpida | La subida falla con mensaje de error; el formulario conserva los datos elegidos. |
| Cancelar o volver atrás | Cancelar antes de enviar no guarda nada. |
| Pasar a segundo plano y regresar | Si la subida se interrumpió, al volver se informa el error y se puede reintentar. |
| Recrear la pantalla | Al recargar, la lista muestra los documentos ya enviados con su estado. |
| Reabrir después de terminarse el proceso | Igual que recrear. |
| Otros puntos aplicables de la guía | **Permisos:** en el celular se puede elegir de la galería, de archivos o sacar una foto; si se niega la cámara, sigue disponible la galería. **Privacidad:** los documentos nunca quedan en una dirección pública. |

**Puntos de la guía no aplicables y motivo:** trabajo en segundo plano e
idiomas no aplican.

## Restricciones del pedido

<!-- Condiciones ya impuestas: compatibilidad, límites de alcance, requisitos
de accesibilidad o rendimiento medibles, o una tecnología expresamente exigida.
Ejemplo: Usar Room puede ser una restricción; el diseño de entidades va en PLAN.md.
No conviertas una preferencia del agente en una restricción. -->

- La matrícula es opcional y no bloquea ofrecer ningún rubro.
- Los documentos se guardan con la misma protección que los de identidad (privados).

## Criterios de aceptación

<!-- Resultados observables que permitan decidir si se cumple cada requisito.
Incluye los casos alternativos acordados. No uses Funciona correctamente.
Repite el formato según sea necesario. -->

- **CA-01 · RF-01, RF-02:** Dado un profesional, cuando sube un PDF de matrícula, entonces lo ve en su lista como "Pendiente de aprobación".
- **CA-02 · RF-01:** Dado un archivo que no es imagen ni PDF, aunque tenga extensión .pdf, cuando se intenta subir, entonces se rechaza con el motivo.
- **CA-03 · RF-03:** Dado un documento pendiente, cuando administración abre Matrículas, entonces ve el archivo y los datos, y puede aprobar o rechazar con motivo.
- **CA-04 · RF-04, RF-05:** Dado un documento aprobado, cuando cualquiera mira la tarjeta y el perfil del profesional, entonces ve "Matriculado", y el profesional tiene el aviso en su campanita.
- **CA-05 · RF-05, RF-06:** Dado un documento rechazado, cuando el profesional abre su perfil, entonces ve el motivo, puede borrarlo y subir otro.
- **CA-06 · RF-07:** Dado otro usuario (o un invitado), cuando intenta abrir la dirección de un documento, entonces no puede verlo.
- **CA-07 · RF-04:** Dado un profesional sin documentos aprobados, cuando se mira su perfil, entonces no aparece la insignia y puede recibir trabajos igual.

## Cómo se comprueba el comportamiento

<!-- Una fila por criterio: escenario y resultado que debemos comprobar.
La selección de tests, herramientas, comandos y evidencias se desarrolla en PLAN.md.
No marques los criterios como superados durante la especificación. -->

| Criterio | Condiciones y pasos | Resultado esperado |
| --- | --- | --- |
| CA-01 | Subir un PDF desde Mi perfil. | Aparece como pendiente. |
| CA-02 | Subir un archivo cualquiera renombrado a .pdf. | Rechazado con motivo. |
| CA-03 | Revisar desde administración. | Se ve el documento; aprobar y rechazar funcionan. |
| CA-04 | Aprobar y mirar la tarjeta, el perfil y la campanita. | Insignia visible y aviso recibido. |
| CA-05 | Rechazar; como profesional, borrar y resubir. | Motivo visible; resubida pendiente. |
| CA-06 | Abrir el documento con otra sesión y sin sesión. | Acceso denegado. |
| CA-07 | Perfil sin documentos aprobados. | Sin insignia; puede recibir pedidos. |

## Decisiones pendientes

<!-- Al resolverlas, actualiza las secciones afectadas. Escribe Ninguna cuando
no queden pendientes funcionales ni restricciones por decidir. -->

Ninguna.

<!-- ANTES DE SOLICITAR APROBACIÓN
Comprueba que el alcance está acordado, los flujos son coherentes, los puntos
mobile relevantes están cubiertos y cada requisito tiene criterios comprobables.
Resuelve las dudas y los marcadores pendientes. Mantén el diseño técnico en PLAN.md.
-->
