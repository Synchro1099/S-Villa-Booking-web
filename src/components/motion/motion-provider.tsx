"use client";

import { MotionConfig } from "motion/react";
import { DURATION, EASE } from "@/lib/motion";

/**
 * Site-wide motion defaults. `reducedMotion="user"` removes movement (keeps
 * gentle fades) for visitors who ask their device for less motion.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: DURATION.base, ease: EASE }}>
      {children}
    </MotionConfig>
  );
}
