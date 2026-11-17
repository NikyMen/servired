# PLAN: Pedidos de Diego (noviembre 2026)

**Fuente:** chat del grupo «Servired» del 16/11 (los mensajes de Diego de las 18:53 a las 22:36) y los documentos de armado de CV.
**Estado:** Pedidos 1, 2 y 3 implementados (sin commit). El resto, pendiente.

Son seis pedidos. Están ordenados del más chico al más grande.

| # | Pedido | Tamaño | Estado |
| --- | --- | --- | --- |
| 1 | Portada de planes: «Tu oficio / Profesión» | Muy chico | Hecho |
| 2 | Mapa: mostrar el rubro además del nombre | Chico | Hecho |
| 3 | Muestras de trabajos en el registro | Mediano | Hecho: las muestras viajan con el envío del alta |
| 4 | Foto en la calificación, en la misma opinión que el trabajo hecho | Mediano | Pendiente |
| 5 | Armado de CV (13 pasos) | Grande | Plan aparte: [../cv-y-muestras/PLAN.md](../cv-y-muestras/PLAN.md) |
| 6 | Cobro de suscripciones | Grande | Hay que elegir el proveedor |

---

## 1. Portada de planes: «Tu oficio / Profesión»

**Pedido:** en `/planes`, donde dice «Tu oficio. Más oportunidades.», que diga «Tu oficio / Profesión».

**Hoy:** el texto sale de `src/lib/planes-config.ts` → `PLANES_DEFAULT.encabezado.titulo` (`"Tu oficio."`), y administración lo puede editar desde `AdminPlanes`.

- [ ] Cambiar el valor por defecto a `"Tu oficio o profesión."` (o `"Tu oficio / Profesión."`, exactamente como lo escribió Diego).
- [ ] Si ya hay una versión guardada desde el panel, el cambio se hace ahí. Si no, alcanza con el valor por defecto.
- [ ] Revisar en el celular que el título no corte feo en dos líneas.
- Aprovechar para revisar otros textos que dicen solo «oficio» y dejan afuera a los profesionales, por ejemplo la pregunta de «ofertas en relación de dependencia».

## 2. Mapa: rubro además del nombre

**Pedido:** en el mapa, la etiqueta de cada oferente tiene que mostrar el rubro, no solo el nombre.

**Hoy:** `src/components/mapa/MapaCompletoInner.tsx` (l.23-28) muestra foto y `item.nombre`. La página `src/app/(client)/mapa/page.tsx` ya manda el oficio (`oficio: p.headline`), así que el dato ya llega y no hay que tocar la base.

- [ ] Agregar una segunda línea más chica con el rubro debajo del nombre (por ejemplo «Juan Pérez» y abajo «Plomero»).
- [ ] Si tiene varios rubros, mostrar el principal y «+2».
- [ ] Cuidar el ancho: hoy el nombre corta en `max-w-32`. En el celular, con muchas etiquetas fijas, revisar que no se tapen.
- [ ] Usar el mismo formato en las etiquetas del mapa chico de la portada (`FondoMapaInner.tsx`), si ahí también aparecen nombres.

## 3. Muestras de trabajos en el registro

**Pedido:** «el de las muestras, me dicen que no está el punto». Ya se le dijo que va en la actualización de esta noche.

El detalle está en [../cv-y-muestras/PLAN.md](../cv-y-muestras/PLAN.md), sección 3. En resumen:
- [ ] Paso opcional «Muestras de tus trabajos» en el alta del oferente, con el botón «Saltear este paso».
- [ ] Abrir `POST /api/pro/trabajos` a los perfiles pendientes. Hoy exige perfil aprobado y devuelve 403.
- [ ] Las muestras no se ven en público hasta que el perfil se aprueba. Administración las ve en la revisión.
- [ ] Verificar que en Mi perfil quede claro dónde se cargan, porque es posible que el reclamo venga de ahí: personas ya aprobadas que no encuentran la sección.

## 4. Foto en la calificación, en la misma opinión que el trabajo

**Pedido:** cuando el cliente califica, que opcionalmente pueda subir una foto del trabajo que recibió. En el perfil del oferente, la opinión tiene que mostrar junto lo que se hizo, el comentario y la foto.

**Hoy (verificado):**
- La tabla `Review` ya tiene `imageUrl`, y `POST /api/pagos/[id]/resena` ya la acepta (l.20).
- El perfil ya dibuja la foto si existe (`profesionales/[id]/page.tsx` l.291).
- **Lo que falta:** ninguno de los dos formularios para calificar manda foto. Ni `CalificarObligatorio.tsx` (l.40) ni `BookingActions.tsx` (l.68) tienen dónde subirla.
- Hoy el perfil muestra por separado «Trabajos realizados» (título del servicio, resumen y estrellas) y «Opiniones» (nombre, estrellas y comentario). Por eso no se ve todo junto.

**Cambios:**
- [ ] En los dos formularios para calificar, agregar el campo «Agregar foto del trabajo (opcional)». Se sube con `/api/upload` (solo imágenes, con la compresión que ya existe) y la URL viaja como `imageUrl`.
- [ ] Mostrar una vista previa con la opción de quitar la foto. Calificar sin foto sigue funcionando igual.
- [ ] En el perfil, cada opinión pasa a mostrar en una sola tarjeta:
  - lo que se hizo: título del servicio y resumen (`booking.service.title` / `booking.workSummary`), tomado de la contratación de la reseña con `bookingId`;
  - las estrellas, el comentario y la fecha;
  - la foto, en miniatura, que se abre en grande en el mismo visor que ya usan las muestras (`MuestraTrabajos`).
