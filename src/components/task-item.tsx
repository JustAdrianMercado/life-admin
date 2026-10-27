import clsx from "clsx";
import { Check, Clock, Pencil, Trash2 } from "lucide-react";
import { deleteTask, saveTask, setTaskDone } from "@/actions/tasks";
import type { Category, Priority, Task } from "@/db/schema";
import { daysBetween, formatDate, formatTime, relativeDay } from "@/lib/dates";
import { ActionButton } from "./action-button";
import { FormDialog } from "./form-dialog";
import { TaskFields } from "./forms";
import { CategoryBadge, PriorityBadge } from "./ui";

export const PRIORITY_ORDER: Record<Priority, number> = { urgente: 0, alta: 1, media: 2, baja: 3 };

export function sortByPriority(a: Task, b: Task) {
  return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.createdAt.getTime() - b.createdAt.getTime();
}

export function TaskItem({
  task,
  categories,
  today,
  compact,
}: {
  task: Task;
  categories: Category[];
  today: string;
  compact?: boolean;
}) {
  const done = task.status === "hecha";
  const category = categories.find((c) => c.id === task.categoryId);
  const overdue = !done && task.dueDate && daysBetween(today, task.dueDate) < 0;

  return (
    <li className="flex items-start gap-3 py-3">
      <ActionButton
        action={setTaskDone.bind(null, task.id, !done)}
        label={done ? "Marcar como pendiente" : "Marcar como hecha"}
        variant="ghost"
        className={clsx(
          "mt-0.5 size-6 shrink-0 !rounded-full !p-0 border-2",
          done ? "border-success bg-success text-white" : "border-border",
        )}
      >
        {done && <Check size={14} />}
      </ActionButton>
      <div className="min-w-0 flex-1">
        <p className={clsx("text-sm font-medium", done && "text-muted line-through")}>{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          {!done && <PriorityBadge priority={task.priority} />}
          <CategoryBadge category={category} />
          {task.dueDate && (
            <span className={clsx("inline-flex items-center gap-1", overdue && "font-medium text-danger")}>
              <Clock size={12} />
              {formatDate(task.dueDate)}
              {task.dueTime && ` ${formatTime(task.dueTime)}`} · {relativeDay(task.dueDate, today)}
            </span>
          )}
          {task.status === "en_progreso" && <span className="text-accent">En progreso</span>}
        </div>
        {task.notes && !compact && <p className="mt-1 text-xs text-muted">{task.notes}</p>}
      </div>
      {!compact && (
        <div className="flex shrink-0 items-center">
          <FormDialog
            title="Editar pendiente"
            trigger={<Pencil size={14} />}
            triggerLabel="Editar"
            triggerVariant="ghost"
            triggerSize="sm"
            action={saveTask}
          >
            <TaskFields task={task} categories={categories} />
          </FormDialog>
          <ActionButton
            action={deleteTask.bind(null, task.id)}
            confirm={`¿Eliminar "${task.title}"?`}
            variant="danger"
            label="Eliminar"
          >
            <Trash2 size={14} />
          </ActionButton>
        </div>
      )}
    </li>
  );
}
