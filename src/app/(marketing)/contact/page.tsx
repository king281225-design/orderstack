import type { Metadata } from "next";
import { WhatsAppIcon } from "@/components/marketing/whatsapp-icon";
import { BUSINESS_NAME, PHONE_DISPLAY, PHONE_TEL, WHATSAPP_URL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with BhojSetu for a demo, restaurant onboarding help, or any question about the platform.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-gray-700 dark:text-gray-300">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contact Us</h1>

      <p className="mt-6">
        Questions about setting up your restaurant, a demo, or anything else — reach {BUSINESS_NAME}{" "}
        directly:
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-fit items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm hover:-translate-y-0.5 hover:shadow-md dark:bg-[#241d17]"
        >
          <WhatsAppIcon className="flex h-9 w-9 items-center justify-center rounded-full" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Chat on WhatsApp</p>
            <p className="text-xs text-gray-500">{PHONE_DISPLAY}</p>
          </div>
        </a>

        <a
          href={PHONE_TEL}
          className="flex w-fit items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm hover:-translate-y-0.5 hover:shadow-md dark:bg-[#241d17]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
            ☎
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Call us</p>
            <p className="text-xs text-gray-500">{PHONE_DISPLAY}</p>
          </div>
        </a>
      </div>
    </div>
  );
}
