import { Check, Pencil, Plus, Trash2, Undo2 } from "lucide-react";
import type { Metadata } from "next";
import {
  deleteSubscription,
  markSubscriptionPaid,
  saveSubscription,
  unmarkSubscriptionPaid,
} from "@/actions/subscriptions";
import { ActionButton } from "@/components/action-button";
import { FormDialog } from "@/components/form-dialog";
import { SubscriptionFields, SubscriptionPaymentFields } from "@/components/forms";
import { Badge, Card, CardTitle, CategoryBadge, Empty, PageHeader, ProgressBar, Stat } from "@/components/ui";
import { chargeDateIn, formatDate, formatMonth, monthKey, nextChargeDate, relativeDay, todayISO } from "@/lib/dates";
import { getCategories, getChargesForMonth, getSettings, getSubscriptions } from "@/lib/data";
import { getExchangeRates, suggestedRates } from "@/lib/exchange";
import { fmt, formatMoney, toLocal, toUSD } from "@/lib/money";
import { paymentLabel } from "@/lib/payment-methods";

export const metadata: Metadata = { title: "Suscripciones" };

export default async function SubscriptionsPage() {
  const settings = await getSettings();
  const today = todayISO(settings.timezone);
  const month = monthKey(today);
  const [subs, categories, charges, exchange] = await Promise.all([
    getSubscriptions(),
    getCategories(),
    getChargesForMonth(month),
    getExchangeRates(),
  ]);
  const rates = suggestedRates(exchange, settings);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const paidIds = new Set(charges.map((c) => c.subscriptionId));

  const active = subs.filter((s) => s.active);
  const totalUSD = active.reduce((acc, s) => acc + toUSD(s, settings), 0);
  const paidUSD = active.filter((s) => paidIds.has(s.id)).reduce((acc, s) => acc + toUSD(s, settings), 0);

  // Agrupar por día de cobro: "Día 1: $30 · Día 13: $20".
  const byDay = new Map<number, typeof active>();
  for (const s of active) byDay.set(s.billingDay, [...(byDay.get(s.billingDay) ?? []), s]);
  const days = [...byDay.entries()].sort(([a], [b]) => a - b);

  return (
    <>
      <PageHeader
        title="Suscripciones"
        subtitle={`Cobros de ${formatMonth(month)}`}
        actions={
          <FormDialog title="Nueva suscripción" trigger={<><Plus size={16} /> Nueva</>} action={saveSubscription}>
            <SubscriptionFields categories={categories} settings={settings} />
          </FormDialog>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardTitle>Necesitas al mes</CardTitle>
          <div className="grid grid-cols-2 gap-4">
            <Stat
              label="Total mensual"
              value={formatMoney(totalUSD, "USD")}
              hint={`≈ ${formatMoney(toLocal({ amount: totalUSD, currency: "USD" }, settings), settings.localCurrency)}`}
            />
            <Stat
              label="Falta pagar este mes"
              value={formatMoney(totalUSD - paidUSD, "USD")}
              tone={totalUSD - paidUSD > 0 ? undefined : "success"}
              hint={`${paidIds.size} de ${active.length} pagadas`}
            />
          </div>
          <ProgressBar className="mt-4" value={totalUSD ? (paidUSD / totalUSD) * 100 : 0} color="var(--success)" />
        </Card>

        <Card>
          <CardTitle>Calendario de cobros</CardTitle>
          {days.length === 0 ? (
            <Empty>Sin suscripciones activas.</Empty>
          ) : (
            <ol className="flex flex-col gap-2">
              {days.map(([day, list]) => {
                const date = chargeDateIn(month, day);
                const dayUSD = list.reduce((acc, s) => acc + toUSD(s, settings), 0);
                const allPaid = list.every((s) => paidIds.has(s.id));
                return (
                  <li key={day} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface text-center leading-none">
                      <span>
                        <span className="block text-[10px] uppercase text-muted">Día</span>
                        <span className="text-lg font-semibold">{day}</span>
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{list.map((s) => s.name).join(", ")}</p>
                      <p className="text-xs text-muted">
                        {formatDate(date)} · {allPaid ? "pagado" : relativeDay(date, today)}
                      </p>
                    </div>
                    <span className={`tabular font-semibold ${allPaid ? "text-success" : ""}`}>
                      {formatMoney(dayUSD, "USD")}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardTitle>Todas</CardTitle>
        {subs.length === 0 ? (
          <Empty>Agrega tu primera suscripción con el botón “Nueva”.</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {subs.map((s) => {
              const paid = paidIds.has(s.id);
              const next = nextChargeDate(s.billingDay, today);
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{s.name}</span>
                      <CategoryBadge category={s.categoryId ? categoryById.get(s.categoryId) : null} />
                      {!s.active && <Badge className="bg-surface-2 text-muted">Pausada</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      Cobra el día {s.billingDay} · próximo {formatDate(next)} ({relativeDay(next, today)})
                      {s.paymentMethod && ` · ${paymentLabel(s.paymentMethod)}`}
                      {s.notes && ` · ${s.notes}`}
                    </p>
                  </div>
                  <span className="tabular font-semibold">{fmt(s, settings)}</span>
                  <div className="flex items-center gap-1">
                    {s.active &&
                      (paid ? (
                        <ActionButton
                          action={unmarkSubscriptionPaid.bind(null, s.id, month)}
                          variant="success"
                          label="Deshacer pago (borra el gasto)"
                        >
                          <Check size={14} /> Pagado <Undo2 size={12} className="opacity-60" />
                        </ActionButton>
                      ) : (
                        <FormDialog
                          title={`Pagar ${s.name}`}
                          trigger="Marcar pagado"
                          triggerVariant="secondary"
                          triggerSize="sm"
                          submitLabel="Marcar pagado"
                          action={markSubscriptionPaid.bind(null, s.id, month)}
                        >
                          <SubscriptionPaymentFields sub={s} settings={settings} rates={rates} />
                        </FormDialog>
                      ))}
                    <FormDialog
                      title="Editar suscripción"
                      trigger={<Pencil size={14} />}
                      triggerLabel="Editar"
                      triggerVariant="ghost"
                      triggerSize="sm"
                      action={saveSubscription}
                    >
                      <SubscriptionFields sub={s} categories={categories} settings={settings} />
                    </FormDialog>
                    <ActionButton
                      action={deleteSubscription.bind(null, s.id)}
                      confirm={`¿Eliminar "${s.name}"?`}
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
        <p className="mt-3 text-xs text-muted">
          “Marcar pagado” registra el cobro en Gastos, con el banco y lo que te cobró en bolivianos.
        </p>
      </Card>
    </>
  );
}
