// Color de una barra de presupuesto: verde, ámbar desde el 80 % y rojo desde el 100 %.
export function budgetColor(spent: number, limit: number) {
  const pct = limit > 0 ? (spent / limit) * 100 : 0;
  if (pct >= 100) return "var(--danger)";
  if (pct >= 80) return "var(--warning)";
  return "var(--success)";
}
