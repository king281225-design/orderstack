export type WhatsNewEntry = { id: string; date: string; title: string; description: string };

/**
 * Shown once to each owner/staff login as a "what's new" popup (see
 * WhatsNewModal) — add a new entry here whenever a customer-visible feature
 * ships. Keep newest-first: entries[0].id is what gets compared against the
 * viewer's own localStorage to decide whether they've already seen it.
 */
export const WHATS_NEW: WhatsNewEntry[] = [
  {
    id: "2026-09-26-edit-bill",
    date: "26 Sep",
    title: "Add or remove items on an existing bill",
    description:
      'A customer ordering more (or less) a few minutes later no longer needs a second bill. Open any active order and tap the pencil icon to add or remove items — totals and stock update automatically, and the invoice stays one bill, not two.',
  },
  {
    id: "2026-09-26-mark-as-paid",
    date: "26 Sep",
    title: '"Mark as paid" on New Bill',
    description:
      'New Bill now has a "Mark as paid" checkbox — tick it when the customer settles on the spot, and the printed invoice shows "Payment successful" right away instead of "Payment pending".',
  },
];
