import { prisma } from "@/lib/prisma";
import { compararOrdenPorDefecto } from "@/lib/search";
import { mismoOrden, validarOrdenPerfiles } from "@/lib/orden-perfiles-utils";

/** Perfiles aceptados para la pantalla de orden de /admin, ya ordenados como en la portada. */
export async function listarOrdenPerfiles() {
  const pros = await prisma.professional.findMany({
    where: { profileStatus: "approved" },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      businessName: true,
      headline: true,
      providerType: true,
      posicionFija: true,
      approvedAt: true,
      createdAt: true,
      userId: true,
      user: { select: { accountStatus: true, perfilOculto: true } },
    },
  });
  return pros.sort((a, b) => compararOrdenPorDefecto(a, b) || a.id.localeCompare(b.id)).map((pro) => ({
    ...pro,
    // Aceptado pero sin salir en el sitio: la fila avisa en vez de esconderse.
    oculto: pro.userId !== null && (pro.user?.accountStatus !== "approved" || pro.user?.perfilOculto === true),
  }));
}

export type MovimientoPerfil = "fijar" | "soltar" | "subir" | "bajar" | "primero";

/** Guarda el orden completo de forma atómica, sin pisar cambios de otro admin. */
export async function guardarOrdenPerfiles(input: unknown) {
  if (!validarOrdenPerfiles(input)) return { ok: false, error: "El orden enviado no es válido." } as const;

  return prisma.$transaction(async (tx) => {
    const aprobados = await tx.professional.findMany({
      where: { profileStatus: "approved" },
      select: { id: true, posicionFija: true, approvedAt: true, createdAt: true },
    });
    const actuales = aprobados
      .filter((pro) => pro.posicionFija !== null)
      .sort((a, b) => compararOrdenPorDefecto(a, b) || a.id.localeCompare(b.id))
      .map((pro) => pro.id);
    // Un reintento cuya respuesta se perdió puede encontrar el mismo orden
    // ya guardado: aceptarlo no pisa cambios ajenos.
    if (!mismoOrden(actuales, input.anteriores) && !mismoOrden(actuales, input.ids)) {
      return { ok: false, error: "El orden cambió mientras lo editabas. Descartá los cambios para tomar la lista actualizada." } as const;
    }
    const disponibles = new Set(aprobados.map((pro) => pro.id));
    if (input.ids.some((id) => !disponibles.has(id))) {
      return { ok: false, error: "Un perfil ya no está disponible. Descartá los cambios y revisá la lista actualizada." } as const;
    }

    await tx.professional.updateMany({ where: { posicionFija: { not: null } }, data: { posicionFija: null } });
    for (const [index, id] of input.ids.entries()) {
      await tx.professional.update({ where: { id }, data: { posicionFija: index + 1 } });
    }
    return { ok: true, ids: input.ids } as const;
  }, { timeout: 15000 });
}

/**
 * Cambia la lista de fijados y la renumera 1..n, así nunca quedan huecos ni
 * empates. "fijar" suma el perfil al final de los fijados.
 */
export async function moverPerfil(id: string, movimiento: MovimientoPerfil) {
  await prisma.$transaction(async (tx) => {
    // Un fijado que dejó de estar aceptado no figura en /admin: si se quedara
    // con su número, "subir" o "bajar" podrían cruzarlo sin que se vea nada.
    await tx.professional.updateMany({ where: { posicionFija: { not: null }, profileStatus: { not: "approved" } }, data: { posicionFija: null } });
    const fijados = (await tx.professional.findMany({ where: { posicionFija: { not: null } }, orderBy: { posicionFija: "asc" }, select: { id: true } })).map((pro) => pro.id);
    const indice = fijados.indexOf(id);

    if (movimiento === "fijar") {
      if (indice !== -1) return;
      const pro = await tx.professional.findUnique({ where: { id }, select: { profileStatus: true } });
      if (pro?.profileStatus !== "approved") return;
      fijados.push(id);
    } else {
      if (indice === -1) return;
      fijados.splice(indice, 1);
      if (movimiento === "subir") fijados.splice(Math.max(indice - 1, 0), 0, id);
      else if (movimiento === "bajar") fijados.splice(Math.min(indice + 1, fijados.length), 0, id);
      else if (movimiento === "primero") fijados.unshift(id);
      else await tx.professional.update({ where: { id }, data: { posicionFija: null } }); // soltar
    }

    for (const [posicion, fijado] of fijados.entries()) {
      await tx.professional.update({ where: { id: fijado }, data: { posicionFija: posicion + 1 } });
    }
  });
}
