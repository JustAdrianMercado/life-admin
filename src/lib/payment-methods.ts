// Medios de pago. Los bancos usan el mismo slug que la API de tipo de cambio.

export const BINANCE_P2P = "binance-p2p";

export const BANKS = [
  { slug: "banco-nacional-de-bolivia", name: "BNB" },
  { slug: "banco-bisa", name: "BISA" },
  { slug: "banco-de-credito", name: "BCP" },
  { slug: "banco-economico", name: "Económico" },
  { slug: "banco-fie", name: "FIE" },
  { slug: "banco-fortaleza", name: "Fortaleza" },
  { slug: "banco-ganadero", name: "Ganadero" },
  { slug: "banco-mercantil-santa-cruz", name: "Mercantil Santa Cruz" },
  { slug: "banco-de-la-nacion-argentina", name: "Nación Argentina" },
  { slug: "banco-prodem", name: "Prodem" },
  { slug: "banco-pyme-de-la-comunidad", name: "PYME de la Comunidad" },
  { slug: "banco-pyme-ecofuturo", name: "Ecofuturo" },
  { slug: "banco-solidario", name: "BancoSol" },
  { slug: "banco-union", name: "Unión" },
];

export const OTHER_METHODS = [
  { slug: BINANCE_P2P, name: "Binance P2P" },
  { slug: "efectivo", name: "Efectivo" },
  { slug: "otro", name: "Otro" },
];

const labels = new Map([...BANKS, ...OTHER_METHODS].map((m) => [m.slug, m.name]));

export function paymentLabel(slug: string | null | undefined) {
  return slug ? (labels.get(slug) ?? slug) : null;
}

export function isBank(slug: string | null | undefined) {
  return !!slug && slug.startsWith("banco-");
}

/** Tasa sugerida (moneda local por 1 USD) para estimar lo que se cobra según el medio de pago. */
export type SuggestedRate = { rate: number; label: string };
export type SuggestedRates = { byMethod: Record<string, SuggestedRate>; fallback: SuggestedRate };
