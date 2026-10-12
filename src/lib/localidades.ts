import { cache } from "react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { LOCALIDADES_CHACO } from "@/lib/localidades-chaco";
import { LOCALIDADES_CORRIENTES } from "@/lib/localidades-corrientes";
import { LOCALIDADES_ENTRE_RIOS } from "@/lib/localidades-entre-rios";

type Punto = { name: string; province: string; latitude: number; longitude: number };
type Resultado<T> = { error: string } | { data: T };

/**
 * Lista con la que arranca la tabla. Los puntos son el centro aproximado de
 * cada ciudad (pueden errar uno o dos km, que para un radio de 10 km no
 * cambia nada); administración los corrige desde su panel si hace falta.
 */
export const LOCALIDADES_BASE: Punto[] = [
  { name: "Corrientes Capital", province: "Corrientes", latitude: -27.4692, longitude: -58.8306 },
  { name: "Resistencia", province: "Chaco", latitude: -27.4514, longitude: -58.9867 },
  { name: "Barranqueras", province: "Chaco", latitude: -27.4847, longitude: -58.9353 },
  { name: "Presidencia Roque Sáenz Peña", province: "Chaco", latitude: -26.79095, longitude: -60.44132 },
  { name: "Villa Ángela", province: "Chaco", latitude: -27.57679, longitude: -60.71114 },
  { name: "Charata", province: "Chaco", latitude: -27.21787, longitude: -61.18738 },
  { name: "Alvear", province: "Corrientes", latitude: -29.097, longitude: -56.55 },
  { name: "Bella Vista", province: "Corrientes", latitude: -28.51, longitude: -59.043 },
  { name: "Caá Catí", province: "Corrientes", latitude: -27.75, longitude: -57.62 },
  { name: "Curuzú Cuatiá", province: "Corrientes", latitude: -29.7919, longitude: -58.0546 },
  { name: "Empedrado", province: "Corrientes", latitude: -27.951, longitude: -58.805 },
  { name: "Esquina", province: "Corrientes", latitude: -30.0144, longitude: -59.5272 },
  { name: "Gobernador Virasoro", province: "Corrientes", latitude: -28.0476, longitude: -56.0197 },
  { name: "Goya", province: "Corrientes", latitude: -29.1439, longitude: -59.2651 },
  { name: "Itá Ibaté", province: "Corrientes", latitude: -27.427, longitude: -57.337 },
  { name: "Itatí", province: "Corrientes", latitude: -27.27, longitude: -58.244 },
  { name: "Ituzaingó", province: "Corrientes", latitude: -27.585, longitude: -56.6886 },
  { name: "La Cruz", province: "Corrientes", latitude: -29.174, longitude: -56.644 },
  { name: "Mburucuyá", province: "Corrientes", latitude: -28.047, longitude: -58.228 },
  { name: "Mercedes", province: "Corrientes", latitude: -29.184, longitude: -58.0752 },
  { name: "Monte Caseros", province: "Corrientes", latitude: -30.2536, longitude: -57.6364 },
  { name: "Paso de la Patria", province: "Corrientes", latitude: -27.316, longitude: -58.572 },
  { name: "Paso de los Libres", province: "Corrientes", latitude: -29.7128, longitude: -57.0877 },
  { name: "Riachuelo", province: "Corrientes", latitude: -27.583, longitude: -58.747 },
  { name: "Saladas", province: "Corrientes", latitude: -28.254, longitude: -58.626 },
  { name: "San Cosme", province: "Corrientes", latitude: -27.371, longitude: -58.512 },
  { name: "San Luis del Palmar", province: "Corrientes", latitude: -27.508, longitude: -58.555 },
  { name: "San Roque", province: "Corrientes", latitude: -28.573, longitude: -58.709 },
  { name: "Santa Ana", province: "Corrientes", latitude: -27.456, longitude: -58.654 },
  { name: "Santa Lucía", province: "Corrientes", latitude: -28.987, longitude: -59.103 },
  { name: "Santo Tomé", province: "Corrientes", latitude: -28.5493, longitude: -56.0413 },
  { name: "Sauce", province: "Corrientes", latitude: -30.086, longitude: -58.787 },
  { name: "Yapeyú", province: "Corrientes", latitude: -29.469, longitude: -56.816 },
  ...LOCALIDADES_CORRIENTES,
  ...LOCALIDADES_CHACO,
  ...LOCALIDADES_ENTRE_RIOS,
];

