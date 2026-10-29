import clsx from "clsx";
import { Check, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { saveEvent } from "@/actions/events";
import { markSubscriptionPaid } from "@/actions/subscriptions";
import { EventItem } from "@/components/event-item";
import { FormDialog } from "@/components/form-dialog";
import { EventFields, SubscriptionPaymentFields } from "@/components/forms";
import { TaskItem } from "@/components/task-item";
import { Badge, buttonClass, Card, CardTitle, Empty, PageHeader } from "@/components/ui";
import type { CalendarEvent, Subscription, Task } from "@/db/schema";
import { monthGrid } from "@/lib/calendar";
import { chargeDateIn, formatDate, formatMonth, formatTime, monthKey, relativeDay, shiftMonth, todayISO } from "@/lib/dates";
import {
  getAccountOptions,
  getCategories,
  getChargesForMonths,
  getEventOccurrences,
  getSettings,
  getSubscriptions,
  getTasksBetween,
} from "@/lib/data";
import { getExchangeRates, suggestedRates } from "@/lib/exchange";
import { fmt, formatMoney, toUSD } from "@/lib/money";
import { paymentLabel } from "@/lib/payment-methods";

export const metadata: Metadata = { title: "Calendario" };

type DayItems = {
  charges: { sub: Subscription; paid: boolean }[];
  events: CalendarEvent[];
  tasks: Task[];
};

// [nombre corto, inicial en el celular] — miércoles es "X" para no repetir la "M".
const WEEKDAYS = [
  ["Lun", "L"],
  ["Mar", "M"],
  ["Mié", "X"],
  ["Jue", "J"],
  ["Vie", "V"],
  ["Sáb", "S"],
  ["Dom", "D"],
];

export default async function CalendarPage({ searchParams }: PageProps<"/calendario">) {
  const { m, d } = await searchParams;
  const settings = await getSettings();
  const today = todayISO(settings.timezone);
  const month = typeof m === "string" && /^\d{4}-\d{2}$/.test(m) ? m : monthKey(today);
  const grid = monthGrid(month);
  const selected =
    typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= grid.start && d <= grid.end
      ? d
      : monthKey(today) === month
        ? today
        : `${month}-01`;

  // La grilla muestra días del mes anterior y del siguiente.
  const months = [shiftMonth(month, -1), month, shiftMonth(month, 1)];
  const [subs, charges, occurrences, tasks, categories, exchange, accounts] = await Promise.all([
    getSubscriptions(),
    getChargesForMonths(months),
    getEventOccurrences(grid.start, grid.end),
    getTasksBetween(grid.start, grid.end),
    getCategories(),
    getExchangeRates(),
    getAccountOptions(),
  ]);
  const rates = suggestedRates(exchange, settings);

  const byDay = new Map<string, DayItems>(grid.days.map((day) => [day, { charges: [], events: [], tasks: [] }]));
  const paid = new Set(charges.map((c) => `${c.subscriptionId}:${c.periodMonth}`));
  for (const sub of subs.filter((s) => s.active)) {
    for (const key of months) {
      const date = chargeDateIn(key, sub.billingDay);
      byDay.get(date)?.charges.push({ sub, paid: paid.has(`${sub.id}:${key}`) });
    }
  }
  for (const { event, date } of occurrences) byDay.get(date)?.events.push(event);
  for (const task of tasks) byDay.get(task.dueDate!)?.tasks.push(task);

  const monthCharges = grid.days
    .filter((day) => monthKey(day) === month)
    .flatMap((day) => byDay.get(day)!.charges);
  const monthChargesUSD = monthCharges.reduce((acc, c) => acc + toUSD(c.sub, settings), 0);
  const monthEvents = occurrences.filter((o) => monthKey(o.date) === month).length;

  const day = byDay.get(selected)!;
  const href = (date: string) => `/calendario?m=${monthKey(date)}&d=${date}`;

  return (
    <>
      <PageHeader
        title="Calendario"
        subtitle={
          <>
            {formatMonth(month)} · cobros por {formatMoney(monthChargesUSD, "USD")} · {monthEvents}{" "}
            {monthEvents === 1 ? "evento" : "eventos"}
          </>
        }
        actions={
          <>
            <div className="flex">
              <Link href={`/calendario?m=${shiftMonth(month, -1)}`} className={buttonClass("ghost")} aria-label="Mes anterior">
                <ChevronLeft size={18} />
              </Link>
              <Link href={href(today)} className={buttonClass("secondary")}>
                Hoy
              </Link>
              <Link href={`/calendario?m=${shiftMonth(month, 1)}`} className={buttonClass("ghost")} aria-label="Mes siguiente">
                <ChevronRight size={18} />
              </Link>
            </div>
            <FormDialog title="Nuevo evento" trigger={<><Plus size={16} /> Evento</>} action={saveEvent}>
              <EventFields categories={categories} date={selected} />
            </FormDialog>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <Card className="p-2 sm:p-3">
          <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted">
            {WEEKDAYS.map(([name, initial]) => (
              <span key={name} className="py-1.5">
                <span className="sm:hidden">{initial}</span>
                <span className="hidden sm:inline">{name}</span>
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
            {grid.days.map((date) => {
              const items = byDay.get(date)!;
              const chips = [
                ...items.charges.map(({ sub, paid }) => ({
                  key: `c${sub.id}`,
                  label: `${paid ? "✓" : "💳"} ${sub.name}`,
                  className: paid ? "bg-success-soft text-success" : "bg-warning-soft text-warning",
                })),
                ...items.events.map((e) => ({
                  key: `e${e.id}`,
                  label: `${formatTime(e.startTime) ?? ""} ${e.title}`.trim(),
                  className: "bg-accent-soft text-accent",
                })),
                ...items.tasks.map((t) => ({
                  key: `t${t.id}`,
                  label: t.title,
                  className: clsx("bg-surface-2 text-muted", t.status === "hecha" && "line-through opacity-60"),
                })),
              ];
              const outside = monthKey(date) !== month;
              return (
                <Link
                  key={date}
                  href={href(date)}
                  scroll={false}
                  className={clsx(
                    "flex min-h-14 flex-col gap-1 bg-surface p-1 transition hover:bg-surface-2 sm:min-h-24 sm:p-1.5",
                    outside && "bg-surface-2/60 text-muted",
                    date === selected && "ring-2 ring-accent ring-inset",
                  )}
                >
                  <span
                    className={clsx(
                      "grid size-6 place-items-center self-center rounded-full text-xs font-medium sm:self-start",
                      date === today && "bg-accent text-accent-fg",
                    )}
                  >
                    {Number(date.slice(8))}
                  </span>
                  {/* Celular: puntos. Pantallas grandes: etiquetas. */}
                  <span className="flex flex-wrap justify-center gap-0.5 sm:hidden">
                    {items.charges.length > 0 && <Dot className="bg-warning" />}
                    {items.events.length > 0 && <Dot className="bg-accent" />}
                    {items.tasks.length > 0 && <Dot className="bg-muted" />}
                  </span>
                  <span className="hidden flex-col gap-0.5 sm:flex">
                    {chips.slice(0, 3).map((c) => (
                      <span key={c.key} className={clsx("truncate rounded px-1 py-px text-[11px] leading-4", c.className)}>
                        {c.label}
                      </span>
                    ))}
                    {chips.length > 3 && <span className="px-1 text-[11px] text-muted">+{chips.length - 3} más</span>}
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 px-1 text-xs text-muted">
            <Legend className="bg-warning">Cobros</Legend>
            <Legend className="bg-accent">Eventos</Legend>
            <Legend className="bg-muted">Pendientes</Legend>
          </div>
        </Card>

        <Card>
          <CardTitle
            action={
              <FormDialog
                title="Nuevo evento"
                trigger={<><Plus size={14} /> Evento</>}
                triggerVariant="secondary"
                triggerSize="sm"
                action={saveEvent}
              >
                <EventFields categories={categories} date={selected} />
              </FormDialog>
            }
          >
            {formatDate(selected, { weekday: "long" })} · {relativeDay(selected, today)}
          </CardTitle>

          {day.charges.length + day.events.length + day.tasks.length === 0 && <Empty>Nada para este día.</Empty>}

          {day.charges.length > 0 && (
            <Section title="Cobros">
              {day.charges.map(({ sub, paid }) => (
                <li key={sub.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{sub.name}</p>
                    <p className="text-xs text-muted">
                      {fmt(sub, settings)}
                      {sub.paymentMethod && ` · ${paymentLabel(sub.paymentMethod, accounts)}`}
                    </p>
                  </div>
                  {paid ? (
                    <Badge className="bg-success-soft text-success">
                      <Check size={12} /> Pagado
                    </Badge>
                  ) : (
                    <FormDialog
                      title={`Pagar ${sub.name}`}
                      trigger="Marcar pagado"
                      triggerVariant="secondary"
                      triggerSize="sm"
                      submitLabel="Marcar pagado"
                      action={markSubscriptionPaid.bind(null, sub.id, monthKey(selected))}
                    >
                      <SubscriptionPaymentFields sub={sub} settings={settings} rates={rates} accounts={accounts} />
                    </FormDialog>
                  )}
                </li>
              ))}
            </Section>
          )}

          {day.events.length > 0 && (
            <Section title="Eventos">
              {day.events.map((e) => (
                <EventItem key={e.id} event={e} date={selected} categories={categories} today={today} />
              ))}
            </Section>
          )}

          {day.tasks.length > 0 && (
            <Section title="Pendientes">
              {day.tasks.map((t) => (
                <TaskItem key={t.id} task={t} categories={categories} today={today} compact />
              ))}
            </Section>
          )}
        </Card>
      </div>
    </>
  );
}

function Dot({ className }: { className: string }) {
  return <span className={clsx("size-1.5 rounded-full", className)} />;
}

function Legend({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={clsx("size-2 rounded-full", className)} />
      {children}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <h3 className="text-xs font-semibold text-muted">{title}</h3>
      <ul className="divide-y divide-border">{children}</ul>
    </div>
  );
}
