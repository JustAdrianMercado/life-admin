import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { accountIdOf } from "./accounts";
import { payment } from "./form";

/**
 * Como payment(fd), pero si se eligió una cuenta ("acc:<id>") guarda su id
 * y usa el medio de pago asociado a la cuenta (para las tasas y los reportes por banco).
 * `chosen` es el valor tal cual se eligió en el formulario.
 */
export async function readPayment(fd: FormData) {
  const paid = payment(fd);
  const chosen = paid.paymentMethod;
  const accountId = accountIdOf(chosen);
  if (accountId == null) return { values: { ...paid, accountId: null }, chosen };
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
  return {
    values: { ...paid, accountId: account?.id ?? null, paymentMethod: account?.paymentMethod ?? null },
    chosen,
  };
}
