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

/** How long each slide stays up. The first slide (the court) leads the pitch, so it stays longer. */
const FIRST_SLIDE_MS = 8000;
const SLIDE_MS = 6000;
const slideMs = (i: number) => (i === 0 ? FIRST_SLIDE_MS : SLIDE_MS);
const HINT_KEY = "svilla-hero-swipe-hint";

/**
 * Homepage hero, leading with the private pickleball court.
 * - Text entrance is pure CSS (staggered fade-up), so the headline is visible
 *   even before JavaScript loads — no blank hero on slow connections.
 * - With HERO_SLIDES set (src/lib/media.ts), full-bleed photos change every few
 *   seconds with a soft parallax wipe, each zooming slowly while it's shown and
 *   drifting on scroll, under a forest gradient that keeps the headline
 *   readable. Progress bars show the timing; visitors can pause, pick a slide,
 *   or swipe on touch screens.
 * - Without slides, the illustrated court floats beside the text instead.
 * Motion is transform/opacity/mask only; with reduced motion the slides don't
 * advance on their own and change without a wipe.
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
  const show = useSlideshow(slides.length, !!still);

  const step = (i: number) => ({ animationDelay: `${80 + i * 90}ms` });

  return (
    <section
      ref={ref}
      data-hero
      {...(hasSlides ? show.swipe : {})}
      className={cn(
        "relative overflow-hidden bg-forest text-ivory",
        // Vertical drags still scroll the page; horizontal ones change the slide.
        hasSlides && "flex touch-pan-y touch-pinch-zoom items-center md:min-h-[38rem] lg:min-h-[44rem]",
      )}
    >
      {hasSlides ? (
        <Slideshow slides={slides} show={show} drift={still ? undefined : mediaY} />
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

type Direction = "next" | "prev";

/**
 * Slideshow state. Timing is driven by the active progress bar's CSS animation
 * (its animationend advances the slide), so pausing the bar pauses the show.
 * It pauses on the pause button, on hover/focus over the controls and while
 * the tab is hidden; with reduced motion it never advances on its own. A pause
 * control is required for content that moves by itself for over 5s (WCAG 2.2.2).
 */
function useSlideshow(count: number, still: boolean) {
  const [active, setActive] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [direction, setDirection] = useState<Direction>("next");
  const [run, setRun] = useState(0); // bumps on every pick, so the progress bar restarts
  const [turn, setTurn] = useState(0); // bumps on every slide change, so the entering wipe replays
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    const onVisibility = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // One-time "swipe" hint on touch screens, once per visit, after the first slide has settled.
  useEffect(() => {
    if (still || count < 2 || !window.matchMedia("(hover: none) and (pointer: coarse)").matches) return;
    try {
      if (sessionStorage.getItem(HINT_KEY)) return;
      sessionStorage.setItem(HINT_KEY, "1");
    } catch {
      return; // storage blocked: skip the hint rather than show it on every visit
    }
    const show = window.setTimeout(() => setHint(true), 2500);
    const hide = window.setTimeout(() => setHint(false), 6500);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [still, count]);

  const goTo = (i: number, dir: Direction) => {
    const target = (i + count) % count;
    if (target === active) return setRun((r) => r + 1);
    setPrev(active);
    setDirection(dir);
    setActive(target);
    setTurn((t) => t + 1);
    setRun((r) => r + 1);
    setHint(false);
  };

  // Touch swipes anywhere on the hero: left for the next slide, right for the previous one.
  const start = useRef<{ id: number; x: number; y: number } | null>(null);
  const swipe = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" || !e.isPrimary || count < 2) return;
      start.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    },
    onPointerUp: (e: React.PointerEvent) => {
      const s = start.current;
      start.current = null;
      if (!s || s.id !== e.pointerId) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) goTo(active + (dx < 0 ? 1 : -1), dx < 0 ? "next" : "prev");
    },
    onPointerCancel: () => {
      start.current = null;
    },
  };

  return {
    active,
    prev,
    direction,
    run,
    turn,
    paused,
    hint,
    still,
    running: !still && !paused && !held && !hidden && count > 1,
    goTo,
    togglePause: () => setPaused((p) => !p),
    setHeld,
    advance: () => goTo(active + 1, "next"),
    swipe,
  };
}

type Show = ReturnType<typeof useSlideshow>;

