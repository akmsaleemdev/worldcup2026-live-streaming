"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";

/**
 * Capability-gated, lazy-loaded background layer for the 3D hero scene
 * (Req 12.3).
 *
 * This is the only thing the server-rendered home page references. It keeps
 * the heavy three.js / R3F bundle out of the initial payload by importing
 * {@link HeroScene} through `next/dynamic` with `ssr: false`, so the 3D code
 * is fetched on the client only after the gate below passes.
 *
 * The scene is rendered ONLY when all of the following hold:
 *  - the component has mounted on the client (avoids SSR/hydration work), and
 *  - the user has not requested reduced motion, and
 *  - the browser exposes a usable WebGL context.
 *
 * Otherwise a static, navy/gold gradient fallback is shown. Either way the
 * layer is decorative: it is `aria-hidden` and `pointer-events-none`, sits
 * behind the hero content, and never interferes with the page's server data
 * loading or the interactive hero controls.
 */

const HeroScene = dynamic(
  () => import("./HeroScene").then((mod) => mod.HeroScene),
  { ssr: false, loading: () => <StaticFallback /> },
);

/**
 * Decorative gradient shown when 3D is unavailable, disabled, or still
 * loading. Mirrors the KOORAKIT navy background with gold accent glows.
 */
function StaticFallback() {
  return (
    <div
      className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(212,175,55,0.18),_transparent_60%)]"
      aria-hidden="true"
    />
  );
}

/** Detect a usable WebGL context without throwing on locked-down browsers. */
function detectWebGL(): boolean {
  if (typeof window === "undefined" || !window.WebGLRenderingContext) {
    return false;
  }
  try {
    const canvas = document.createElement("canvas");
    const context =
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    return Boolean(context);
  } catch {
    return false;
  }
}

export function HeroSceneBackground() {
  const prefersReduced = usePrefersReducedMotion();
  const [canRender3D] = useState(() => {
    // SSR: always false (no DOM). Client: detect WebGL on initial render.
    if (typeof window === "undefined") return false;
    return !prefersReduced && detectWebGL();
  });

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0"
      aria-hidden="true"
    >
      {canRender3D ? <HeroScene /> : <StaticFallback />}
    </div>
  );
}

export default HeroSceneBackground;
