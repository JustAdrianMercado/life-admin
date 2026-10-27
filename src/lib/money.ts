import type { Currency, Settings } from "@/db/schema";

export type Money = { amount: number; currency: Currency };

export function toUSD({ amount, currency }: Money, settings: Settings) {
  return currency === "USD" ? amount : amount / settings.usdToLocalRate;
}

export function toLocal({ amount, currency }: Money, settings: Settings) {
  return currency === "LOCAL" ? amount : amount * settings.usdToLocalRate;
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
