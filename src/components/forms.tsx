import { EVENT_REPEATS, type CalendarEvent, type Category, type Expense, type SavingsGoal, type Settings, type Subscription, type Task } from "@/db/schema";
import { accountValue } from "@/lib/accounts";
import { repeatLabel } from "@/lib/calendar";
import { addDays } from "@/lib/dates";
import type { AccountOption, SuggestedRates } from "@/lib/payment-methods";
import { PaymentFields } from "./payment-fields";
import { CategoryOptions, Field, Input, PaymentMethodOptions, Select, Textarea } from "./ui";

function CurrencySelect({ value, settings }: { value?: string; settings: Settings }) {
  return (
    <Select name="currency" defaultValue={value ?? "USD"}>
      <option value="USD">USD</option>
      <option value="LOCAL">{settings.localCurrency}</option>
    </Select>
  );
}

function AmountRow({
  name,
  label,
  amount,
  currency,
  settings,
}: {
  name: string;
  label: string;
  amount?: number;
  currency?: string;
  settings: Settings;
}) {
  return (
    <div className="grid grid-cols-[1fr_7rem] gap-3">
      <Field label={label}>
        <Input name={name} type="number" step="0.01" min="0" inputMode="decimal" defaultValue={amount} required />
      </Field>
      <Field label="Moneda">
        <CurrencySelect value={currency} settings={settings} />
      </Field>
    </div>
  );
}

export function SubscriptionFields({
  sub,
  categories,
  settings,
  accounts = [],
}: {
  sub?: Subscription;
  categories: Category[];
  settings: Settings;
  accounts?: AccountOption[];
}) {
  const defaultCategory = sub?.categoryId ?? categories.find((c) => c.name === "Suscripciones")?.id;
  return (
    <>
      {sub && <input type="hidden" name="id" value={sub.id} />}
      <Field label="Nombre">
        <Input name="name" defaultValue={sub?.name} placeholder="Claude, Netflix, Spotify…" required />
      </Field>
      <AmountRow name="amount" label="Monto" amount={sub?.amount} currency={sub?.currency} settings={settings} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Día de cobro">
          <Input name="billingDay" type="number" min="1" max="31" defaultValue={sub?.billingDay ?? 1} required />
        </Field>
        <Field label="Categoría">
          <Select name="categoryId" defaultValue={defaultCategory ?? ""}>
            <CategoryOptions categories={categories} />
          </Select>
        </Field>
      </div>
      <Field label="Se paga con">
        <Select name="paymentMethod" defaultValue={sub?.paymentMethod ?? ""}>
          <PaymentMethodOptions accounts={accounts} current={sub?.paymentMethod} />
        </Select>
      </Field>
      {sub && (
        <Field label="Estado">
          <Select name="active" defaultValue={sub.active ? "on" : "off"}>
            <option value="on">Activa</option>
            <option value="off">Pausada</option>
          </Select>
        </Field>
      )}
      <Field label="Notas">
        <Textarea name="notes" defaultValue={sub?.notes ?? ""} placeholder="Tarjeta, cuenta, etc." />
      </Field>
    </>
  );
}

export function TaskFields({ task, categories }: { task?: Task; categories: Category[] }) {
  return (
    <>
      {task && <input type="hidden" name="id" value={task.id} />}
      <Field label="¿Qué hay que hacer?">
        <Input name="title" defaultValue={task?.title} placeholder="Informe de Metodología…" required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoría">
          <Select name="categoryId" defaultValue={task?.categoryId ?? ""}>
            <CategoryOptions categories={categories} />
          </Select>
        </Field>
        <Field label="Prioridad">
          <Select name="priority" defaultValue={task?.priority ?? "media"}>
            <option value="urgente">🔴 Urgente</option>
            <option value="alta">🟠 Alta</option>
            <option value="media">🔵 Media</option>
            <option value="baja">⚪ Baja</option>
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha (opcional)">
          <Input name="dueDate" type="date" defaultValue={task?.dueDate ?? ""} />
        </Field>
        <Field label="Hora (opcional)">
          <Input name="dueTime" type="time" defaultValue={task?.dueTime?.slice(0, 5) ?? ""} />
        </Field>
      </div>
      <Field label="Notas">
        <Textarea name="notes" defaultValue={task?.notes ?? ""} />
      </Field>
    </>
  );
}

