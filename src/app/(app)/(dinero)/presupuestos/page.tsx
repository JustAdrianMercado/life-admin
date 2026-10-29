import { Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { saveBudget } from "@/actions/budgets";
import { FormDialog } from "@/components/form-dialog";
import { Card, CardTitle, Empty, Field, Input, PageHeader, ProgressBar } from "@/components/ui";
import type { Category, Settings } from "@/db/schema";
import { budgetColor } from "@/lib/budget-status";
import { daysBetween, formatMonth, monthKey, monthRange, todayISO } from "@/lib/dates";
import { getBudgets, getCategories, getExpensesForMonth, getSettings } from "@/lib/data";
import { formatMoney, localLabel, sumUSD, toLocal } from "@/lib/money";

export const metadata: Metadata = { title: "Presupuestos" };

export default async function BudgetsPage() {
  const settings = await getSettings();
  const today = todayISO(settings.timezone);
  const month = monthKey(today);
  const [categories, budgets, expenses] = await Promise.all([getCategories(), getBudgets(), getExpensesForMonth(month)]);

  const limitBy = new Map(budgets.map((b) => [b.categoryId, b.amountUsd]));
  const spentBy = (categoryId: number) => sumUSD(expenses.filter((e) => e.categoryId === categoryId), settings);
  // Días que quedan en el mes, contando hoy.
  const daysLeft = daysBetween(today, monthRange(month).end) + 1;

  const withBudget = categories.filter((c) => limitBy.has(c.id));
  const withoutBudget = categories.filter((c) => !limitBy.has(c.id));
  const totalLimit = settings.monthlyBudgetUsd;
  const totalSpent = sumUSD(expenses, settings);

  return (
    <>
      <PageHeader title="Presupuestos" subtitle={`${formatMonth(month)} · quedan ${daysLeft} ${daysLeft === 1 ? "día" : "días"}`} />

      <Card className="mb-4">
        <CardTitle>Total del mes</CardTitle>
        {totalLimit ? (
          <BudgetRow label="Todos los gastos" spent={totalSpent} limit={totalLimit} daysLeft={daysLeft} />
        ) : (
          <p className="text-sm text-muted">
            Llevas {formatMoney(totalSpent, "USD")}. Define un presupuesto total en{" "}
            <Link href="/ajustes" className="text-accent">
              Ajustes
            </Link>
            .
          </p>
        )}
      </Card>

      <Card className="mb-4">
        <CardTitle>Por categoría</CardTitle>
        {withBudget.length === 0 ? (
          <Empty>Ponle un límite mensual a una categoría (abajo) y te aviso al llegar al 80 % y al 100 %.</Empty>
        ) : (
          <ul className="flex flex-col gap-5">
            {withBudget.map((c) => (
              <li key={c.id}>
                <BudgetRow
                  label={`${c.emoji} ${c.name}`}
                  spent={spentBy(c.id)}
                  limit={limitBy.get(c.id)!}
                  daysLeft={daysLeft}
                  action={
                    <FormDialog title={`Presupuesto de ${c.name}`} trigger={<Pencil size={14} />} triggerLabel="Editar" triggerVariant="ghost" triggerSize="sm" action={saveBudget}>
                      <BudgetFields category={c} limit={limitBy.get(c.id)} settings={settings} />
                    </FormDialog>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {withoutBudget.length > 0 && (
        <Card>
          <CardTitle>Sin presupuesto</CardTitle>
          <ul className="divide-y divide-border">
            {withoutBudget.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm">
                  {c.emoji} {c.name}
                  <span className="ml-2 text-xs text-muted">{formatMoney(spentBy(c.id), "USD")} este mes</span>
                </span>
                <FormDialog title={`Presupuesto de ${c.name}`} trigger={<><Plus size={14} /> Límite</>} triggerVariant="secondary" triggerSize="sm" action={saveBudget}>
                  <BudgetFields category={c} settings={settings} />
                </FormDialog>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

function BudgetRow({
  label,
  spent,
  limit,
  daysLeft,
  action,
}: {
  label: string;
  spent: number;
  limit: number;
  daysLeft: number;
  action?: React.ReactNode;
}) {
  const left = limit - spent;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="flex items-center gap-1">
          <span className="tabular text-sm">
            <span className="font-semibold">{formatMoney(spent, "USD")}</span>
            <span className="text-muted"> / {formatMoney(limit, "USD")}</span>
          </span>
          {action}
        </span>
      </div>
      <ProgressBar value={(spent / limit) * 100} color={budgetColor(spent, limit)} />
      <p className="mt-1 text-xs text-muted">
        {left >= 0
          ? `Te quedan ${formatMoney(left, "USD")} · ${formatMoney(left / daysLeft, "USD")} por día`
          : `Te pasaste ${formatMoney(-left, "USD")}`}
      </p>
    </div>
  );
}

function BudgetFields({ category, limit, settings }: { category: Category; limit?: number; settings: Settings }) {
  return (
    <>
      <input type="hidden" name="categoryId" value={category.id} />
      <Field label="Límite mensual (USD)">
        <Input name="amountUsd" type="number" step="0.01" min="0" inputMode="decimal" defaultValue={limit ?? ""} autoFocus />
      </Field>
      <p className="-mt-2 text-xs text-muted">
        {localLabel(settings.localCurrency)} 1.000 ≈ {formatMoney(1000 / settings.usdToLocalRate, "USD")} ·{" "}
        {limit ? `≈ ${formatMoney(toLocal({ amount: limit, currency: "USD" }, settings), settings.localCurrency)} al mes. ` : ""}
        Déjalo vacío para quitar el presupuesto.
      </p>
    </>
  );
}
