import {
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  time,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const currencyEnum = pgEnum("currency", ["USD", "LOCAL"]);
export const priorityEnum = pgEnum("priority", ["baja", "media", "alta", "urgente"]);
export const taskStatusEnum = pgEnum("task_status", ["pendiente", "en_progreso", "hecha"]);

// Fila única (id = 1) con la configuración de la app.
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  localCurrency: text("local_currency").notNull().default("BOB"),
  usdToLocalRate: numeric("usd_to_local_rate", { precision: 12, scale: 4, mode: "number" })
    .notNull()
    .default(6.96),
  monthlyBudgetUsd: numeric("monthly_budget_usd", { precision: 12, scale: 2, mode: "number" }),
  timezone: text("timezone").notNull().default("America/La_Paz"),
  // Con cuántos días de anticipación avisar de un cobro (además del aviso del mismo día).
  notifyDaysBefore: integer("notify_days_before").notNull().default(1),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#6366f1"),
  emoji: text("emoji").notNull().default("📁"),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
  currency: currencyEnum("currency").notNull().default("USD"),
  // Día del mes en que cobran (1–31). Si el mes es más corto, se cobra el último día.
  billingDay: integer("billing_day").notNull(),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  // Medio con el que se suele pagar (slug de banco, "binance-p2p", "efectivo"…).
  paymentMethod: text("payment_method"),
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
  currency: currencyEnum("currency").notNull().default("USD"),
  paymentMethod: text("payment_method"),
  // Lo que realmente se cobró en moneda local (ej. Bs que descontó el banco por un gasto en USD).
  amountLocal: numeric("amount_local", { precision: 12, scale: 2, mode: "number" }),
  date: date("date", { mode: "string" }).notNull(),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  subscriptionId: integer("subscription_id").references(() => subscriptions.id, {
    onDelete: "set null",
  }),
  // Cuenta de la que salió el dinero (opcional): descuenta de su saldo.
  accountId: integer("account_id").references(() => accounts.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const subscriptionCharges = pgTable(
  "subscription_charges",
  {
    id: serial("id").primaryKey(),
    subscriptionId: integer("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    // Mes del cobro en formato YYYY-MM.
    periodMonth: text("period_month").notNull(),
    expenseId: integer("expense_id").references(() => expenses.id, { onDelete: "set null" }),
    paidAt: timestamp("paid_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.subscriptionId, t.periodMonth)],
);

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  notes: text("notes"),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  priority: priorityEnum("priority").notNull().default("media"),
  dueDate: date("due_date", { mode: "string" }),
  dueTime: time("due_time"),
  status: taskStatusEnum("status").notNull().default("pendiente"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const savingsGoals = pgTable("savings_goals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("🎯"),
  targetAmount: numeric("target_amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
  currency: currencyEnum("currency").notNull().default("USD"),
  deadline: date("deadline", { mode: "string" }),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const goalContributions = pgTable("goal_contributions", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id")
    .notNull()
    .references(() => savingsGoals.id, { onDelete: "cascade" }),
  // Puede ser negativo para registrar un retiro.
  amount: numeric("amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
  date: date("date", { mode: "string" }).notNull(),
  note: text("note"),
});

export const EVENT_REPEATS = ["none", "weekly", "monthly", "yearly"] as const;
export type EventRepeat = (typeof EVENT_REPEATS)[number];

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  // Primera fecha; si se repite, las demás se calculan a partir de esta.
  date: date("date", { mode: "string" }).notNull(),
  // Sin hora de inicio = todo el día.
  startTime: time("start_time"),
  endTime: time("end_time"),
  // Lugar o link de la reunión.
  location: text("location"),
  repeat: text("repeat").$type<EventRepeat>().notNull().default("none"),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Navegadores/dispositivos suscritos a las notificaciones push.
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Cuentas con saldo: bancos, Binance, efectivo… (Binance/USDT se lleva en USD).
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("🏦"),
  currency: currencyEnum("currency").notNull().default("LOCAL"),
  // Medio de pago asociado (slug de banco, "binance-p2p", "efectivo"…): da la tasa sugerida al pagar en USD.
  paymentMethod: text("payment_method"),
  initialBalance: numeric("initial_balance", { precision: 14, scale: 2, mode: "number" }).notNull().default(0),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const MOVEMENT_KINDS = ["ingreso", "transferencia", "ajuste"] as const;
export type MovementKind = (typeof MOVEMENT_KINDS)[number];

export const accountMovements = pgTable("account_movements", {
  id: serial("id").primaryKey(),
  kind: text("kind").$type<MovementKind>().notNull(),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  // Solo transferencias: cuenta destino y lo que llegó (puede ser otra moneda, ej. Bs → USDT).
  toAccountId: integer("to_account_id").references(() => accounts.id, { onDelete: "cascade" }),
  // Ingreso: positivo. Ajuste: puede ser negativo. Transferencia: lo que salió.
  amount: numeric("amount", { precision: 14, scale: 2, mode: "number" }).notNull(),
  toAmount: numeric("to_amount", { precision: 14, scale: 2, mode: "number" }),
  date: date("date", { mode: "string" }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Presupuesto mensual por categoría (en USD).
export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id")
    .notNull()
    .unique()
    .references(() => categories.id, { onDelete: "cascade" }),
  amountUsd: numeric("amount_usd", { precision: 12, scale: 2, mode: "number" }).notNull(),
});

// Avisos de presupuesto ya enviados (80 % / 100 %), para no repetirlos en el mes.
export const budgetAlerts = pgTable(
  "budget_alerts",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    month: text("month").notNull(),
    threshold: integer("threshold").notNull(),
  },
  (t) => [unique().on(t.categoryId, t.month, t.threshold)],
);

export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("✅"),
  color: text("color").notNull().default("#4f46e5"),
  // Veces por semana (7 = todos los días).
  targetPerWeek: integer("target_per_week").notNull().default(7),
  archived: boolean("archived").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const habitChecks = pgTable(
  "habit_checks",
  {
    id: serial("id").primaryKey(),
    habitId: integer("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
  },
  (t) => [unique().on(t.habitId, t.date)],
);

export type Category = typeof categories.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type AccountMovement = typeof accountMovements.$inferSelect;
export type Habit = typeof habits.$inferSelect;
export type CalendarEvent = typeof events.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type SavingsGoal = typeof savingsGoals.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type Currency = (typeof currencyEnum.enumValues)[number];
export type Priority = (typeof priorityEnum.enumValues)[number];
