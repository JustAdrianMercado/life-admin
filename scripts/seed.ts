import { config } from "dotenv";

config({ path: ".env.local" });

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function nextWeekday(weekday: number) {
  const d = new Date();
  const diff = (weekday - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return isoDate(d);
}

async function main() {
  const { db } = await import("../src/db");
  const s = await import("../src/db/schema");

  const existing = await db.select().from(s.categories).limit(1);
  if (existing.length > 0) {
    console.log("La base ya tiene datos; no se siembra nada.");
    return;
  }

  await db.insert(s.settings).values({ id: 1 }).onConflictDoNothing();

  const cats = await db
    .insert(s.categories)
    .values([
      { name: "Uni", emoji: "🎓", color: "#6366f1" },
      { name: "Webby", emoji: "🎬", color: "#ec4899" },
      { name: "Personal", emoji: "🙂", color: "#10b981" },
      { name: "Suscripciones", emoji: "🔁", color: "#f59e0b" },
      { name: "Comida", emoji: "🍔", color: "#ef4444" },
      { name: "Transporte", emoji: "🚌", color: "#0ea5e9" },
    ])
    .returning();
  const cat = Object.fromEntries(cats.map((c) => [c.name, c.id]));

  await db.insert(s.subscriptions).values([
    { name: "Claude", amount: 20, billingDay: 13, categoryId: cat.Suscripciones },
    { name: "Otras suscripciones", amount: 30, billingDay: 1, categoryId: cat.Suscripciones },
  ]);

  await db.insert(s.tasks).values([
    {
      title: "Informe de Metodología de la Investigación",
      categoryId: cat.Uni,
      priority: "alta",
      dueDate: nextWeekday(4),
    },
    { title: "Grabar video de Webby", categoryId: cat.Webby, priority: "media" },
  ]);

  await db.insert(s.savingsGoals).values({ name: "AirPods", emoji: "🎧", targetAmount: 130 });

  console.log("✓ Datos de ejemplo creados");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).$client?.close?.();
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