- [ ] Agregar «Denunciar imagen» sobre la foto de la reseña, como en las muestras (`DenunciarImagen` y el panel de denuncias en admin), porque la sube un cliente.
- [ ] Al darse de baja una cuenta, la foto de la reseña se borra junto con ella (`baja-cuenta.ts`).
- **Decisión para Diego:** ¿unimos «Trabajos realizados» y «Opiniones» en una sola sección? Proponemos que sí: cada trabajo terminado con su opinión debajo, y los trabajos sin opinión solo con su título.
- **Decisión para Diego:** ¿una foto por opinión o hasta tres? Proponemos hasta 3.

## 5. Armado de CV

Plan completo en [../cv-y-muestras/PLAN.md](../cv-y-muestras/PLAN.md): 13 pasos, preguntas filtro, adjunto PDF/DOC/DOCX y listado con filtros en admin.

## 6. Cobro de suscripciones

**Pedido:** Diego está armando las suscripciones. El banco le ofreció **DEBIN automático**, y pregunta si nos da igual integrar con otra API: **Payway, Newpay, Fiserv o Modo**.

**Hoy:** `/planes` es solo una vista previa (`publicado: false`, «las suscripciones todavía no están disponibles»). Mercado Pago ya está integrado para cobrar los trabajos (cuentas vinculadas por OAuth y webhook en `api/mercadopago/webhook`).

**Comparación inicial** (hay que confirmar costos y requisitos con cada proveedor antes de decidir):

| Opción | Qué cobra | A favor | En contra |
| --- | --- | --- | --- |
| **DEBIN recurrente** (lo ofrece el banco) | Débito de una cuenta bancaria o virtual (CBU/CVU) del oferente, con adhesión previa | Suele ser barato, entra directo al banco de ServiRed, no usa tarjeta | El oferente tiene que adherirse desde su homebanking, no sirve con tarjeta de crédito y la API depende de lo que el banco nos dé (documentación, entorno de pruebas, avisos de pago) |
| **Mercado Pago Suscripciones** (no está en la lista, pero ya lo usamos) | Tarjeta o dinero en cuenta de Mercado Pago, débito automático mensual | Ya tenemos la cuenta, las credenciales y el webhook; la mayoría de los oferentes ya tiene Mercado Pago; reintentos y avisos incluidos | La comisión suele ser más alta que la de un débito bancario |
| **Payway** (Prisma) | Tarjetas, con cobro recurrente sobre tarjeta guardada | Pasarela de tarjetas consolidada | Pide alta de comercio y número de establecimiento; los reintentos y avisos los armamos nosotros |
| **Fiserv** (ex First Data) | Tarjetas, como adquirente y pasarela | Grande y estable | Integración más pesada y pensada para comercios grandes; el alta es más lenta |
| **MODO** | Pagos desde la app de los bancos (QR o botón de pago) | Muy usado, sin tarjeta | Hay que confirmar si ofrece débito recurrente automático; si no, cada mes el oferente tendría que pagar a mano |
| **Newpay** | — | — | No tengo información confiable; hay que pedirle a Diego la documentación o el contacto |

**Recomendación técnica:**
1. **Para salir rápido: Mercado Pago Suscripciones.** Reusa lo que ya está integrado y probado, y cubre tarjeta y dinero en cuenta.
2. **Como segunda vía, más barata: el DEBIN del banco,** siempre que el banco dé una API con entorno de pruebas y avisos automáticos (webhook) de cobro aprobado o rechazado. Sin eso no se puede automatizar el alta y la baja del plan.
3. El código del plan queda separado del proveedor: cada pago avisa «cobrado», «rechazado» o «cancelado», y la lógica del plan no depende de quién cobró. Así se puede sumar otro proveedor después sin rehacer nada.

**Qué hay que construir** (cuando se elija el proveedor):
- [ ] Modelo `Subscription`: oferente, plan, período mensual o anual, estado (`activa`, `pendiente`, `vencida`, `cancelada`), proveedor, id externo y próximo cobro.
- [ ] Botón «Suscribirme» en `/planes` → pantalla de pago del proveedor → vuelta a ServiRed.
- [ ] Webhook que activa, renueva o suspende el plan, y que no procesa dos veces el mismo aviso.
- [ ] Beneficios de cada plan aplicados en la plataforma (visibilidad, contacto directo, etc., según `planes-config.ts`).
- [ ] Mi perfil: plan actual, próximo cobro, «Cancelar suscripción» e historial.
- [ ] Admin: listado de suscripciones, estado y cobros fallidos.
- [ ] Avisos por campanita y correo: cobro aprobado, cobro rechazado y plan por vencer.
- [ ] Términos: agregar las condiciones de la suscripción (renovación automática, baja y reintegros) antes de publicar.

**Qué le tenemos que pedir a Diego:**
- [ ] De parte del banco: documentación de la API de DEBIN recurrente, si hay entorno de pruebas, si avisan por webhook y cuál es el costo por operación.
- [ ] Qué es «Newpay» (link o contacto).
- [ ] Precios finales de los planes, y si el plan anual se cobra todo junto o mensual.
- [ ] Si la cuenta de Mercado Pago de ServiRed puede usarse para suscripciones.

---

## Orden propuesto

1. **Esta noche:** el pedido 3 (muestras en el registro), que ya está en curso, y los pedidos 1 y 2, que son chicos.
2. **Siguiente actualización:** el pedido 4 (foto en la calificación y opinión unificada).
3. **Después:** el pedido 5 (CV), en etapas, según su plan.
4. **En paralelo:** decidir el proveedor de suscripciones (pedido 6). La integración arranca cuando estén las respuestas del banco y los precios finales.
