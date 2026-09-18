"use client";

import { useScrollReveal } from "@/components/landing/use-scroll-reveal";
import { FaqAccordion } from "@/components/shared/faq-accordion";

type Faq = { q: string; a: string };

export function LandingFaq({ faqs }: { faqs: Faq[] }) {
  const { ref: headingRef, visible } = useScrollReveal<HTMLHeadingElement>();

  return (
    <section className="mx-auto max-w-3xl px-4 pb-20">
      <h2 ref={headingRef} className={`reveal mb-6 text-center text-xl font-semibold text-gray-900 ${visible ? "is-visible" : ""}`}>
        Frequently asked questions
      </h2>
      <FaqAccordion faqs={faqs} columns={2} />
    </section>
  );
}
