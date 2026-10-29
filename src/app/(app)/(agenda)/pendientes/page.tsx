import clsx from "clsx";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { saveTask } from "@/actions/tasks";
import { FormDialog } from "@/components/form-dialog";
import { TaskFields } from "@/components/forms";
import { sortByPriority, TaskItem } from "@/components/task-item";
import { Card, CardTitle, Empty, PageHeader } from "@/components/ui";
import type { Task } from "@/db/schema";
import { addDays, todayISO } from "@/lib/dates";
import { getCategories, getDoneTasks, getOpenTasks, getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Pendientes" };

export default async function TasksPage({ searchParams }: PageProps<"/pendientes">) {
  const { cat } = await searchParams;
  const categoryFilter = typeof cat === "string" ? Number(cat) : null;

  const settings = await getSettings();
  const today = todayISO(settings.timezone);
  const [allOpen, done, categories] = await Promise.all([getOpenTasks(), getDoneTasks(), getCategories()]);
  const open = categoryFilter ? allOpen.filter((t) => t.categoryId === categoryFilter) : allOpen;

  const weekEnd = addDays(today, 6);
  const dated = open.filter((t) => t.dueDate);
  const groups: { title: string; tasks: Task[]; tone?: string }[] = [
    { title: "Vencidas", tasks: dated.filter((t) => t.dueDate! < today), tone: "text-danger" },
    { title: "Hoy", tasks: dated.filter((t) => t.dueDate === today) },
    { title: "Esta semana", tasks: dated.filter((t) => t.dueDate! > today && t.dueDate! <= weekEnd) },
    { title: "Más adelante", tasks: dated.filter((t) => t.dueDate! > weekEnd) },
  ];
  const undated = open.filter((t) => !t.dueDate).sort(sortByPriority);

  return (
    <>
      <PageHeader
        title="Pendientes"
        subtitle={`${allOpen.length} por hacer`}
        actions={
          <FormDialog title="Nuevo pendiente" trigger={<><Plus size={16} /> Nuevo</>} action={saveTask}>
            <TaskFields categories={categories} />
          </FormDialog>
        }
      />

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <FilterChip href="/pendientes" active={!categoryFilter}>
          Todas
        </FilterChip>
        {categories.map((c) => (
          <FilterChip key={c.id} href={`/pendientes?cat=${c.id}`} active={categoryFilter === c.id}>
            {c.emoji} {c.name}
          </FilterChip>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Con fecha</CardTitle>
          {dated.length === 0 ? (
            <Empty>Nada con fecha límite. 🎉</Empty>
          ) : (
            groups
              .filter((g) => g.tasks.length > 0)
              .map((g) => (
                <div key={g.title} className="mb-2">
                  <h3 className={clsx("text-xs font-semibold", g.tone ?? "text-muted")}>
                    {g.title} · {g.tasks.length}
                  </h3>
                  <ul className="divide-y divide-border">
                    {g.tasks.map((t) => (
                      <TaskItem key={t.id} task={t} categories={categories} today={today} />
                    ))}
                  </ul>
                </div>
              ))
          )}
        </Card>

        <Card>
          <CardTitle>Sin fecha · por prioridad</CardTitle>
          {undated.length === 0 ? (
            <Empty>Nada pendiente sin fecha.</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {undated.map((t) => (
                <TaskItem key={t.id} task={t} categories={categories} today={today} />
              ))}
            </ul>
          )}
        </Card>
      </div>

      {done.length > 0 && (
        <Card className="mt-4">
          <details>
            <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-muted">
              Hechas recientemente · {done.length}
            </summary>
            <ul className="mt-2 divide-y divide-border">
              {done.map((t) => (
                <TaskItem key={t.id} task={t} categories={categories} today={today} />
              ))}
            </ul>
          </details>
        </Card>
      )}
    </>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={clsx(
        "shrink-0 rounded-full border px-3 py-1.5 text-sm transition",
        active ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface text-muted hover:text-fg",
      )}
    >
      {children}
    </Link>
  );
}
