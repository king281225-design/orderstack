"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { CSSProperties, RefObject } from "react";
import { BhojSetuFrontPageLogo } from "@/components/brand/logo";
import {
  BasilLeafIcon,
  ChiliIcon,
  CutleryGlowLoop,
  ForkIcon,
  OnionRingIcon,
  SpiceParticleIcon,
  SpoonIcon,
  TomatoSliceIcon,
} from "@/components/landing/hero-decorations";
import { ScooterIcon, ShoppingBagIcon, StorefrontIcon, TrendingUpIcon } from "@/components/landing/feature-icons";
import { buildWhatsAppUrl, DEMO_STOREFRONT_SLUG } from "@/lib/contact";

/**
 * Desktop-only mouse parallax on the logo card, fork, spoon and background
 * blobs (spec: ±8px / ±15px / ±15px / ±5px). Each target is a plain
 * absolutely-positioned wrapper the JS translates directly — the wrapper's
 * *child* carries the CSS keyframe float/drift animation, so the two
 * transforms compose instead of one clobbering the other. Skipped entirely
 * under prefers-reduced-motion, coarse (touch) pointers, and narrow
 * viewports, per the "disable parallax on mobile / reduced motion" spec.
 */
function useHeroParallax(targets: { ref: RefObject<HTMLDivElement | null>; max: number }[]) {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const isNarrow = window.matchMedia("(max-width: 767px)").matches;
    if (reduceMotion || isCoarsePointer || isNarrow) return;

    let rafId = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    function handleMove(e: MouseEvent) {
      targetX = (e.clientX / window.innerWidth) * 2 - 1;
      targetY = (e.clientY / window.innerHeight) * 2 - 1;
    }

    function tick() {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      for (const { ref, max } of targets) {
        const el = ref.current;
        if (!el) continue;
        el.style.transform = `translate3d(${(currentX * max).toFixed(2)}px, ${(currentY * max).toFixed(2)}px, 0)`;
      }
      rafId = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", handleMove);
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- targets is a stable set of refs built once per render
  }, []);
}

