"use client";

import clsx from "clsx";
import { CalendarClock, CheckSquare, Home, PiggyBank, Settings, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/pendientes", label: "Pendientes", icon: CheckSquare },
  { href: "/suscripciones", label: "Suscripciones", icon: CalendarClock },
  { href: "/gastos", label: "Gastos", icon: Wallet },
  { href: "/metas", label: "Metas", icon: PiggyBank },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={clsx(
            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
            isActive(pathname, href) ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2 hover:text-fg",
          )}
        >
          <Icon size={18} />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  // En el celular "Ajustes" queda fuera de la barra; se accede desde Inicio.
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {NAV_ITEMS.slice(0, 5).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
              isActive(pathname, href) ? "text-accent" : "text-muted",
            )}
          >
            <Icon size={20} />
            {label === "Suscripciones" ? "Suscrip." : label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