/** Full-bleed photos behind the hero text, plus the caption, progress bars and pause button. */
function Slideshow({ slides, show, drift }: { slides: HeroSlide[]; show: Show; drift?: MotionValue<number> }) {
  const { active, prev, direction, run, turn, still } = show;
  const total = String(slides.length).padStart(2, "0");

  return (
    <>
      {/* Starts 96px above the hero so the scroll drift never uncovers an edge. */}
      <motion.div
        style={drift ? { y: drift } : undefined}
        // isolate: keeps the slides' z-order (entering over leaving) from rising above the controls.
        className="absolute inset-x-0 -top-24 bottom-0 isolate"
        role="group"
        aria-roledescription="slideshow"
        aria-label="Photos of S-Villa"
      >
        {/* The one-time swipe hint nudges the whole stack sideways and back. */}
        <div className={cn("absolute inset-0", show.hint && "motion-safe:animate-hero-nudge")}>
          {slides.map((s, i) => {
            const isActive = i === active;
            const isLeaving = i === prev && !still;
            return (
              <div
                // Remount the entering slide so its wipe replays every time it comes back.
                key={isActive ? `${s.media.src}-${turn}` : s.media.src}
                aria-hidden={!isActive}
                className={cn(
                  "absolute inset-0",
                  isActive ? "z-20" : isLeaving ? "z-10" : "invisible z-0",
                  // Entering: soft-edged wipe from the side it's coming from, drifting into place.
                  isActive && prev !== null && !still && (direction === "next" ? "hero-mask-next animate-hero-wipe-next" : "hero-mask-prev animate-hero-wipe-prev"),
                  // Leaving: stays underneath and drifts the other way (parallax).
                  isLeaving && (direction === "next" ? "animate-hero-leave-next" : "animate-hero-leave-prev"),
                )}
              >
                <MediaFrame
                  media={s.media}
                  sizes="100vw"
                  preload={i === 0}
                  // Only the slide on screen zooms; switching slides restarts it.
                  className={cn("size-full", isActive && "motion-safe:animate-ken-burns")}
                />
              </div>
            );
          })}
        </div>
      </motion.div>
      {/* Phones: the text spans the width, so darken evenly. Desktop: darken the text side only. */}
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-t from-forest via-forest/80 to-forest/55 lg:bg-linear-to-r lg:from-forest lg:via-forest/70 lg:to-forest/5"
        aria-hidden
      />

      {slides.length > 1 ? (
        <div
          className="container-page absolute inset-x-0 bottom-5 z-10 flex items-center justify-between gap-3 md:bottom-8"
          onMouseEnter={() => show.setHeld(true)}
          onMouseLeave={() => show.setHeld(false)}
          onFocus={() => show.setHeld(true)}
          onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && show.setHeld(false)}
        >
          <p className="min-w-0 truncate text-xs font-medium text-ivory/85 sm:text-sm" aria-live={show.running ? "off" : "polite"}>
            {/* Rises in with each slide. */}
            <span key={`${active}-${turn}`} className="inline-block motion-safe:animate-hero-caption">
              {/* Phones: the bars already show position, so the caption keeps room for the label. */}
              <span className="hidden tabular-nums text-brass sm:inline">
                {String(active + 1).padStart(2, "0")} / {total}
              </span>
              <span className="mx-2 hidden text-ivory/40 sm:inline" aria-hidden>
                ·
              </span>
              {slides[active].label}
            </span>
          </p>
          <div className="relative flex shrink-0 items-center">
            {/* Floats above the bars so it never takes room from the caption. */}
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute bottom-full left-0 mb-1 text-xs font-semibold uppercase tracking-wider text-ivory/80 transition-opacity duration-500 md:hidden",
                show.hint ? "opacity-100" : "opacity-0",
              )}
            >
              Swipe
            </span>
            {slides.map((s, i) => (
              <button
                key={s.media.src}
                type="button"
                onClick={() => show.goTo(i, i < active ? "prev" : "next")}
                aria-label={`Show slide ${i + 1}: ${s.label}`}
                aria-current={i === active}
                // 44px tall; narrower on phones so the caption keeps room.
                className="group grid h-11 w-9 place-items-center sm:w-12"
              >
                <span className="relative block h-[3px] w-7 overflow-hidden rounded-full bg-ivory/30 transition-colors group-hover:bg-ivory/50 sm:w-10">
                  {i < active || (i === active && still) ? (
                    // Done, or reduced motion (no timer): full.
                    <span className={cn("absolute inset-0 rounded-full", i === active ? "bg-brass" : "bg-ivory/70")} />
                  ) : i === active ? (
                    // Filling over this slide's time; freezes while paused.
                    <span
                      key={run}
                      className="absolute inset-0 origin-left rounded-full bg-brass"
                      style={{
                        animation: `hero-progress ${slideMs(i)}ms linear both`,
                        animationPlayState: show.running ? "running" : "paused",
                      }}
                      onAnimationEnd={show.advance}
                    />
                  ) : null}
                </span>
              </button>
            ))}
            {still ? null : (
              <button
                type="button"
                onClick={show.togglePause}
                aria-label={show.paused ? "Play slideshow" : "Pause slideshow"}
                className="ml-1 grid size-11 place-items-center rounded-full border border-ivory/25 text-ivory transition-colors hover:border-ivory/60 hover:bg-ivory/10"
              >
                {show.paused ? <Play className="size-4 translate-x-px fill-current" aria-hidden /> : <Pause className="size-4 fill-current" aria-hidden />}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
