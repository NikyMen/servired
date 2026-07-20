/**
 * Búsqueda inteligente de profesionales.
 *
 * El catálogo es chico (decenas de perfiles), así que se rankea en memoria en vez
 * de pelear con LIKE de SQLite, que no ignora acentos ni tolera errores de tipeo.
 * Si el catálogo creciera a miles de filas, esto pide un índice de texto de verdad
 * (FTS5 o Postgres) — el corte natural es reemplazar rankProfessionals().
 */

export type SearchablePro = {
  id: string;
  name: string;
  headline: string;
  bio: string | null;
  zone: string;
  rating: number;
  verified: boolean;
  featured: boolean;
  category: { slug: string; name: string };
  services: { title: string; description: string }[];
};

/**
 * minúsculas, sin acentos, sin puntuación: "Plomería" y "plomeria" son lo mismo.
 * NFD separa la tilde de la letra, así que la ñ también cae en n: por eso los
 * sinónimos de acá abajo se escriben "diseno" y no "diseño".
 */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "") // marcas de acento que NFD dejó sueltas
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Palabras que no aportan al match: conectores y muletillas de intención. */
const STOPWORDS = new Set([
  "de", "del", "la", "el", "los", "las", "un", "una", "unos", "unas", "y", "o",
  "en", "por", "para", "con", "sin", "que", "mi", "me", "te", "se", "su", "al",
  "a", "es", "hay", "muy", "mas", "necesito", "busco", "buscar", "quiero",
  "alguien", "algun", "alguna", "servicio", "servicios", "profesional",
  "profesionales", "cerca", "zona", "barrio", "urgente", "urgentemente",
  "porfa", "favor", "hola", "ayuda", "casa", "hogar",
]);

/**
 * Cómo habla la gente -> a qué rubro se refiere.
 * Nadie busca "plomeria": busca "se me rompió un caño" o "destapar el inodoro".
 */
const SYNONYMS: Record<string, string[]> = {
  plomeria: [
    "plomero", "plomera", "plomeria", "cano", "canos", "caneria", "canerias",
    "destapacion", "destapaciones", "destapar", "destape", "perdida", "perdidas",
    "filtracion", "filtraciones", "gotera", "goteras", "canilla", "grifo",
    "inodoro", "bacha", "pileta", "cloaca", "cloacas", "tuberia", "tuberias",
    "termotanque", "bomba", "tanque", "agua", "desague", "rejilla",
  ],
  electricidad: [
    "electricista", "electricidad", "electrico", "electrica", "luz", "luces",
    "enchufe", "enchufes", "tablero", "tableros", "cortocircuito", "disyuntor",
    "termica", "termicas", "cableado", "cable", "cables", "lampara", "lamparas",
    "luminaria", "luminarias", "plafon", "plafones", "led", "instalacion",
    "llave", "toma", "corriente", "medidor",
  ],
  gasista: [
    "gasista", "gas", "garrafa", "estufa", "estufas", "calefon", "calefones",
    "caldera", "cocina", "horno", "fuga", "escape", "matriculado", "certificado",
  ],
  limpieza: [
    "limpieza", "limpiar", "limpio", "mucama", "orden", "ordenar", "profunda",
    "post", "obra", "vidrios", "alfombras", "tapizados", "desinfeccion",
  ],
  jardineria: [
    "jardineria", "jardinero", "jardin", "jardines", "cesped", "pasto", "poda",
    "podar", "arbol", "arboles", "parque", "paisajismo", "riego", "plantas",
    "yuyos", "desmalezado",
  ],
  pintura: [
    "pintura", "pintor", "pintora", "pintar", "pared", "paredes", "latex",
    "frente", "frentes", "revoque", "cielorraso", "impermeabilizacion", "color",
  ],
  carpinteria: [
    "carpinteria", "carpintero", "madera", "mueble", "muebles", "placard",
    "placares", "puerta", "puertas", "estante", "estantes", "cajon", "cocina",
  ],
  abogado: [
    "abogado", "abogada", "abogados", "legal", "juridico", "juicio", "demanda",
    "despido", "divorcio", "sucesion", "contrato", "laboral", "civil", "familia",
  ],
  contador: [
    "contador", "contadora", "contable", "monotributo", "impuestos", "impuesto",
    "afip", "balance", "factura", "facturacion", "iva", "ganancias", "sueldos",
  ],
  diseno: [
    "diseno", "disenador", "disenadora", "grafico", "logo", "marca", "web",
    "identidad", "branding", "flyer", "redes",
  ],
};

