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
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
  currency: currencyEnum("currency").notNull().default("USD"),
  date: date("date", { mode: "string" }).notNull(),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  subscriptionId: integer("subscription_id").references(() => subscriptions.id, {
    onDelete: "set null",
  }),
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

export type Category = typeof categories.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type SavingsGoal = typeof savingsGoals.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type Currency = (typeof currencyEnum.enumValues)[number];
export type Priority = (typeof priorityEnum.enumValues)[number];
