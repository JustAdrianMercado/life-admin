import {
  ArrowLeftRight,
  CalendarClock,
  CalendarDays,
  CheckSquare,
  Flame,
  Gauge,
  Landmark,
  PiggyBank,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

// Secciones agrupadas como en las apps de finanzas y agenda: en el celular cada grupo es una pestaña
// de la barra de abajo y sus páginas se cambian con las pestañas de arriba.
export const SECTIONS = {
  agenda: [
    { href: "/calendario", label: "Calendario", icon: CalendarDays },
    { href: "/pendientes", label: "Pendientes", icon: CheckSquare },
    { href: "/habitos", label: "Hábitos", icon: Flame },
  ],
  dinero: [
    { href: "/gastos", label: "Gastos", icon: Wallet },
    { href: "/cuentas", label: "Cuentas", icon: Landmark },
    { href: "/presupuestos", label: "Presupuestos", icon: Gauge },
    { href: "/suscripciones", label: "Suscripciones", icon: CalendarClock },
    { href: "/metas", label: "Metas", icon: PiggyBank },
    { href: "/cambio", label: "Tipo de cambio", icon: ArrowLeftRight },
  ],
} satisfies Record<string, NavItem[]>;

export type Section = keyof typeof SECTIONS;