/** token -> slug de rubro. Se arma una vez al cargar el módulo. */
const TERM_TO_SLUG = new Map<string, string>();
for (const [slug, terms] of Object.entries(SYNONYMS)) {
  for (const t of terms) TERM_TO_SLUG.set(t, slug);
}

/**
 * Distancia de edición Damerau-Levenshtein (variante OSA).
 *
 * Sobre Levenshtein pelado agrega la transposición de letras contiguas como UN
 * error y no dos, que es lo que hace falta acá: "plomeor" es un dedo cruzado
 * escribiendo "plomero", no dos errores distintos.
 */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // La transposición necesita mirar dos filas atrás.
  let prevPrev: number[] = [];
  let prev: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const curr = new Array<number>(b.length + 1);
    curr[0] = i;

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(
        curr[j - 1] + 1, // inserción
        prev[j] + 1, // borrado
        prev[j - 1] + cost // sustitución
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, prevPrev[j - 2] + 1); // transposición
      }
      curr[j] = best;
    }

    prevPrev = prev;
    prev = curr;
  }
  return prev[b.length];
}

/** Cuántos errores se le perdonan a una palabra según su largo. */
function allowedTypos(token: string): number {
  if (token.length <= 4) return 0; // "luz" con un error ya es otra palabra
  if (token.length <= 7) return 1;
  return 2;
}

export type ParsedQuery = {
  /** Términos con los que se rankea (sin stopwords). */
  tokens: string[];
  /** Rubros deducidos de lo que escribió el usuario. */
  slugs: string[];
  /** true si no quedó nada con qué buscar. */
  empty: boolean;
};

export function parseQuery(raw: string): ParsedQuery {
  const words = normalize(raw).split(" ").filter(Boolean);
  const tokens = words.filter((w) => w.length > 1 && !STOPWORDS.has(w));

  const slugs = new Set<string>();
  for (const t of tokens) {
    const direct = TERM_TO_SLUG.get(t);
    if (direct) {
      slugs.add(direct);
      continue;
    }
    // Con typo: "plomeor" -> "plomero". Solo vale la pena en palabras largas.
    if (t.length >= 5) {
      for (const [term, slug] of TERM_TO_SLUG) {
        if (Math.abs(term.length - t.length) <= 2 && editDistance(term, t) <= allowedTypos(t)) {
          slugs.add(slug);
          break;
        }
      }
    }
  }

  return { tokens, slugs: [...slugs], empty: tokens.length === 0 };
}

/** Qué tan bien matchea un token dentro de un campo: 0 = nada, 1 = palabra exacta. */
function matchQuality(token: string, field: string): number {
  if (!field) return 0;
  const haystack = normalize(field);
  if (!haystack) return 0;

  const words = haystack.split(" ");
  let best = 0;

  for (const w of words) {
    if (w === token) return 1;
    if (token.length >= 3 && w.startsWith(token)) best = Math.max(best, 0.9);
    else if (token.length >= 4 && w.includes(token)) best = Math.max(best, 0.7);
    else {
      const max = allowedTypos(token);
      if (max > 0 && Math.abs(w.length - token.length) <= max && editDistance(w, token) <= max) {
        best = Math.max(best, 0.6);
      }
    }
  }
  return best;
}

/** Peso de cada campo: el rubro y el titular dicen más que la bio. */
const FIELD_WEIGHTS = {
  category: 5,
  headline: 4,
  service: 3.5,
  name: 3,
  zone: 2,
  bio: 1.5,
  serviceDescription: 1,
} as const;

