import Image from "next/image";
import type { CSSProperties } from "react";

export type Testimonial = {
  name: string;
  location?: string;
  quote: string;
  /**
   * Path under /public to a cropped logo mark, or null to fall back to a
   * plain initials avatar.
   */
  logoUrl: string | null;
  /** The logo file's real pixel dimensions — next/image requires these. */
  logoWidth: number;
  logoHeight: number;
  /** Backdrop behind the logo: "dark" for light-on-dark logos, "light" for dark-on-light ones. */
  logoTone?: "dark" | "light";
};

// Only list testimonials the restaurant has actually approved — the brief
// says not to fake any. Sized/laid out so one or two cards still read as
// intentional (see the section below).
export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Urban Bake House",
    location: "Hari Nagar, New Delhi",
    quote: "Your bhojsetu web app is easy to use and prices is very pocket friendly.",
    logoUrl: "/testimonials/urban-bake-house-logo.png",
    logoWidth: 480,
    logoHeight: 180,
    logoTone: "dark",
  },
  {
    // DRAFT WORDING — get the owner's OK before this goes live.
    name: "Bake House by MS",
    quote:
      "BhojSetu gave our bakery its own beautiful ordering page in no time. Customers browse the menu, order and pay without any fuss, and we finally see every order in one place. Simple to run, honestly priced and a joy to use.",
    logoUrl: "/testimonials/bake-house-by-ms-logo.png",
    logoWidth: 287,
    logoHeight: 300,
    logoTone: "light",
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
          testimonials.length === 1
            ? "mx-auto max-w-sm grid-cols-1"
            : testimonials.length === 2
              ? "mx-auto max-w-3xl sm:grid-cols-2"
              : "sm:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {testimonials.map((t, i) => (
          <div
            key={t.name}
            className="reveal is-visible flex flex-col gap-3 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:bg-[#241d17]"
            style={{ "--reveal-delay": `${i * 100}ms` } as CSSProperties}
          >
            {t.logoUrl && (
              // A dark strip keeps light-on-dark logos legible; dark-on-light
              // logos get a warm cream strip instead.
              <div
                className={`flex h-28 w-full items-center justify-center p-2 ${
                  t.logoTone === "light" ? "bg-white" : "bg-gray-900"
                }`}
              >
                <Image
                  src={t.logoUrl}
                  alt={`${t.name} logo`}
                  width={t.logoWidth}
                  height={t.logoHeight}
                  className="h-full w-auto object-contain"
                  loading="lazy"
                />
              </div>
            )}
            <div className="flex flex-1 flex-col gap-3 p-5 pt-0">
              <p className="text-sm text-gray-700 dark:text-gray-300">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-auto flex items-center gap-3 pt-2">
                {!t.logoUrl && <InitialsAvatar name={t.name} />}
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</p>
                  {t.location && <p className="text-xs text-gray-500">{t.location}</p>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
