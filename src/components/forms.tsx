import type { Category, Expense, SavingsGoal, Settings, Subscription, Task } from "@/db/schema";
import { CategoryOptions, Field, Input, Select, Textarea } from "./ui";

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
}: {
  sub?: Subscription;
  categories: Category[];
  settings: Settings;
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

export function ExpenseFields({
  expense,
  categories,
  settings,
  today,
}: {
  expense?: Expense;
  categories: Category[];
  settings: Settings;
  today: string;
}) {
  return (
    <>
      {expense && <input type="hidden" name="id" value={expense.id} />}
      <Field label="Descripción">
        <Input name="description" defaultValue={expense?.description} placeholder="Almuerzo, pasaje…" required />
      </Field>
      <AmountRow name="amount" label="Monto" amount={expense?.amount} currency={expense?.currency} settings={settings} />
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
