# SPEC: Términos y condiciones y localidad al crear la cuenta

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

Antes de salir al mercado, ServiRed necesita que **toda persona que use la
plataforma haya aceptado los términos y condiciones**, tanto quien busca como
quien ofrece, y poder demostrar qué versión aceptó y cuándo. También necesita
saber **en qué localidad está cada usuario**, porque esa es la ubicación de
respaldo para el mapa y la búsqueda a 20 km (ver [Mapa y ubicación](../mapa-ubicacion/SPEC.md)).

La minuta también pedía **entrar con Facebook y Google**. Eso **ya existe**:
esta spec solo asegura que esas altas también acepten los términos y dejen
elegida la localidad, y deja anotada la configuración de producción.

## Situación actual

<!-- Comportamiento actual relevante, limitación que queremos resolver y
comportamientos existentes que deben conservarse. No describas la arquitectura. -->

- Hay una sola cuenta por persona: con la misma cuenta se busca y se ofrece.
  Quien quiere ofrecer completa después el alta de oferente (identidad y rubros).
- El alta por email pide nombre, email y contraseña. **No pide aceptar términos
  ni localidad.** Después hay que confirmar un código de 6 dígitos que llega por
  mail. Recién ahí se inicia la sesión.
- Los botones "Continuar con Google" y "Continuar con Facebook" ya están en las
  pantallas de entrar y crear cuenta. La primera vez crean la cuenta sin pedir
  nada más.
- Existe la página pública de términos y condiciones, editable desde
  administración y enlazada en el pie de página. **Nadie la acepta** y el texto
  no tiene número de versión.
- En el entorno local no hay claves de Google ni Facebook configuradas.

## Dentro del alcance

<!-- Requisitos concretos, con identificadores estables para vincularlos a
criterios, decisiones del plan y tareas. -->

- **RF-01:** El alta con email tiene una casilla obligatoria "Leí y acepto los términos y condiciones", con un enlace que abre el texto sin perder lo cargado. Sin tildarla no se puede crear la cuenta.
- **RF-02:** El alta con email pide elegir la localidad de una lista.
- **RF-03:** Quien entra por primera vez con Google o Facebook tiene que aceptar los términos y elegir su localidad antes de poder usar la plataforma.
- **RF-04:** Se registra, por cada usuario, la versión de los términos que aceptó y la fecha.
- **RF-05:** Administración puede publicar una **versión nueva** de los términos. Corregir un error de tipeo no obliga a nadie a re-aceptar.
- **RF-06:** Cuando hay una versión nueva, un usuario con sesión tiene que aceptarla en su próxima visita antes de seguir usando la plataforma. Tampoco puede publicar, contratar ni mandar mensajes hasta aceptarla.
- **RF-07:** Las cuentas que ya existen aceptan los términos (y eligen localidad si no tienen) en su próxima visita, con el mismo mecanismo que RF-06.
- **RF-08:** El login con Google y Facebook funciona en producción (configuración documentada en la checklist de [LANZAMIENTO](../LANZAMIENTO.md)).

## Fuera de alcance

<!-- Exclusiones acordadas, no deducidas por el agente. Si no hay exclusiones
adicionales, indícalo tras revisarlo con la persona. -->

- Términos aparte para quien ofrece servicios: se acepta un solo texto.
- Cambios al flujo del código de 6 dígitos o al alta de oferente (salvo la localidad, que está en [Mapa y ubicación](../mapa-ubicacion/SPEC.md)).
- Otros proveedores de login (Apple, etc.).

## Flujo de usuario

<!-- Cómo se inicia, qué hace el usuario y qué resultado obtiene.
Incluye pantallas afectadas, navegación y alternativas relevantes. -->

1. **Alta con email:** carga nombre, email, contraseña y localidad, y tilda los términos. Crea la cuenta y sigue con el código de 6 dígitos, como hoy.
2. **Alta con Google o Facebook:** vuelve del proveedor y, antes de ver el sitio, aparece la pantalla "Completá tu alta" con el texto de los términos, la casilla y la localidad. Al confirmar sigue a donde iba.
3. **Versión nueva o cuenta existente:** al entrar al sitio aparece "Actualizamos los términos" con el texto, la casilla (y la localidad si falta). Al aceptar sigue navegando. Puede cerrar sesión desde ahí.
4. **Administración:** edita el texto de los términos. Si marca "Publicar como versión nueva", al guardar todos tienen que volver a aceptar. Si no la marca, solo se corrige el texto.

## Datos y reglas de negocio

<!-- Información que necesita el usuario, campos obligatorios, validaciones,
límites y reglas como duplicados u orden de presentación. Describe significado
y comportamiento, sin diseñar tablas, DTO, DAO ni almacenamiento. -->

- Versión de términos: un número que empieza en 1 y sube cada vez que
  administración publica una versión nueva.
- Por usuario se guarda la versión aceptada y la fecha y hora de aceptación.
- La localidad sale de la lista de localidades activas (ver [Mapa y ubicación](../mapa-ubicacion/SPEC.md)). Es obligatoria.
- Un usuario "al día" es el que aceptó la versión vigente y tiene localidad.
  Uno que no está al día solo puede ver la pantalla de aceptación, leer los
  términos y cerrar sesión.
- Las páginas públicas (portada, perfiles, términos) se siguen viendo sin sesión, igual que hoy.
- La casilla nunca viene tildada de antemano.

## Comportamiento mobile y casos alternativos

<!-- Adapta la tabla usando MOBILE_GUIDELINES.md. Añade escenarios relevantes.
Marca No aplica con su motivo cuando corresponda. No presupongas soporte offline
ni conservación de todo el estado. Expresa resultados, no mecanismos técnicos. -->

