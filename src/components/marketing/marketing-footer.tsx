import Link from "next/link";
import { WhatsAppIcon } from "@/components/marketing/whatsapp-icon";
import { BUSINESS_NAME, PHONE_DISPLAY, PHONE_TEL, WHATSAPP_URL } from "@/lib/contact";

const COMPANY_LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact Us" },
  { href: "/blog", label: "Blog" },
  { href: "/compare/bhojsetu-vs-petpooja", label: "vs Petpooja" },
];

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund", label: "Refund / Cancellation Policy" },
];

/** The brief's "footer with legal pages" ask — see src/app/(marketing)/layout.tsx. */
export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-white dark:border-white/10 dark:bg-[#1a120c]">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 text-sm sm:grid-cols-3">
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{BUSINESS_NAME}</p>
          <p className="mt-2 max-w-xs text-gray-500 dark:text-gray-400">
            Real ordering for real restaurants — menus, orders, and billing on your own storefront.
          </p>
          <div className="mt-3 flex flex-col gap-2 text-gray-500 dark:text-gray-400">
            <a href={PHONE_TEL} className="hover:text-indigo-600 dark:hover:text-indigo-400">
              {PHONE_DISPLAY}
            </a>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              <WhatsAppIcon className="flex h-4 w-4 items-center justify-center rounded-full" />
              Chat on WhatsApp
            </a>
          </div>
        </div>

        <div>
          <p className="font-semibold text-gray-900 dark:text-white">Company</p>
          <ul className="mt-2 flex flex-col gap-2 text-gray-500 dark:text-gray-400">
            {COMPANY_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-semibold text-gray-900 dark:text-white">Legal</p>
          <ul className="mt-2 flex flex-col gap-2 text-gray-500 dark:text-gray-400">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-100 px-4 py-4 text-center text-xs text-gray-400 dark:border-white/5">
        © {year} {BUSINESS_NAME}. All rights reserved.
      </div>
    </footer>
  );
}
