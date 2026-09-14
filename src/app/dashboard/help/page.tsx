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
    a: "Those are available on the Advanced and Business plans. Starter includes Menu, Orders & billing, QR table ordering, and UPI/COD checkout. Upgrade any time from Billing.",
  },
  {
    q: "How do I temporarily stop taking orders?",
    a: "Use the \"Open restaurant\" / \"Close restaurant\" toggle on the Orders page — customers immediately see your storefront as closed.",
  },
  {
    q: "I forgot my password — what do I do?",
    a: "Sign out, then use \"Forgot password?\" on the sign-in page. If that email has an account, a reset link is sent to it.",
  },
];

export default function DashboardHelpPage() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-gray-900">Help &amp; FAQ</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {FAQS.map((faq) => (
          <details
            key={faq.q}
            className="group rounded-lg border border-gray-200 bg-white p-4 shadow-sm open:shadow-md open:ring-1 open:ring-indigo-100 dark:bg-[#1e2939]"
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
    </div>
  );
}
