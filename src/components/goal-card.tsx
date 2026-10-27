import { Archive, ArchiveRestore, Pencil, Plus, Trash2, X } from "lucide-react";
import { addContribution, deleteContribution, deleteGoal, saveGoal, setGoalArchived } from "@/actions/goals";
import type { Settings } from "@/db/schema";
import type { GoalWithProgress } from "@/lib/data";
import { addDays, daysBetween, formatDate } from "@/lib/dates";
import { currencyCode, formatMoney } from "@/lib/money";
import { ActionButton } from "./action-button";
import { FormDialog } from "./form-dialog";
import { ContributionFields, GoalFields } from "./forms";
import { Badge, Card, ProgressBar } from "./ui";

const MILESTONES = [25, 50, 75, 100];

export function goalStats(goal: GoalWithProgress, today: string) {
  const positives = goal.contributions.filter((c) => c.amount > 0);
  const first = positives.at(-1)?.date;
  // Promedio mensual desde el primer aporte (mínimo un mes para no inflarlo).
  const months = first ? Math.max(daysBetween(first, today) / 30.44, 1) : null;
  const monthlyAvg = months && goal.saved > 0 ? goal.saved / months : null;
  const eta =
    goal.remaining > 0 && monthlyAvg ? addDays(today, Math.ceil((goal.remaining / monthlyAvg) * 30.44)) : null;
  const daysLeft = goal.deadline ? daysBetween(today, goal.deadline) : null;
  const neededPerMonth =
    daysLeft !== null && goal.remaining > 0 ? goal.remaining / Math.max(daysLeft / 30.44, 1) : null;
  return { monthlyAvg, eta, daysLeft, neededPerMonth };
}

function color(percent: number) {
  if (percent >= 100) return "var(--success)";
  if (percent >= 50) return "var(--accent)";
  return "var(--warning)";
}

export function GoalCard({
  goal,
  settings,
  today,
  compact,
}: {
  goal: GoalWithProgress;
  settings: Settings;
  today: string;
  compact?: boolean;
}) {
  const code = currencyCode(goal.currency, settings);
  const money = (n: number) => formatMoney(n, code);
  const { monthlyAvg, eta, daysLeft, neededPerMonth } = goalStats(goal, today);
  const complete = goal.percent >= 100;

  if (compact) {
    return (
      <li className="py-2.5">
        <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
          <span className="truncate font-medium">
            {goal.emoji} {goal.name}
          </span>
          <span className="tabular shrink-0 text-muted">
            <span className="font-semibold text-fg">{Math.floor(goal.percent)}%</span> · {money(goal.saved)} /{" "}
            {money(goal.targetAmount)}
          </span>
        </div>
        <ProgressBar value={goal.percent} color={color(goal.percent)} />
      </li>
    );
  }

  return (
    <Card className={goal.archived ? "opacity-60" : undefined}>
      <div className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-2xl" aria-hidden>
          {goal.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{goal.name}</h3>
          <p className="tabular text-sm text-muted">
            {money(goal.saved)} de {money(goal.targetAmount)}
          </p>
        </div>
        <span className="tabular text-3xl font-bold tracking-tight" style={{ color: color(goal.percent) }}>
          {Math.floor(goal.percent)}%
        </span>
      </div>

      <ProgressBar value={goal.percent} color={color(goal.percent)} className="mt-4 h-3" />
      <div className="mt-2 flex gap-1.5">
        {MILESTONES.map((m) => (
          <Badge
            key={m}
            className={goal.percent >= m ? "bg-success-soft text-success" : "bg-surface-2 text-muted"}
          >
            {m === 100 ? "🏆" : "⭐"} {m}%
          </Badge>
        ))}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted">Te falta</dt>
          <dd className="tabular font-semibold">{complete ? "¡Nada! 🎉" : money(goal.remaining)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Promedio mensual</dt>
          <dd className="tabular font-semibold">{monthlyAvg ? money(monthlyAvg) : "—"}</dd>
        </div>
        {goal.deadline && (
          <div>
            <dt className="text-xs text-muted">Fecha límite</dt>
            <dd className={`font-semibold ${daysLeft !== null && daysLeft < 0 && !complete ? "text-danger" : ""}`}>
              {formatDate(goal.deadline, { year: "numeric" })}
              {daysLeft !== null && !complete && (
                <span className="block text-xs font-normal text-muted">
                  {daysLeft >= 0 ? `${daysLeft} días` : "vencida"}
                  {neededPerMonth && ` · ${money(neededPerMonth)}/mes`}
                </span>
              )}
            </dd>
          </div>
        )}
        {!complete && (
          <div>
            <dt className="text-xs text-muted">A este ritmo llegas</dt>
            <dd className="font-semibold">{eta ? formatDate(eta, { year: "numeric" }) : "Aporta para estimar"}</dd>
          </div>
        )}
      </dl>

      {goal.contributions.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-medium text-muted">
            Historial · {goal.contributions.length}{" "}
            {goal.contributions.length === 1 ? "movimiento" : "movimientos"}
          </summary>
          <ul className="mt-2 divide-y divide-border text-sm">
            {goal.contributions.map((c) => (
              <li key={c.id} className="flex items-center gap-2 py-1.5">
                <span className="text-xs text-muted">{formatDate(c.date)}</span>
                <span className="min-w-0 flex-1 truncate text-xs">{c.note}</span>
                <span className={`tabular font-medium ${c.amount < 0 ? "text-danger" : "text-success"}`}>
                  {c.amount > 0 ? "+" : ""}
                  {money(c.amount)}
                </span>
                <ActionButton action={deleteContribution.bind(null, c.id)} label="Quitar" confirm="¿Quitar este movimiento?">
                  <X size={12} />
                </ActionButton>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="mt-4 flex items-center gap-1 border-t border-border pt-3">
        {!goal.archived && (
          <FormDialog
            title={`Aportar a ${goal.name}`}
            trigger={<><Plus size={14} /> Aportar</>}
            triggerSize="sm"
            action={addContribution}
          >
            <ContributionFields goalId={goal.id} today={today} />
          </FormDialog>
        )}
        <span className="flex-1" />
        <FormDialog
          title="Editar meta"
          trigger={<Pencil size={14} />}
          triggerLabel="Editar"
          triggerVariant="ghost"
          triggerSize="sm"
          action={saveGoal}
        >
          <GoalFields goal={goal} settings={settings} />
        </FormDialog>
        <ActionButton
          action={setGoalArchived.bind(null, goal.id, !goal.archived)}
          label={goal.archived ? "Reactivar" : "Archivar"}
        >
          {goal.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
        </ActionButton>
        <ActionButton
          action={deleteGoal.bind(null, goal.id)}
          confirm={`¿Eliminar la meta "${goal.name}" y su historial?`}
          variant="danger"
          label="Eliminar"
        >
          <Trash2 size={14} />
        </ActionButton>
      </div>
    </Card>
  );
}
