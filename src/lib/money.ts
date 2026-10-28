import type { Currency, Settings } from "@/db/schema";

export type Money = { amount: number; currency: Currency };

export function toUSD({ amount, currency }: Money, settings: Settings) {
  return currency === "USD" ? amount : amount / settings.usdToLocalRate;
}

export function toLocal({ amount, currency }: Money, settings: Settings) {
  return currency === "LOCAL" ? amount : amount * settings.usdToLocalRate;
}

/** Lo que realmente salió en moneda local: lo cobrado si se registró, si no la conversión con la tasa de Ajustes. */
export function paidLocal(e: Money & { amountLocal: number | null }, settings: Settings) {
  if (e.currency === "LOCAL") return e.amount;
  return e.amountLocal ?? e.amount * settings.usdToLocalRate;
}

/** Gasto en USD sin el monto local registrado (el total en moneda local lo estima). */
export function isEstimatedLocal(e: Money & { amountLocal: number | null }) {
  return e.currency === "USD" && e.amountLocal == null;
}

/** "Bs" para bolivianos; el código ISO para el resto. */
export function localLabel(code: string) {
  return code === "BOB" ? "Bs" : code;
}

export function formatRate(rate: number) {
  return new Intl.NumberFormat("es-419", { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(rate);
}

export function currencyCode(currency: Currency, settings: Settings) {
  return currency === "USD" ? "USD" : settings.localCurrency;
}

export function formatMoney(amount: number, code: string) {
  try {
    return new Intl.NumberFormat("es-419", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${code}`;
  }
}

export function fmt(money: Money, settings: Settings) {
  return formatMoney(money.amount, currencyCode(money.currency, settings));
}

export function sumUSD(items: Money[], settings: Settings) {
  return items.reduce((acc, m) => acc + toUSD(m, settings), 0);
}
