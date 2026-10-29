import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { saveGoal } from "@/actions/goals";
import { FormDialog } from "@/components/form-dialog";
import { GoalFields } from "@/components/forms";
import { GoalCard } from "@/components/goal-card";
import { Card, Empty, PageHeader, ProgressBar, Stat } from "@/components/ui";
import { todayISO } from "@/lib/dates";
import { getGoalsWithProgress, getSettings } from "@/lib/data";
import { formatMoney, sumUSD } from "@/lib/money";

export const metadata: Metadata = { title: "Metas" };

export default async function GoalsPage() {
  const settings = await getSettings();
  const today = todayISO(settings.timezone);
  const goals = await getGoalsWithProgress(true);
  const active = goals.filter((g) => !g.archived);
  const archived = goals.filter((g) => g.archived);

  const savedUSD = sumUSD(active.map((g) => ({ amount: g.saved, currency: g.currency })), settings);
  const targetUSD = sumUSD(active.map((g) => ({ amount: g.targetAmount, currency: g.currency })), settings);
  const completed = active.filter((g) => g.percent >= 100).length;

  return (
    <>
      <PageHeader
        title="Scoreboard"
        subtitle="Tus metas de ahorro"
        actions={
          <FormDialog title="Nueva meta" trigger={<><Plus size={16} /> Meta</>} action={saveGoal}>
            <GoalFields settings={settings} />
          </FormDialog>
        }
      />

      {active.length > 0 && (
        <Card className="mb-4">
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Ahorrado" value={formatMoney(savedUSD, "USD")} />
            <Stat label="Objetivo total" value={formatMoney(targetUSD, "USD")} />
            <Stat label="Metas cumplidas" value={`${completed}/${active.length}`} tone={completed ? "success" : undefined} />
          </div>
          <ProgressBar className="mt-4" value={targetUSD ? (savedUSD / targetUSD) * 100 : 0} />
        </Card>
      )}

      {active.length === 0 ? (
        <Empty>Crea una meta (ej. AirPods 🎧) y ve sumando aportes.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {active
            .sort((a, b) => b.percent - a.percent)
            .map((g) => (
              <GoalCard key={g.id} goal={g} settings={settings} today={today} />
            ))}
        </div>
      )}

      {archived.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-muted">
            Archivadas · {archived.length}
          </summary>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {archived.map((g) => (
              <GoalCard key={g.id} goal={g} settings={settings} today={today} />
            ))}
          </div>
        </details>
      )}
    </>
  );
}