/** Todos los oferentes se dieron de alta acá cuando era la única opción. */
export const CAPITAL = { name: "Corrientes Capital", province: "Corrientes" };

/** Lo que se muestra como zona del perfil. */
export function zonaDe(localidad: { name: string; province: string }) {
  return `${localidad.name}, ${localidad.province}`;
}

/** Datos de una localidad nueva: nombre y provincia legibles, punto dentro de Argentina. */
export function validarLocalidad(input: Punto): Resultado<Punto> {
  const { name, province } = canonizar({ name: input.name.trim().replace(/\s+/g, " "), province: input.province.trim().replace(/\s+/g, " ") });
  if (name.length < 2 || name.length > 60) return { error: "El nombre tiene que tener entre 2 y 60 letras." };
  if (province.length < 2 || province.length > 60) return { error: "La provincia tiene que tener entre 2 y 60 letras." };
  const punto = validarPunto(input.latitude, input.longitude);
  if ("error" in punto) return punto;
  return { data: { name, province, ...punto.data } };
}

const PROVINCIAS = [
  "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Ciudad Autónoma de Buenos Aires", "Córdoba", "Corrientes", "Entre Ríos",
  "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis",
  "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán",
];

/** Para comparar nombres sin que importen mayúsculas, tildes ni espacios: "Entre rios" es "Entre Ríos". */
export function claveNombre(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

const PROVINCIA_POR_CLAVE = new Map(PROVINCIAS.map((p) => [claveNombre(p), p]));
const BASE_POR_CLAVE = new Map(LOCALIDADES_BASE.map((l) => [`${claveNombre(l.name)}|${l.province}`, l.name]));

/**
 * La provincia escrita como corresponde y, si la localidad está en la lista
 * base, su nombre también: así "Nogoya, Entre rios" pasa a "Nogoyá, Entre Ríos"
 * y no aparecen dos provincias iguales en el selector.
 */
export function canonizar(localidad: { name: string; province: string }) {
  const province = PROVINCIA_POR_CLAVE.get(claveNombre(localidad.province)) ?? localidad.province;
  const name = BASE_POR_CLAVE.get(`${claveNombre(localidad.name)}|${province}`) ?? localidad.name;
  return { name, province };
}

/** El punto tiene que caer en Argentina: evita un clic suelto en el medio del mar. */
export function validarPunto(latitude: number, longitude: number): Resultado<{ latitude: number; longitude: number }> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -56 || latitude > -21 || longitude < -74 || longitude > -53) {
    return { error: "Marcá el punto de la localidad en el mapa (dentro de Argentina)." };
  }
  return { data: { latitude, longitude } };
}

/**
 * Agrega las localidades base que falten, también en instalaciones existentes.
 * Upsert evita duplicados si dos pedidos llegan a la vez.
 */
export async function asegurarLocalidades() {
  let existentes = await prisma.locality.findMany({ select: { id: true, name: true, province: true } });
  if (await unificarLocalidades(existentes)) existentes = await prisma.locality.findMany({ select: { id: true, name: true, province: true } });
  const claves = new Set(existentes.map((l) => `${claveNombre(l.name)}|${l.province}`));
  for (const [index, localidad] of LOCALIDADES_BASE.entries()) {
    if (claves.has(`${claveNombre(localidad.name)}|${localidad.province}`)) continue;
    // Capital primero y el resto por nombre.
    const sortOrder = index === 0 ? 0 : 10;
    await prisma.locality.upsert({
      where: { name_province: { name: localidad.name, province: localidad.province } },
      create: { ...localidad, sortOrder },
      update: {},
    });
  }
}

