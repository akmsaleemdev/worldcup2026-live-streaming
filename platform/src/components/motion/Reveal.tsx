"use client";

import { type ElementType, type ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

/**
 * Scroll-triggered reveal animation (Req 12.1).
 *
 * Reusable client island that fades/slides its children into view the first
 * time they enter the viewport, using framer-motion's `whileInView`. Apply it
 * to hero blocks, match cards, and home-page section reveals.
 *
 * Accessibility: when the user prefers reduced motion the component renders its
 * children fully visible with no transform/opacity transition, honoring
 * `prefers-reduced-motion` (framer-motion's `useReducedMotion`).
 */

export type RevealDirection = "up" | "down" | "left" | "right" | "none";

export interface RevealProps {
  children: ReactNode;
  /** Direction the content travels from while fading in. Default `up`. */
  direction?: RevealDirection;
  /** Animation duration in seconds. Default `0.5`. */
  duration?: number;
  /** Delay before the animation starts, in seconds. Default `0`. */
  delay?: number;
  /** Travel distance in px for the slide-in. Default `24`. */
  distance?: number;
  /** Rendered element/tag. Default `div`. */
  as?: ElementType;
  className?: string;
  /** Fraction of the element that must be visible to trigger. Default `0.2`. */
  amount?: number;
}

function offsetFor(direction: RevealDirection, distance: number) {
  switch (direction) {
    case "up":
      return { x: 0, y: distance };
    case "down":
      return { x: 0, y: -distance };
    case "left":
      return { x: distance, y: 0 };
    case "right":
      return { x: -distance, y: 0 };
    case "none":
    default:
      return { x: 0, y: 0 };
  }
}

export function Reveal({
  children,
  direction = "up",
  duration = 0.5,
  delay = 0,
  distance = 24,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  as = "div",
  className,
  amount = 0.2,
}: RevealProps) {
  const prefersReduced = useReducedMotion();

  // Reduced motion: render statically, no transform/opacity animation.
  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  const { x, y } = offsetFor(direction, distance);
  const variants: Variants = {
    hidden: { opacity: 0, x, y },
    visible: { opacity: 1, x: 0, y: 0 },
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={variants}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default Reveal;
