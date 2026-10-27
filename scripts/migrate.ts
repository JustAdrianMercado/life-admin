import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { db } = await import("../src/db");
  if (process.env.DATABASE_URL) {
    const { migrate } = await import("drizzle-orm/neon-http/migrator");
    await migrate(db, { migrationsFolder: "./drizzle" });
  } else {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate(db as any, { migrationsFolder: "./drizzle" });
  }
  console.log("✓ Migraciones aplicadas");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).$client?.close?.();
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
