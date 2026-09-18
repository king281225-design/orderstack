"use client";

import type { CSSProperties, ComponentType } from "react";
import { useScrollReveal } from "@/components/landing/use-scroll-reveal";
import { BarChartIcon, BoxesIcon, QrCodeIcon, ReceiptIcon, ScooterIcon, TicketIcon } from "@/components/landing/feature-icons";

const FEATURES: { Icon: ComponentType<{ className?: string }>; title: string; description: string }[] = [
  {
    Icon: QrCodeIcon,
    title: "QR table ordering",
    description: "Scan, browse, order — the table number fills in automatically, no app to download.",
  },
  {
    Icon: ScooterIcon,
    title: "Delivery & takeaway",
    description: "Customers choose delivery or takeaway at checkout, and pay by UPI QR or cash on delivery.",
  },
  {
    Icon: ReceiptIcon,
    title: "Billing & invoices",
    description: "GST-ready invoices, manual order entry, and a full order ledger, built into every plan.",
  },
  {
    Icon: BoxesIcon,
    title: "Inventory & stock alerts",
    description: "Track ingredients, auto-deduct stock as orders come in, and get low-stock alerts — in every plan.",
  },
  {
    Icon: TicketIcon,
    title: "KOT by kitchen station",
    description: "Each order is split into Kitchen Order Tickets per station (grill, tandoor, bar) you can print or view live.",
  },
  {
    Icon: BarChartIcon,
    title: "Business analytics",
    description: "Real-time revenue, top-selling items, and order trends from your own dashboard.",
  },
];

/**
 * A compact "what you get" section between the hero and the FAQ — the
 * closest thing this page has to the reference design's 4 feature cards,
 * but describing real, shipped BhojSetu features rather than the
 * reference's Swiggy/Zomato-style delivery-platform integration (out of
 * scope per CLAUDE.md). Same scroll-reveal mechanism as the FAQ section.
 */
export function LandingFeatures() {
  const { ref, visible } = useScrollReveal<HTMLDivElement>();

  return (
    <section ref={ref} className="mx-auto max-w-5xl px-4 pb-16">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ Icon, title, description }, i) => (
          <div
            key={title}
            className={`reveal rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md dark:bg-[#241d17] ${visible ? "is-visible" : ""}`}
            style={{ "--reveal-delay": `${i * 100}ms` } as CSSProperties}
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-sm font-semibold text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
