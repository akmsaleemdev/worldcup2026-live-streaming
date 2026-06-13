"use client";

import { useSyncExternalStore } from "react";

/**
 * Accessibility hook: tracks the user's `prefers-reduced-motion` setting (Req 12).
 *
 * Returns `true` when the user has requested reduced motion at the OS/browser
 * level. Animation primitives use this to disable or relax non-essential
 * motion (scroll reveals, smooth scrolling, looping loaders).
 *
 * Uses `useSyncExternalStore` for lint-safe external subscription without
 * calling setState inside an effect.
 */

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => {};
  }
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default usePrefersReducedMotion;
