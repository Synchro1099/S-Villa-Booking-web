"use client";

import { motion } from "motion/react";
import { EASE, DURATION, VIEWPORT, fadeUp, stagger } from "@/lib/motion";

/**
 * Scroll-triggered reveals. Reduced-motion users get a plain fade (see
 * MotionProvider). Use only below the fold — above-the-fold content should
 * be visible without waiting for JavaScript.
 */
export function Reveal({
  children,
  delay = 0,
  enabled = true,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  enabled?: boolean;
  className?: string;
}) {
  if (!enabled) return <div className={className}>{children}</div>;
  return (
    <motion.div
      data-reveal
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: DURATION.slow, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

const TAGS = { div: motion.div, ul: motion.ul, ol: motion.ol, dl: motion.dl };

/** A container whose StaggerItem children reveal one after another. Pass
 * enabled={false} to render plain markup (e.g. when the block is above the fold). */
export function Stagger({
  as = "div",
  gap = 0.07,
  delay = 0,
  enabled = true,
  className,
  children,
  ...rest
}: {
  as?: keyof typeof TAGS;
  gap?: number;
  delay?: number;
  enabled?: boolean;
  className?: string;
  children: React.ReactNode;
} & React.AriaAttributes) {
  if (!enabled) {
    const Plain = as;
    return (
      <Plain className={className} {...rest}>
        {children}
      </Plain>
    );
  }
  const Tag = TAGS[as];
  return (
    <Tag data-reveal className={className} initial="hidden" whileInView="shown" viewport={VIEWPORT} variants={stagger(gap, delay)} {...rest}>
      {children}
    </Tag>
  );
}

const ITEM_TAGS = { div: motion.div, li: motion.li };

export function StaggerItem({ as = "div", className, children }: { as?: keyof typeof ITEM_TAGS; className?: string; children: React.ReactNode }) {
  // Inside a disabled Stagger there are no variants to follow, so items render as-is.
  const Tag = ITEM_TAGS[as];
  return (
    <Tag data-reveal className={className} variants={fadeUp}>
      {children}
    </Tag>
  );
}
