import clsx from "clsx";
import { Check } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { setAppRate } from "@/actions/settings";
import { ActionButton } from "@/components/action-button";
import { ExchangeCredit, formatTime, RateStatusBadge } from "@/components/exchange";
import { Badge, Card, CardTitle, Empty, PageHeader } from "@/components/ui";
import type { RateStatus } from "@/lib/exchange";
import { getExchangeRates } from "@/lib/exchange";
import { formatDate } from "@/lib/dates";
import { getSettings } from "@/lib/data";
import { formatRate } from "@/lib/money";

export const metadata: Metadata = { title: "Tipo de cambio" };

// en-US: "$10M", "$999.9K" (es-419 mezcla "k" y "K").
const compactUSD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

function RateCard({
  title,
  value,
  valueLabel,
  details,
  footnote,
  status,
  appRate,
}: {
  title: string;
  value: number;
  valueLabel: string;
  details?: ReactNode;
  footnote?: ReactNode;
  status: RateStatus;
  appRate: number;
}) {
  const inUse = Math.abs(appRate - value) < 0.0001;
  return (
    <Card className="flex flex-col">
      <CardTitle action={<RateStatusBadge status={status} />}>{title}</CardTitle>
      <div className="flex items-baseline gap-2">
        <span className="tabular text-3xl font-semibold tracking-tight">{formatRate(value)}</span>
        <span className="text-xs text-muted">Bs · {valueLabel}</span>
      </div>
      {details && <p className="mt-1 text-sm text-muted">{details}</p>}
      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <span className="text-xs text-muted">{footnote}</span>
        {inUse ? (
          <Badge className="bg-success-soft text-success">
            <Check size={12} /> En uso
          </Badge>
        ) : (
          <ActionButton
            action={setAppRate.bind(null, value)}
            variant="secondary"
            label="Usar esta tasa para convertir USD → Bs en toda la app"
          >
            Usar en la app
          </ActionButton>
        )}
      </div>
    </Card>
  );
}

export default async function ExchangePage() {
  const [settings, rates] = await Promise.all([getSettings(), getExchangeRates()]);
  const { tc, banks, p2p } = rates;
  const tz = settings.timezone;

  if (!rates.configured) {
    return (
      <>
        <PageHeader title="Tipo de cambio" />
        <Empty>
          Falta la API key. Agrega <code>WAVESOFT_API_KEY</code> a <code>.env.local</code> (y en Vercel para
          producción) y reinicia el servidor.
        </Empty>
      </>
    );
  }

  const bankList = banks?.banks ?? [];
  const sells = bankList.flatMap((b) => (b.sell ? [b.sell] : []));
  const buys = bankList.flatMap((b) => (b.buy ? [b.buy] : []));
  const bestSell = sells.length ? Math.min(...sells) : null;
  const bestBuy = buys.length ? Math.max(...buys) : null;

  return (
    <>
      <PageHeader
        title="Tipo de cambio"
        subtitle={
          tc
            ? `Dólar en Bolivia · ${formatDate(tc.date, { weekday: "long", day: "numeric", month: "long" })}`
            : "Dólar en Bolivia"
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {tc ? (
          <>
            <RateCard
              title="Oficial BCB"
              value={tc.official.sell}
              valueLabel="por USD"
              details="Tipo de cambio único del Banco Central"
              footnote={`Actualizado ${formatTime(tc.official.fetchedAt, tz)}`}
              status={tc.official.status}
              appRate={settings.usdToLocalRate}
            />
            <RateCard
              title="Paralelo"
              value={tc.parallel.sell}
              valueLabel="venta"
              details={`Compra ${formatRate(tc.parallel.buy)} · Promedio ${formatRate(tc.parallel.average)}`}
              footnote={`Actualizado ${formatTime(tc.parallel.fetchedAt, tz)}`}
              status={tc.parallel.status}
              appRate={settings.usdToLocalRate}
            />
          </>
        ) : (
          <Card className="md:col-span-2">
            <Empty>No se pudo obtener el tipo de cambio oficial ni el paralelo.</Empty>
          </Card>
        )}
        {p2p ? (
          <RateCard
            title="Binance P2P · USDT"
            value={p2p.buy.median}
            valueLabel="comprar"
            details={`Vender ${formatRate(p2p.sell.median)} · Referencia ${formatRate(p2p.referencePrice)}`}
            footnote={`${p2p.buy.ads + p2p.sell.ads} anuncios · ${formatTime(p2p.capturedHour, tz)}`}
            status={p2p.status}
            appRate={settings.usdToLocalRate}
          />
        ) : (
          <Card>
            <Empty>No se pudo obtener el P2P de Binance.</Empty>
          </Card>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">
        La app convierte USD → Bs con {formatRate(settings.usdToLocalRate)} (lo puedes cambiar aquí o en Ajustes).
      </p>

      <Card className="mt-4">
        <CardTitle>Bancos</CardTitle>
        {bankList.length === 0 ? (
          <Empty>No se pudo obtener el tipo de cambio de los bancos.</Empty>
        ) : (
          <>
            <p className="mb-3 text-xs text-muted">
              <b className="font-medium text-fg">Venta</b>: lo que te cobra el banco por cada dólar (compras con tarjeta
              en USD), según su pizarra. <b className="font-medium text-fg">Compra</b>: lo que paga por tus dólares,
              promedio de sus operaciones del {formatDate(banks!.cutoffDate, { weekday: undefined })} reportado al BCB.
            </p>
            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-md text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th className="py-2 pr-3 pl-4 font-medium sm:pl-0">Banco</th>
                    <th className="px-3 py-2 text-right font-medium">Venta</th>
                    <th className="px-3 py-2 text-right font-medium">Compra</th>
                    <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Pizarra compra</th>
                    <th className="py-2 pr-4 pl-3 text-right font-medium sm:pr-0">Operado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bankList.map((b) => (
                    <tr key={b.slug}>
                      <td className="py-2.5 pr-3 pl-4 sm:pl-0">
                        <span className="font-medium" title={b.name}>
                          {b.shortName}
                        </span>
                      </td>
                      <td
                        className={clsx(
                          "tabular px-3 py-2.5 text-right font-semibold",
                          b.sell && b.sell === bestSell && "text-success",
                        )}
                      >
                        {b.sell ? formatRate(b.sell) : <span className="font-normal text-muted">—</span>}
                      </td>
                      <td
                        className={clsx("tabular px-3 py-2.5 text-right", b.buy && b.buy === bestBuy && "text-success")}
                      >
                        {b.buy ? formatRate(b.buy) : <span className="text-muted">—</span>}
                      </td>
                      <td className="tabular hidden px-3 py-2.5 text-right text-muted sm:table-cell">
                        {b.boardBuy ? formatRate(b.boardBuy) : "—"}
                      </td>
                      <td className="tabular py-2.5 pr-4 pl-3 text-right text-muted sm:pr-0">
                        {compactUSD.format(b.amountUsd)}
                        <span className="hidden text-xs md:inline"> · {b.transactions} op.</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted">
              En verde, la venta más barata y la compra más alta. Ordenados por monto operado.
            </p>
          </>
        )}
      </Card>

      <ExchangeCredit className="mt-4" />
    </>
  );
}
