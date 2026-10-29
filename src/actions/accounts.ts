"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { accountMovements, accounts } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { currency, num, optInt, optStr, str } from "@/lib/form";

export async function saveAccount(fd: FormData) {
  await requireAuth();
  const values = {
    name: str(fd, "name"),
    emoji: str(fd, "emoji") || "🏦",
    currency: currency(fd),
    paymentMethod: optStr(fd, "paymentMethod"),
    initialBalance: str(fd, "initialBalance") ? num(fd, "initialBalance") : 0,
    archived: fd.get("archived") === "on",
  };
  if (!values.name) return;
  const id = optInt(fd, "id");
  if (id) await db.update(accounts).set(values).where(eq(accounts.id, id));
  else await db.insert(accounts).values(values);
  revalidatePath("/", "layout");
}

export async function deleteAccount(id: number) {
  await requireAuth();
  // Los gastos pagados con la cuenta se quedan (sin cuenta); sus ingresos y transferencias se borran.
  await db.delete(accounts).where(eq(accounts.id, id));
  revalidatePath("/", "layout");
}

/** Ingreso, transferencia entre cuentas o ajuste de saldo. */
export async function saveMovement(fd: FormData) {
  await requireAuth();
  const kind = str(fd, "kind");
  const accountId = optInt(fd, "accountId");
  const date = str(fd, "date");
  const note = optStr(fd, "note");
  if (!accountId || !date) return;

  if (kind === "transferencia") {
    const toAccountId = optInt(fd, "toAccountId");
    const amount = num(fd, "amount");
    if (!toAccountId || toAccountId === accountId || amount <= 0) return;
    // Si llegó otra cantidad (otra moneda, comisión), se guarda aparte.
    const toAmount = str(fd, "toAmount") ? num(fd, "toAmount") : amount;
    await db.insert(accountMovements).values({ kind, accountId, toAccountId, amount, toAmount, date, note });
  } else if (kind === "ajuste") {
    // Se escribe el saldo real; se guarda la diferencia con el saldo calculado.
    const diff = num(fd, "newBalance") - num(fd, "currentBalance");
    if (Math.abs(diff) < 0.005) return;
    await db.insert(accountMovements).values({ kind, accountId, amount: Number(diff.toFixed(2)), date, note });
  } else {
    const amount = num(fd, "amount");
    if (amount <= 0) return;
    await db.insert(accountMovements).values({ kind: "ingreso", accountId, amount, date, note });
  }
  revalidatePath("/", "layout");
}

export async function deleteMovement(id: number) {
  await requireAuth();
  await db.delete(accountMovements).where(eq(accountMovements.id, id));
  revalidatePath("/", "layout");
}
