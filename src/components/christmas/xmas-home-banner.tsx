"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { XmasDivider } from "@/components/christmas/xmas-divider";
import { DEMO_STOREFRONT_SLUG } from "@/lib/contact";

// Fixed, hand-placed positions (not random) so server and client render the
// same markup. [left%, top%, sizePx, delaySeconds]
const STARS: [number, number, number, number][] = [
  [6, 14, 3, 0],
  [14, 38, 2, 1.1],
  [22, 8, 2, 2.2],
  [31, 30, 3, 0.6],
  [40, 12, 2, 1.7],
  [57, 9, 3, 2.6],
  [66, 34, 2, 0.3],
  [74, 16, 3, 1.4],
  [83, 40, 2, 2.1],
  [91, 10, 2, 0.9],
  [96, 30, 3, 1.9],
  [48, 28, 2, 2.9],
];

type Left = { days: number; hours: number; mins: number; secs: number };

/** Time left until 25 December 00:00 local time this year, or null once it has passed. */
function timeUntilChristmas(now: number): Left | null {
  const target = new Date(new Date(now).getFullYear(), 11, 25).getTime();
  const ms = target - now;
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), mins: Math.floor((s % 3600) / 60), secs: s % 60 };
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The marketing homepage's Christmas banner — a night-sky panel with a moon
 * and twinkling stars (the 3D Santa flies through the empty sky above the
 * heading), a gold "Merry Christmas!" headline, a live countdown, and the
 * same two actions the hero offers (trial signup / live demo). Mounted only
 * while CHRISTMAS_THEME_ENABLED is on (src/lib/seasonal.ts).
 *
 * The countdown shows "--" until mounted: it depends on the viewer's clock,
 * which the server can't know, and rendering a real number in the SSR HTML
 * would mismatch on hydration.
 */
export function XmasHomeBanner() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const left = now === null ? null : timeUntilChristmas(now);
  const isChristmasDay = now !== null && left === null && new Date(now).getMonth() === 11 && new Date(now).getDate() === 25;
  const showCountdown = now === null || left !== null;

  const units: [string, string][] = [
    ["Days", left ? pad(left.days) : "--"],
    ["Hours", left ? pad(left.hours) : "--"],
    ["Mins", left ? pad(left.mins) : "--"],
    ["Secs", left ? pad(left.secs) : "--"],
  ];

  return (
    <section className="xmas-sky relative overflow-hidden text-center" aria-label="Christmas greetings">
      {STARS.map(([x, y, size, delay], i) => (
        <span
          key={i}
          className="xmas-star"
          style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, animationDelay: `${delay}s` }}
          aria-hidden="true"
        />
      ))}
      <div
        className="xmas-moon pointer-events-none absolute left-[7%] top-10 hidden h-16 w-16 rounded-full sm:block md:h-20 md:w-20"
        aria-hidden="true"
      />

      {/* The top ~9rem is intentionally open sky: the 3D Santa flies through it. */}
      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 pb-9 pt-36 sm:pt-40">
        <p className="text-xs font-bold uppercase tracking-[0.28em]" style={{ color: "var(--xmas-gold)" }}>
          From all of us at BhojSetu
        </p>
        <h2 className="xmas-heading mt-2 font-serif text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-7xl">
          Merry
          <br />
          Christmas!
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed sm:text-base" style={{ color: "var(--xmas-cream)" }}>
          Wishing every restaurant a season full of happy tables. Set up your storefront in minutes and start the new
          year with orders flowing.
        </p>

        {showCountdown ? (
          <div className="mt-6 flex flex-col items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: "var(--xmas-cream)" }}>
              Christmas is in
            </span>
            <div className="flex gap-2 sm:gap-3">
              {units.map(([label, value]) => (
                <div key={label} className="xmas-count-box flex w-14 flex-col items-center rounded-xl py-2 sm:w-16">
                  <span
                    className="font-serif text-2xl font-bold tabular-nums leading-none sm:text-3xl"
                    style={{ color: "var(--xmas-gold)" }}
                  >
                    {value}
                  </span>
                  <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--xmas-cream)" }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : isChristmasDay ? (
          <p className="mt-6 text-lg font-semibold" style={{ color: "var(--xmas-gold)" }}>
            It&apos;s Christmas Day — enjoy every moment! 🎅
          </p>
        ) : null}

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/signup"
            data-ga-event="trial_cta_click"
            data-ga-params='{"location":"xmas_banner"}'
            className="xmas-pill-btn text-sm transition-transform hover:-translate-y-0.5"
          >
            Start your 7-day free trial
          </Link>
          <Link
            href={`/r/${DEMO_STOREFRONT_SLUG}`}
            target="_blank"
            className="xmas-pill-btn-outline text-sm text-[var(--xmas-cream)] transition-colors hover:bg-white/10"
          >
            See a live demo →
          </Link>
        </div>
      </div>
      <XmasDivider />
    </section>
  );
}
