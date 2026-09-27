"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight, CalendarCheck, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaFrame } from "@/components/media/media-frame";
import { HERO_MEDIA } from "@/lib/media";
import { cn } from "@/lib/utils";
import { CourtArt } from "./court-art";

/**
 * Homepage hero.
 * - Text entrance is pure CSS (staggered fade-up), so the headline is visible
 *   even before JavaScript loads — no blank hero on slow connections.
 * - Ambient layers loop slowly in CSS (court lines drift, glow breathes, art floats).
 * - On scroll, layers move at different speeds (parallax) via Framer Motion.
 * - With HERO_MEDIA set (src/lib/media.ts), a full-bleed photo or silent loop
 *   replaces the illustration: it zooms slowly and drifts on scroll, under a
 *   forest gradient that keeps the headline readable.
 * All of it is transform/opacity only and switches off with reduced motion.
 */
export function Hero({ maxGuests }: { maxGuests: number }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const artY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const glowY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, 40]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.35]);
  const mediaY = useTransform(scrollYProgress, [0, 1], [0, 96]);
  const media = HERO_MEDIA;

  // Scroll-linked styles bypass MotionConfig, so switch parallax off explicitly.
  const still = useReducedMotion();

  const step = (i: number) => ({ animationDelay: `${80 + i * 90}ms` });

  return (
    <section
      ref={ref}
      data-hero
      className={cn("relative overflow-hidden bg-forest text-ivory", media && "flex items-center md:min-h-[38rem] lg:min-h-[44rem]")}
    >
      {media ? (
        <>
          {/* Starts 96px above the hero so the scroll drift never uncovers an edge. */}
          <motion.div style={still ? undefined : { y: mediaY }} className="absolute inset-x-0 -top-24 bottom-0">
            <MediaFrame media={media} sizes="100vw" preload className="size-full motion-safe:animate-ken-burns" />
          </motion.div>
          {/* Phones: the text spans the width, so darken evenly. Desktop: darken the text side only. */}
          <div
            className="absolute inset-0 bg-linear-to-t from-forest via-forest/80 to-forest/55 lg:bg-linear-to-r lg:from-forest lg:via-forest/70 lg:to-forest/5"
            aria-hidden
          />
        </>
      ) : (
        // Court lines drift diagonally; the layer is oversized by one tile so the loop is seamless.
        <div className="absolute -inset-[88px] opacity-60 motion-safe:animate-court-pan" aria-hidden>
          <div className="court-lines size-full" />
        </div>
      )}
      <div className="grain absolute inset-0" aria-hidden />
      <motion.div style={still ? undefined : { y: glowY }} className="absolute -right-40 -top-40" aria-hidden>
        <div className="size-[34rem] rounded-full bg-brass/20 blur-3xl motion-safe:animate-glow" />
      </motion.div>

      <div
        className={cn(
          "container-page relative grid items-center gap-12 py-20 md:py-28 lg:py-32",
          media ? "w-full" : "lg:grid-cols-[1.15fr_1fr]",
        )}
      >
        <motion.div style={still ? undefined : { y: textY, opacity: textOpacity }} className={cn(media && "max-w-2xl")}>
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
            Play pickleball or badminton, sing in the KTV lounge, then unwind in the jacuzzi. One booking reserves
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

        {media ? null : (
          <motion.div style={still ? undefined : { y: artY }} className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="animate-fade-up" style={step(2)}>
              <div className="motion-safe:animate-float">
                <CourtArt />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
