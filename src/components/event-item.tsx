import { MapPin, Pencil, Repeat, Trash2, Video } from "lucide-react";
import { deleteEvent, saveEvent } from "@/actions/events";
import type { CalendarEvent, Category } from "@/db/schema";
import { isUrl, repeatLabel } from "@/lib/calendar";
import { formatDate, formatTime, relativeDay } from "@/lib/dates";
import { ActionButton } from "./action-button";
import { FormDialog } from "./form-dialog";
import { EventFields } from "./forms";
import { CategoryBadge } from "./ui";

export function eventTime(event: CalendarEvent) {
  const start = formatTime(event.startTime);
  if (!start) return "Todo el día";
  const end = formatTime(event.endTime);
  return end ? `${start} – ${end}` : start;
}

/** Un evento en una fecha concreta (los que se repiten tienen varias). */
export function EventItem({
  event,
  date,
  categories,
  today,
  showDate,
}: {
  event: CalendarEvent;
  date: string;
  categories: Category[];
  today: string;
  showDate?: boolean;
}) {
  const category = event.categoryId ? categories.find((c) => c.id === event.categoryId) : null;
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span
        className="mt-1 h-9 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: category?.color ?? "var(--accent)" }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{event.title}</p>
        <p className="text-xs text-muted">
          {showDate && `${formatDate(date)} (${relativeDay(date, today)}) · `}
          {eventTime(event)}
          {event.repeat !== "none" && (
            <span className="ml-1.5 inline-flex items-center gap-0.5">
              <Repeat size={11} /> {repeatLabel[event.repeat].toLowerCase()}
            </span>
          )}
        </p>
        {event.location && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
            {isUrl(event.location) ? (
              <>
                <Video size={12} className="shrink-0" />
                <a href={event.location} target="_blank" rel="noreferrer" className="truncate text-accent underline">
                  {event.location.replace(/^https?:\/\//, "")}
                </a>
              </>
            ) : (
              <>
                <MapPin size={12} className="shrink-0" /> {event.location}
              </>
            )}
          </p>
        )}
        {event.notes && <p className="mt-0.5 text-xs whitespace-pre-line text-muted">{event.notes}</p>}
        {category && (
          <div className="mt-1">
            <CategoryBadge category={category} />
          </div>
        )}
      </div>
      <div className="flex shrink-0">
        <FormDialog
          title="Editar evento"
          trigger={<Pencil size={14} />}
          triggerLabel="Editar"
          triggerVariant="ghost"
          triggerSize="sm"
          action={saveEvent}
        >
          <EventFields event={event} categories={categories} date={event.date} />
        </FormDialog>
        <ActionButton
          action={deleteEvent.bind(null, event.id)}
          confirm={
            event.repeat === "none" ? `¿Eliminar "${event.title}"?` : `¿Eliminar "${event.title}" y todas sus repeticiones?`
          }
          variant="danger"
          label="Eliminar"
        >
          <Trash2 size={14} />
        </ActionButton>
      </div>
    </li>
  );
}
