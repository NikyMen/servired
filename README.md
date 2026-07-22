# ServiRed

Marketplace de servicios que conecta personas con **profesionales verificados**
(plomería, electricidad, limpieza, jardinería, y más), con cuentas, contratación
y mensajería funcionales de punta a punta.

**Código de color**: 🔵 **azul** = quien **busca** un servicio (cliente) ·
🟢 **verde** = quien **ofrece** un servicio (profesional). El fondo de la página
se tiñe del color del lado en el que estás, y el interruptor del encabezado
cruza de uno al otro con una cortina de color.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4**
- **Prisma** + **SQLite** (base de datos local, sin configuración externa)
- **PNPM** como gestor de paquetes
- Sin dependencias de auth ni de IA: sesiones propias con `node:crypto` y
  DeepSeek vía `fetch`.

## Puesta en marcha

```bash
pnpm install        # instala dependencias (genera el cliente de Prisma)
pnpm setup          # crea la base de datos SQLite y carga datos de ejemplo
pnpm dev            # levanta el servidor en http://localhost:3655
```

> `pnpm setup` = `prisma db push` + `prisma db seed`.
> Si cambiás el esquema (`prisma/schema.prisma`), corré `pnpm db:push` **y
> reiniciá el dev server**: el cliente de Prisma se carga al arrancar el proceso.

### Variables de entorno

| Archivo      | Qué va                    | ¿Git?               |
| ------------ | ------------------------- | ------------------- |
| `.env`       | `DATABASE_URL`, sin secretos | Sí, está trackeado |
| `.env.local` | `DEEPSEEK_API_KEY`        | **No**, lo ignora `.gitignore` |

Copiá `.env.example` como referencia. **La API key va en `.env.local`**: `.env`
está trackeado por git y terminaría publicada.

## Cuentas

Las preinscripciones se guardan en MongoDB cuando `MONGODB_URI` está configurada.
El panel administrativo está en `/admin` y requiere `ADMIN_EMAIL`, `ADMIN_PASSWORD`
y `ADMIN_SESSION_SECRET` en `.env.local`.

Autenticación propia, sin librerías externas:

- Contraseñas con **scrypt** (`node:crypto`), con sal por usuario.
- Sesiones con **token opaco en la base** y cookie `httpOnly` — se pueden revocar
  de verdad, a diferencia de un JWT.
- `src/lib/auth.ts` expone `getSessionUser()`, `requireUser()` y `requirePro()`.

Al registrarse, quien elige **ofrecer** carga rubro, titular, zona y precio: la
cuenta arranca con su perfil público creado y ya aparece en las búsquedas.

### Cuentas de demo (clave para todas: `servired123`)

| Email                  | Rol                            |
| ---------------------- | ------------------------------ |
| `maria@servired.test`  | Cliente (contrata)             |
| `martin@servired.test` | Profesional — electricista     |
| `carlos@servired.test` | Profesional — plomero          |
| `julieta.r@servired.test` | Cliente que publicó una solicitud |

Cada profesional del seed tiene su cuenta (`nombre@servired.test`), y cada
solicitud de ejemplo tiene un autor real para que "Responder" funcione.

## Búsqueda inteligente

`src/lib/search.ts` rankea en memoria en vez de usar `LIKE` de SQLite, que no
ignora acentos ni tolera errores de tipeo. Entiende:

- **Acentos**: `plomería` = `plomeria`.
- **Sinónimos del rubro**: `se me tapó el inodoro` → Plomería.
- **Typos, incluida la transposición**: `plomeor` → `plomero` (Damerau-Levenshtein).
- **Frases naturales**: `necesito un abogado por un despido` → Abogados.

> El catálogo es chico (decenas de perfiles). Con miles de filas esto pide un
> índice de texto real (FTS5 o Postgres): el corte natural es reemplazar
> `rankProfessionals()`.

## ServiRed IA

Botón flotante que habla con **DeepSeek** (`deepseek-chat`) por streaming.
Sin `DEEPSEEK_API_KEY` la app funciona igual y el panel avisa que falta
configurarla.

