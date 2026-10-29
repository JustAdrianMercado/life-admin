import { ChevronLeft, ChevronRight, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { deleteExpense, saveExpense } from "@/actions/expenses";
import { ActionButton } from "@/components/action-button";
import { FormDialog } from "@/components/form-dialog";
import { ExpenseFields } from "@/components/forms";
import { buttonClass, Card, CardTitle, Empty, PageHeader, ProgressBar, Stat } from "@/components/ui";
import { formatDate, formatMonth, monthKey, shiftMonth, todayISO } from "@/lib/dates";
import { accountValue } from "@/lib/accounts";
import { budgetColor } from "@/lib/budget-status";
import { getAccountOptions, getBudgets, getCategories, getExpensesForMonth, getSettings } from "@/lib/data";
import { getExchangeRates, suggestedRates } from "@/lib/exchange";
import { fmt, formatMoney, formatRate, isEstimatedLocal, localLabel, paidLocal, sumUSD, toUSD } from "@/lib/money";
import { paymentLabel } from "@/lib/payment-methods";

export const metadata: Metadata = { title: "Gastos" };

export default async function ExpensesPage({ searchParams }: PageProps<"/gastos">) {
  const settings = await getSettings();
  const today = todayISO(settings.timezone);
  const { mes } = await searchParams;
  const month = typeof mes === "string" && /^\d{4}-\d{2}$/.test(mes) ? mes : monthKey(today);

  const [expenses, categories, exchange, accounts, budgets] = await Promise.all([
    getExpensesForMonth(month),
    getCategories(),
    getExchangeRates(),
    getAccountOptions(),
    getBudgets(),
  ]);
  const limitBy = new Map(budgets.map((b) => [b.categoryId, b.amountUsd]));
  // Medio con el que se pagó: la cuenta si se eligió una, si no el banco/medio.
  const methodOf = (e: (typeof expenses)[number]) => (e.accountId ? accountValue(e.accountId) : e.paymentMethod);
  const rates = suggestedRates(exchange, settings);
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const totalUSD = sumUSD(expenses, settings);
  const budget = settings.monthlyBudgetUsd;

  const byCategory = new Map<number | null, number>();
  for (const e of expenses) byCategory.set(e.categoryId, (byCategory.get(e.categoryId) ?? 0) + toUSD(e, settings));
  const breakdown = [...byCategory.entries()].sort(([, a], [, b]) => b - a);

  // Lo que salió en moneda local: lo que cobró el banco en los gastos en USD que lo registran.
  const local = localLabel(settings.localCurrency);
  const totalLocal = expenses.reduce((acc, e) => acc + paidLocal(e, settings), 0);
  const estimatedCount = expenses.filter(isEstimatedLocal).length;
  const chargedUSD = expenses.filter((e) => e.currency === "USD" && e.amountLocal != null);
  const chargedAmount = chargedUSD.reduce((acc, e) => acc + e.amount, 0);
  const avgRate = chargedAmount > 0 ? chargedUSD.reduce((acc, e) => acc + e.amountLocal!, 0) / chargedAmount : null;

  const byMethod = new Map<string | null, number>();
  for (const e of expenses) byMethod.set(methodOf(e), (byMethod.get(methodOf(e)) ?? 0) + paidLocal(e, settings));
  const methods = [...byMethod.entries()].sort(([, a], [, b]) => b - a);

  const isCurrent = month === monthKey(today);

  return (
    <>
      <PageHeader
        title="Gastos"
        subtitle={
          <span className="inline-flex items-center gap-1">
            <Link href={`/gastos?mes=${shiftMonth(month, -1)}`} className={buttonClass("ghost", "sm")} aria-label="Mes anterior">
              <ChevronLeft size={16} />
            </Link>
            <span className="min-w-32 text-center font-medium text-fg">{formatMonth(month)}</span>
            <Link href={`/gastos?mes=${shiftMonth(month, 1)}`} className={buttonClass("ghost", "sm")} aria-label="Mes siguiente">
              <ChevronRight size={16} />
            </Link>
            {!isCurrent && (
              <Link href="/gastos" className="text-xs text-accent">
                Hoy
              </Link>
            )}
          </span>
        }
        actions={
          <FormDialog title="Nuevo gasto" trigger={<><Plus size={16} /> Gasto</>} action={saveExpense}>
            <ExpenseFields
              categories={categories}
              settings={settings}
              rates={rates}
              today={isCurrent ? today : `${month}-01`}
              accounts={accounts}
            />
          </FormDialog>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardTitle>Gastado en el mes</CardTitle>
            <div className="grid grid-cols-2 gap-4">
              <Stat
                label="Total en USD"
                value={formatMoney(totalUSD, "USD")}
                tone={budget && totalUSD > budget ? "danger" : undefined}
                hint={`${expenses.length} gastos`}
              />
              <Stat
                label={`Pagado en ${local}`}
                value={formatMoney(totalLocal, settings.localCurrency)}
                hint={[
                  avgRate && `TC promedio ${formatRate(avgRate)}`,
                  estimatedCount > 0 && `${estimatedCount} estimado${estimatedCount === 1 ? "" : "s"}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
            </div>
            {budget ? (
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs text-muted">
                  <span>Presupuesto {formatMoney(budget, "USD")}</span>
                  <span>
                    {totalUSD <= budget
                      ? `Quedan ${formatMoney(budget - totalUSD, "USD")}`
                      : `Te pasaste ${formatMoney(totalUSD - budget, "USD")}`}
                  </span>
                </div>
                <ProgressBar value={(totalUSD / budget) * 100} color={totalUSD > budget ? "var(--danger)" : undefined} />
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted">
                Puedes definir un presupuesto mensual en{" "}
                <Link href="/ajustes" className="text-accent">
                  Ajustes
                </Link>
                .
              </p>
            )}
            {estimatedCount > 0 && (
              <p className="mt-3 text-xs text-muted">
                Los gastos en USD sin “Cobrado en {local}” se estiman con {formatRate(settings.usdToLocalRate)}. Edítalos
                para poner lo que te cobró el banco.
              </p>
            )}
          </Card>

          {methods.some(([method]) => method) && (
            <Card>
              <CardTitle>Por medio de pago</CardTitle>
              <ul className="divide-y divide-border">
                {methods.map(([method, amount]) => (
                  <li key={method ?? "none"} className="flex justify-between py-2 text-sm">
                    <span>{paymentLabel(method, accounts) ?? "Sin especificar"}</span>
                    <span className="tabular font-medium">
                      {formatMoney(amount, settings.localCurrency)}{" "}
                      <span className="text-xs text-muted">{Math.round((amount / totalLocal) * 100)}%</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <Card>
          <CardTitle
            action={
              <Link href="/presupuestos" className="text-xs font-medium text-accent">
                Presupuestos
              </Link>
            }
          >
            Por categoría
          </CardTitle>
          {breakdown.length === 0 ? (
            <Empty>Sin gastos este mes.</Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {breakdown.map(([catId, amount]) => {
                const c = catId ? categoryById.get(catId) : undefined;
                const limit = catId ? limitBy.get(catId) : undefined;
                return (
                  <li key={catId ?? "none"}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>
                        {c ? `${c.emoji} ${c.name}` : "Sin categoría"}
                      </span>
                      <span className="tabular font-medium">
                        {formatMoney(amount, "USD")}{" "}
                        <span className="text-xs text-muted">
                          {limit ? `de ${formatMoney(limit, "USD")}` : `${Math.round((amount / totalUSD) * 100)}%`}
                        </span>
                      </span>
                    </div>
                    <ProgressBar
                      value={limit ? (amount / limit) * 100 : (amount / totalUSD) * 100}
                      color={limit ? budgetColor(amount, limit) : (c?.color ?? "var(--muted)")}
                      className="h-1.5"
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardTitle>Movimientos</CardTitle>
        {expenses.length === 0 ? (
          <Empty>Registra un gasto con el botón “Gasto”.</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {expenses.map((e) => {
              const c = e.categoryId ? categoryById.get(e.categoryId) : undefined;
              return (
                <li key={e.id} className="flex items-center gap-3 py-2.5">
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-xl text-base"
                    style={{ backgroundColor: `${c?.color ?? "#888888"}22` }}
                    aria-hidden
                  >
                    {c?.emoji ?? "💸"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                      {e.description}
                      {e.subscriptionId && <Repeat size={12} className="text-muted" aria-label="Suscripción" />}
                    </p>
                    <p className="text-xs text-muted">
                      {formatDate(e.date)}
                      {c && ` · ${c.name}`}
                      {methodOf(e) && ` · ${paymentLabel(methodOf(e), accounts)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular text-sm font-semibold">{fmt(e, settings)}</p>
                    {e.currency === "USD" && (
                      <p className="tabular text-xs text-muted">
                        {isEstimatedLocal(e) && "≈ "}
                        {formatMoney(paidLocal(e, settings), settings.localCurrency)}
                      </p>
                    )}
                  </div>
                  <div className="flex">
                    <FormDialog
                      title="Editar gasto"
                      trigger={<Pencil size={14} />}
                      triggerLabel="Editar"
                      triggerVariant="ghost"
                      triggerSize="sm"
                      action={saveExpense}
                    >
                      <ExpenseFields expense={e} categories={categories} settings={settings} rates={rates} today={today} accounts={accounts} />
                    </FormDialog>
                    <ActionButton
                      action={deleteExpense.bind(null, e.id)}
                      confirm={`¿Eliminar "${e.description}"?`}
                      variant="danger"
                      label="Eliminar"
                    >
                      <Trash2 size={14} />
                    </ActionButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
