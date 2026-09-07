import { MongoClient, type Collection } from "mongodb";
import { prisma } from "@/lib/prisma";

export const PREINSCRIPTION_TYPES = ["cliente", "profesional"] as const;
export type PreinscriptionType = (typeof PREINSCRIPTION_TYPES)[number];

export type PreinscriptionInput = {
  name: string;
  email: string;
  phone: string;
  occupation: string | null;
  type: PreinscriptionType;
};

export type Preinscription = PreinscriptionInput & { id: string; createdAt: Date };
type MongoPreinscription = PreinscriptionInput & { createdAt: Date };

const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB || "servired";
const globalForMongo = globalThis as unknown as { mongoClientPromise?: Promise<MongoClient> };

async function getMongoCollection(): Promise<Collection<MongoPreinscription>> {
  if (!mongoUri) throw new Error("MONGODB_URI no está configurado.");
  if (!globalForMongo.mongoClientPromise) {
    const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 });
    globalForMongo.mongoClientPromise = client.connect().catch((error) => {
      // Si la conexión falla (Mongo caído), no dejar cacheada una promesa rechazada:
      // así el próximo request reintenta en vez de quedar en 500 hasta reiniciar el proceso.
      globalForMongo.mongoClientPromise = undefined;
      throw error;
    });
  }
  return (await globalForMongo.mongoClientPromise).db(mongoDbName).collection("preinscripciones");
}

export function hasMongoStorage() { return Boolean(mongoUri); }

export function normalizePhone(raw: string) {
  const plus = raw.trim().startsWith("+") ? "+" : "";
  return plus + raw.replace(/\D/g, "");
}

export function parsePreinscription(input: unknown) {
  const body = (input ?? {}) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? normalizePhone(body.phone) : "";
  const occupation = typeof body.occupation === "string" ? body.occupation.trim() || null : null;
  const type: PreinscriptionType = body.type === "profesional" ? "profesional" : "cliente";
  const errors: string[] = [];
  if (name.length < 2) errors.push("Ingresá tu nombre.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.push("Ingresá un correo válido.");
  if (phone.replace(/\D/g, "").length < 8) errors.push("Ingresá un teléfono válido (mínimo 8 dígitos).");
  return errors.length ? { error: errors.join(" ") } : { data: { name, email, phone, occupation, type } };
}

export function isDuplicatePreinscriptionError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? (error as { code?: unknown }).code : undefined;
  return code === "P2002" || code === 11000;
}

export async function createPreinscription(data: PreinscriptionInput): Promise<Preinscription> {
  if (hasMongoStorage()) {
    try {
      const createdAt = new Date();
      const result = await (await getMongoCollection()).insertOne({ ...data, createdAt });
      return { ...data, id: result.insertedId.toString(), createdAt };
    } catch (error) {
      // Un email repetido sí debe cortar; cualquier otra falla (Mongo caído) cae a SQLite
      // para no perder el lead. listPreinscriptions() ya mergea ambas fuentes.
      if (isDuplicatePreinscriptionError(error)) throw error;
      console.error("createPreinscription: Mongo no disponible, guardo en SQLite", error);
    }
  }
  const created = await prisma.preregistration.create({ data });
  return { ...created, type: created.type === "profesional" ? "profesional" : "cliente" };
}

export async function listPreinscriptions(): Promise<Preinscription[]> {
  let mongoRows: Preinscription[] = [];
  if (hasMongoStorage()) {
    try {
      mongoRows = (await (await getMongoCollection()).find().sort({ createdAt: -1 }).toArray()).map(({ _id, name, email, phone, occupation, type, createdAt }) => ({ id: _id.toString(), name, email, phone, occupation: occupation ?? null, type: type === "profesional" ? "profesional" as const : "cliente" as const, createdAt }));
    } catch (error) {
      // Mongo caído no debe voltear todo el panel admin: seguimos con lo que haya en SQLite.
      console.error("listPreinscriptions: Mongo no disponible, sigo solo con SQLite", error);
    }
  }
  const sqliteRows = await prisma.preregistration.findMany({ orderBy: { createdAt: "desc" } });
  const allRows: Preinscription[] = [...mongoRows, ...sqliteRows.map((row) => ({ id: row.id, name: row.name, email: row.email, phone: row.phone, occupation: row.occupation, type: row.type === "profesional" ? "profesional" as const : "cliente" as const, createdAt: row.createdAt }))].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const unique = new Map<string, Preinscription>();
  for (const row of allRows) {
    const key = row.email.trim().toLowerCase();
    if (!unique.has(key)) unique.set(key, row);
  }
  return [...unique.values()];
}
