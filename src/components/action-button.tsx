"use client";

import { useTransition, type ReactNode } from "react";
import { buttonClass } from "./ui";

/** Botón que ejecuta una server action ya enlazada (opcionalmente con confirmación). */
export function ActionButton({
  action,
  children,
  confirm,
  label,
  variant = "ghost",
  size = "sm",
  className,
}: {
  action: () => Promise<void>;
  children: ReactNode;
  confirm?: string;
  label?: string;
  variant?: Parameters<typeof buttonClass>[0];
  size?: "sm" | "md";
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={pending}
      className={`${buttonClass(variant, size)} ${className ?? ""}`}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        startTransition(() => action());
      }}
    >
      {children}
    </button>
  );
}