function scorePro(pro: SearchablePro, query: ParsedQuery): number {
  let total = 0;

  for (const token of query.tokens) {
    // Mejor match del token en todo el perfil, ponderado por campo.
    let best = 0;
    const consider = (quality: number, weight: number) => {
      if (quality > 0) best = Math.max(best, quality * weight);
    };

    consider(matchQuality(token, `${pro.category.name} ${pro.category.slug}`), FIELD_WEIGHTS.category);
    consider(matchQuality(token, pro.headline), FIELD_WEIGHTS.headline);
    consider(matchQuality(token, pro.name), FIELD_WEIGHTS.name);
    consider(matchQuality(token, pro.zone), FIELD_WEIGHTS.zone);
    consider(matchQuality(token, pro.bio ?? ""), FIELD_WEIGHTS.bio);
    for (const s of pro.services) {
      consider(matchQuality(token, s.title), FIELD_WEIGHTS.service);
      consider(matchQuality(token, s.description), FIELD_WEIGHTS.serviceDescription);
    }

    // El token no aparece por ningún lado. ¿Lo salva el rubro deducido?
    // "destapar" no está escrito en el perfil del plomero, pero implica plomería.
    if (best === 0 && TERM_TO_SLUG.get(token) === pro.category.slug) {
      best = FIELD_WEIGHTS.category * 0.8;
    }

    // AND: si un término no matchea nada, el perfil no es lo que se buscó.
    if (best === 0) return 0;
    total += best;
  }

  // Empates: primero el mejor calificado y verificado, no el que cargaron antes.
  total += pro.rating * 0.15;
  if (pro.verified) total += 0.3;
  if (pro.featured) total += 0.2;

  return total;
}

/** Ordena por relevancia y descarta lo que no matchea. Sin query, ordena por destacado/rating. */
export function rankProfessionals<T extends SearchablePro>(pros: T[], raw: string): T[] {
  const query = parseQuery(raw);

  if (query.empty) {
    return [...pros].sort(
      (a, b) => Number(b.featured) - Number(a.featured) || b.rating - a.rating
    );
  }

  const scored: { pro: T; score: number }[] = [];
  for (const pro of pros) {
    const score = scorePro(pro, query);
    if (score > 0) scored.push({ pro, score });
  }

  // Si nada matcheó con AND, se afloja a OR sobre el rubro deducido:
  // más vale mostrar plomeros que una pantalla vacía.
  if (scored.length === 0 && query.slugs.length > 0) {
    return pros
      .filter((p) => query.slugs.includes(p.category.slug))
      .sort((a, b) => Number(b.featured) - Number(a.featured) || b.rating - a.rating);
  }

  return scored.sort((a, b) => b.score - a.score).map((s) => s.pro);
}

export type Suggestion = {
  label: string;
  kind: "rubro" | "servicio" | "profesional";
  /** Adónde va el chip: query libre o filtro de categoría. */
  href: string;
};

/** Sugerencias del autocompletado, ordenadas por qué tan bien pegan. */
export function suggest(
  pros: SearchablePro[],
  categories: { slug: string; name: string; icon: string }[],
  raw: string,
  limit = 6
): Suggestion[] {
  const query = parseQuery(raw);
  if (query.empty) return [];

  const out: { s: Suggestion; score: number }[] = [];
  const seen = new Set<string>();

  const push = (s: Suggestion, score: number) => {
    const key = `${s.kind}:${s.label}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ s, score });
  };

  for (const c of categories) {
    let q = 0;
    for (const t of query.tokens) q = Math.max(q, matchQuality(t, `${c.name} ${c.slug}`));
    // El rubro deducido por sinónimo también se ofrece: "caño" sugiere Plomería.
    if (q === 0 && query.slugs.includes(c.slug)) q = 0.85;
    if (q > 0) push({ label: `${c.icon} ${c.name}`, kind: "rubro", href: `/?categoria=${c.slug}` }, q * 3);
  }

  for (const p of pros) {
    for (const s of p.services) {
      let q = 0;
      for (const t of query.tokens) q = Math.max(q, matchQuality(t, s.title));
      if (q > 0) push({ label: s.title, kind: "servicio", href: `/?q=${encodeURIComponent(s.title)}` }, q * 2);
    }
    let q = 0;
    for (const t of query.tokens) q = Math.max(q, matchQuality(t, p.name));
    if (q > 0) push({ label: p.name, kind: "profesional", href: `/profesionales/${p.id}` }, q * 1.5);
  }

  return out
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((o) => o.s);
}