export function EventFields({
  event,
  categories,
  date,
}: {
  event?: CalendarEvent;
  categories: Category[];
  date: string;
}) {
  return (
    <>
      {event && <input type="hidden" name="id" value={event.id} />}
      <Field label="Evento">
        <Input name="title" defaultValue={event?.title} placeholder="Reunión, dentista, cumpleaños…" required />
      </Field>
      <div className="grid grid-cols-[1fr_6.5rem_6.5rem] gap-3">
        <Field label="Fecha">
          <Input name="date" type="date" defaultValue={event?.date ?? date} required />
        </Field>
        <Field label="Desde">
          <Input name="startTime" type="time" defaultValue={event?.startTime?.slice(0, 5) ?? ""} />
        </Field>
        <Field label="Hasta">
          <Input name="endTime" type="time" defaultValue={event?.endTime?.slice(0, 5) ?? ""} />
        </Field>
      </div>
      <p className="-mt-2 text-xs text-muted">Sin hora = todo el día.</p>
      <Field label="Lugar o link (opcional)">
        <Input name="location" defaultValue={event?.location ?? ""} placeholder="Oficina, https://meet.google.com/…" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Repetir">
          <Select name="repeat" defaultValue={event?.repeat ?? "none"}>
            {EVENT_REPEATS.map((r) => (
              <option key={r} value={r}>
                {repeatLabel[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Categoría">
          <Select name="categoryId" defaultValue={event?.categoryId ?? ""}>
            <CategoryOptions categories={categories} />
          </Select>
        </Field>
      </div>
      <Field label="Notas">
        <Textarea name="notes" defaultValue={event?.notes ?? ""} />
      </Field>
    </>
  );
}

export function ExpenseFields({
  expense,
  categories,
  settings,
  rates,
  today,
  accounts = [],
}: {
  expense?: Expense;
  categories: Category[];
  settings: Settings;
  rates: SuggestedRates;
  today: string;
  accounts?: AccountOption[];
}) {
  return (
    <>
      {expense && <input type="hidden" name="id" value={expense.id} />}
      <Field label="Descripción">
        <Input name="description" defaultValue={expense?.description} placeholder="Almuerzo, pasaje…" required />
      </Field>
      <PaymentFields
        amount={expense?.amount}
        currency={expense?.currency}
        paymentMethod={expense?.accountId ? accountValue(expense.accountId) : expense?.paymentMethod}
        amountLocal={expense?.amountLocal}
        localCurrency={settings.localCurrency}
        rates={rates}
        accounts={accounts}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha">
          <Input name="date" type="date" defaultValue={expense?.date ?? today} required />
        </Field>
        <Field label="Categoría">
          <Select name="categoryId" defaultValue={expense?.categoryId ?? ""}>
            <CategoryOptions categories={categories} />
          </Select>
        </Field>
      </div>
    </>
  );
}

/** Pago del mes de una suscripción: se puede ajustar el monto, el medio y lo cobrado. */
export function SubscriptionPaymentFields({
  sub,
  settings,
  rates,
  accounts = [],
}: {
  sub: Subscription;
  settings: Settings;
  rates: SuggestedRates;
  accounts?: AccountOption[];
}) {
  return (
    <PaymentFields
      amount={sub.amount}
      currency={sub.currency}
      paymentMethod={sub.paymentMethod}
      localCurrency={settings.localCurrency}
      rates={rates}
      accounts={accounts}
    />
  );
}

/** Botones tipo "chip" que funcionan como radio (sin JavaScript). */
function ChipRadio({ name, value, defaultChecked, children }: { name: string; value: string; defaultChecked?: boolean; children: React.ReactNode }) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name={name} value={value} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="flex h-10 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-sm text-muted transition peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/30">
        {children}
      </span>
    </label>
  );
}

/** Gasto rápido (botón +): monto grande, categorías y medio de pago en botones, fecha Hoy/Ayer. */
export function QuickExpenseFields({
  categories,
  settings,
  rates,
  today,
  accounts,
  lastPayment,
}: {
  categories: Category[];
  settings: Settings;
  rates: SuggestedRates;
  today: string;
  accounts: AccountOption[];
  lastPayment: string | null;
}) {
  return (
    <>
      <PaymentFields
        paymentMethod={lastPayment}
        localCurrency={settings.localCurrency}
        rates={rates}
        accounts={accounts}
        quick
      />
      <Field label="Categoría">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <ChipRadio key={c.id} name="categoryId" value={String(c.id)}>
              <span aria-hidden>{c.emoji}</span> {c.name}
            </ChipRadio>
          ))}
        </div>
      </Field>
      <Field label="Fecha">
        <div className="flex flex-wrap items-center gap-2">
          <ChipRadio name="date" value={today} defaultChecked>
            Hoy
          </ChipRadio>
          <ChipRadio name="date" value={addDays(today, -1)}>
            Ayer
          </ChipRadio>
          <ChipRadio name="date" value="otra">
            Otra
          </ChipRadio>
          <Input name="otherDate" type="date" defaultValue={today} className="h-10 w-auto" aria-label="Otra fecha" />
        </div>
      </Field>
      <Field label="Descripción (opcional)">
        <Input name="description" placeholder="Si la dejas vacía se usa la categoría" />
      </Field>
    </>
  );
}

export function GoalFields({ goal, settings }: { goal?: SavingsGoal; settings: Settings }) {
  return (
    <>
      {goal && <input type="hidden" name="id" value={goal.id} />}
      <div className="grid grid-cols-[4.5rem_1fr] gap-3">
        <Field label="Emoji">
          <Input name="emoji" defaultValue={goal?.emoji ?? "🎯"} maxLength={4} className="text-center" />
        </Field>
        <Field label="Meta">
          <Input name="name" defaultValue={goal?.name} placeholder="AirPods" required />
        </Field>
      </div>
      <AmountRow
        name="targetAmount"
        label="Objetivo"
        amount={goal?.targetAmount}
        currency={goal?.currency}
        settings={settings}
      />
      <Field label="Fecha límite (opcional)">
        <Input name="deadline" type="date" defaultValue={goal?.deadline ?? ""} />
      </Field>
    </>
  );
}

export function ContributionFields({ goalId, today }: { goalId: number; today: string }) {
  return (
    <>
      <input type="hidden" name="goalId" value={goalId} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <Select name="kind" defaultValue="aporte">
            <option value="aporte">➕ Aporte</option>
            <option value="retiro">➖ Retiro</option>
          </Select>
        </Field>
        <Field label="Monto">
          <Input name="amount" type="number" step="0.01" min="0" inputMode="decimal" required autoFocus />
        </Field>
      </div>
      <Field label="Fecha">
        <Input name="date" type="date" defaultValue={today} required />
      </Field>
      <Field label="Nota (opcional)">
        <Input name="note" placeholder="Ahorro de la semana" />
      </Field>
    </>
  );
}
