# Lanzamiento de ServiRed: tanda de la reunión con el cliente

Índice de los pedidos de la última reunión con el cliente antes de salir al
mercado. Cada grupo tiene su `SPEC.md` (qué se tiene que cumplir). El
`PLAN.md` (cómo se implementa) y el `TASKS.md` (pasos) se escriben recién
cuando la spec del grupo está **Aprobada**.

Método: spec → plan → tareas → implementación → validación. Cada etapa necesita
la aprobación explícita de la anterior. Plantillas: [SPEC_TEMPLATE](../SPEC_TEMPLATE.md),
[PLAN_TEMPLATE](../PLAN_TEMPLATE.md) y [MOBILE_GUIDELINES](../MOBILE_GUIDELINES.md)
(se aplica a la web en el celular).

## Grupos, orden y estado

| # | Grupo | Pedidos de la minuta | Tamaño | Depende de | Spec | Plan |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | [Propuestas y trabajos](propuestas-trabajos/SPEC.md) | La propuesta vence a los 5 días · quitar el tope de trabajos en curso | S | — | Aprobada | [Aprobado](propuestas-trabajos/PLAN.md) · [Tareas](propuestas-trabajos/TASKS.md) |
| 2 | [Contacto y ayuda](contacto-ayuda/SPEC.md) | Mensaje predeterminado al hacer clic · botón flotante "Necesito ayuda" | S | — | Aprobada | [Aprobado](contacto-ayuda/PLAN.md) · [Tareas](contacto-ayuda/TASKS.md) |
| 3 | [Mapa y ubicación](mapa-ubicacion/SPEC.md), parte A: localidades | Lista de localidades con su punto en el mapa, administrable | S | — | Aprobada | [Aprobado](mapa-ubicacion/PLAN-A-localidades.md) · [Tareas](mapa-ubicacion/TASKS-A-localidades.md) |
| 4 | [Alta y términos](alta-terminos/SPEC.md) | Términos y condiciones al crear el usuario · login con Facebook y Google | M | 3 | Aprobada | [Aprobado](alta-terminos/PLAN.md) · [Tareas](alta-terminos/TASKS.md) |
| 5 | [Avisos por correo](avisos-correo/SPEC.md) | Aviso de mensajes sin contestar · aviso solo a los rubros propios · propuestas | M | SMTP de producción | Aprobada | [Aprobado](avisos-correo/PLAN.md) · [Tareas](avisos-correo/TASKS.md) |
| 6 | [Matrículas](matriculas/SPEC.md) | Matrícula o certificado pendiente de aprobación | M | — | Aprobada | [Aprobado](matriculas/PLAN.md) · [Tareas](matriculas/TASKS.md) |
| 7 | [Mapa y ubicación](mapa-ubicacion/SPEC.md), parte B | Mapa oculto al invitado · ubicación en tiempo real · sección Mapa en el nav · 20 km a la redonda · ideas de elLaburante | L | 3, 4, 6 | Aprobada | [Aprobado](mapa-ubicacion/PLAN-B-mapa.md) · [Tareas](mapa-ubicacion/TASKS-B-mapa.md) |
| 8 | [Publicidad](publicidad/SPEC.md) | 9 placas iguales debajo de la portada · 4 al pie · rediseño de la carga | M | 2 | Aprobada | [Aprobado](publicidad/PLAN.md) · [Tareas](publicidad/TASKS.md) |

La 8 se puede hacer en paralelo con la 7.

## Autorizaciones

- 2026-09-18: el usuario aprobó el plan del grupo 4 y autorizó seguir **sin
  parar hasta el último grupo**: specs 5–8 aprobadas, y cada plan y sus tareas
  se implementan sin esperar otra aprobación. Las decisiones menores que
  aparezcan se toman con criterio y quedan registradas en cada PLAN
  ("Decisiones tomadas con la autorización general") para revisarlas al final.

## Descartado en la planificación

- Avisos por WhatsApp: el cliente pidió dejarlos afuera por ahora (hace falta
  la API paga de Meta o un intermediario).
- Términos aparte para quien ofrece servicios: se acepta un solo texto.
- Matrícula obligatoria: es opcional y solo suma una insignia.
- Radio ajustable: es fijo en 20 km.
- Guardar la ubicación de cada inicio de sesión: no se eligió. La ubicación de
  respaldo es la localidad del alta.

## Checklist de producción (antes de anunciar el lanzamiento)

- [ ] Claves de Google y Facebook de producción cargadas, con las URL de
      retorno registradas en las dos consolas. La app de Facebook en modo
      "Live" con permiso de email. (Grupo 4)
- [ ] Proveedor de correo (SMTP) de producción configurado y el dominio
      remitente con SPF/DKIM. Sin eso no sale ni el código de verificación. (Grupo 5)
