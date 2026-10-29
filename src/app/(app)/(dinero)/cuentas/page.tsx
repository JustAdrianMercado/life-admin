import { ArrowDownLeft, ArrowLeftRight, Pencil, Plus, Scale, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { deleteAccount, deleteMovement, saveAccount, saveMovement } from "@/actions/accounts";
import { ActionButton } from "@/components/action-button";
import { FormDialog } from "@/components/form-dialog";
import { Badge, Card, CardTitle, Empty, Field, Input, PageHeader, PaymentMethodOptions, Select, Stat, Textarea } from "@/components/ui";
import type { Account, Settings } from "@/db/schema";
import { formatDate, todayISO } from "@/lib/dates";
import { getAccountsWithBalances, getSettings } from "@/lib/data";
import { currencyCode, formatMoney, formatRate, localLabel, toLocal, toUSD } from "@/lib/money";
import { paymentLabel } from "@/lib/payment-methods";

export const metadata: Metadata = { title: "Cuentas" };

type AccountWithBalance = Account & { balance: number };

export default async function AccountsPage() {
  const settings = await getSettings();
  const today = todayISO(settings.timezone);
  const { accounts, movements, total } = await getAccountsWithBalances();
  const active = accounts.filter((a) => !a.archived);
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const money = (amount: number, a: Pick<Account, "currency">) => formatMoney(amount, currencyCode(a.currency, settings));

  return (
    <>
      <PageHeader
        title="Cuentas"
        subtitle="Cuánto tienes en cada banco, Binance y efectivo"
        actions={
          <>
            {active.length >= 2 && (
              <FormDialog
                title="Transferir entre cuentas"
                trigger={<><ArrowLeftRight size={16} /> Transferir</>}
                triggerVariant="secondary"
                action={saveMovement}
              >
                <TransferFields accounts={active} settings={settings} today={today} />
              </FormDialog>
            )}
            <FormDialog title="Nueva cuenta" trigger={<><Plus size={16} /> Cuenta</>} action={saveAccount}>
              <AccountFields settings={settings} />
            </FormDialog>
          </>
        }
      />

      {active.length === 0 ? (
        <Empty>
          Agrega tus cuentas (BNB, Binance, efectivo…) con su saldo actual. Luego, al registrar un gasto, elige la cuenta
          en “Pagado con” y el saldo se descuenta solo.
        </Empty>
      ) : (
        <>
          <Card className="mb-4">
            <CardTitle>Patrimonio</CardTitle>
            <div className="grid grid-cols-2 gap-4">
              <Stat label={`Total en ${localLabel(settings.localCurrency)}`} value={formatMoney(total.local, settings.localCurrency)} />
              <Stat label="Total en USD" value={formatMoney(total.usd, "USD")} hint={`a ${formatRate(settings.usdToLocalRate)} por dólar`} />
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((a) => (
              <AccountCard key={a.id} account={a} settings={settings} today={today} money={money} />
            ))}
          </div>
        </>
      )}

      {movements.length > 0 && (
        <Card className="mt-4">
          <CardTitle>Ingresos y transferencias</CardTitle>
          <ul className="divide-y divide-border">
            {movements.slice(0, 40).map((m) => {
              const from = byId.get(m.accountId);
              const to = m.toAccountId ? byId.get(m.toAccountId) : undefined;
              if (!from) return null;
              return (
                <li key={m.id} className="flex items-center gap-3 py-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
                    {m.kind === "transferencia" ? <ArrowLeftRight size={16} /> : m.kind === "ajuste" ? <Scale size={16} /> : <ArrowDownLeft size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {m.kind === "transferencia"
                        ? `${from.emoji} ${from.name} → ${to ? `${to.emoji} ${to.name}` : "cuenta borrada"}`
                        : `${m.kind === "ajuste" ? "Ajuste" : "Ingreso"} · ${from.emoji} ${from.name}`}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {formatDate(m.date)}
                      {m.note && ` · ${m.note}`}
                    </p>
                  </div>
                  <span className={`tabular text-right text-sm font-semibold ${m.kind === "ingreso" ? "text-success" : ""}`}>
                    {m.kind === "transferencia" ? (
                      <>
                        {money(m.amount, from)}
                        {to && m.toAmount != null && to.currency !== from.currency && (
                          <span className="block text-xs font-normal text-muted">→ {money(m.toAmount, to)}</span>
                        )}
                      </>
                    ) : (
                      `${m.amount > 0 ? "+" : ""}${money(m.amount, from)}`
                    )}
                  </span>
                  <ActionButton action={deleteMovement.bind(null, m.id)} confirm="¿Eliminar este movimiento?" variant="danger" label="Eliminar">
                    <Trash2 size={14} />
                  </ActionButton>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {accounts.some((a) => a.archived) && (
        <p className="mt-4 text-xs text-muted">
          Archivadas: {accounts.filter((a) => a.archived).map((a) => `${a.emoji} ${a.name}`).join(", ")}. Edítalas para reactivarlas.
        </p>
      )}
    </>
  );
}

function AccountCard({
  account: a,
  settings,
  today,
  money,
}: {
  account: AccountWithBalance;
  settings: Settings;
  today: string;
  money: (amount: number, a: Pick<Account, "currency">) => string;
}) {
  const other =
    a.currency === "USD"
      ? formatMoney(toLocal({ amount: a.balance, currency: "USD" }, settings), settings.localCurrency)
      : formatMoney(toUSD({ amount: a.balance, currency: "LOCAL" }, settings), "USD");
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-2xl" aria-hidden>
            {a.emoji}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{a.name}</p>
            {a.paymentMethod && <Badge className="bg-surface-2 text-muted">{paymentLabel(a.paymentMethod)}</Badge>}
          </div>
        </div>
        <div className="flex">
          <FormDialog title="Editar cuenta" trigger={<Pencil size={14} />} triggerLabel="Editar" triggerVariant="ghost" triggerSize="sm" action={saveAccount}>
            <AccountFields account={a} settings={settings} />
          </FormDialog>
          <ActionButton
            action={deleteAccount.bind(null, a.id)}
            confirm={`¿Eliminar "${a.name}"? Se borran sus ingresos y transferencias; los gastos quedan sin cuenta. Si solo ya no la usas, mejor archívala.`}
            variant="danger"
            label="Eliminar"
          >
            <Trash2 size={14} />
          </ActionButton>
        </div>
      </div>
      <p className={`tabular mt-3 text-2xl font-semibold tracking-tight ${a.balance < 0 ? "text-danger" : ""}`}>{money(a.balance, a)}</p>
      <p className="text-xs text-muted">≈ {other}</p>
      <div className="mt-3 flex gap-2">
        <FormDialog title={`Ingreso a ${a.name}`} trigger={<><ArrowDownLeft size={14} /> Ingreso</>} triggerVariant="success" triggerSize="sm" action={saveMovement}>
          <input type="hidden" name="kind" value="ingreso" />
          <input type="hidden" name="accountId" value={a.id} />
          <Field label={`Monto (${currencyCode(a.currency, settings)})`}>
            <Input name="amount" type="number" step="0.01" min="0" inputMode="decimal" required autoFocus />
          </Field>
          <DateAndNote today={today} placeholder="Sueldo, venta, devolución…" />
        </FormDialog>
        <FormDialog title={`Ajustar saldo de ${a.name}`} trigger={<><Scale size={14} /> Ajustar</>} triggerVariant="secondary" triggerSize="sm" action={saveMovement}>
          <input type="hidden" name="kind" value="ajuste" />
          <input type="hidden" name="accountId" value={a.id} />
          <input type="hidden" name="currentBalance" value={a.balance} />
          <Field label={`Saldo real hoy (${currencyCode(a.currency, settings)})`}>
            <Input name="newBalance" type="number" step="0.01" inputMode="decimal" defaultValue={a.balance.toFixed(2)} required autoFocus />
          </Field>
          <p className="-mt-2 text-xs text-muted">Escribe lo que dice tu banco; la diferencia se guarda como ajuste.</p>
          <DateAndNote today={today} />
        </FormDialog>
      </div>
    </Card>
  );
}

function AccountFields({ account, settings }: { account?: Account; settings: Settings }) {
  return (
    <>
      {account && <input type="hidden" name="id" value={account.id} />}
      <div className="grid grid-cols-[4.5rem_1fr] gap-3">
        <Field label="Emoji">
          <Input name="emoji" defaultValue={account?.emoji ?? "🏦"} maxLength={4} className="text-center" />
        </Field>
        <Field label="Nombre">
          <Input name="name" defaultValue={account?.name} placeholder="BNB caja de ahorro, Binance, Efectivo…" required />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Moneda">
          <Select name="currency" defaultValue={account?.currency ?? "LOCAL"}>
            <option value="LOCAL">{localLabel(settings.localCurrency)}</option>
            <option value="USD">USD / USDT</option>
          </Select>
        </Field>
        <Field label="Saldo inicial">
          <Input name="initialBalance" type="number" step="0.01" inputMode="decimal" defaultValue={account?.initialBalance ?? ""} placeholder="0.00" />
        </Field>
      </div>
      <Field label="Banco o medio (para el tipo de cambio)">
        <Select name="paymentMethod" defaultValue={account?.paymentMethod ?? ""}>
          <PaymentMethodOptions />
        </Select>
      </Field>
      {account && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="archived" defaultChecked={account.archived} className="size-4 accent-[var(--accent)]" />
          Archivada (ya no la uso)
        </label>
      )}
    </>
  );
}

function TransferFields({ accounts, settings, today }: { accounts: AccountWithBalance[]; settings: Settings; today: string }) {
  const option = (a: AccountWithBalance) => (
    <option key={a.id} value={a.id}>
      {a.emoji} {a.name} ({currencyCode(a.currency, settings)})
    </option>
  );
  return (
    <>
      <input type="hidden" name="kind" value="transferencia" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Desde">
          <Select name="accountId" defaultValue={accounts[0].id}>
            {accounts.map(option)}
          </Select>
        </Field>
        <Field label="Hacia">
          <Select name="toAccountId" defaultValue={accounts[1].id}>
            {accounts.map(option)}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Salió">
          <Input name="amount" type="number" step="0.01" min="0" inputMode="decimal" required />
        </Field>
        <Field label="Llegó (opcional)">
          <Input name="toAmount" type="number" step="0.01" min="0" inputMode="decimal" placeholder="Si es otra moneda" />
        </Field>
      </div>
      <p className="-mt-2 text-xs text-muted">Ej.: compraste USDT en Binance P2P: salió 1.210 Bs y llegaron 100 USDT.</p>
      <DateAndNote today={today} />
    </>
  );
}

function DateAndNote({ today, placeholder }: { today: string; placeholder?: string }) {
  return (
    <>
      <Field label="Fecha">
        <Input name="date" type="date" defaultValue={today} required />
      </Field>
      <Field label="Nota (opcional)">
        <Textarea name="note" placeholder={placeholder} className="min-h-12" />
      </Field>
    </>
  );
}
