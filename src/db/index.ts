import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";

export type DB = NeonHttpDatabase<typeof schema>;

// Producción (Vercel): Neon Postgres vía DATABASE_URL.
// Desarrollo sin DATABASE_URL: Postgres embebido (PGlite) guardado en ./.data/pglite.
function createDb(): DB {
  const url = process.env.DATABASE_URL;
  if (url) return drizzleNeon(neon(url), { schema });
  const dir = process.env.PGLITE_DIR ?? "./.data/pglite";
  mkdirSync(dirname(dir), { recursive: true });
  const client = new PGlite(dir);
  return drizzlePglite(client, { schema }) as unknown as DB;
}

const globalForDb = globalThis as unknown as { __db?: DB };

// Se conecta en el primer uso (no al importar), para que el build no abra la base.
export const db = new Proxy({} as DB, {
  get(_, prop) {
    globalForDb.__db ??= createDb();
    return Reflect.get(globalForDb.__db, prop);
  },
});
