"use client";

import { type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition as MotionTransition,
} from "framer-motion";

/**
 * Page / modal / card transition primitives (Req 12.2).
 *
 * Lightweight client wrappers so server-rendered pages stay RSC while only the
 * animated pieces become client islands. All primitives honor
 * `prefers-reduced-motion` by rendering statically (no transform/opacity
 * transition) when reduced motion is requested.
 */

const EASE: MotionTransition = { duration: 0.35, ease: [0.22, 1, 0.36, 1] };

export interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/** Fades/slides a page or route segment in on mount. */
export function PageTransition({ children, className }: PageTransitionProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={EASE}
    >
      {children}
    </motion.div>
  );
}

export interface ModalTransitionProps {
  children: ReactNode;
  /** Whether the modal content is visible. */
  open: boolean;
  className?: string;
}

/**
 * Animates modal/dialog content mounting and unmounting via `AnimatePresence`.
 * The caller still owns focus management and the backdrop; this only wraps the
 * appear/disappear motion of the content.
 */
export function ModalTransition({
  children,
  open,
  className,
}: ModalTransitionProps) {
  const prefersReduced = useReducedMotion();

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className={className}
          initial={prefersReduced ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
          transition={EASE}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export interface MotionCardProps {
  children: ReactNode;
  className?: string;
}

/** Card with a subtle hover lift / tap press, disabled under reduced motion. */
export function MotionCard({ children, className }: MotionCardProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
    >
      {children}
    </motion.div>
  );
}

export default PageTransition;