- [ ] Tarea programada del servidor activa para los avisos por correo. (Grupo 5)
- [ ] Sitio servido por HTTPS: el navegador no da la ubicación en tiempo real
      sin HTTPS. (Grupo 7)
- [x] Número de WhatsApp de soporte en el `.env` del servidor (`SOPORTE_WHATSAPP`): +54 9 3794 40-4086, cargado el 19/09/2026. (Grupo 2)
- [ ] Lista de localidades confirmada por el cliente. (Grupo 3)
- [ ] Texto de términos revisado y publicado como versión vigente. (Grupo 4)
- [ ] Imágenes de publicidad re-subidas con el recorte nuevo, ya cuadradas de 800 × 800. (Grupo 8)

## Estado al cierre de la tanda (2026-09-18)

Los 8 grupos están implementados y validados en local, en la rama
`tanda-lanzamiento` (un commit por grupo). Lo que falta en cada TASKS.md, marcado
con `[~]` o como pendiente fuera del entorno:

- **Pantallas de `/admin`** (Soporte, Localidades, Legales con versión nueva,
  Matrículas y Publicidad): el agente no ingresa la contraseña de
  administración. La lógica de cada una está probada por script.
- **Producción:** claves de Google y Facebook, SMTP con SPF/DKIM, crontab con
  `CRON_SECRET`, HTTPS para la ubicación, número de soporte y re-subir las
  imágenes de publicidad con el recorte nuevo (ver la checklist de arriba).
- **Deploy, en orden:** backup de la base → `git pull` → `pnpm install` →
  `npx prisma db push` → `pnpm exec tsx prisma/extender-propuestas.ts` →
  `pnpm exec tsx prisma/asignar-localidad-pros.ts` → build → `pm2 restart`.
- **Aviso al cliente:** al desplegar, todas las cuentas existentes ven la
  pantalla "Completá tu alta" (términos y localidad) en su próxima visita.

## Ajustes pedidos por el cliente (2026-09-19)

Pedido directo, sin pasar por spec (cambios chicos sobre grupos ya cerrados):

- **Publicidad (Grupo 8):** todas las placas son cuadradas de 800 × 800
  (costados, arriba y pie). Arriba, en el celular y la tablet, pasan a 2 filas
  de 3 (se suman `mobile-5` y `mobile-6`). Los costados crecen con el lugar
  libre, hasta 14rem. El recorte deja alejar la imagen más allá del marco y
  pintar el resto con un color de fondo: selector, código para copiar/pegar,
  cuentagotas sobre la imagen y "color del borde" automático. Las imágenes que
  no son cuadradas se marcan para re-encuadrar.
- **Publicidad (Grupo 8), 2026-09-20:** la portada tiene **un solo grupo de 9
  placas** (`portada-1`…`portada-9`), iguales en el celular y en la compu y en
  el mismo lugar: debajo de la portada. En el celular son 3 filas de 3; desde
  `lg` es una sola fila de 9 a todo el ancho de la pantalla. **Se van los
  costados** (`left-*`, `right-*`) y las de solo celular (`mobile-*`). Un lugar
  de portada sin imagen muestra «Tu publicidad acá / Contactanos» y abre el
  WhatsApp de soporte; los 4 del pie siguen ocultándose cuando están vacíos.
  Al deployar se corre **una vez** `pnpm placas:reubicar`, que muda a los
  lugares nuevos las imágenes ya cargadas (sin borrar nada y sin repetir si se
  corre de nuevo).
- **Publicidad (Grupo 8), 2026-09-21:** los lugares son **12 y son todos**. En
  la compu, **3 en el costado izquierdo y 3 en el derecho**, fijas: acompañan el
  scroll en **todas las pantallas del sitio**, no solo en la portada (viven en
  el layout del cliente, `<AdsCostados>`), y **6 debajo de la portada** en una
  fila. En el celular no hay costados: se ven las **12 juntas, de 4 en 4**,
  debajo de la portada. Todas del mismo tamaño (cuadradas de 800 × 800). Se va
  el grupo del **pie**: `bottom-1`…`bottom-3` pasan a ser 3 de los 6 de debajo
  de la portada y `bottom-4` deja de mostrarse. Los slots no se renombran para
  no perder lo cargado: `portada-1`…`portada-3` son la franja izquierda,
  `portada-4`…`portada-6` la derecha y `portada-7`…`portada-9` +
  `bottom-1`…`bottom-3` las de debajo. En el panel quedan agrupadas por costado.
  Al deployar se corre **una vez** `pnpm placas:reubicar`, que ahora rescata
  también lo que hubiera en `bottom-4`.
- **Mensajes:** ya no es flotante (se encimaba con ServiRed IA); es un ícono en
  el encabezado, al lado de la campanita, en el celular y en la compu, que abre
  el mismo panel. Sale de la navegación de texto de la compu.
