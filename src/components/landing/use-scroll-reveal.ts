"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fires `visible` true once when the returned ref's element crosses the
 * given viewport threshold, then disconnects — a one-time scroll entrance,
 * not a repeating scroll-spy. Pair with the `.reveal`/`.reveal.is-visible`
 * classes in globals.css, which degrade to a plain opacity fade under
 * prefers-reduced-motion so this hook never needs its own reduced-motion
 * branch (a synchronous setState in the effect body for that branch would
 * also trip react-hooks/set-state-in-effect).
 */
export function useScrollReveal<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}
