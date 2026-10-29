"use client";

import clsx from "clsx";
import { useState } from "react";
import type { Currency } from "@/db/schema";
import { accountIdOf, accountValue } from "@/lib/accounts";
import { formatRate, localLabel } from "@/lib/money";
import { paymentLabel, resolveMethod, type AccountOption, type SuggestedRates } from "@/lib/payment-methods";
import { Field, Input, PaymentMethodOptions, Select } from "./ui";

/**
 * Monto, moneda, medio de pago y lo cobrado en moneda local.
 * Para gastos en USD, lo cobrado se estima con la tasa del día del medio elegido
 * (ej. venta del BNB) hasta que se escribe a mano lo que realmente cobró el banco.
 *
 * `quick`: versión del botón +: monto grande y el medio de pago en botones (cuentas + último usado).
 */
export function PaymentFields({
  amount,
  currency,
  paymentMethod,
  amountLocal,
  localCurrency,
  rates,
  accounts = [],
  quick,
}: {
  amount?: number;
  currency?: Currency;
  paymentMethod?: string | null;
  amountLocal?: number | null;
  localCurrency: string;
  rates: SuggestedRates;
  accounts?: AccountOption[];
  quick?: boolean;
}) {
  // Si se paga desde una cuenta, la moneda por defecto es la de la cuenta.
  const initialAccount = accounts.find((a) => a.id === accountIdOf(paymentMethod));
  const [amountValue, setAmountValue] = useState(amount?.toString() ?? "");
  const [cur, setCur] = useState<Currency>(currency ?? initialAccount?.currency ?? "USD");
  const [method, setMethod] = useState(paymentMethod ?? "");
  // null = sin editar a mano: se usa el estimado.
  const [local, setLocal] = useState<string | null>(amountLocal != null ? amountLocal.toString() : null);
  // Modo rápido: lo cobrado se muestra como una línea hasta que se toca "editar".
  const [editingLocal, setEditingLocal] = useState(!quick);

  const label = localLabel(localCurrency);
  const suggested = rates.byMethod[resolveMethod(method, accounts) ?? ""] ?? rates.fallback;
  const usd = Number(amountValue.replace(",", "."));
  const estimate = usd > 0 ? (usd * suggested.rate).toFixed(2) : "";
  const localValue = local ?? estimate;
  const effectiveRate = local && usd > 0 ? Number(local) / usd : null;

  // Botones del modo rápido: las cuentas activas y, si no es una de ellas, el último medio usado.
  const chips = [
    ...accounts.filter((a) => !a.archived).map((a) => accountValue(a.id)),
    ...(paymentMethod && accountIdOf(paymentMethod) == null ? [paymentMethod] : []),
    ...["efectivo", "binance-p2p"].filter((m) => m !== paymentMethod),
  ].slice(0, 6);

  const currencySelect = (
    <Select name="currency" value={cur} onChange={(e) => setCur(e.target.value as Currency)} className={clsx(quick && "h-14 text-base")}>
      <option value="USD">USD</option>
      <option value="LOCAL">{label}</option>
    </Select>
  );

  return (
    <>
      <div className={clsx("grid gap-3", quick ? "grid-cols-[1fr_6.5rem]" : "grid-cols-[1fr_7rem]")}>
        <Field label="Monto">
          <Input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            placeholder={quick ? "0.00" : undefined}
            value={amountValue}
            onChange={(e) => setAmountValue(e.target.value)}
            className={clsx(quick && "tabular h-14 text-3xl font-semibold")}
            required
          />
        </Field>
        <Field label="Moneda">{currencySelect}</Field>
      </div>

      {quick ? (
        <Field label="Pagado con">
          <div className="flex flex-wrap gap-2">
            {chips.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMethod(value);
                  const account = accounts.find((a) => a.id === accountIdOf(value));
                  if (account) setCur(account.currency);
                }}
                className={clsx(
                  "h-10 cursor-pointer rounded-full border px-3 text-sm transition",
                  method === value ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface text-muted",
                )}
              >
                {paymentLabel(value, accounts)}
              </button>
            ))}
            <Select
              aria-label="Otro medio de pago"
              value={chips.includes(method) ? "" : method}
              onChange={(e) => setMethod(e.target.value)}
              className="h-10 !w-auto rounded-full text-muted"
            >
              <PaymentMethodOptions accounts={accounts} current={method} emptyLabel="Otro…" />
            </Select>
          </div>
          <input type="hidden" name="paymentMethod" value={method} />
        </Field>
      ) : (
        <Field label="Pagado con">
          <Select name="paymentMethod" value={method} onChange={(e) => setMethod(e.target.value)}>
            <PaymentMethodOptions accounts={accounts} current={method} />
          </Select>
        </Field>
      )}

      {cur === "USD" && !editingLocal && (
        <p className="-mt-1 text-sm text-muted">
          <input type="hidden" name="amountLocal" value={localValue} />
          {estimate ? (
            <>
              ≈ <span className="tabular font-semibold text-fg">{localValue} {label}</span> ({suggested.label}) ·{" "}
            </>
          ) : (
            <>Se estima en {label} con {formatRate(suggested.rate)} ({suggested.label}) · </>
          )}
          <button type="button" className="cursor-pointer text-accent" onClick={() => setEditingLocal(true)}>
            poner lo que cobró el banco
          </button>
        </p>
      )}

      {cur === "USD" && editingLocal && (
        <>
          <Field label={`Cobrado en ${label}`}>
            <Input
              name="amountLocal"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={localValue}
              onChange={(e) => setLocal(e.target.value)}
            />
          </Field>
          <p className="-mt-2 text-xs text-muted">
            {effectiveRate ? (
              <>
                Te cobraron {formatRate(effectiveRate)} {label} por dólar ·{" "}
                <button type="button" className="cursor-pointer text-accent" onClick={() => setLocal(null)}>
                  usar {formatRate(suggested.rate)} ({suggested.label})
                </button>
              </>
            ) : (
              <>
                Estimado con {formatRate(suggested.rate)} {label} por dólar ({suggested.label}). Cámbialo por lo que te
                cobró el banco.
              </>
            )}
          </p>
        </>
      )}
    </>
  );
}