export function LandingHero() {
  const logoRef = useRef<HTMLDivElement>(null);
  const forkRef = useRef<HTMLDivElement>(null);
  const spoonRef = useRef<HTMLDivElement>(null);
  const blob1Ref = useRef<HTMLDivElement>(null);
  const blob2Ref = useRef<HTMLDivElement>(null);

  useHeroParallax([
    { ref: logoRef, max: 8 },
    { ref: forkRef, max: 15 },
    { ref: spoonRef, max: 15 },
    { ref: blob1Ref, max: 5 },
    { ref: blob2Ref, max: 5 },
  ]);

  return (
    <div className="relative flex flex-col items-center gap-5 overflow-hidden px-4 pt-20 pb-16 text-center">
      {/* Background blobs — almost-invisible, slow drift, parallax on desktop */}
      <div ref={blob1Ref} className="pointer-events-none absolute -left-16 top-10 hidden md:block" aria-hidden="true">
        <div
          className="animate-hero-blob h-72 w-72 rounded-full bg-indigo-200/25 blur-3xl"
          style={{ "--blob-x": "18px", "--blob-y": "-14px", "--blob-duration": "17s" } as CSSProperties}
        />
      </div>
      <div
        ref={blob2Ref}
        className="pointer-events-none absolute -right-20 bottom-0 hidden md:block"
        aria-hidden="true"
      >
        <div
          className="animate-hero-blob h-80 w-80 rounded-full bg-violet-50/70 blur-3xl"
          style={{ "--blob-x": "-16px", "--blob-y": "12px", "--blob-duration": "20s", animationDelay: "-4s" } as CSSProperties}
        />
      </div>

      {/* Floating cutlery — decorative, outside the text column. Each sits
          on a faint elliptical glow "trail" (CutleryGlowLoop), a restrained
          nod to the reference design's crossed-cutlery light loop. */}
      <div ref={forkRef} className="pointer-events-none absolute left-[6%] top-14 hidden md:block" aria-hidden="true">
        <div className="relative">
          <CutleryGlowLoop className="animate-hero-glow absolute left-1/2 top-1/2 h-16 w-40 -translate-x-1/2 -translate-y-1/2 -rotate-[28deg] text-indigo-400 blur-[2px] lg:h-20 lg:w-48" />
          <div className="animate-hero-fork relative text-indigo-500/80 drop-shadow-[0_0_10px_rgba(232,93,4,0.3)]">
            <ForkIcon className="h-20 w-auto lg:h-24" />
          </div>
        </div>
      </div>
      <div ref={spoonRef} className="pointer-events-none absolute right-[6%] top-20 hidden md:block" aria-hidden="true">
        <div className="relative">
          <CutleryGlowLoop
            className="animate-hero-glow absolute left-1/2 top-1/2 h-16 w-40 -translate-x-1/2 -translate-y-1/2 rotate-[28deg] text-indigo-400 blur-[2px] lg:h-20 lg:w-48"
            style={{ animationDelay: "-3s" }}
          />
          <div
            className="animate-hero-spoon relative text-indigo-500/80 drop-shadow-[0_0_10px_rgba(232,93,4,0.3)]"
            style={{ animationDelay: "-2.5s" }}
          >
            <SpoonIcon className="h-20 w-auto lg:h-24" />
          </div>
        </div>
      </div>

      {/* Floating food particles — outer hero area only, never over the copy */}
      <BasilLeafIcon
        className="animate-hero-particle pointer-events-none absolute left-[14%] top-[6%] hidden h-6 w-6 text-green-600/45 lg:block"
        style={{ "--particle-x": "14px", "--particle-y": "-18px", "--particle-r": "14deg", "--particle-duration": "12s" } as CSSProperties}
      />
      <ChiliIcon
        className="animate-hero-particle pointer-events-none absolute right-[16%] top-[4%] hidden h-6 w-8 text-red-600/40 lg:block"
        style={{ "--particle-x": "-12px", "--particle-y": "16px", "--particle-r": "-16deg", "--particle-duration": "15s" } as CSSProperties}
      />
      <TomatoSliceIcon
        className="animate-hero-particle pointer-events-none absolute left-[10%] bottom-[10%] hidden h-7 w-7 text-red-600/35 lg:block"
        style={{ "--particle-x": "16px", "--particle-y": "14px", "--particle-r": "18deg", "--particle-duration": "13s" } as CSSProperties}
      />
      <OnionRingIcon
        className="animate-hero-particle pointer-events-none absolute right-[11%] bottom-[8%] hidden h-7 w-7 text-gray-400/50 lg:block"
        style={{ "--particle-x": "-14px", "--particle-y": "-12px", "--particle-r": "-10deg", "--particle-duration": "16s" } as CSSProperties}
      />
      <SpiceParticleIcon
        className="animate-hero-particle pointer-events-none absolute left-[24%] top-[24%] hidden h-5 w-5 text-indigo-600/40 lg:block"
        style={{ "--particle-x": "10px", "--particle-y": "-10px", "--particle-r": "20deg", "--particle-duration": "10s" } as CSSProperties}
      />
      <SpiceParticleIcon
        className="animate-hero-particle pointer-events-none absolute right-[24%] bottom-[20%] hidden h-5 w-5 text-indigo-600/30 lg:block"
        style={{ "--particle-x": "-11px", "--particle-y": "12px", "--particle-r": "-18deg", "--particle-duration": "18s" } as CSSProperties}
      />

      {/* Content column — always above the decoration layer */}
      <div ref={logoRef} className="relative z-10">
        {/* The source image is opaque (its own off-white background baked
            in, not transparent) — a rounded card with a shadow makes that
            look like a deliberate framed logo instead of a stray square
            floating over the page, especially against the dark gradient. */}
        <div className="animate-hero-logo overflow-hidden rounded-2xl">
          <BhojSetuFrontPageLogo width={260} />
        </div>
      </div>

      <span
        className="hero-badge-shimmer animate-hero-badge relative z-10 overflow-hidden rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1 text-xs font-semibold text-white transition-transform duration-200 hover:scale-[1.03]"
        style={{ animationDelay: "0ms" }}
      >
        7-day free trial · No credit card required
      </span>

      <h1
        className="animate-hero-headline relative z-10 max-w-xl text-3xl font-bold text-gray-900 sm:text-4xl"
        style={{ animationDelay: "120ms" }}
      >
        Your restaurant, online in minutes
      </h1>

      <p
        className="animate-hero-paragraph relative z-10 max-w-md text-sm text-gray-600"
        style={{ animationDelay: "380ms" }}
      >
        Have a restaurant? Set up your own storefront below. If you&apos;re a customer, use the
        ordering link your restaurant gave you (e.g. <code>/r/your-restaurant</code>).
      </p>

      <div className="animate-hero-cta relative z-10 mt-2 flex flex-wrap justify-center gap-3" style={{ animationDelay: "550ms" }}>
        <Link
          href="/signup"
          className="rounded-md bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:from-indigo-700 hover:to-violet-700 hover:shadow-[0_10px_25px_-5px_rgba(232,93,4,0.45)] active:scale-[0.98] dark:shadow-none"
        >
          Start your 7-day free trial
        </Link>
        <a
          href={buildWhatsAppUrl("Hi, I'd like to book a demo of BhojSetu for my restaurant.")}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-indigo-300 bg-indigo-50 px-5 py-2.5 text-sm font-semibold text-indigo-700 transition-all duration-[250ms] ease-out hover:-translate-y-0.5 hover:bg-indigo-100 dark:border-indigo-400/40 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
        >
          Book a demo
        </a>
        <Link
          href="/login"
          className="rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-[250ms] ease-out hover:-translate-y-0.5 hover:border-indigo-400 hover:bg-indigo-50/60 dark:bg-[#241d17] dark:hover:bg-[#2e2016]"
        >
          Sign in
        </Link>
      </div>

      <div className="animate-hero-cta relative z-10 flex flex-col items-center gap-1 text-xs text-gray-500" style={{ animationDelay: "620ms" }}>
        <span>Full dashboard free for 7 days — no card required, set up in about 10 minutes</span>
        <Link href={`/r/${DEMO_STOREFRONT_SLUG}`} target="_blank" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          See a live demo →
        </Link>
      </div>

      <div
        className="animate-hero-cta relative z-10 mt-4 flex flex-wrap items-start justify-center gap-x-8 gap-y-4"
        style={{ animationDelay: "700ms" }}
      >
        {[
          { Icon: StorefrontIcon, label: "Dine-in" },
          { Icon: ScooterIcon, label: "Delivery" },
          { Icon: ShoppingBagIcon, label: "Takeaway" },
          { Icon: TrendingUpIcon, label: "Grow business" },
        ].map(({ Icon, label }) => (
          <div key={label} className="flex w-16 flex-col items-center gap-1.5 text-gray-500">
            <Icon className="h-6 w-6 text-indigo-500" />
            <span className="text-xs font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
