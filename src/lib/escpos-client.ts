"use client";

import { buildInvoiceEscPos, buildKotEscPos, bytesToBase64, type InvoiceData, type KotTicketData } from "@/lib/escpos";
import type { ThermalWidth } from "@/lib/print-prefs";
import { getPersistedThermalWidth } from "@/lib/print-prefs-client";

/**
 * The ESC/POS bytes are built in the browser at the moment of printing, not
 * on the server at render time — the roll width the owner saved (see
 * print-prefs-client.ts) lives only in this device's localStorage, so a
 * server-built payload could only ever use the 80mm default. That was a real
 * bug: a 58mm printer kept getting 48-column lines that its firmware then
 * wrapped mid-word.
 */
export function kotEscPosBase64(data: KotTicketData): string {
  return bytesToBase64(buildKotEscPos({ widthMm: Number(getPersistedThermalWidth()), ...data }));
}

export function invoiceEscPosBase64(data: InvoiceData, width: ThermalWidth): string {
  return bytesToBase64(buildInvoiceEscPos({ widthMm: Number(width), ...data }));
}