> El límite de pedidos por IP es en memoria: se reinicia con el proceso y no se
> comparte entre instancias. Antes de escalar a varias réplicas, moverlo a Redis
> o al gateway.

## Rutas

### Cuenta

| Ruta            | Descripción                                       |
| --------------- | ------------------------------------------------- |
| `/entrar`       | Login                                             |
| `/crear-cuenta` | Registro, con las dos vías (contratar / ofrecer)  |

### Cliente (azul)

| Ruta                  | Descripción                                                       |
| --------------------- | ----------------------------------------------------------------- |
| `/`                   | Búsqueda de profesionales (texto, ubicación, categoría)           |
| `/profesionales/[id]` | Perfil del profesional + contratar o consultar                    |
| `/publicar-solicitud` | Publicar una solicitud de presupuesto                             |
| `/solicitudes`        | Solicitudes abiertas                                              |
| `/contrataciones`     | Mis contrataciones (solicitada → aceptada → completada)           |
| `/mensajes`           | Chat con los profesionales                                        |

### Profesional (verde)

| Ruta            | Descripción                                                        |
| --------------- | ------------------------------------------------------------------ |
| `/pro`          | Panel: contrataciones recibidas, solicitudes de clientes, servicios |
| `/pro/mensajes` | Chat con los clientes                                              |

## API (Route Handlers)

Todo lo que escribe pide sesión, y **el rol sale de la sesión, nunca del body**.

| Endpoint                                 | Descripción                                     |
| ---------------------------------------- | ----------------------------------------------- |
| `GET /api/buscar/sugerencias`            | Autocompletado del buscador                     |
| `POST /api/ia`                           | ServiRed IA (streaming desde DeepSeek)          |
| `POST /api/upload`                       | Sube imagen o PDF (≤8 MB, valida magic bytes)   |
| `POST /api/solicitudes`                  | Publica una solicitud                           |
| `POST /api/solicitudes/[id]/responder`   | El profesional le contesta a quien la publicó   |
| `POST /api/contrataciones`               | Crea una contratación (y abre la conversación)  |
| `PATCH /api/contrataciones/[id]`         | Cambia el estado (aceptar/completar/cancelar)   |
| `POST /api/conversaciones`               | Abre una conversación y envía el primer mensaje |
| `GET·POST /api/conversaciones/[id]/mensajes` | Lee (polling) y envía mensajes con adjunto |

## Mensajes

Reales y con adjuntos: imágenes (JPG/PNG/WEBP/GIF) y PDF hasta 8 MB. El hilo
abierto se refresca cada 5 s y se frena con la pestaña en segundo plano.

Los archivos van a `public/uploads/` (ignorado por git) con **nombre aleatorio y
extensión derivada del tipo validado**, nunca del nombre que mandó el navegador.
En producción con varias instancias esto pide almacenamiento externo (S3/R2).

## Estructura

```
prisma/
  schema.prisma      # User, Session, Category, Professional, Service, Review,
                     # Booking, Conversation, Message, ServiceRequest
  seed.ts            # datos de ejemplo + cuentas de demo
src/
  app/
    (auth)/          # entrar, crear-cuenta y sus server actions
    (client)/        # área del cliente (azul)
    pro/             # área del profesional (verde)
    api/             # route handlers
    icon.svg         # favicon (el mismo símbolo que el logo)
  components/        # UI reutilizable (Header, Chat, ModeSwitch, AsistenteIA, …)
  lib/               # auth, password, search, prisma, brand, format, links, types
```

## Scripts

| Script            | Acción                                    |
| ----------------- | ----------------------------------------- |
| `pnpm dev`        | Servidor de desarrollo                    |
| `pnpm build`      | Build de producción                       |
| `pnpm start`      | Sirve el build de producción              |
| `pnpm setup`      | `db push` + `db seed`                     |
| `pnpm db:studio`  | Prisma Studio (explorar la base de datos) |

## Pendientes conocidos

- **Logo**: el símbolo actual (red de tres nodos, en `Logo.tsx` e `icon.svg`) es
  propio. Falta reemplazarlo por el archivo de marca definitivo.
- Límite de la IA y uploads en disco local: ver las notas de arriba antes de
  escalar a más de una instancia.
