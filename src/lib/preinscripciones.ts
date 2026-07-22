import { prisma } from "@/lib/prisma";
import { MongoClient, type Collection } from "mongodb";

export const PREINSCRIPTION_TYPES = ["cliente", "profesional"] as const;
export type PreinscriptionType = (typeof PREINSCRIPTION_TYPES)[number];

export type PreinscriptionInput = {
  name: string;
  email: string;
  phone: string;
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
    globalForMongo.mongoClientPromise = new MongoClient(mongoUri).connect();
  }
  const db = (await globalForMongo.mongoClientPromise).db(mongoDbName);
  const collection = db.collection<MongoPreinscription>("preinscripciones");
  await collection.createIndex({ email: 1 }, { unique: true });
  return collection;
}

export function hasMongoStorage() {
  return Boolean(mongoUri);
}

export function normalizePhone(raw: string) {
  const plus = raw.trim().startsWith("+") ? "+" : "";
  return plus + raw.replace(/\D/g, "");
}

export function parsePreinscription(input: unknown):
  | { data: PreinscriptionInput }
  | { error: string } {
  const body = (input ?? {}) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? normalizePhone(body.phone) : "";
  const type: PreinscriptionType = body.type === "profesional" ? "profesional" : "cliente";
  const errors: string[] = [];

  if (name.length < 2) errors.push("Ingresá tu nombre.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.push("Ingresá un correo válido.");
  if (phone.replace(/\D/g, "").length < 8) {
    errors.push("Ingresá un teléfono válido (mínimo 8 dígitos).");
  }

  return errors.length ? { error: errors.join(" ") } : { data: { name, email, phone, type } };
}

export function isDuplicatePreinscriptionError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error
    ? (error as { code?: unknown }).code
    : undefined;
  return code === "P2002" || code === 11000;
}

export async function createPreinscription(data: PreinscriptionInput): Promise<Preinscription> {
  if (hasMongoStorage()) {
    const createdAt = new Date();
    const result = await (await getMongoCollection()).insertOne({ ...data, createdAt });
    return { ...data, id: result.insertedId.toString(), createdAt };
  }

  const created = await prisma.preregistration.create({ data });
  return { ...created, type: created.type === "profesional" ? "profesional" : "cliente" };
}

export async function listPreinscriptions(): Promise<Preinscription[]> {
  if (hasMongoStorage()) {
    const rows = await (await getMongoCollection()).find().sort({ createdAt: -1 }).toArray();
    return rows.map(({ _id, name, email, phone, type, createdAt }) => ({
      id: _id.toString(), name, email, phone, type, createdAt,
    }));
  }

  const rows = await prisma.preregistration.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map((row) => ({
    id: row.id, name: row.name, email: row.email, phone: row.phone,
    type: row.type === "profesional" ? "profesional" : "cliente", createdAt: row.createdAt,
  }));
}
