import type { Account, AccountMovement, Expense, Settings } from "@/db/schema";
import { paidLocal, toLocal, toUSD } from "./money";

// Medio de pago que apunta a una cuenta: "acc:<id>".
export const ACCOUNT_PREFIX = "acc:";

export function accountValue(id: number) {
  return `${ACCOUNT_PREFIX}${id}`;
}

export function accountIdOf(value: string | null | undefined) {
  if (!value?.startsWith(ACCOUNT_PREFIX)) return null;
  const id = Number(value.slice(ACCOUNT_PREFIX.length));
  return Number.isInteger(id) ? id : null;
}

/** Lo que un gasto descuenta de una cuenta, en la moneda de la cuenta. */
export function expenseInAccountCurrency(
  e: Pick<Expense, "amount" | "currency" | "amountLocal">,
  account: Pick<Account, "currency">,
  settings: Settings,
) {
  if (account.currency === "LOCAL") return paidLocal(e, settings);
  return e.currency === "USD" ? e.amount : e.amount / settings.usdToLocalRate;
}

/** Saldo de cada cuenta: inicial + ingresos ± transferencias + ajustes − gastos pagados con ella. */
export function accountBalances(
  accounts: Account[],
  movements: AccountMovement[],
  expenses: Pick<Expense, "accountId" | "amount" | "currency" | "amountLocal">[],
  settings: Settings,
) {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const balances = new Map(accounts.map((a) => [a.id, a.initialBalance]));
  const add = (id: number | null, amount: number) => {
    if (id != null && balances.has(id)) balances.set(id, balances.get(id)! + amount);
  };

  for (const m of movements) {
    if (m.kind === "transferencia") {
      add(m.accountId, -m.amount);
      add(m.toAccountId, m.toAmount ?? m.amount);
    } else {
      add(m.accountId, m.amount);
    }
  }
  for (const e of expenses) {
    const account = e.accountId != null ? byId.get(e.accountId) : undefined;
    if (account) add(account.id, -expenseInAccountCurrency(e, account, settings));
  }
  return balances;
}

/** Patrimonio: la suma de todas las cuentas, en USD y en moneda local (con la tasa de Ajustes). */
export function netWorth(accounts: Account[], balances: Map<number, number>, settings: Settings) {
  const usd = accounts.reduce(
    (acc, a) => acc + toUSD({ amount: balances.get(a.id) ?? 0, currency: a.currency }, settings),
    0,
  );
  return { usd, local: toLocal({ amount: usd, currency: "USD" }, settings) };
}