- **Mapa (Grupo 7):** radio de 10 km (antes 20). El mapa arranca encuadrando el
  círculo entero; los botones y la tarjeta ya no pasan por encima del
  encabezado al scrollear ni se enciman entre sí en el celular. Se saca el
  texto "Mostrando lo que está a N km de tu ubicación".
- **Categorías:** hasta 4 filas en el celular y en la compu; el último lugar es
  "Ver más", que despliega el resto.
- **Soporte (Grupo 2):** el número del botón "¿Necesitás ayuda?" sale de
  `SOPORTE_WHATSAPP` (y `SOPORTE_WHATSAPP_MENSAJE`) en el `.env`; si está,
  manda sobre lo cargado en `/admin`.

### Segunda tanda (2026-09-19)

- **Login con freno de intentos:** 5 fallos por cuenta y 20 por IP cada 15
  minutos; `/admin`, 5 por IP. En memoria (`src/lib/intentos.ts`), alcanza con
  un solo proceso. La IP sale de `X-Real-Ip` que pone Traefik (antes la IA
  tomaba la primera de `X-Forwarded-For`, que la inventa cualquiera).
- **Monitoreo:** `check-endpoints.sh` del VPS ahora vigila el 3655,
  servired.consultoriadigital.io y servired.ar (aviso por Telegram). La entrada
  vieja "servired-3060" es otra app (`/var/www/services`).
- **Costados:** 3 placas por lado (`left-3`, `right-3`); el lado se achica
  también con el alto de la pantalla para que las 3 entren.
- **Categorías:** cada fila se estira hasta llenar el ancho (la última queda
  natural). Se re-mide cuando carga la tipografía y, desplegado, el alto queda
  libre: antes podía cortar la última fila y tapar "Ver menos".
- **Recorte de placas:** el archivo se arma en el momento de guardar; antes se
  preparaba con una demora y un "Guardar" rápido no subía la imagen nueva.

- **Soporte (19/09):** el número del cliente (+54 9 3794 40-4086) quedó en
  `SOPORTE_WHATSAPP` del `.env` del VPS. Aparece en el botón flotante y en el
  footer, con el mismo enlace de WhatsApp.

- **Mercado Pago (22-23/09):** app nueva de producción (Checkout Pro, API de
  Preferencias, OAuth con redirect `…/api/mercadopago/callback`, webhook solo
  "Pagos (legacy)"). Comisión de ServiRed por `MP_COMISION_PORCENTAJE` (1 % en
  el VPS) enviada como `marketplace_fee`; queda en `Payment.commission`.
- **Portada (23/09):** categorías como menú (la abierta es una pestaña pegada a
  su panel de subcategorías) y filtros sin recargar ni mover el scroll. Menú de
  la cuenta y campanita sólidos; cerrar sesión en rojo. TikTok en login/registro.
- **Pago, perfil y calificación (23/09):** el botón "Pagar" del chat y "Pagar con
  Mercado Pago" llevan el logo y el celeste de MP. El perfil ya no muestra
  teléfono ni WhatsApp del oferente, y en "Trabajos realizados" se ven las
  estrellas del cliente en vez del monto final. Calificar es obligatorio: un
  trabajo pagado sin calificar abre una pantalla que tapa el sitio del cliente
  (`CalificarObligatorio`) y el servidor rechaza contratar, abrir conversaciones
  o publicar solicitudes hasta calificarlo (`lib/calificacion.ts`).
- **Tarjeta de Mercado Pago del panel pro (23/09):** con los colores de MP y
  fondo difuminado (`components/pro/MercadoPagoCard.tsx`). Vinculada se ve en
  grande (cuenta, fecha y comisión) y sin botón; "Volver a vincular" aparece
  solo si Mercado Pago rechaza renovar el acceso (`estadoMercadoPago`), y en
  ese caso tampoco deja cerrar trabajos hasta volver a vincular.
- **Ayuda y Mi perfil (23/09):** el botón flotante de soporte es solo el logo
  de WhatsApp, redondo como el de ServiRed IA. La tarjeta de Mercado Pago pasó
  a Mi perfil del pro (`/pro/mi-perfil#mercado-pago`, ahí vuelve el OAuth); el
  panel solo muestra un aviso celeste si falta vincular o se cortó.
- **Empleo y publicidad (23/09):** tilde «Me gustaría recibir ofertas por
  privado en relación de dependencia» arriba de términos al registrarse como
  oficio/profesional, en el alta pro y en Mi perfil (`User.ofertasDependencia`);
  la lista está en el admin, pestaña «Empleo». Cada placa tiene tipo
  (`Ad.tipo`: oficio | profesional) y viaja entera al moverla; el formulario
  del admin se remonta después de mover (antes mostraba el título y el
  WhatsApp del lugar anterior y «Guardar» los pisaba). En el celular la
  publicidad son dos carruseles infinitos: oficios hacia la derecha y
  profesionales hacia la izquierda, con lugares libres hasta completar 6.
