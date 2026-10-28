import "server-only";
import { unstable_cache } from "next/cache";
import type { Settings } from "@/db/schema";
import { BINANCE_P2P, type SuggestedRates } from "./payment-methods";

// API de tipo de cambio de NextWave Software: https://wavesoft.cloud/developers
const BASE_URL = "https://wavesoft.cloud/api/v1";

export type RateStatus = "UPDATED" | "STALE" | "FAILED";

export type RateQuote = { buy: number; sell: number; average: number; status: RateStatus; fetchedAt: string };

export type TcResponse = { date: string; official: RateQuote; parallel: RateQuote };

export type BankRate = {
  slug: string;
  name: string;
  shortName: string;
  // Compra: lo que el banco paga por tus dólares (promedio de sus operaciones, publicado por el BCB).
  buy: number | null;
  // Venta: lo que el banco te cobra por cada dólar (de su pizarra). null si no la publica.
  sell: number | null;
  boardBuy: number | null;
  boardStale: boolean;
  amountUsd: number;
  transactions: number;
  marketShare: number;
  diffVsOfficial: number | null;
};

export type BanksResponse = {
  cutoffDate: string;
  validFrom: string;
  validTo: string;
  officialMedian: number;
  totalAmountUsd: number;
  totalTransactions: number;
  fetchedAt: string;
  banks: BankRate[];
};

type P2PSide = { median: number; weighted: number; best: number; min: number; max: number; ads: number; volume: number };

export type P2PMarket = {
  asset: string;
  fiat: string;
  capturedHour: string;
  capturedAt: string;
  referencePrice: number;
  // buy: lo que cuesta conseguir 1 USDT · sell: lo que recibes al vender 1 USDT.
  buy: P2PSide;
  sell: P2PSide;
  status: RateStatus;
};

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${process.env.WAVESOFT_API_KEY}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`wavesoft ${path}: HTTP ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

// El oficial y los bancos cambian una vez al día; el P2P se captura cada hora.
// Si la API falla no se guarda nada en caché y se reintenta en la próxima visita.
const getTc = unstable_cache(() => apiGet<TcResponse>("/tc"), ["wavesoft-tc"], { revalidate: 3600 });

const getBanks = unstable_cache(() => apiGet<BanksResponse>("/tc/banks"), ["wavesoft-banks"], { revalidate: 3600 });

const getP2P = unstable_cache(
  async () => {
    const { markets } = await apiGet<{ markets: P2PMarket[] }>("/p2p?fiat=BOB");
    const market = markets.find((m) => m.fiat === "BOB");
    if (!market) throw new Error("wavesoft /p2p: sin datos para BOB");
    return market;
  },
  ["wavesoft-p2p-bob"],
  { revalidate: 900 },
);

async function safe<T>(promise: Promise<T>) {
  try {
    return await promise;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function getExchangeRates() {
  if (!process.env.WAVESOFT_API_KEY) return { configured: false, tc: null, banks: null, p2p: null };
  const [tc, banks, p2p] = await Promise.all([safe(getTc()), safe(getBanks()), safe(getP2P())]);
  return { configured: true, tc, banks, p2p };
}

export type ExchangeRates = Awaited<ReturnType<typeof getExchangeRates>>;

/** Tasa con la que se estima cuánto cobra cada medio de pago por un gasto en USD. */
export function suggestedRates(rates: ExchangeRates, settings: Settings): SuggestedRates {
  const appRate = { rate: settings.usdToLocalRate, label: "tasa de Ajustes" };
  // La API solo cotiza bolivianos.
  if (settings.localCurrency !== "BOB") return { byMethod: {}, fallback: appRate };

  const byMethod: SuggestedRates["byMethod"] = {};
  for (const b of rates.banks?.banks ?? []) {
    if (b.sell) byMethod[b.slug] = { rate: b.sell, label: `venta ${b.shortName} hoy` };
  }
  if (rates.p2p) byMethod[BINANCE_P2P] = { rate: rates.p2p.buy.median, label: "compra USDT en Binance P2P" };
  const official = rates.tc?.official.sell;
  return { byMethod, fallback: official ? { rate: official, label: "oficial BCB hoy" } : appRate };
}
