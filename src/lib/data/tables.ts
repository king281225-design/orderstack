import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma, TableStatus } from "@prisma/client";

/**
 * Live dine-in table status board — a real, persisted Table per table
 * (separate from the QR-code generator on /dashboard/tables, which only
 * ever encodes a label into a link and needs no Table row; see the model's
 * own schema comment). v1 scope, confirmed with the user up front: open/
 * close/reserve a table and transfer it to another — no merge, no
 * split-bill.
 */

export class TableError extends Error {}

// Active = still on the floor / being worked, for "what's currently at this
// table" purposes. Same terminal set createOrder/createManualOrder already
// treat as final everywhere else in this app.
const ACTIVE_ORDER_STATUSES = ["PENDING", "ACCEPTED", "PREPARING", "READY"] as const;

/** Natural-ish sort: numeric labels ("1", "2", "10") sort numerically, non-numeric labels fall back to plain text order after them. */
function compareLabels(a: string, b: string): number {
  const an = Number(a);
  const bn = Number(b);
  const aIsNum = a.trim() !== "" && Number.isFinite(an);
  const bIsNum = b.trim() !== "" && Number.isFinite(bn);
  if (aIsNum && bIsNum) return an - bn;
  if (aIsNum) return -1;
  if (bIsNum) return 1;
  return a.localeCompare(b);
}

export async function listTables(tenantId: string) {
  const tables = await prisma.table.findMany({ where: { tenantId } });
  return tables.sort((a, b) => compareLabels(a.label, b.label));
}

export async function createTable(tenantId: string, label: string, seats: number | null) {
  const trimmed = label.trim();
  if (!trimmed) throw new TableError("Table name/number is required.");
  if (trimmed.length > 40) throw new TableError("Table name is too long.");
  const existing = await prisma.table.findUnique({ where: { tenantId_label: { tenantId, label: trimmed } } });
  if (existing) throw new TableError(`Table "${trimmed}" already exists.`);
  return prisma.table.create({
    data: { tenantId, label: trimmed, seats: seats && seats > 0 ? Math.round(seats) : null },
  });
}

export async function deleteTable(tenantId: string, id: string) {
  const table = await prisma.table.findFirst({ where: { id, tenantId } });
  if (!table) throw new TableError("Table not found.");
  if (table.status !== "AVAILABLE") {
    throw new TableError("Close this table (mark it available) before removing it.");
  }
  await prisma.table.deleteMany({ where: { id, tenantId } });
}

/** Manual status override — the owner can always force any transition by hand (seat a walk-in, take a reservation, reopen after a mistaken close, etc). */
export async function setTableStatus(tenantId: string, id: string, status: TableStatus) {
  const result = await prisma.table.updateMany({ where: { id, tenantId }, data: { status } });
  if (result.count === 0) throw new TableError("Table not found.");
}

/** Every non-terminal order currently sitting at a table label, newest first. */
export async function listActiveOrdersForTable(tenantId: string, label: string) {
  return prisma.order.findMany({
    where: { tenantId, tableLabel: label, status: { in: [...ACTIVE_ORDER_STATUSES] } },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
}

/**
 * Called from inside createOrder/createManualOrder's own transaction for
 * every DINE_IN order — if a real Table row exists for this label and isn't
 * already mid-service (OCCUPIED/BILLING), flips it to OCCUPIED. Never
 * downgrades BILLING back to OCCUPIED (a second round ordered while the
 * first is being paid out shouldn't undo "ready to close"), and is a no-op
 * if no Table with this label exists at all — the QR/manual dine-in flow
 * works identically whether or not the owner has set up the status board.
 */
export async function markTableOccupiedFromOrder(tx: Prisma.TransactionClient, tenantId: string, tableLabel: string | null | undefined) {
  if (!tableLabel) return;
  await tx.table.updateMany({
    where: { tenantId, label: tableLabel, status: { in: ["AVAILABLE", "RESERVED"] } },
    data: { status: "OCCUPIED" },
  });
}

/**
 * Moves a table's current state to another table — every active order at
 * `fromId`'s label gets `toId`'s label instead, `toId` takes over `fromId`'s
 * status, and `fromId` goes back to AVAILABLE. Refuses if the destination
 * isn't AVAILABLE (never silently merges two occupied tables — that's the
 * explicitly out-of-scope "merge" feature, not this).
 */
export async function transferTable(tenantId: string, fromId: string, toId: string) {
  if (fromId === toId) throw new TableError("Pick a different table to transfer to.");
  const [from, to] = await Promise.all([
    prisma.table.findFirst({ where: { id: fromId, tenantId } }),
    prisma.table.findFirst({ where: { id: toId, tenantId } }),
  ]);
  if (!from || !to) throw new TableError("Table not found.");
  if (to.status !== "AVAILABLE") throw new TableError(`Table "${to.label}" isn't available.`);

  await prisma.$transaction([
    prisma.order.updateMany({
      where: { tenantId, tableLabel: from.label, status: { in: [...ACTIVE_ORDER_STATUSES] } },
      data: { tableLabel: to.label },
    }),
    prisma.table.update({ where: { id: to.id }, data: { status: from.status } }),
    prisma.table.update({ where: { id: from.id }, data: { status: "AVAILABLE" } }),
  ]);
}
