"use client";

import clsx from "clsx";
import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { saveEvent } from "@/actions/events";
import { deleteExpense, quickAddExpense } from "@/actions/expenses";
import { saveTask } from "@/actions/tasks";
import { useToast } from "./toast";
import { buttonClass } from "./ui";

export type QuickKind = "gasto" | "evento" | "pendiente";
const KINDS: { kind: QuickKind; label: string }[] = [
  { kind: "gasto", label: "Gasto" },
  { kind: "evento", label: "Evento" },
  { kind: "pendiente", label: "Pendiente" },
];

const QuickAddContext = createContext<{ open: (kind?: QuickKind) => void }>({ open: () => {} });

export function useQuickAdd() {
  return useContext(QuickAddContext);
}

/**
 * El botón +: un panel que sube desde abajo en el celular (diálogo centrado en la PC)
 * para registrar un gasto, evento o pendiente desde cualquier página.
 * Los formularios llegan ya renderizados desde el servidor.
 */
export function QuickAddProvider({ forms, children }: { forms: Record<QuickKind, ReactNode>; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState<QuickKind>("gasto");
  // Cada vez que se abre, el formulario se vuelve a montar vacío y el diálogo se abre después de renderizar.
  const [openCount, setOpenCount] = useState(0);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const open = useCallback((k: QuickKind = "gasto") => {
    setKind(k);
    setOpenCount((n) => n + 1);
  }, []);

  useEffect(() => {
    if (openCount > 0 && !ref.current?.open) ref.current?.showModal();
  }, [openCount]);

  // showModal enfoca el primer botón: se pasa el foco al primer campo (el monto, así sale el teclado numérico).
  useEffect(() => {
    if (!ref.current?.open) return;
    ref.current.querySelector<HTMLElement>("input:not([type=hidden]):not([type=radio]), textarea")?.focus();
  }, [openCount, kind]);

  const close = () => ref.current?.close();

  function submit(fd: FormData) {
    startTransition(async () => {
      if (kind === "gasto") {
        const { id, alert } = await quickAddExpense(fd);
        if (!id) return;
        close();
        toast({ message: alert ?? "Gasto guardado", action: { label: "Deshacer", onClick: () => deleteExpense(id) } });
      } else if (kind === "evento") {
        await saveEvent(fd);
        close();
        toast({ message: "Evento guardado" });
      } else {
        await saveTask(fd);
        close();
        toast({ message: "Pendiente guardado" });
      }
    });
  }

  return (
    <QuickAddContext.Provider value={{ open }}>
      {children}
      <Suspense fallback={null}>
        <OpenFromUrl open={open} />
      </Suspense>
      <dialog
        ref={ref}
        aria-label="Agregar"
        onClick={(e) => e.target === ref.current && close()}
        className="m-auto max-h-[90dvh] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-border bg-surface p-0 text-fg shadow-2xl max-sm:mb-0 max-sm:w-full max-sm:max-w-full max-sm:rounded-b-none"
      >
        <form key={`${kind}-${openCount}`} action={submit} className="flex flex-col gap-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 rounded-xl bg-surface-2 p-1" role="tablist">
              {KINDS.map((k) => (
                <button
                  key={k.kind}
                  type="button"
                  role="tab"
                  aria-selected={kind === k.kind}
                  onClick={() => setKind(k.kind)}
                  className={clsx(
                    "h-9 flex-1 cursor-pointer rounded-lg text-sm font-medium transition",
                    kind === k.kind ? "bg-surface text-fg shadow-sm" : "text-muted",
                  )}
                >
                  {k.label}
                </button>
              ))}
            </div>
            <button type="button" aria-label="Cerrar" className={buttonClass("ghost", "sm")} onClick={close}>
              <X size={18} />
            </button>
          </div>
          {forms[kind]}
          <button type="submit" className={`${buttonClass("primary")} h-12 text-base`} disabled={pending}>
            {pending ? "Guardando…" : `Guardar ${KINDS.find((k) => k.kind === kind)!.label.toLowerCase()}`}
          </button>
        </form>
      </dialog>
    </QuickAddContext.Provider>
  );
}

/** Atajos del ícono de la app (?nuevo=gasto|evento|pendiente): abre el panel y limpia la URL. */
function OpenFromUrl({ open }: { open: (kind: QuickKind) => void }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const nuevo = params.get("nuevo");
  useEffect(() => {
    if (nuevo && KINDS.some((k) => k.kind === nuevo)) {
      open(nuevo as QuickKind);
      router.replace(pathname);
    }
  }, [nuevo, open, router, pathname]);
  return null;
}
