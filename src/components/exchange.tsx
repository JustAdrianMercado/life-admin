import clsx from "clsx";
import type { RateStatus } from "@/lib/exchange";
import { Badge } from "./ui";

/** Crédito obligatorio según las condiciones de uso de la API. */
export function ExchangeCredit({ className }: { className?: string }) {
  return (
    <p className={clsx("text-xs text-muted", className)}>
      Datos:{" "}
      <a href="https://wavesoft.cloud" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
        NextWave Software
      </a>
    </p>
  );
}

export function RateStatusBadge({ status }: { status: RateStatus }) {
  if (status === "UPDATED") return null;
  return (
    <Badge className={status === "STALE" ? "bg-warning-soft text-warning" : "bg-danger-soft text-danger"}>
      {status === "STALE" ? "Sin actualizar" : "Falló"}
    </Badge>
  );
}

export function formatTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit", timeZone }).format(new Date(iso));
}
