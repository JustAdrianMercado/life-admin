import { LogOut, Pencil, Plus, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { logout } from "@/actions/auth";
import { saveNotifySettings } from "@/actions/push";
import { deleteCategory, saveCategory, saveSettings } from "@/actions/settings";
import { ActionButton } from "@/components/action-button";
import { FormDialog } from "@/components/form-dialog";
import { PushManager } from "@/components/push-manager";
import { Button, buttonClass, Card, CardTitle, CategoryBadge, Field, Input, PageHeader, Select } from "@/components/ui";
import type { Category } from "@/db/schema";
import { getCategories, getPushDevices, getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Ajustes" };

function CategoryFields({ category }: { category?: Category }) {
  return (
    <>
      {category && <input type="hidden" name="id" value={category.id} />}
      <div className="grid grid-cols-[4.5rem_1fr_4.5rem] gap-3">
        <Field label="Emoji">
          <Input name="emoji" defaultValue={category?.emoji ?? "📁"} maxLength={4} className="text-center" />
        </Field>
        <Field label="Nombre">
          <Input name="name" defaultValue={category?.name} required />
        </Field>
        <Field label="Color">
          <Input name="color" type="color" defaultValue={category?.color ?? "#6366f1"} className="p-1" />
        </Field>
      </div>
    </>
  );
}

export default async function SettingsPage() {
  const [settings, categories, devices] = await Promise.all([getSettings(), getCategories(), getPushDevices()]);

  return (
    <>
      <PageHeader title="Ajustes" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Moneda y presupuesto</CardTitle>
          <form action={saveSettings} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Moneda local (código ISO)">
                <Input name="localCurrency" defaultValue={settings.localCurrency} maxLength={3} placeholder="BOB, PEN, MXN…" />
              </Field>
              <Field label={`1 USD = ? ${settings.localCurrency}`}>
                <Input name="usdToLocalRate" type="number" step="0.0001" min="0" defaultValue={settings.usdToLocalRate} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Presupuesto mensual (USD)">
                <Input
                  name="monthlyBudgetUsd"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={settings.monthlyBudgetUsd ?? ""}
                  placeholder="Opcional"
                />
              </Field>
              <Field label="Zona horaria">
                <Input name="timezone" defaultValue={settings.timezone} placeholder="America/La_Paz" />
              </Field>
            </div>
            <Button type="submit" className="self-start">
              Guardar
            </Button>
          </form>
        </Card>

        <Card id="notificaciones" className="scroll-mt-6">
          <CardTitle>Notificaciones</CardTitle>
          <p className="mb-4 text-sm text-muted">
            Cada mañana (~8:00) te aviso de los cobros de suscripciones, los eventos del día y los pendientes que vencen.
            {devices.length > 0 &&
              ` Activas en ${devices.length} ${devices.length === 1 ? "dispositivo" : "dispositivos"}.`}
          </p>
          <PushManager />
          <form action={saveNotifySettings} className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
            <Field label="Avisar de un cobro" className="min-w-48 flex-1">
              <Select name="notifyDaysBefore" defaultValue={settings.notifyDaysBefore}>
                <option value="0">Solo el mismo día</option>
                <option value="1">1 día antes y el mismo día</option>
                <option value="2">2 días antes y el mismo día</option>
                <option value="3">3 días antes y el mismo día</option>
                <option value="7">1 semana antes y el mismo día</option>
              </Select>
            </Field>
            <Button type="submit" variant="secondary">
              Guardar
            </Button>
          </form>
        </Card>

        <Card>
          <CardTitle
            action={
              <FormDialog
                title="Nueva categoría"
                trigger={<><Plus size={14} /> Nueva</>}
                triggerSize="sm"
                triggerVariant="secondary"
                action={saveCategory}
              >
                <CategoryFields />
              </FormDialog>
            }
          >
            Categorías
          </CardTitle>
          <ul className="divide-y divide-border">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2">
                <CategoryBadge category={c} />
                <div className="flex">
                  <FormDialog
                    title="Editar categoría"
                    trigger={<Pencil size={14} />}
                    triggerLabel="Editar"
                    triggerVariant="ghost"
                    triggerSize="sm"
                    action={saveCategory}
                  >
                    <CategoryFields category={c} />
                  </FormDialog>
                  <ActionButton
                    action={deleteCategory.bind(null, c.id)}
                    confirm={`¿Eliminar la categoría "${c.name}"? Lo que la use quedará sin categoría.`}
                    variant="danger"
                    label="Eliminar"
                  >
                    <Trash2 size={14} />
                  </ActionButton>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <form action={logout} className="mt-6 md:hidden">
        <button className={buttonClass("secondary")}>
          <LogOut size={16} /> Cerrar sesión
        </button>
      </form>
    </>
  );
}
