import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import type { Category, Priority } from "@/db/schema";
import { accountValue } from "@/lib/accounts";
import { BANKS, OTHER_METHODS, type AccountOption } from "@/lib/payment-methods";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={clsx("rounded-2xl border border-border bg-surface p-4 sm:p-5", className)} {...props} />;
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{children}</h2>
      {action}
    </div>
  );
}

const buttonVariants = {
  primary: "bg-accent text-accent-fg hover:opacity-90",
  secondary: "border border-border bg-surface hover:bg-surface-2",
  ghost: "hover:bg-surface-2 text-muted hover:text-fg",
  danger: "text-danger hover:bg-danger-soft",
  success: "bg-success-soft text-success hover:opacity-80",
};

export function buttonClass(variant: keyof typeof buttonVariants = "primary", size: "sm" | "md" = "md") {
  return clsx(
    "inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition disabled:opacity-50 cursor-pointer",
    // En el celular los botones chicos también miden 40px para tocarlos sin errar.
    size === "md" ? "h-10 px-4 text-sm" : "h-10 min-w-10 px-2.5 text-xs sm:h-8 sm:min-w-8",
    buttonVariants[variant],
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof buttonVariants; size?: "sm" | "md" }) {
  return <button className={clsx(buttonClass(variant, size), className)} {...props} />;
}

const fieldClass =
  "h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={clsx(fieldClass, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={clsx(fieldClass, "pr-8", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={clsx(fieldClass, "h-auto min-h-20 py-2", className)} {...props} />;
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={clsx("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Badge({ children, className, style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", className)}
      style={style}
    >
      {children}
    </span>
  );
}

export function CategoryBadge({ category }: { category?: Category | null }) {
  if (!category) return null;
  return (
    <Badge style={{ backgroundColor: `${category.color}22`, color: category.color }}>
      <span aria-hidden>{category.emoji}</span>
      {category.name}
    </Badge>
  );
}

const priorityStyles: Record<Priority, string> = {
  urgente: "bg-danger-soft text-danger",
  alta: "bg-warning-soft text-warning",
  media: "bg-accent-soft text-accent",
  baja: "bg-surface-2 text-muted",
};

export const priorityLabel: Record<Priority, string> = {
  urgente: "Urgente",
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge className={priorityStyles[priority]}>{priorityLabel[priority]}</Badge>;
}

export function ProgressBar({ value, color, className }: { value: number; color?: string; className?: string }) {
  const pct = Math.max(0, Math.min(value, 100));
  return (
    <div
      className={clsx("h-2.5 w-full overflow-hidden rounded-full bg-surface-2", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%`, backgroundColor: color ?? "var(--accent)" }}
      />
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "danger" | "success" }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      <span
        className={clsx(
          "tabular text-2xl font-semibold tracking-tight",
          tone === "danger" && "text-danger",
          tone === "success" && "text-success",
        )}
      >
        {value}
      </span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">{children}</p>;
}

export function PaymentMethodOptions({
  accounts = [],
  current,
  emptyLabel = "Sin especificar",
}: {
  accounts?: AccountOption[];
  current?: string | null;
  emptyLabel?: string;
}) {
  // Las cuentas archivadas solo aparecen si son el valor actual.
  const visible = accounts.filter((a) => !a.archived || accountValue(a.id) === current);
  return (
    <>
      <option value="">{emptyLabel}</option>
      {visible.length > 0 && (
        <optgroup label="Tus cuentas">
          {visible.map((a) => (
            <option key={a.id} value={accountValue(a.id)}>
              {a.emoji} {a.name}
            </option>
          ))}
        </optgroup>
      )}
      <optgroup label="Bancos">
        {BANKS.map((b) => (
          <option key={b.slug} value={b.slug}>
            {b.name}
          </option>
        ))}
      </optgroup>
      <optgroup label="Otros">
        {OTHER_METHODS.map((m) => (
          <option key={m.slug} value={m.slug}>
            {m.name}
          </option>
        ))}
      </optgroup>
    </>
  );
}

export function CategoryOptions({ categories }: { categories: Category[] }) {
  return (
    <>
      <option value="">Sin categoría</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.emoji} {c.name}
        </option>
      ))}
    </>
  );
}
