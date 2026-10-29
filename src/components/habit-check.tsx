"use client";

import clsx from "clsx";
import { Check } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { toggleHabit } from "@/actions/habits";
import { formatDate } from "@/lib/dates";

/** Botón grande para marcar un hábito hoy; cambia al instante y se guarda en segundo plano. */
export function HabitCheck({ habitId, date, done, color, label }: { habitId: number; date: string; done: boolean; color: string; label: string }) {
  const [optimistic, setOptimistic] = useOptimistic(done);
  const [, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={optimistic}
      aria-label={optimistic ? `Desmarcar ${label}` : `Marcar ${label}`}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic);
          await toggleHabit(habitId, date, !optimistic);
        })
      }
      className={clsx(
        "grid size-12 shrink-0 cursor-pointer place-items-center rounded-full border-2 transition active:scale-90",
        optimistic ? "text-white" : "bg-surface text-transparent",
      )}
      style={{ borderColor: color, backgroundColor: optimistic ? color : undefined }}
    >
      <Check size={24} strokeWidth={3} />
    </button>
  );
}

/** Mapa de calor de las últimas semanas (columnas = semanas, filas = lunes a domingo). Tocar un día lo marca. */
export function HabitHeatmap({
  habitId,
  weeks,
  checked,
  today,
  color,
}: {
  habitId: number;
  weeks: string[][];
  checked: string[];
  today: string;
  color: string;
}) {
  const [optimistic, toggle] = useOptimistic(new Set(checked), (set, date: string) => {
    const next = new Set(set);
    if (next.has(date)) next.delete(date);
    else next.add(date);
    return next;
  });
  const [, startTransition] = useTransition();
  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {weeks.map((week) => (
        <div key={week[0]} className="flex flex-col gap-1">
          {week.map((date) => {
            const future = date > today;
            const done = optimistic.has(date);
            return (
              <button
                key={date}
                type="button"
                disabled={future}
                title={formatDate(date)}
                aria-label={`${formatDate(date)}: ${done ? "hecho" : "sin marcar"}`}
                onClick={() =>
                  startTransition(async () => {
                    toggle(date);
                    await toggleHabit(habitId, date, !done);
                  })
                }
                className={clsx(
                  "size-4 cursor-pointer rounded-[4px] transition disabled:cursor-default sm:size-5",
                  !done && (future ? "bg-transparent" : "bg-surface-2"),
                  date === today && "ring-2 ring-fg/40",
                )}
                style={done ? { backgroundColor: color } : undefined}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
