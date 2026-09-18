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
| 8 | [Publicidad](publicidad/SPEC.md) | 4 placas al pie · laterales que siguen el scroll · rediseño de la carga | M | 2 | Aprobada | [Aprobado](publicidad/PLAN.md) · [Tareas](publicidad/TASKS.md) |

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
- [ ] Número de WhatsApp de soporte cargado en administración. (Grupo 2)
- [ ] Lista de localidades confirmada por el cliente. (Grupo 3)
- [ ] Texto de términos revisado y publicado como versión vigente. (Grupo 4)
- [ ] Imágenes de publicidad re-subidas con el recorte nuevo. (Grupo 8)

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
