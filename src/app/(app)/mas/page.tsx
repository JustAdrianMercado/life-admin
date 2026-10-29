import { Bell, ChevronRight, Download, LogOut, Settings } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/actions/auth";
import { SECTIONS } from "@/lib/sections";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Más" };

// Lista estilo "Ajustes" de iOS: lo de uso ocasional que no entra en la barra de abajo.
export default function MorePage() {
  return (
    <>
      <PageHeader title="Más" />

      <Group>
        <Row href="/ajustes" icon={<Settings size={18} />} label="Ajustes" hint="Moneda, tipo de cambio, presupuesto, categorías" />
        <Row href="/ajustes#notificaciones" icon={<Bell size={18} />} label="Notificaciones" hint="Avisos de cobros y del día" />
        <li>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5">
              <Icon>
                <Download size={18} />
              </Icon>
              <span className="flex-1 text-sm font-medium">Instalar en el celular</span>
              <ChevronRight size={16} className="text-muted transition group-open:rotate-90" />
            </summary>
            <div className="px-4 pb-4 pl-[3.75rem] text-sm text-muted">
              <p>
                <b className="text-fg">iPhone:</b> en Safari toca Compartir → <i>Agregar a inicio</i>. Ábrela desde ese ícono
                para recibir notificaciones.
              </p>
              <p className="mt-2">
                <b className="text-fg">Android:</b> en Chrome toca ⋮ → <i>Instalar app</i>. Mantén presionado el ícono para
                los atajos (nuevo gasto, evento, pendiente).
              </p>
            </div>
          </details>
        </li>
      </Group>

      <Group title="Agenda">
        {SECTIONS.agenda.map(({ href, label, icon: I }) => (
          <Row key={href} href={href} icon={<I size={18} />} label={label} />
        ))}
      </Group>

      <Group title="Dinero">
        {SECTIONS.dinero.map(({ href, label, icon: I }) => (
          <Row key={href} href={href} icon={<I size={18} />} label={label} />
        ))}
      </Group>

      <form action={logout} className="mt-6">
        <button className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3.5 text-sm font-medium text-danger">
          <LogOut size={16} /> Cerrar sesión
        </button>
      </form>
    </>
  );
}

function Group({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      {title && <h2 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h2>}
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">{children}</ul>
    </section>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">{children}</span>;
}

function Row({ href, icon, label, hint }: { href: string; icon: React.ReactNode; label: string; hint?: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-surface-2">
        <Icon>{icon}</Icon>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{label}</span>
          {hint && <span className="block truncate text-xs text-muted">{hint}</span>}
        </span>
        <ChevronRight size={16} className="text-muted" />
      </Link>
    </li>
  );
}
