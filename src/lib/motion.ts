/**
 * S-Villa motion language — one easing curve and a few durations, shared by
 * Framer Motion (JS) and CSS (`ease-soft` / `--ease-soft` in globals.css) so
 * every animation on the site feels like part of the same system.
 *
 * Soft "expo-out": quick to start, long gentle settle, no bounce.
 */
export const EASE = [0.22, 1, 0.36, 1] as const;

export const DURATION = {
  fast: 0.2, // presses, icon swaps, exits
  base: 0.3, // step changes, menus
  slow: 0.5, // reveals, entrances
} as const;

/** Scroll reveals fire once, a little before the element is fully on screen. */
export const VIEWPORT = { once: true, margin: "0px 0px -80px 0px" } as const;

export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  shown: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE } },
};

export function stagger(gap = 0.06, delay = 0) {
  return { hidden: {}, shown: { transition: { staggerChildren: gap, delayChildren: delay } } };
}
