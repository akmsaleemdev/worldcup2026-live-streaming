"use client";

import { motion } from "framer-motion";

/**
 * Loading state animation (Req 12.5).
 * A simple animated loading indicator using Framer Motion.
 */
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8" role="status" aria-label="Loading">
      <motion.div
        className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
