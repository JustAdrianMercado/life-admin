"use client";

import { X } from "lucide-react";
import { useRef, useTransition, type ReactNode } from "react";
import { buttonClass } from "./ui";

type Props = {
  title: string;
  trigger: ReactNode;
  triggerVariant?: Parameters<typeof buttonClass>[0];
  triggerSize?: "sm" | "md";
  triggerLabel?: string;
  action: (fd: FormData) => Promise<void>;
  submitLabel?: string;
  children: ReactNode;
};

export function FormDialog({
  title,
  trigger,
  triggerVariant = "primary",
  triggerSize = "md",
  triggerLabel,
  action,
  submitLabel = "Guardar",
  children,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        aria-label={triggerLabel}
        title={triggerLabel}
        className={buttonClass(triggerVariant, triggerSize)}
        onClick={() => ref.current?.showModal()}
      >
        {trigger}
      </button>
      <dialog
        ref={ref}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-0 text-fg shadow-2xl"
        onClick={(e) => e.target === ref.current && ref.current?.close()}
      >
        <form
          className="flex flex-col gap-4 p-5"
          action={(fd) =>
            startTransition(async () => {
              await action(fd);
              ref.current?.close();
            })
          }
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              type="button"
              aria-label="Cerrar"
              className={buttonClass("ghost", "sm")}
              onClick={() => ref.current?.close()}
            >
              <X size={16} />
            </button>
          </div>
          {children}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className={buttonClass("secondary")} onClick={() => ref.current?.close()}>
              Cancelar
            </button>
            <button type="submit" className={buttonClass("primary")} disabled={pending}>
              {pending ? "Guardando…" : submitLabel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
