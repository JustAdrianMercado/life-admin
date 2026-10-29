import { LogOut } from "lucide-react";
import { logout } from "@/actions/auth";
import { EventFields, QuickExpenseFields, TaskFields } from "@/components/forms";
import { BottomNav, SideNav } from "@/components/nav";
import { QuickAddProvider } from "@/components/quick-add";
import { ToastProvider } from "@/components/toast";
import { buttonClass } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { getAccountOptions, getCategories, getLastPaymentChoice, getSettings } from "@/lib/data";
import { getExchangeRates, suggestedRates } from "@/lib/exchange";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireAuth();
  // Datos del botón + (gasto rápido), disponible en todas las páginas.
  const [settings, categories, accounts, lastPayment, exchange] = await Promise.all([
    getSettings(),
    getCategories(),
    getAccountOptions(),
    getLastPaymentChoice(),
    getExchangeRates(),
  ]);
  const today = todayISO(settings.timezone);
  const forms = {
    gasto: (
      <QuickExpenseFields
        categories={categories}
        settings={settings}
        rates={suggestedRates(exchange, settings)}
        today={today}
        accounts={accounts}
        lastPayment={lastPayment}
      />
    ),
    evento: <EventFields categories={categories} date={today} />,
    pendiente: <TaskFields categories={categories} />,
  };

  return (
    <ToastProvider>
      <QuickAddProvider forms={forms}>
        <div className="mx-auto flex min-h-screen max-w-6xl">
          <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col justify-between overflow-y-auto border-r border-border px-3 py-6 md:flex">
            <div>
              <div className="mb-5 flex items-center gap-2 px-3">
                <span className="grid size-8 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-fg">A</span>
                <span className="font-semibold">Admin</span>
              </div>
              <SideNav />
            </div>
            <form action={logout} className="mt-4">
              <button className={`${buttonClass("ghost")} w-full justify-start`}>
                <LogOut size={16} /> Salir
              </button>
            </form>
          </aside>
          <main className="min-w-0 flex-1 px-4 pt-6 pb-28 sm:px-6 md:pb-10 lg:px-10">{children}</main>
          <BottomNav />
        </div>
      </QuickAddProvider>
    </ToastProvider>
  );
}
