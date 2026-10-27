import { LogOut } from "lucide-react";
import { logout } from "@/actions/auth";
import { BottomNav, SideNav } from "@/components/nav";
import { buttonClass } from "@/components/ui";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireAuth();
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col justify-between border-r border-border px-3 py-6 md:flex">
        <div>
          <div className="mb-6 flex items-center gap-2 px-3">
            <span className="grid size-8 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-fg">A</span>
            <span className="font-semibold">Admin</span>
          </div>
          <SideNav />
        </div>
        <form action={logout}>
          <button className={`${buttonClass("ghost")} w-full justify-start`}>
            <LogOut size={16} /> Salir
          </button>
        </form>
      </aside>
      <main className="min-w-0 flex-1 px-4 pt-6 pb-28 sm:px-6 md:pb-10 lg:px-10">{children}</main>
      <BottomNav />
    </div>
  );
}
