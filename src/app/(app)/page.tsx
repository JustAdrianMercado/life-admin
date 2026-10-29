import { ArrowRight, Plus, Settings as SettingsIcon } from "lucide-react";
import Link from "next/link";
import { saveEvent } from "@/actions/events";
import { saveExpense } from "@/actions/expenses";
import { markSubscriptionPaid } from "@/actions/subscriptions";
import { saveTask } from "@/actions/tasks";
import { EventItem } from "@/components/event-item";
import { FormDialog } from "@/components/form-dialog";
import { ExchangeCredit } from "@/components/exchange";
import { EventFields, ExpenseFields, SubscriptionPaymentFields, TaskFields } from "@/components/forms";
import { GoalCard } from "@/components/goal-card";
import { HabitCheck } from "@/components/habit-check";
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
  getAccountOptions,
  getAccountsWithBalances,
  getCategories,
  getChargesForMonth,
  getEventOccurrences,
  getExpensesForMonth,
  getGoalsWithProgress,
  getHabitChecksSince,
  getHabits,
  getOpenTasks,
  getSettings,
  getSubscriptions,
} from "@/lib/data";
import { getExchangeRates, suggestedRates } from "@/lib/exchange";
import { fmt, formatMoney, formatRate, isEstimatedLocal, localLabel, paidLocal, sumUSD, toLocal } from "@/lib/money";
import { countInWeek, habitStreak, HISTORY_DAYS } from "@/lib/habits";
import { isBank } from "@/lib/payment-methods";

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
  const weekEnd = addDays(today, 6);
  const [categories, subs, charges, openTasks, expenses, goals, exchange, agenda, accounts, wallet, habits, habitChecks] = await Promise.all([
    getCategories(),
    getSubscriptions(),
    getChargesForMonth(month),
    getOpenTasks(),
    getExpensesForMonth(month),
    getGoalsWithProgress(),
    getExchangeRates(),
    getEventOccurrences(today, weekEnd),
    getAccountOptions(),
    getAccountsWithBalances(),
    getHabits(),
    getHabitChecksSince(addDays(today, -HISTORY_DAYS)),
  ]);
  const habitRows = habits.map((h) => {
    const set = new Set(habitChecks.filter((c) => c.habitId === h.id).map((c) => c.date));
    return { habit: h, done: set.has(today), streak: habitStreak(set, h.targetPerWeek, today), week: countInWeek(set, today) };
  });
  const rates = suggestedRates(exchange, settings);

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
  const urgentDated = openTasks.filter((t) => t.dueDate && t.dueDate <= weekEnd);
  const topUndated = openTasks.filter((t) => !t.dueDate).sort(sortByPriority).slice(0, 3);

  // Gastos
  const spentUSD = sumUSD(expenses, settings);
  const spentLocal = expenses.reduce((acc, e) => acc + paidLocal(e, settings), 0);
  const budget = settings.monthlyBudgetUsd;

  // Tipo de cambio: la venta de los bancos con los que pagas (o el rango de todos).
  const usedBanks = new Set([...subs, ...expenses, ...accounts].map((x) => x.paymentMethod).filter(isBank));
  const bankRates = exchange.banks?.banks.filter((b) => b.sell) ?? [];
  const myBanks = bankRates.filter((b) => usedBanks.has(b.slug));
  const bankSells = bankRates.map((b) => b.sell!);

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
          {/* En el celular se agrega con el botón + de la barra de abajo. */}
          <div className="hidden gap-2 md:flex">
          <FormDialog title="Nuevo pendiente" trigger={<><Plus size={16} /> Pendiente</>} action={saveTask} triggerVariant="secondary">
            <TaskFields categories={categories} />
          </FormDialog>
          <FormDialog title="Nuevo gasto" trigger={<><Plus size={16} /> Gasto</>} action={saveExpense}>
            <ExpenseFields categories={categories} settings={settings} rates={rates} today={today} accounts={accounts} />
          </FormDialog>
          </div>
          <Link href="/ajustes" className={`${buttonClass("ghost")} md:hidden`} aria-label="Ajustes">
            <SettingsIcon size={18} />
          </Link>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {habitRows.length > 0 && (
          <Card className="lg:col-span-2">
            <CardTitle action={<SeeAll href="/habitos" />}>
              Hábitos de hoy · {habitRows.filter((r) => r.done).length}/{habitRows.length}
            </CardTitle>
            <ul className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-1">
              {habitRows.map(({ habit: h, done, streak }) => (
                <li key={h.id} className="flex w-20 shrink-0 flex-col items-center gap-1 text-center">
                  <HabitCheck habitId={h.id} date={today} done={done} color={h.color} label={h.name} />
                  <span className="w-full truncate text-xs font-medium">
                    {h.emoji} {h.name}
                  </span>
                  <span className="text-[11px] text-muted">{streak.count > 0 ? `🔥 ${streak.count}` : " "}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="lg:col-span-2">
          <CardTitle action={<SeeAll href="/cambio" />}>Dólar hoy · Bs por USD</CardTitle>
          {!exchange.configured ? (
            <Empty>
              Agrega <code>WAVESOFT_API_KEY</code> para ver el tipo de cambio del día.
            </Empty>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Oficial BCB" value={exchange.tc ? formatRate(exchange.tc.official.sell) : "—"} />
                <Stat
                  label="Paralelo"
                  value={exchange.tc ? formatRate(exchange.tc.parallel.sell) : "—"}
                  hint={exchange.tc && `compra ${formatRate(exchange.tc.parallel.buy)}`}
                />
                <Stat
                  label="Binance P2P"
                  value={exchange.p2p ? formatRate(exchange.p2p.buy.median) : "—"}
                  hint={exchange.p2p && `vender ${formatRate(exchange.p2p.sell.median)}`}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm">
                <p className="text-muted">
                  {myBanks.length > 0 ? (
                    <>
                      Venta en tus bancos:{" "}
                      {myBanks.map((b, i) => (
                        <span key={b.slug}>
                          {i > 0 && " · "}
                          {b.shortName} <span className="tabular font-semibold text-fg">{formatRate(b.sell!)}</span>
                        </span>
                      ))}
                    </>
                  ) : bankSells.length > 0 ? (
                    <>
                      Venta en bancos:{" "}
                      <span className="tabular font-semibold text-fg">
                        {formatRate(Math.min(...bankSells))} – {formatRate(Math.max(...bankSells))}
                      </span>
                    </>
                  ) : null}
                </p>
                <ExchangeCredit />
              </div>
            </>
          )}
        </Card>

        <Card>
          <CardTitle
            action={
              <div className="flex items-center gap-2">
                <FormDialog
                  title="Nuevo evento"
                  trigger={<Plus size={14} />}
                  triggerLabel="Nuevo evento"
                  triggerVariant="ghost"
                  triggerSize="sm"
                  action={saveEvent}
                >
                  <EventFields categories={categories} date={today} />
                </FormDialog>
                <SeeAll href="/calendario" />
              </div>
            }
          >
            Agenda · 7 días
          </CardTitle>
          {agenda.length === 0 ? (
            <Empty>Sin eventos esta semana.</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {agenda.slice(0, 5).map(({ event, date }) => (
                <EventItem key={`${event.id}-${date}`} event={event} date={date} categories={categories} today={today} showDate />
              ))}
            </ul>
          )}
        </Card>

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
              <FormDialog
                title={`Pagar ${s.name}`}
                trigger="Marcar pagado"
                triggerVariant="secondary"
                triggerSize="sm"
                submitLabel="Marcar pagado"
                action={markSubscriptionPaid.bind(null, s.id, month)}
              >
                <SubscriptionPaymentFields sub={s} settings={settings} rates={rates} accounts={accounts} />
              </FormDialog>
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
          {wallet.accounts.some((a) => !a.archived) && (
            <p className="mt-3 border-t border-border pt-3 text-sm text-muted">
              <Link href="/cuentas" className="hover:text-fg">
                En tus cuentas:{" "}
                <span className="tabular font-semibold text-fg">{formatMoney(wallet.total.local, settings.localCurrency)}</span>
                {" · "}
                {formatMoney(wallet.total.usd, "USD")}
              </Link>
            </p>
          )}
          {expenses.length > 0 && (
            <p className="mt-3 border-t border-border pt-3 text-sm text-muted">
              Pagado en {localLabel(settings.localCurrency)}:{" "}
              <span className="tabular font-semibold text-fg">
                {expenses.some(isEstimatedLocal) && "≈ "}
                {formatMoney(spentLocal, settings.localCurrency)}
              </span>
            </p>
          )}
        </Card>

        <Card className="lg:col-span-2">
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
