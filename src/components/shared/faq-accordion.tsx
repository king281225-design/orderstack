"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { useScrollReveal } from "@/components/landing/use-scroll-reveal";

type Faq = { q: string; a: string };

/**
 * Shared animated FAQ accordion — scroll-triggered staggered entrance plus
 * an open-one-at-a-time accordion (grid-template-rows 0fr->1fr trick for a
 * real animated height, no JS height measurement). Originally built for the
 * homepage (src/components/landing/landing-faq.tsx, which now just wraps
 * this) and pulled out so /pricing and any future FAQ block get the same
 * polished interaction instead of a plain static list.
 */
export function FaqAccordion({ faqs, columns = 2 }: { faqs: Faq[]; columns?: 1 | 2 }) {
  const { ref: sectionRef, visible } = useScrollReveal<HTMLDivElement>();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div ref={sectionRef} className={`grid gap-3 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
      {faqs.map((faq, i) => {
        const open = openIndex === i;
        return (
          <div
            key={faq.q}
            className={`reveal rounded-lg border bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md dark:bg-[#241d17] ${
              open ? "border-indigo-400 shadow-md ring-1 ring-indigo-100 dark:ring-indigo-500/20" : "border-gray-200 dark:border-white/10"
            } ${visible ? "is-visible" : ""}`}
            style={{ "--reveal-delay": `${i * 80}ms` } as CSSProperties}
          >
            <button
              type="button"
              aria-expanded={open}
              aria-controls={`faq-panel-${columns}-${i}`}
              onClick={() => setOpenIndex(open ? null : i)}
              className="group flex w-full items-start justify-between gap-2 text-left text-sm font-semibold text-gray-900 dark:text-white"
            >
              {faq.q}
              <span
                className={`mt-0.5 shrink-0 text-indigo-500 transition-transform duration-300 dark:text-indigo-400 ${
                  open ? "rotate-45" : "group-hover:scale-110"
                }`}
              >
                +
              </span>
            </button>
            <div id={`faq-panel-${columns}-${i}`} className={`accordion-panel ${open ? "is-open" : ""}`}>
              <div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{faq.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
