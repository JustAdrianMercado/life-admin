import { Archive, Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import { archiveHabit, saveHabit } from "@/actions/habits";
import { ActionButton } from "@/components/action-button";
import { FormDialog } from "@/components/form-dialog";
import { HabitCheck, HabitHeatmap } from "@/components/habit-check";
import { Card, CardTitle, Empty, Field, Input, PageHeader, Select } from "@/components/ui";
import type { Habit } from "@/db/schema";
import { addDays, todayISO } from "@/lib/dates";
import { getHabitChecksSince, getHabits, getSettings } from "@/lib/data";
import { countInWeek, habitStreak, heatmapWeeks, HISTORY_DAYS, isDaily, milestone, targetLabel } from "@/lib/habits";

export const metadata: Metadata = { title: "Hábitos" };

export default async function HabitsPage() {
  const settings = await getSettings();
  const today = todayISO(settings.timezone);
  const [habits, checks] = await Promise.all([getHabits(), getHabitChecksSince(addDays(today, -HISTORY_DAYS))]);
  const weeks = heatmapWeeks(today);

  const rows = habits.map((h) => {
    const dates = checks.filter((c) => c.habitId === h.id).map((c) => c.date);
    const set = new Set(dates);
    const streak = habitStreak(set, h.targetPerWeek, today);
    return { habit: h, dates, doneToday: set.has(today), streak, week: countInWeek(set, today) };
  });
  const doneCount = rows.filter((r) => r.doneToday).length;

  return (
    <>
      <PageHeader
        title="Hábitos"
        subtitle={habits.length > 0 ? `Hoy: ${doneCount} de ${habits.length}` : "Pequeñas cosas que quieres hacer seguido"}
        actions={
          <FormDialog title="Nuevo hábito" trigger={<><Plus size={16} /> Hábito</>} action={saveHabit}>
            <HabitFields />
          </FormDialog>
        }
      />

      {habits.length === 0 ? (
        <Empty>
          Crea tu primer hábito: 🏋️ Gym 3 veces por semana, 📖 Leer 20 min, 💧 Tomar agua, 🧘 Meditar… Lo marcas con un
          toque y ves tu racha.
        </Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardTitle>Hoy</CardTitle>
            <ul className="divide-y divide-border">
              {rows.map(({ habit: h, doneToday, streak, week }) => (
                <li key={h.id} className="flex items-center gap-3 py-3">
                  <HabitCheck habitId={h.id} date={today} done={doneToday} color={h.color} label={h.name} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      <span aria-hidden>{h.emoji}</span> {h.name}
                    </p>
                    <p className="text-xs text-muted">
                      {isDaily(h.targetPerWeek) ? targetLabel(h.targetPerWeek) : `${week} de ${h.targetPerWeek} esta semana`}
                      {streak.count > 0 && ` · 🔥 ${streak.count} ${streak.unit}`}
                    </p>
                    {milestone(streak) && <p className="text-xs font-medium text-success">{milestone(streak)}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {rows.map(({ habit: h, dates, streak }) => (
            <Card key={h.id}>
              <CardTitle
                action={
                  <div className="flex">
                    <FormDialog title="Editar hábito" trigger={<Pencil size={14} />} triggerLabel="Editar" triggerVariant="ghost" triggerSize="sm" action={saveHabit}>
                      <HabitFields habit={h} />
                    </FormDialog>
                    <ActionButton action={archiveHabit.bind(null, h.id)} confirm={`¿Archivar "${h.name}"? Su historial se guarda.`} label="Archivar">
                      <Archive size={14} />
                    </ActionButton>
                  </div>
                }
              >
                {h.emoji} {h.name}
              </CardTitle>
              <HabitHeatmap habitId={h.id} weeks={weeks} checked={dates} today={today} color={h.color} />
              <p className="mt-2 text-xs text-muted">
                {targetLabel(h.targetPerWeek)} · racha actual {streak.count} {streak.unit} · últimas 12 semanas (toca un día para
                marcarlo)
              </p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function HabitFields({ habit }: { habit?: Habit }) {
  return (
    <>
      {habit && <input type="hidden" name="id" value={habit.id} />}
      <div className="grid grid-cols-[4.5rem_1fr_4.5rem] gap-3">
        <Field label="Emoji">
          <Input name="emoji" defaultValue={habit?.emoji ?? "✅"} maxLength={4} className="text-center" />
        </Field>
        <Field label="Hábito">
          <Input name="name" defaultValue={habit?.name} placeholder="Gym, leer, meditar…" required />
        </Field>
        <Field label="Color">
          <Input name="color" type="color" defaultValue={habit?.color ?? "#4f46e5"} className="p-1" />
        </Field>
      </div>
      <Field label="Meta">
        <Select name="targetPerWeek" defaultValue={habit?.targetPerWeek ?? 7}>
          <option value="7">Todos los días</option>
          {[6, 5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "vez" : "veces"} por semana
            </option>
          ))}
        </Select>
      </Field>
    </>
  );
}
