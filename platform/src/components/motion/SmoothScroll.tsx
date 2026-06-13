"use client";

import { useEffect } from "react";
import Lenis from "lenis";

import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * Lenis smooth-scrolling provider for public pages (Req 12.4).
 *
 * Mount once near the root of the public layout. It initializes a Lenis
 * instance after mount (browser-only, guarded against SSR) and drives it with
 * a `requestAnimationFrame` loop, then tears everything down on unmount.
 *
 * Accessibility: when the user prefers reduced motion, smooth scrolling is
 * skipped entirely so the browser's native (instant) scrolling is preserved,
 * honoring `prefers-reduced-motion` (Req 12 accessibility constraint).
 *
 * Renders nothing itself; it only manages the global scroll behavior while
 * mounted, so it composes cleanly with server-rendered children.
 */
export function SmoothScroll() {
  const prefersReduced = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReduced || typeof window === "undefined") {
      return;
    }

    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = window.requestAnimationFrame(raf);
    };
    frame = window.requestAnimationFrame(raf);

    return () => {
      window.cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [prefersReduced]);

  return null;
}

export default SmoothScroll;