| Situación | Comportamiento esperado |
| --- | --- |
| Carga o acción en curso | El botón de crear cuenta o aceptar queda deshabilitado con "Guardando…"; dos toques no crean dos cuentas ni dos aceptaciones. |
| Sin datos | Si no hay localidades activas, se muestra un error claro y no se puede completar el alta (no debería pasar: hay lista base). |
| Entrada inválida | Sin casilla tildada o sin localidad: mensaje junto al campo y no se envía. Se conserva lo ya cargado. |
| Error o espera excesiva | Mensaje de error y se puede reintentar sin volver a cargar todo. |
| Sin conexión o conexión interrumpida | El envío falla con mensaje de error; el formulario conserva lo cargado. |
| Cancelar o volver atrás | Desde la pantalla de aceptación solo se puede aceptar o cerrar sesión; volver atrás la vuelve a mostrar. |
| Pasar a segundo plano y regresar | Al volver sigue la misma pantalla con lo cargado. |
| Recrear la pantalla | Recargar la página vuelve a mostrar la aceptación si todavía no aceptó. |
| Reabrir después de terminarse el proceso | Al reabrir el sitio con sesión, si no aceptó, vuelve a ver la aceptación. |
| Otros puntos aplicables de la guía | El texto de los términos se puede leer entero con scroll en 360 px y los botones quedan visibles. La casilla tiene etiqueta accesible y área táctil cómoda. |

**Puntos de la guía no aplicables y motivo:** permisos, trabajo en segundo
plano e idiomas no aplican.

## Restricciones del pedido

<!-- Condiciones ya impuestas: compatibilidad, límites de alcance, requisitos
de accesibilidad o rendimiento medibles, o una tecnología expresamente exigida.
Ejemplo: Usar Room puede ser una restricción; el diseño de entidades va en PLAN.md.
No conviertas una preferencia del agente en una restricción. -->

- Se usa el login con Google y Facebook que ya existe; no se reemplaza.
- Las cuentas existentes no se borran ni se bloquean: solo se les pide aceptar.

## Criterios de aceptación

<!-- Resultados observables que permitan decidir si se cumple cada requisito.
Incluye los casos alternativos acordados. No uses Funciona correctamente.
Repite el formato según sea necesario. -->

- **CA-01 · RF-01:** Dado el formulario de alta, cuando se envía sin tildar los términos, entonces no se crea la cuenta y se muestra el motivo.
- **CA-02 · RF-01, RF-02, RF-04:** Dado el formulario completo con términos tildados y localidad, cuando se crea la cuenta, entonces queda registrada la versión vigente, la fecha y la localidad.
- **CA-03 · RF-03:** Dada una persona que entra por primera vez con Google, cuando vuelve al sitio, entonces ve "Completá tu alta" y no puede usar otras páginas con sesión hasta aceptar y elegir localidad.
- **CA-04 · RF-05:** Dado administración editando los términos sin marcar "versión nueva", cuando guarda, entonces el texto cambia y ningún usuario tiene que re-aceptar.
- **CA-05 · RF-05, RF-06:** Dado un usuario al día, cuando administración publica una versión nueva y el usuario entra, entonces ve "Actualizamos los términos" y, al aceptar, queda registrada la versión nueva.
- **CA-06 · RF-06:** Dado un usuario que no aceptó la versión vigente, cuando intenta publicar una solicitud, mandar un mensaje o contratar (aun sin pasar por la pantalla), entonces la acción se rechaza con "Aceptá los términos actualizados".
- **CA-07 · RF-07:** Dada una cuenta creada antes de este cambio, cuando inicia sesión, entonces se le pide aceptar los términos y elegir la localidad.
- **CA-08 · RF-08:** Dado el sitio de producción con las claves cargadas, cuando alguien entra con Google y con Facebook, entonces vuelve con sesión iniciada (después de completar el alta si es nuevo).

## Cómo se comprueba el comportamiento

<!-- Una fila por criterio: escenario y resultado que debemos comprobar.
La selección de tests, herramientas, comandos y evidencias se desarrolla en PLAN.md.
No marques los criterios como superados durante la especificación. -->

| Criterio | Condiciones y pasos | Resultado esperado |
| --- | --- | --- |
| CA-01 | Alta sin tildar. | Rechazada con mensaje; no existe la cuenta. |
| CA-02 | Alta completa; revisar la cuenta creada. | Versión, fecha y localidad guardadas. |
| CA-03 | Alta nueva con Google (entorno con claves). | Aparece "Completá tu alta" y bloquea el resto. |
| CA-04 | Editar términos sin "versión nueva"; entrar con un usuario al día. | No se pide re-aceptar. |
| CA-05 | Publicar versión nueva; entrar con un usuario al día. | Se pide aceptar; queda la versión nueva. |
| CA-06 | Usuario desactualizado envía directamente una solicitud. | Rechazada con el mensaje. |
| CA-07 | Entrar con una cuenta demo existente. | Se pide términos y localidad. |
| CA-08 | Entrar con Google y Facebook en producción. | Sesión iniciada. |

## Decisiones pendientes

<!-- Al resolverlas, actualiza las secciones afectadas. Escribe Ninguna cuando
no queden pendientes funcionales ni restricciones por decidir. -->

- Claves de Google y Facebook de producción, y la app de Facebook en modo Live (las gestiona el cliente o el equipo).
- Texto final de los términos para el lanzamiento (lo revisa el cliente; se edita desde administración y no bloquea la implementación).

<!-- ANTES DE SOLICITAR APROBACIÓN
Comprueba que el alcance está acordado, los flujos son coherentes, los puntos
mobile relevantes están cubiertos y cada requisito tiene criterios comprobables.
Resuelve las dudas y los marcadores pendientes. Mantén el diseño técnico en PLAN.md.
-->
