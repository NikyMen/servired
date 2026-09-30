import { prisma } from "@/lib/prisma";
import { compararOrdenPorDefecto } from "@/lib/search";

/** Perfiles aceptados para la pantalla de orden de /admin, ya ordenados como en la portada. */
export async function listarOrdenPerfiles() {
  const pros = await prisma.professional.findMany({
    where: { profileStatus: "approved" },
    select: {
      id: true,
      name: true,
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
  return pros.sort(compararOrdenPorDefecto).map((pro) => ({
    ...pro,
    // Aceptado pero sin salir en el sitio: la fila avisa en vez de esconderse.
    oculto: pro.userId !== null && (pro.user?.accountStatus !== "approved" || pro.user?.perfilOculto === true),
  }));
}

export type MovimientoPerfil = "fijar" | "soltar" | "subir" | "bajar" | "primero";

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
