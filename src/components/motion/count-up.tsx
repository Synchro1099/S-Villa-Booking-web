"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";
import { EASE } from "@/lib/motion";

/**
 * Number that counts up when it scrolls into view. The real value is in the
 * server HTML (correct without JS, for SEO and screen readers); it only resets
 * to 0 if it starts off-screen, so there is never a visible 6 → 0 → 6 flash.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const armed = useRef(false);
  const inView = useInView(ref, { once: true, margin: "0px 0px -60px 0px" });
  const reduce = useReducedMotion();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reduce || el.getBoundingClientRect().top < window.innerHeight) return;
    el.textContent = "0";
    armed.current = true;
  }, [reduce]);

  useEffect(() => {
    const el = ref.current;
    if (!inView || !el || !armed.current) return;
    armed.current = false;
    const controls = animate(0, value, {
      duration: Math.min(1.2, 0.5 + value * 0.05),
      ease: EASE,
      onUpdate: (v) => (el.textContent = String(Math.round(v))),
    });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}
