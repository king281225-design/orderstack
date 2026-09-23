import { requireTenantSession } from "@/lib/auth";
import { getTenantById } from "@/lib/data/tenants";
import {
  CATEGORY_LABEL,
  PRIORITY_LABEL,
  STATUS_LABEL,
  SUPPORT_AREAS,
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  listTicketsForTenant,
} from "@/lib/data/support";
import { PHONE_DISPLAY, PHONE_TEL, SUPPORT_RESPONSE_TARGET, buildWhatsAppUrl } from "@/lib/contact";
import { SupportForm } from "@/components/help/support-form";
import type { SupportStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<SupportStatus, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  WAITING_ON_CUSTOMER: "bg-purple-100 text-purple-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-700",
};

const FAQS = [
  {
    q: "How do I add items to my menu?",
    a: "Go to Menu, add a category, then add items under it (name, price, description, an optional photo). You can also upload a photo/PDF of your paper menu and have it read in automatically, or load a sample menu to start from.",
  },
  {
    q: "How do customers pay?",
    a: "UPI QR code (set your UPI ID in Settings) or Cash on Delivery. The customer picks one at checkout — no card details ever touch this app.",
  },
  {
    q: "How does table QR ordering work?",
    a: "Generate QR codes for your tables from the Tables page and print them. Scanning one opens your menu with Dine-in and the table number already filled in at checkout.",
  },
  {
    q: "How do I create a manual/walk-in bill?",
    a: "Use New bill to add line items by hand (or pick from your menu), apply a discount, and set the GST rate. It saves as a normal order and takes you straight to a printable invoice.",
  },
  {
    q: "How do I print an invoice?",
    a: "Open any order and use Print bill — it's a clean, tenant-branded invoice with a \"Print / Save as PDF\" button, plus a narrow thermal-receipt layout if you print on an 80mm roll.",
  },
  {
    q: "Why can't I see Kitchen, Coupons, Analytics, or Staff?",
    a: "Those are available on the Advanced and Business plans. Every plan (including Starter) includes Menu, Orders & billing, QR table ordering, Inventory, KOT, and UPI/COD checkout. Upgrade any time from Billing.",
  },
  {
    q: "How do I temporarily stop taking orders?",
    a: "Use the \"Open restaurant\" / \"Close restaurant\" toggle on the Orders page — customers immediately see your storefront as closed.",
  },
  {
    q: "I forgot my password — what do I do?",
    a: "Sign out, then use \"Forgot password?\" on the sign-in page. If that email has an account, a reset link is sent to it.",
  },
  {
    q: "My printer won't connect / Chrome says \"Searching for printers\"",
    a: "Printing here just uses your browser's normal Print dialog, so any printer your device already has installed will work — no extra setup in BhojSetu. If it won't connect, it's almost always one of two things: (1) the printer is USB-only and another app (e.g. an older billing/POS system) already has it locked, so this device can't also see it — a network/WiFi thermal printer (or a cheap USB-to-LAN print server adapter) fixes this, since both apps can print to it independently. (2) it needs to be added manually: on the device, go to Settings → Print and Scan → Add printer, and if auto-search doesn't find it, add it by IP address using either IPP or Socket/JetDirect on port 9100 (works with almost every thermal printer). Once it's added and set as default, hit Print on any KOT or invoice here and pick it — use the 80mm toggle to match a receipt roll.",
  },
];

export default async function DashboardHelpPage() {
  const session = await requireTenantSession();
  const [tenant, tickets] = await Promise.all([
    getTenantById(session.tenantId),
    listTicketsForTenant(session.tenantId),
  ]);
  if (!tenant) return null;
  const last = tickets[0];

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Help &amp; Support</h2>
            <p className="text-sm text-gray-500">
              Stuck or have a question? Tell us below — our team aims to respond within {SUPPORT_RESPONSE_TARGET}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={buildWhatsAppUrl(`Hi, I need help with my BhojSetu account (${tenant.name}).`)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              WhatsApp us
            </a>
            <a
              href={PHONE_TEL}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-indigo-400"
            >
              Call {PHONE_DISPLAY}
            </a>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:bg-[#241d17]">
          <h3 className="mb-3 text-base font-semibold text-gray-900">Contact the support team</h3>
          <SupportForm
            restaurantName={tenant.name}
            responseTarget={SUPPORT_RESPONSE_TARGET}
            categories={SUPPORT_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
            priorities={SUPPORT_PRIORITIES}
            areas={[...SUPPORT_AREAS]}
            defaults={{
              name: last?.contactName ?? "",
              phone: last?.contactPhone ?? "",
              email: last?.contactEmail ?? session.email,
            }}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="my-requests">
        <h3 id="my-requests" className="text-base font-semibold text-gray-900">
          Your requests
        </h3>
        {tickets.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing yet. Requests you send will show up here with their status.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {tickets.map((t) => (
              <li key={t.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-[#241d17]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">
                    #{t.ticketNumber} · {t.subject}
                  </p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[t.status]}`}>
                    {STATUS_LABEL[t.status]}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {CATEGORY_LABEL[t.category]} · {PRIORITY_LABEL[t.priority]} · sent {t.createdAt.toLocaleString("en-IN")}
                </p>
                {t.adminResponse ? (
                  <div className="mt-3 rounded-md bg-indigo-50 p-3 text-sm text-indigo-950 dark:bg-indigo-500/10 dark:text-indigo-100">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                      Reply from the BhojSetu team
                    </p>
                    <p className="whitespace-pre-wrap">{t.adminResponse}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-gray-500">We&apos;ve got this and will reply here soon.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold text-gray-900">Frequently asked questions</h3>
        <div className="grid gap-3 sm:grid-cols-2">
        {FAQS.map((faq) => (
          <details
            key={faq.q}
            className="group rounded-lg border border-gray-200 bg-white p-4 shadow-sm open:shadow-md open:ring-1 open:ring-indigo-100 dark:bg-[#241d17]"
          >
            <summary className="cursor-pointer list-none text-sm font-semibold text-gray-900 marker:content-none">
              <span className="flex items-start justify-between gap-2">
                {faq.q}
                <span className="mt-0.5 shrink-0 text-indigo-500 transition-transform group-open:rotate-45">
                  +
                </span>
              </span>
            </summary>
            <p className="mt-2 text-sm text-gray-600">{faq.a}</p>
          </details>
        ))}
      </div>
      </section>
    </div>
  );
}
