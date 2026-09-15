"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { useScrollReveal } from "@/components/landing/use-scroll-reveal";

type Faq = { q: string; a: string };

/**
 * FAQ section: scroll-triggered entrance (heading, then cards staggered
 * 100ms apart) plus a custom accordion. Rebuilt from the original native
 * <details>/<summary> markup because that element can't animate its own
 * open/close height smoothly across browsers — same question/answer data
 * and open-one-at-a-time behavior, just an accessible button+panel pair
 * instead, using the grid-template-rows 0fr->1fr trick for a real animated
 * height (no JS height measurement, no layout thrash).
 */
export function LandingFaq({ faqs }: { faqs: Faq[] }) {
  const { ref: sectionRef, visible } = useScrollReveal<HTMLDivElement>();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section ref={sectionRef} className="mx-auto max-w-3xl px-4 pb-20">
      <h2 className={`reveal mb-6 text-center text-xl font-semibold text-gray-900 ${visible ? "is-visible" : ""}`}>
        Frequently asked questions
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {faqs.map((faq, i) => {
          const open = openIndex === i;
          return (
            <div
              key={faq.q}
              className={`reveal rounded-lg border bg-white p-4 shadow-sm hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md dark:bg-[#241d17] ${
                open ? "border-indigo-400 shadow-md ring-1 ring-indigo-100" : "border-gray-200"
              } ${visible ? "is-visible" : ""}`}
              style={{ "--reveal-delay": `${i * 100}ms` } as CSSProperties}
            >
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`faq-panel-${i}`}
                onClick={() => setOpenIndex(open ? null : i)}
                className="group flex w-full items-start justify-between gap-2 text-left text-sm font-semibold text-gray-900"
              >
                {faq.q}
                <span
                  className={`mt-0.5 shrink-0 text-indigo-500 transition-transform duration-300 ${
                    open ? "rotate-45" : "group-hover:scale-110"
                  }`}
                >
                  +
                </span>
              </button>
              <div id={`faq-panel-${i}`} className={`accordion-panel ${open ? "is-open" : ""}`}>
                <div>
                  <p className="mt-2 text-sm text-gray-600">{faq.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
