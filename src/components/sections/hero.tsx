"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { ArrowRight, CalendarCheck, Pause, Play, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaFrame } from "@/components/media/media-frame";
import { HERO_SLIDES, type HeroSlide } from "@/lib/media";
import { cn } from "@/lib/utils";
import { CourtArt } from "./court-art";

const SLIDE_MS = 7000;

/**
 * Homepage hero, leading with the private pickleball court.
 * - Text entrance is pure CSS (staggered fade-up), so the headline is visible
 *   even before JavaScript loads — no blank hero on slow connections.
 * - With HERO_SLIDES set (src/lib/media.ts), full-bleed photos crossfade every
 *   few seconds, each zooming slowly while it's shown and drifting on scroll,
 *   under a forest gradient that keeps the headline readable. The first slide
 *   (the court) loads first; visitors can pause or pick a slide.
 * - Without slides, the illustrated court floats beside the text instead.
 * Motion is transform/opacity only; with reduced motion the slides don't
 * advance on their own and nothing zooms or drifts.
 */
export function Hero({ maxGuests }: { maxGuests: number }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const artY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const glowY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, 40]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.35]);
  const mediaY = useTransform(scrollYProgress, [0, 1], [0, 96]);
  const slides = HERO_SLIDES;
  const hasSlides = slides.length > 0;

  // Scroll-linked styles bypass MotionConfig, so switch parallax off explicitly.
  const still = useReducedMotion();

  const step = (i: number) => ({ animationDelay: `${80 + i * 90}ms` });

  return (
    <section
      ref={ref}
      data-hero
      className={cn("relative overflow-hidden bg-forest text-ivory", hasSlides && "flex items-center md:min-h-[38rem] lg:min-h-[44rem]")}
    >
      {hasSlides ? (
        <Slideshow slides={slides} drift={still ? undefined : mediaY} still={!!still} />
      ) : (
        // Court lines drift diagonally; the layer is oversized by one tile so the loop is seamless.
        <div className="absolute -inset-[88px] opacity-60 motion-safe:animate-court-pan" aria-hidden>
          <div className="court-lines size-full" />
        </div>
      )}
      <div className="grain pointer-events-none absolute inset-0" aria-hidden />
      <motion.div style={still ? undefined : { y: glowY }} className="pointer-events-none absolute -right-40 -top-40" aria-hidden>
        <div className="size-[34rem] rounded-full bg-brass/20 blur-3xl motion-safe:animate-glow" />
      </motion.div>

      <div
        className={cn(
          "container-page pointer-events-none relative grid items-center gap-12 py-20 md:py-28 lg:py-32",
          hasSlides ? "w-full pb-32 md:pb-32" : "lg:grid-cols-[1.15fr_1fr]",
        )}
      >
        <motion.div style={still ? undefined : { y: textY, opacity: textOpacity }} className={cn("pointer-events-auto", hasSlides && "max-w-2xl")}>
          <p className="eyebrow animate-fade-up !text-brass" style={step(0)}>
            Private indoor pickleball
          </p>
          <h1 className="mt-6 text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
            {/* Balanced so a wide screen never leaves "court." alone on the second line. */}
            <span className="block animate-fade-up text-balance" style={step(1)}>
              Your private pickleball court.
            </span>
            <em className="block animate-fade-up text-brass" style={step(2)}>
              just for your group.
            </em>
          </h1>
          <p className="mt-6 max-w-xl animate-fade-up text-lg leading-relaxed text-ivory/80" style={step(3)}>
            Book the court by the hour, then add the KTV lounge, jacuzzi or badminton when you want more. One booking keeps
            all of S-Villa private for up to {maxGuests} guests.
          </p>
          <div className="mt-10 flex animate-fade-up flex-wrap gap-3" style={step(4)}>
            <Button asChild variant="brass" size="lg">
              <Link href="/book?service=pickleball">
                Book the court <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="light" size="lg">
              <Link href="/availability">Check availability</Link>
            </Button>
          </div>
          <ul className="mt-12 flex animate-fade-up flex-wrap gap-x-8 gap-y-3 text-sm text-ivory/75" style={step(5)}>
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

        {hasSlides ? null : (
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

/**
 * Full-bleed crossfading photos behind the hero text. Auto-advances every
 * SLIDE_MS unless paused (button, hover, keyboard focus, hidden tab) or the
 * visitor prefers reduced motion — a pause control is required for content
 * that moves on its own for more than five seconds (WCAG 2.2.2).
 */
function Slideshow({ slides, drift, still }: { slides: HeroSlide[]; drift?: MotionValue<number>; still: boolean }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false); // hover or focus inside the controls
  const auto = !still && !paused && !held && slides.length > 1;

  useEffect(() => {
    if (!auto) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setActive((i) => (i + 1) % slides.length);
    }, SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [auto, slides.length]);

  return (
    <>
      {/* Starts 96px above the hero so the scroll drift never uncovers an edge. */}
      <motion.div
        style={drift ? { y: drift } : undefined}
        className="absolute inset-x-0 -top-24 bottom-0"
        role="group"
        aria-roledescription="slideshow"
        aria-label="Photos of S-Villa"
      >
        {slides.map((s, i) => (
          <div
            key={s.media.src}
            aria-hidden={i !== active}
            className={cn("absolute inset-0 transition-opacity duration-[1200ms] ease-soft", i === active ? "opacity-100" : "opacity-0")}
          >
            <MediaFrame
              media={s.media}
              sizes="100vw"
              preload={i === 0}
              // Only the slide on screen zooms; switching slides restarts it.
              className={cn("size-full", i === active && "motion-safe:animate-ken-burns")}
            />
          </div>
        ))}
      </motion.div>
      {/* Phones: the text spans the width, so darken evenly. Desktop: darken the text side only. */}
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-t from-forest via-forest/80 to-forest/55 lg:bg-linear-to-r lg:from-forest lg:via-forest/70 lg:to-forest/5"
        aria-hidden
      />

      {slides.length > 1 ? (
        <div
          className="container-page absolute inset-x-0 bottom-5 z-10 flex items-center justify-between gap-4 md:bottom-8"
          onMouseEnter={() => setHeld(true)}
          onMouseLeave={() => setHeld(false)}
          onFocus={() => setHeld(true)}
          onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setHeld(false)}
        >
          <p className="min-w-0 truncate text-xs font-medium text-ivory/85 sm:text-sm" aria-live={auto ? "off" : "polite"}>
            {slides[active].label}
          </p>
          <div className="flex shrink-0 items-center">
            {slides.map((s, i) => (
              <button
                key={s.media.src}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show slide ${i + 1}: ${s.label}`}
                aria-current={i === active}
                // Narrower on phones so the caption keeps room; still 44px tall.
                className="group grid h-11 w-9 place-items-center sm:w-11"
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-all duration-300 ease-soft",
                    i === active ? "w-6 bg-brass" : "w-1.5 bg-ivory/50 group-hover:bg-ivory/80",
                  )}
                />
              </button>
            ))}
            {still ? null : (
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? "Play slideshow" : "Pause slideshow"}
                className="ml-1 grid size-11 place-items-center rounded-full border border-ivory/25 text-ivory transition-colors hover:border-ivory/60 hover:bg-ivory/10"
              >
                {paused ? <Play className="size-4 translate-x-px fill-current" aria-hidden /> : <Pause className="size-4 fill-current" aria-hidden />}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
