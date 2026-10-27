import { ArrowRight, Plus, Settings as SettingsIcon } from "lucide-react";
import Link from "next/link";
import { saveExpense } from "@/actions/expenses";
import { markSubscriptionPaid } from "@/actions/subscriptions";
import { saveTask } from "@/actions/tasks";
import { ActionButton } from "@/components/action-button";
import { FormDialog } from "@/components/form-dialog";
import { ExpenseFields, TaskFields } from "@/components/forms";
import { GoalCard } from "@/components/goal-card";
import { sortByPriority, TaskItem } from "@/components/task-item";
import { buttonClass, Card, CardTitle, Empty, ProgressBar, Stat } from "@/components/ui";
import {
  addDays,
  chargeDateIn,
  formatDate,
  monthKey,
  nextChargeDate,
  relativeDay,
  shiftMonth,
  todayISO,
} from "@/lib/dates";
import {
  getCategories,
  getChargesForMonth,
  getExpensesForMonth,
  getGoalsWithProgress,
  getOpenTasks,
  getSettings,
  getSubscriptions,
} from "@/lib/data";
import { fmt, formatMoney, sumUSD, toLocal } from "@/lib/money";

function SeeAll({ href }: { href: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-accent">
      Ver todo <ArrowRight size={12} />
    </Link>
  );
}

export default async function DashboardPage() {
  const settings = await getSettings();
  const today = todayISO(settings.timezone);
  const month = monthKey(today);
  const [categories, subs, charges, openTasks, expenses, goals] = await Promise.all([
    getCategories(),
    getSubscriptions(),
    getChargesForMonth(month),
    getOpenTasks(),
    getExpensesForMonth(month),
    getGoalsWithProgress(),
  ]);

  // Cobros
  const paidIds = new Set(charges.map((c) => c.subscriptionId));
  const activeSubs = subs.filter((s) => s.active);
  const monthlyUSD = sumUSD(activeSubs, settings);
  const unpaidDue = activeSubs.filter((s) => !paidIds.has(s.id) && chargeDateIn(month, s.billingDay) <= today);
  const upcoming = activeSubs
    .filter((s) => !unpaidDue.includes(s))
    .map((s) => ({
      sub: s,
      // Si ya se pagó este mes, el próximo cobro es el del mes siguiente.
      next: paidIds.has(s.id)
        ? chargeDateIn(shiftMonth(month, 1), s.billingDay)
        : nextChargeDate(s.billingDay, today),
    }))
    .sort((a, b) => a.next.localeCompare(b.next))
    .slice(0, 4);

  // Pendientes
  const weekEnd = addDays(today, 6);
  const urgentDated = openTasks.filter((t) => t.dueDate && t.dueDate <= weekEnd);
  const topUndated = openTasks.filter((t) => !t.dueDate).sort(sortByPriority).slice(0, 3);

  // Gastos
  const spentUSD = sumUSD(expenses, settings);
  const budget = settings.monthlyBudgetUsd;

  const greeting = new Intl.DateTimeFormat("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: settings.timezone,
  }).format(new Date());

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{greeting.charAt(0).toUpperCase() + greeting.slice(1)}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Hola 👋</h1>
        </div>
        <div className="flex gap-2">
          <FormDialog title="Nuevo pendiente" trigger={<><Plus size={16} /> Pendiente</>} action={saveTask} triggerVariant="secondary">
            <TaskFields categories={categories} />
          </FormDialog>
          <FormDialog title="Nuevo gasto" trigger={<><Plus size={16} /> Gasto</>} action={saveExpense}>
            <ExpenseFields categories={categories} settings={settings} today={today} />
          </FormDialog>
          <Link href="/ajustes" className={`${buttonClass("ghost")} md:hidden`} aria-label="Ajustes">
            <SettingsIcon size={18} />
          </Link>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle action={<SeeAll href="/pendientes" />}>Pendientes</CardTitle>
          {urgentDated.length === 0 && topUndated.length === 0 ? (
            <Empty>Todo al día. 🎉</Empty>
          ) : (
            <>
              {urgentDated.length > 0 && (
                <>
                  <h3 className="text-xs font-semibold text-muted">Próximos 7 días</h3>
                  <ul className="mb-2 divide-y divide-border">
                    {urgentDated.map((t) => (
                      <TaskItem key={t.id} task={t} categories={categories} today={today} compact />
                    ))}
                  </ul>
                </>
              )}
              {topUndated.length > 0 && (
                <>
                  <h3 className="text-xs font-semibold text-muted">Sin fecha · prioridad</h3>
                  <ul className="divide-y divide-border">
                    {topUndated.map((t) => (
                      <TaskItem key={t.id} task={t} categories={categories} today={today} compact />
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </Card>

        <Card>
          <CardTitle action={<SeeAll href="/suscripciones" />}>Próximos cobros</CardTitle>
          {unpaidDue.map((s) => (
            <div key={s.id} className="mb-2 flex items-center gap-3 rounded-xl bg-warning-soft px-3 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.name} · {fmt(s, settings)}</p>
                <p className="text-xs text-muted">
                  Cobró {relativeDay(chargeDateIn(month, s.billingDay), today)} · ¿ya lo pagaste?
                </p>
              </div>
              <ActionButton action={markSubscriptionPaid.bind(null, s.id, month)} variant="secondary">
                Marcar pagado
              </ActionButton>
            </div>
          ))}
          {upcoming.length === 0 && unpaidDue.length === 0 ? (
            <Empty>Sin suscripciones activas.</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map(({ sub, next }) => (
                <li key={sub.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{sub.name}</p>
                    <p className="text-xs text-muted">
                      {formatDate(next)} · {relativeDay(next, today)}
                    </p>
                  </div>
                  <span className="tabular font-semibold">{fmt(sub, settings)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 border-t border-border pt-3 text-sm text-muted">
            Necesitas <span className="tabular font-semibold text-fg">{formatMoney(monthlyUSD, "USD")}</span> al mes
            {settings.localCurrency !== "USD" &&
              ` (≈ ${formatMoney(toLocal({ amount: monthlyUSD, currency: "USD" }, settings), settings.localCurrency)})`}
          </p>
        </Card>

        <Card>
          <CardTitle action={<SeeAll href="/gastos" />}>Gastos del mes</CardTitle>
          <Stat
            label={`${expenses.length} ${expenses.length === 1 ? "movimiento" : "movimientos"}`}
            value={formatMoney(spentUSD, "USD")}
            tone={budget && spentUSD > budget ? "danger" : undefined}
            hint={
              budget
                ? spentUSD <= budget
                  ? `Te quedan ${formatMoney(budget - spentUSD, "USD")} de ${formatMoney(budget, "USD")}`
                  : `Te pasaste ${formatMoney(spentUSD - budget, "USD")}`
                : undefined
            }
          />
          {budget && (
            <ProgressBar
              className="mt-3"
              value={(spentUSD / budget) * 100}
              color={spentUSD > budget ? "var(--danger)" : undefined}
            />
          )}
        </Card>

        <Card>
          <CardTitle action={<SeeAll href="/metas" />}>Scoreboard</CardTitle>
          {goals.length === 0 ? (
            <Empty>Sin metas de ahorro todavía.</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {goals
                .sort((a, b) => b.percent - a.percent)
                .map((g) => (
                  <GoalCard key={g.id} goal={g} settings={settings} today={today} compact />
                ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