/**
 * Corrige las localidades cargadas a mano con la provincia (o el nombre)
 * escritos distinto. Si al corregirla queda igual a otra, sus usuarios pasan a
 * esa y la repetida se borra. Los expedientes KYC guardan los nombres como
 * texto, así que se corrigen también. Devuelve si cambió algo.
 */
async function unificarLocalidades(existentes: { id: string; name: string; province: string }[]) {
  const vistas = new Map<string, { id: string; name: string; province: string }>();
  const esCanonica = (l: { name: string; province: string }) => {
    const c = canonizar(l);
    return c.name === l.name && c.province === l.province;
  };
  // Las bien escritas primero: son las que sobreviven.
  const ordenadas = [...existentes].sort((a, b) => Number(!esCanonica(a)) - Number(!esCanonica(b)));
  let cambio = false;
  for (const localidad of ordenadas) {
    const canon = canonizar(localidad);
    const clave = `${claveNombre(canon.name)}|${canon.province}`;
    const igual = vistas.get(clave);
    if (igual) {
      await prisma.$transaction([
        prisma.user.updateMany({ where: { localityId: localidad.id }, data: { localityId: igual.id } }),
        prisma.kycCase.updateMany({ where: { province: localidad.province, locality: localidad.name }, data: { province: igual.province, locality: igual.name } }),
        prisma.locality.delete({ where: { id: localidad.id } }),
      ]);
      cambio = true;
      continue;
    }
    if (canon.name !== localidad.name || canon.province !== localidad.province) {
      await prisma.$transaction([
        prisma.locality.update({ where: { id: localidad.id }, data: canon }),
        prisma.kycCase.updateMany({ where: { province: localidad.province, locality: localidad.name }, data: { province: canon.province, locality: canon.name } }),
      ]);
      cambio = true;
    }
    vistas.set(clave, { id: localidad.id, ...canon });
  }
  return cambio;
}

/** Las activas, más la que ya tiene la persona aunque se haya desactivado. */
export const getLocalidades = cache(async (incluirId?: string | null) => {
  await asegurarLocalidades();
  return prisma.locality.findMany({
    where: { OR: [{ active: true }, ...(incluirId ? [{ id: incluirId }] : [])] },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, province: true, latitude: true, longitude: true },
  });
});

/** La localidad elegida sirve si está activa o si es la que la persona ya tenía. */
export async function resolverLocalidad(id: string, actualId?: string | null) {
  if (!id) return null;
  const localidad = await prisma.locality.findUnique({ where: { id } });
  return localidad && (localidad.active || localidad.id === actualId) ? localidad : null;
}

// Administración. Las acciones agregan `requireAdmin()`; acá queda la lógica.

export async function listarLocalidadesAdmin() {
  await asegurarLocalidades();
  return prisma.locality.findMany({
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { users: true } } },
  });
}

export async function crearLocalidad(input: Punto): Promise<{ error: string } | { ok: true }> {
  const valid = validarLocalidad(input);
  if ("error" in valid) return valid;
  const duplicada = { error: `Ya existe ${valid.data.name} en ${valid.data.province}.` };
  // Se mira antes para no ensuciar el log con el error de Prisma; el catch queda por si dos altas iguales llegan juntas.
  const mismaProvincia = await prisma.locality.findMany({ where: { province: valid.data.province }, select: { name: true } });
  if (mismaProvincia.some((l) => claveNombre(l.name) === claveNombre(valid.data.name))) return duplicada;
  try {
    await prisma.locality.create({ data: { ...valid.data, sortOrder: 10 } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return duplicada;
    throw error;
  }
  return { ok: true };
}

export async function moverLocalidad(id: string, latitude: number, longitude: number): Promise<{ error: string } | { ok: true }> {
  const punto = validarPunto(latitude, longitude);
  if ("error" in punto) return punto;
  await prisma.locality.update({ where: { id }, data: punto.data });
  return { ok: true };
}

export async function cambiarLocalidadActiva(id: string, active: boolean) {
  await prisma.locality.update({ where: { id }, data: { active } });
}
