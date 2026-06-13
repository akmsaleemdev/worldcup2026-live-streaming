"use client";

import { useEffect, type ReactNode } from "react";

interface SmoothScrollProps {
  children: ReactNode;
}

/**
 * Lenis smooth scroll provider (Req 12.4).
 * Wraps the app in Lenis for premium smooth scrolling on public pages.
 */
export function SmoothScroll({ children }: SmoothScrollProps) {
  useEffect(() => {
    let lenis: InstanceType<typeof import("lenis").default> | null = null;
    let raf: number;

    const init = async () => {
      const Lenis = (await import("lenis")).default;
      lenis = new Lenis({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      });

      function animate(time: number) {
        lenis?.raf(time);
        raf = requestAnimationFrame(animate);
      }
      raf = requestAnimationFrame(animate);
    };

    init();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, []);

  return <>{children}</>;
}
