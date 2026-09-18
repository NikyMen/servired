# SPEC: Mapa, ubicación en tiempo real y búsqueda a 20 km

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

El cliente quiere encontrar **profesionales cerca suyo**, como en
[elLaburante](https://ellaburante.com/mapa), la referencia que eligió el cliente:

- Una sección **Mapa** propia en la navegación: mapa a pantalla completa con un
  buscador arriba, pines agrupados y una hoja "Profesionales cerca tuyo" con
  foto, nombre, localidad y distancia, más el tilde de verificado.
- Su **ubicación en tiempo real**, con el puntito que se mueve en el mapa y un
  botón **"Ubicarme ahora"**.
- La búsqueda y el mapa del cliente muestran solo lo que está a **20 km a la
  redonda**.
- Las tarjetas del listado toman el estilo de elLaburante: foto, insignias
  (verificado, matriculado), rubro, localidad y distancia.
- El mapa es un **beneficio de tener cuenta**: el invitado ve un recuadro que
  lo invita a iniciar sesión.

Si la persona no da permiso de ubicación, se usa la **localidad que eligió al
crear la cuenta** (ver [Alta y términos](../alta-terminos/SPEC.md)). Por eso
esta spec también define la **lista de localidades** (parte A), que se
implementa antes que el resto.

## Situación actual

<!-- Comportamiento actual relevante, limitación que queremos resolver y
comportamientos existentes que deben conservarse. No describas la arquitectura. -->

- La portada tiene una sección "Mapa de oportunidades" con profesionales,
  solicitudes y fotos de trabajos. **La ve cualquiera, incluso sin sesión.**
- No hay una sección Mapa en la navegación, no se usa la ubicación del
  dispositivo y **no hay filtro por distancia**: la búsqueda ordena por texto,
  rubro y zona.
- Los profesionales pueden marcar su ubicación en el mapa desde su perfil (es
  opcional). Si no la marcan, hoy aparecen en posiciones aproximadas.
- El alta de oferente solo acepta "Corrientes Capital" como localidad.
- Los usuarios no tienen localidad guardada.
- Se conservan: la búsqueda por texto y rubros, el selector Profesionales/Oficios,
  los perfiles y las solicitudes.

## Dentro del alcance

<!-- Requisitos concretos, con identificadores estables para vincularlos a
criterios, decisiones del plan y tareas. -->

**Parte A: localidades**

- **RF-01:** Existe una lista de localidades, cada una con nombre, provincia y su punto en el mapa, que se usa en el alta del usuario y en el alta del oferente.
- **RF-02:** Administración puede agregar localidades (marcando su punto en un mapa), corregir su punto y activarlas o desactivarlas. Una localidad desactivada no aparece para elegir, pero los usuarios que ya la tienen la conservan.
- **RF-03:** El alta de oferente permite elegir cualquier localidad activa, no solo Corrientes Capital.

**Parte B: mapa y ubicación**

- **RF-04:** Hay una sección **Mapa** en la navegación del cliente, en la barra superior de la compu y en la barra inferior del celular.
- **RF-05:** La sección Mapa muestra el mapa a pantalla completa con: buscador arriba (por oficio o nombre), pines de profesionales agrupados cuando están juntos, el puntito de la ubicación del usuario y una hoja desplegable "Profesionales cerca tuyo" con foto, nombre, localidad, distancia y tilde de verificado o insignia de matriculado.
- **RF-06:** Tocar un pin o un profesional de la hoja muestra su resumen con acceso a su perfil.
- **RF-07:** Con permiso, la ubicación del usuario se toma **en tiempo real**: el puntito se mueve mientras la persona se desplaza, y la lista y la distancia se actualizan cuando se aleja lo suficiente.
- **RF-08:** El botón **"Ubicarme ahora"** vuelve a centrar el mapa en la posición actual. Si el permiso no se había pedido o fue negado, lo pide o explica cómo habilitarlo.
- **RF-09:** Sin permiso o sin GPS, el centro es la **localidad del usuario**, y se muestra un aviso discreto "Usando tu localidad: {nombre}".
- **RF-10:** Para un usuario con sesión, los resultados de la búsqueda de la portada y lo que muestra el mapa se limitan a **20 km** alrededor de su ubicación (en tiempo real o su localidad).
- **RF-11:** Un profesional que no marcó su ubicación exacta se ubica en el punto de su localidad para calcular la distancia y mostrarlo en el mapa.
- **RF-12:** Las tarjetas de profesionales del listado muestran foto, nombre, insignias, rubro y "{localidad} • {distancia}".
- **RF-13:** Un **invitado** no ve el mapa: en la portada ve un recuadro borroso con "Iniciá sesión para ver el mapa" y un botón para entrar. Si entra a la sección Mapa, se le pide iniciar sesión y después vuelve al mapa. Tampoco recibe las ubicaciones de profesionales ni de solicitudes.
- **RF-14:** Con sesión, la portada muestra un mapa compacto de los 20 km con "Ver mapa completo", que lleva a la sección Mapa.
- **RF-15:** Si no hay profesionales a 20 km para la búsqueda, se muestra "No encontramos profesionales a 20 km" con una sugerencia (cambiar la búsqueda o publicar una solicitud).

## Fuera de alcance

<!-- Exclusiones acordadas, no deducidas por el agente. Si no hay exclusiones
adicionales, indícalo tras revisarlo con la persona. -->

- Radio ajustable: es fijo en 20 km.
- Guardar la ubicación de cada inicio de sesión o un historial de ubicaciones.
- Ubicación en tiempo real de los **profesionales** (se muestran en su punto fijo o en su localidad).
- Filtro por distancia para las solicitudes que ve el profesional.
- Indicadores de "activo ahora" o niveles como los de elLaburante: no se pidieron.

## Flujo de usuario

<!-- Cómo se inicia, qué hace el usuario y qué resultado obtiene.
Incluye pantallas afectadas, navegación y alternativas relevantes. -->

1. **Cliente con sesión en la portada:** el navegador pide permiso de ubicación. Si acepta, el mapa compacto y el listado se centran en su posición y muestran solo lo que está a 20 km, con la distancia en cada tarjeta. Si no acepta, se usa su localidad y se ve el aviso.
2. **Sección Mapa:** toca "Mapa" en la navegación y ve el mapa a pantalla completa, su puntito y los pines. Sube la hoja "Profesionales cerca tuyo", toca uno y va a su perfil. Escribe "plomero" en el buscador y quedan solo los plomeros a 20 km.
3. **Moviéndose:** con la sección abierta, el puntito sigue su posición. Si se aleja más de un kilómetro, la lista se actualiza sola.
4. **"Ubicarme ahora":** después de mover el mapa a mano, lo toca y el mapa vuelve a su posición.
5. **Invitado:** en la portada ve el recuadro "Iniciá sesión para ver el mapa". Toca "Mapa" o el botón, inicia sesión y vuelve directo a la sección Mapa.
6. **Administración:** en "Localidades" agrega "Goya", marca el punto en el mapa y la activa. A partir de ahí aparece en las altas.

## Datos y reglas de negocio

<!-- Información que necesita el usuario, campos obligatorios, validaciones,
límites y reglas como duplicados u orden de presentación. Describe significado
y comportamiento, sin diseñar tablas, DTO, DAO ni almacenamiento. -->

- Radio: **20 km** en línea recta, fijo.
- Orden de prioridad de la ubicación del usuario: ubicación en tiempo real →
  localidad del usuario → Corrientes Capital (solo si no tiene localidad).
- Ubicación del profesional: el punto que marcó en su perfil → el de su localidad.
- Distancia mostrada: en km con un decimal por debajo de 10 km ("3,2 km") y
  sin decimales desde 10 km. Por debajo de 1 km: "a menos de 1 km".
- Orden del listado dentro del radio: se conserva el ranking actual por
  relevancia; la distancia desempata.
- Localidades: el nombre es único dentro de cada provincia y todas tienen punto
  en el mapa. Lista inicial: localidades de Corrientes más el Gran Resistencia
  (Resistencia y Barranqueras); el cliente puede sumar o desactivar desde administración.
- **Privacidad:** la ubicación exacta del usuario no se guarda en su cuenta ni
  se muestra a nadie. Se usa solo para calcular lo que ve, redondeada a unos 100 m.
- Invitados: la búsqueda de la portada sigue sin filtro de distancia, como hoy.

## Comportamiento mobile y casos alternativos

<!-- Adapta la tabla usando MOBILE_GUIDELINES.md. Añade escenarios relevantes.
Marca No aplica con su motivo cuando corresponda. No presupongas soporte offline
ni conservación de todo el estado. Expresa resultados, no mecanismos técnicos. -->

| Situación | Comportamiento esperado |
| --- | --- |
| Carga o acción en curso | Mientras se busca la ubicación: "Buscando tu ubicación…" sobre el mapa, que ya se ve centrado en la localidad. Los pines cargan sin bloquear el mapa. |
| Sin datos | Sin profesionales a 20 km: mensaje de RF-15 en el listado y en la hoja del mapa. |
| Entrada inválida | Una búsqueda sin coincidencias muestra "Sin resultados para '{texto}' a 20 km". |
| Error o espera excesiva | Si la ubicación no llega en unos segundos, se usa la localidad con el aviso. Si fallan los datos del mapa, mensaje con "Reintentar". |
| Sin conexión o conexión interrumpida | Mensaje "Sin conexión"; al volver la conexión, "Reintentar" recarga el mapa. No hay modo sin conexión. |
| Cancelar o volver atrás | Volver desde un perfil abierto desde el mapa regresa al mapa. |
| Pasar a segundo plano y regresar | En segundo plano no se sigue la ubicación. Al volver, se retoma y se actualiza si se movió. |
| Recrear la pantalla | Al recargar, el mapa vuelve a centrarse en la ubicación actual o en la localidad. No se conserva el zoom manual. |
| Reabrir después de terminarse el proceso | Igual que recrear; si el permiso ya fue dado, no se vuelve a pedir. |
| Otros puntos aplicables de la guía | **Permisos:** se pide la ubicación solo con sesión; si se niega o se revoca, todo funciona con la localidad y "Ubicarme ahora" explica cómo habilitarla. **Batería y datos:** seguir la ubicación solo mientras la pantalla está visible y no recargar datos por movimientos menores a 1 km. **Pantallas:** el mapa ocupa el alto disponible sin quedar debajo de la barra inferior del celular y funciona en 360 px y en compu. **Accesibilidad:** la hoja de profesionales es navegable sin tocar el mapa y "Ubicarme ahora" tiene etiqueta. **Privacidad:** ver reglas. |

**Puntos de la guía no aplicables y motivo:** soporte sin conexión (no se
pidió) e idiomas (solo español).

## Restricciones del pedido

<!-- Condiciones ya impuestas: compatibilidad, límites de alcance, requisitos
de accesibilidad o rendimiento medibles, o una tecnología expresamente exigida.
Ejemplo: Usar Room puede ser una restricción; el diseño de entidades va en PLAN.md.
No conviertas una preferencia del agente en una restricción. -->

- Radio fijo de 20 km.
- El mapa no es visible sin sesión.
- La referencia visual es la sección de mapa de elLaburante, adaptada a los colores de ServiRed (azul cliente / verde profesional).
- Los mapas siguen siendo los de OpenStreetMap que ya usa el sitio.
- La ubicación en tiempo real requiere que el sitio se sirva por HTTPS.

## Criterios de aceptación

<!-- Resultados observables que permitan decidir si se cumple cada requisito.
Incluye los casos alternativos acordados. No uses Funciona correctamente.
Repite el formato según sea necesario. -->

- **CA-01 · RF-01, RF-03:** Dado el alta de usuario y el alta de oferente, cuando se despliega la localidad, entonces aparecen todas las localidades activas, y el oferente puede elegir una distinta de Corrientes Capital.
- **CA-02 · RF-02:** Dado administración, cuando agrega una localidad con su punto y la activa, entonces aparece en las altas. Cuando corrige su punto, se usa el nuevo. Cuando la desactiva, deja de aparecer, pero los usuarios que la tenían la conservan.
- **CA-03 · RF-04, RF-05:** Dado un cliente con sesión en el celular y en la compu, cuando toca "Mapa", entonces ve el mapa a pantalla completa con el buscador, los pines agrupados, su puntito y la hoja "Profesionales cerca tuyo" con foto, nombre, localidad y distancia.
- **CA-04 · RF-06:** Dado el mapa, cuando toca un pin o un profesional de la hoja, entonces ve su resumen y puede ir a su perfil.
- **CA-05 · RF-07:** Dado el permiso concedido, cuando la posición cambia más de 1 km, entonces el puntito se mueve y la lista se actualiza con las distancias nuevas.
- **CA-06 · RF-08:** Dado el mapa desplazado a mano, cuando toca "Ubicarme ahora", entonces el mapa vuelve a centrarse en su posición.
- **CA-07 · RF-09:** Dado el permiso negado, cuando abre la portada o el mapa, entonces el centro es su localidad y ve "Usando tu localidad: {nombre}".
- **CA-08 · RF-10:** Dado un cliente ubicado en Goya, cuando busca, entonces no aparece ningún profesional a más de 20 km en la lista ni en el mapa.
- **CA-09 · RF-11:** Dado un profesional sin ubicación marcada en una localidad a menos de 20 km, cuando el cliente busca su rubro, entonces aparece con la distancia calculada desde el punto de su localidad.
- **CA-10 · RF-12:** Dado el listado de la portada, cuando se muestra un profesional, entonces su tarjeta tiene foto, insignias, rubro y "{localidad} • {distancia}".
- **CA-11 · RF-13:** Dado un invitado, cuando abre la portada, entonces ve el recuadro "Iniciá sesión para ver el mapa" y la página no incluye ubicaciones. Cuando abre la sección Mapa, se le pide entrar y, al iniciar sesión, vuelve al mapa.
- **CA-12 · RF-14:** Dado un cliente con sesión, cuando abre la portada, entonces ve el mapa compacto y "Ver mapa completo" lo lleva a la sección Mapa.
- **CA-13 · RF-15:** Dada una búsqueda sin profesionales a 20 km, cuando se muestran los resultados, entonces aparece el mensaje con la sugerencia de publicar una solicitud.

## Cómo se comprueba el comportamiento

<!-- Una fila por criterio: escenario y resultado que debemos comprobar.
La selección de tests, herramientas, comandos y evidencias se desarrolla en PLAN.md.
No marques los criterios como superados durante la especificación. -->

| Criterio | Condiciones y pasos | Resultado esperado |
| --- | --- | --- |
| CA-01 | Abrir las dos altas y desplegar la localidad. | Lista completa y elección libre. |
| CA-02 | Agregar, corregir el punto, activar y desactivar desde administración. | La lista de las altas y el punto guardado reflejan los cambios. |
| CA-03 | Abrir Mapa con sesión en 360 px y en compu. | Todos los elementos presentes. |
| CA-04 | Tocar un pin y un ítem de la hoja. | Resumen y acceso al perfil. |
| CA-05 | Simular un desplazamiento de 2 km en el navegador. | Puntito y lista actualizados. |
| CA-06 | Mover el mapa y tocar "Ubicarme ahora". | Vuelve a la posición. |
| CA-07 | Negar el permiso de ubicación. | Centro en la localidad y aviso visible. |
| CA-08 | Simular ubicación en Goya; buscar. | Ningún resultado a más de 20 km. |
| CA-09 | Profesional sin punto propio en una localidad cercana. | Aparece con su distancia. |
| CA-10 | Mirar las tarjetas del listado. | Todos los datos presentes. |
| CA-11 | Sin sesión: portada, contenido de la página y sección Mapa. | Recuadro, sin ubicaciones y vuelta al mapa después de entrar. |
| CA-12 | Con sesión: portada y "Ver mapa completo". | Mapa compacto y navegación correcta. |
| CA-13 | Búsqueda sin nadie a 20 km. | Mensaje con sugerencia. |

## Decisiones pendientes

<!-- Al resolverlas, actualiza las secciones afectadas. Escribe Ninguna cuando
no queden pendientes funcionales ni restricciones por decidir. -->

Ninguna.

<!-- ANTES DE SOLICITAR APROBACIÓN
Comprueba que el alcance está acordado, los flujos son coherentes, los puntos
mobile relevantes están cubiertos y cada requisito tiene criterios comprobables.
Resuelve las dudas y los marcadores pendientes. Mantén el diseño técnico en PLAN.md.
-->
