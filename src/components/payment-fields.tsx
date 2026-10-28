"use client";

import { useState } from "react";
import type { Currency } from "@/db/schema";
import { formatRate, localLabel } from "@/lib/money";
import type { SuggestedRates } from "@/lib/payment-methods";
import { Field, Input, PaymentMethodOptions, Select } from "./ui";

/**
 * Monto, moneda, medio de pago y lo cobrado en moneda local.
 * Para gastos en USD, lo cobrado se estima con la tasa del día del medio elegido
 * (ej. venta del BNB) hasta que se escribe a mano lo que realmente cobró el banco.
 */
export function PaymentFields({
  amount,
  currency,
  paymentMethod,
  amountLocal,
  localCurrency,
  rates,
}: {
  amount?: number;
  currency?: Currency;
  paymentMethod?: string | null;
  amountLocal?: number | null;
  localCurrency: string;
  rates: SuggestedRates;
}) {
  const [amountValue, setAmountValue] = useState(amount?.toString() ?? "");
  const [cur, setCur] = useState<Currency>(currency ?? "USD");
  const [method, setMethod] = useState(paymentMethod ?? "");
  // null = sin editar a mano: se usa el estimado.
  const [local, setLocal] = useState<string | null>(amountLocal != null ? amountLocal.toString() : null);

  const label = localLabel(localCurrency);
  const suggested = rates.byMethod[method] ?? rates.fallback;
  const usd = Number(amountValue.replace(",", "."));
  const estimate = usd > 0 ? (usd * suggested.rate).toFixed(2) : "";
  const localValue = local ?? estimate;
  const effectiveRate = local && usd > 0 ? Number(local) / usd : null;

  return (
    <>
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <Field label="Monto">
          <Input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={amountValue}
            onChange={(e) => setAmountValue(e.target.value)}
            required
          />
        </Field>
        <Field label="Moneda">
          <Select name="currency" value={cur} onChange={(e) => setCur(e.target.value as Currency)}>
            <option value="USD">USD</option>
            <option value="LOCAL">{localCurrency}</option>
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Pagado con">
          <Select name="paymentMethod" value={method} onChange={(e) => setMethod(e.target.value)}>
            <PaymentMethodOptions />
          </Select>
        </Field>
        {cur === "USD" && (
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
        )}
      </div>
      {cur === "USD" && (
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
      )}
    </>
  );
}
