"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerSession } from "@/lib/auth";
import { getTenantById, setTenantQrCardDesign } from "@/lib/data/tenants";
import { defaultQrCardDesign, sanitizeQrCardDesign, type QrCardDesign } from "@/lib/qr-card";
import { createTable, deleteTable, setTableStatus, transferTable, TableError } from "@/lib/data/tables";
import type { TableStatus } from "@prisma/client";

export async function saveQrCardDesignAction(input: unknown): Promise<{ error: string | null; design?: QrCardDesign }> {
  const session = await requireOwnerSession();
  const tenant = await getTenantById(session.tenantId);
  if (!tenant) return { error: "Restaurant not found." };

  const design = sanitizeQrCardDesign(input, defaultQrCardDesign(tenant));
  await setTenantQrCardDesign(session.tenantId, design);
  revalidatePath("/dashboard/tables");
  return { error: null, design };
}

// ------------------------------------------------------------- status board

export type TableBoardState = { error: string | null };

function failBoard(err: unknown): TableBoardState {
  if (err instanceof TableError) return { error: err.message };
  console.error(err);
  return { error: "Something went wrong. Please try again." };
}

export async function createTableAction(_prev: TableBoardState, formData: FormData): Promise<TableBoardState> {
  const session = await requireOwnerSession();
  const label = String(formData.get("label") ?? "");
  const seatsRaw = String(formData.get("seats") ?? "");
  try {
    await createTable(session.tenantId, label, seatsRaw ? Number(seatsRaw) : null);
  } catch (err) {
    return failBoard(err);
  }
  revalidatePath("/dashboard/tables/board");
  revalidatePath("/dashboard/orders/new");
  return { error: null };
}

export async function deleteTableAction(id: string): Promise<TableBoardState> {
  const session = await requireOwnerSession();
  try {
    await deleteTable(session.tenantId, id);
  } catch (err) {
    return failBoard(err);
  }
  revalidatePath("/dashboard/tables/board");
  revalidatePath("/dashboard/orders/new");
  return { error: null };
}

export async function setTableStatusAction(id: string, status: TableStatus): Promise<TableBoardState> {
  const session = await requireOwnerSession();
  try {
    await setTableStatus(session.tenantId, id, status);
  } catch (err) {
    return failBoard(err);
  }
  revalidatePath("/dashboard/tables/board");
  return { error: null };
}

export async function transferTableAction(fromId: string, toId: string): Promise<TableBoardState> {
  const session = await requireOwnerSession();
  try {
    await transferTable(session.tenantId, fromId, toId);
  } catch (err) {
    return failBoard(err);
  }
  revalidatePath("/dashboard/tables/board");
  return { error: null };
}
