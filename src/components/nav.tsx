"use client";

import clsx from "clsx";
import { CalendarDays, Home, Menu, Plus, Settings, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { SECTIONS, type NavItem, type Section } from "@/lib/sections";
import { useQuickAdd } from "./quick-add";

const SIDEBAR: { title?: string; items: NavItem[] }[] = [
  { items: [{ href: "/", label: "Inicio", icon: Home }] },
  { title: "Agenda", items: SECTIONS.agenda },
  { title: "Dinero", items: SECTIONS.dinero },
  { title: "General", items: [{ href: "/ajustes", label: "Ajustes", icon: Settings }] },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function inSection(pathname: string, section: Section) {
  return SECTIONS[section].some((item) => isActive(pathname, item.href));
}

export function SideNav() {
  const pathname = usePathname();
  const quickAdd = useQuickAdd();
  return (
    <nav className="flex flex-col gap-4">
      {/* Como "Redactar" en Gmail: la acción principal arriba de todo. */}
      <button
        type="button"
        onClick={() => quickAdd.open("gasto")}
        className="flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-accent px-3 text-sm font-medium text-accent-fg shadow-sm transition hover:opacity-90"
      >
        <Plus size={18} /> Nuevo
      </button>
      {SIDEBAR.map((group, i) => (
        <div key={i} className="flex flex-col gap-0.5">
          {group.title && <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{group.title}</p>}
          {group.items.map(({ href, label, icon: Icon }) => (
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
        </div>
      ))}
    </nav>
  );
}

/** Barra de abajo en el celular: Inicio · Agenda · (+) · Dinero · Más (como Wallet o Money Lover). */
export function BottomNav() {
  const pathname = usePathname();
  const quickAdd = useQuickAdd();
  const tabs = [
    { href: "/", label: "Inicio", icon: Home, active: pathname === "/" },
    { href: "/calendario", label: "Agenda", icon: CalendarDays, active: inSection(pathname, "agenda") },
    null,
    { href: "/gastos", label: "Dinero", icon: Wallet, active: inSection(pathname, "dinero") },
    { href: "/mas", label: "Más", icon: Menu, active: isActive(pathname, "/mas") || isActive(pathname, "/ajustes") },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 items-center">
        {tabs.map((tab) =>
          tab ? (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                tab.active ? "text-accent" : "text-muted",
              )}
            >
              <tab.icon size={22} />
              {tab.label}
            </Link>
          ) : (
            <div key="add" className="flex justify-center">
              <button
                type="button"
                aria-label="Agregar gasto, evento o pendiente"
                onClick={() => quickAdd.open("gasto")}
                className="-mt-5 grid size-14 cursor-pointer place-items-center rounded-full bg-accent text-accent-fg shadow-lg ring-4 ring-bg transition active:scale-95"
              >
                <Plus size={28} />
              </button>
            </div>
          ),
        )}
      </div>
    </nav>
  );
}

/** Pestañas de arriba para cambiar entre las páginas de una sección (solo en el celular). */
export function SectionTabs({ section }: { section: Section }) {
  const pathname = usePathname();
  const activeRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);
  return (
    <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:hidden">
      {SECTIONS[section].map(({ href, label }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            ref={active ? activeRef : undefined}
            className={clsx(
              "flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium transition",
              active ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface text-muted",
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
