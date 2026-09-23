"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight, CalendarCheck, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourtArt } from "./court-art";

/**
 * Homepage hero.
 * - Text entrance is pure CSS (staggered fade-up), so the headline is visible
 *   even before JavaScript loads — no blank hero on slow connections.
 * - Ambient layers loop slowly in CSS (court lines drift, glow breathes, art floats).
 * - On scroll, layers move at different speeds (parallax) via Framer Motion.
 * All of it is transform/opacity only and switches off with reduced motion.
 */
export function Hero({ maxGuests }: { maxGuests: number }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const artY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const glowY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, 40]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.35]);

  // Scroll-linked styles bypass MotionConfig, so switch parallax off explicitly.
  const still = useReducedMotion();

  const step = (i: number) => ({ animationDelay: `${80 + i * 90}ms` });

  return (
    <section ref={ref} data-hero className="relative overflow-hidden bg-forest text-ivory">
      {/* Court lines drift diagonally; the layer is oversized by one tile so the loop is seamless. */}
      <div className="absolute -inset-[88px] opacity-60 motion-safe:animate-court-pan" aria-hidden>
        <div className="court-lines size-full" />
      </div>
      <div className="grain absolute inset-0" aria-hidden />
      <motion.div style={still ? undefined : { y: glowY }} className="absolute -right-40 -top-40" aria-hidden>
        <div className="size-[34rem] rounded-full bg-brass/20 blur-3xl motion-safe:animate-glow" />
      </motion.div>

      <div className="container-page relative grid items-center gap-12 py-20 md:py-28 lg:grid-cols-[1.15fr_1fr] lg:py-32">
        <motion.div style={still ? undefined : { y: textY, opacity: textOpacity }}>
          <p className="eyebrow animate-fade-up !text-brass" style={step(0)}>
            Private villa · Courtyard · Court
          </p>
          <h1 className="mt-6 text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
            <span className="block animate-fade-up" style={step(1)}>
              The whole villa,
            </span>
            <em className="block animate-fade-up text-brass" style={step(2)}>
              just for your group.
            </em>
          </h1>
          <p className="mt-6 max-w-xl animate-fade-up text-lg leading-relaxed text-ivory/75" style={step(3)}>
            Play pickleball or badminton, sing in the music room, then unwind in the jacuzzi and lounge. One booking reserves
            S-Villa exclusively for up to {maxGuests} guests.
          </p>
          <div className="mt-10 flex animate-fade-up flex-wrap gap-3" style={step(4)}>
            <Button asChild variant="brass" size="lg">
              <Link href="/book">
                Book your time <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="light" size="lg">
              <Link href="/availability">Check availability</Link>
            </Button>
          </div>
          <ul className="mt-12 flex animate-fade-up flex-wrap gap-x-8 gap-y-3 text-sm text-ivory/70" style={step(5)}>
            <li className="flex items-center gap-2">
              <Users className="size-4 text-brass" aria-hidden /> Up to {maxGuests} guests
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-brass" aria-hidden /> Exclusive use — no strangers
            </li>
            <li className="flex items-center gap-2">
              <CalendarCheck className="size-4 text-brass" aria-hidden /> Live availability
            </li>
          </ul>
        </motion.div>

        <motion.div style={still ? undefined : { y: artY }} className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="animate-fade-up" style={step(2)}>
            <div className="motion-safe:animate-float">
              <CourtArt />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
