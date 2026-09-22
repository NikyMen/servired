import { PrismaClient } from "@prisma/client";
import { CATEGORY_GROUPS, CATEGORY_GROUP_SLUGS, CATEGORY_KIND, groupSlugForCategory } from "../src/lib/categorias";

const prisma = new PrismaClient();

async function main() {
  const groupIds = new Map<string, string>();

  for (const group of CATEGORY_GROUPS) {
    const category = await prisma.category.upsert({
      where: { slug: group.slug },
      create: { slug: group.slug, name: group.name, icon: group.icon, kind: CATEGORY_KIND },
      update: { name: group.name, icon: group.icon, kind: CATEGORY_KIND, parentId: null, approvalStatus: "approved" },
    });
    groupIds.set(group.slug, category.id);
  }

  const rubros = await prisma.category.findMany({ select: { id: true, slug: true } });
  for (const rubro of rubros) {
    if (CATEGORY_GROUP_SLUGS.has(rubro.slug)) continue;
    const parentId = groupIds.get(groupSlugForCategory(rubro.slug));
    if (parentId) await prisma.category.update({ where: { id: rubro.id }, data: { parentId } });
  }

  console.log(`Catálogo organizado: ${groupIds.size} categorías principales y ${rubros.length - groupIds.size} subcategorías.`);
}

main().finally(() => prisma.$disconnect());
