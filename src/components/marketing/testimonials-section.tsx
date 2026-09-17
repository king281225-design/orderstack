import type { CSSProperties } from "react";

export type Testimonial = {
  name: string;
  location: string;
  quote: string;
  /**
   * Path under /public to a cropped logo mark, or null to fall back to a
   * plain initials avatar. See TESTIMONIALS below for why this is null
   * today.
   */
  logoUrl: string | null;
};

// Exactly one real testimonial today — the brief explicitly says not to
// fake more. Sized/laid out so a single card still reads as intentional
// (see the section below), and scales cleanly once more are added.
export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Urban Bake House",
    location: "Hari Nagar, New Delhi",
    quote: "Your bhojsetu web app is easy to use and prices is very pocket friendly.",
    logoUrl: "/testimonials/urban-bake-house-logo.png",
  },
];

function InitialsAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
      {initials}
    </span>
  );
}

/**
 * Social-proof section. A single testimonial is centered and width-
 * constrained rather than stretched across a 3-column grid, so it doesn't
 * look like a gap — the grid only spreads out once more entries exist.
 */
export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null;

  return (
    <section className="mx-auto max-w-5xl px-4 pb-16">
      <h2 className="mb-6 text-center text-xl font-semibold text-gray-900">
        Restaurants already using BhojSetu
      </h2>
      <div
        className={`grid gap-4 ${
          testimonials.length === 1 ? "mx-auto max-w-sm grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {testimonials.map((t, i) => (
          <div
            key={t.name}
            className="reveal is-visible flex flex-col gap-3 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:bg-[#241d17]"
            style={{ "--reveal-delay": `${i * 100}ms` } as CSSProperties}
          >
            {t.logoUrl && (
              // The source is a wide storefront-sign logo (white/orange text
              // on a dark, mostly-transparent backdrop) — a dark strip keeps
              // it legible instead of near-invisible on a white card.
              // eslint-disable-next-line @next/next/no-img-element -- small static logo asset, not worth next/image config here
              <img
                src={t.logoUrl}
                alt={`${t.name} logo`}
                className="h-20 w-full bg-gray-900 object-contain p-2"
              />
            )}
            <div className="flex flex-1 flex-col gap-3 p-5 pt-0">
              <p className="text-sm text-gray-700 dark:text-gray-300">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-auto flex items-center gap-3 pt-2">
                {!t.logoUrl && <InitialsAvatar name={t.name} />}
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.location}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
