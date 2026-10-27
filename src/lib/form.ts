import type { Currency, Priority } from "@/db/schema";

export function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

export function optStr(fd: FormData, key: string) {
  return str(fd, key) || null;
}

export function num(fd: FormData, key: string) {
  const n = Number(str(fd, key).replace(",", "."));
  if (!Number.isFinite(n)) throw new Error(`Número inválido en "${key}"`);
  return n;
}

export function optInt(fd: FormData, key: string) {
  const v = str(fd, key);
  return v ? Number.parseInt(v, 10) : null;
}

export function currency(fd: FormData): Currency {
  return str(fd, "currency") === "LOCAL" ? "LOCAL" : "USD";
}

const PRIORITIES: Priority[] = ["baja", "media", "alta", "urgente"];
export function priority(fd: FormData): Priority {
  const v = str(fd, "priority") as Priority;
  return PRIORITIES.includes(v) ? v : "media";
}
