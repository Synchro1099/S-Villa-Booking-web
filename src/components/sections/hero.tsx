"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { ArrowRight, CalendarCheck, ChevronLeft, ChevronRight, Pause, Play, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaFrame } from "@/components/media/media-frame";
import { HERO_SLIDES, type HeroSlide } from "@/lib/media";
import { cn } from "@/lib/utils";
import { CourtArt } from "./court-art";

/** How long each slide stays up. Whichever slide is first leads the rotation, so it stays longer. */
const FIRST_SLIDE_MS = 8000;
const SLIDE_MS = 6000;
const slideMs = (i: number) => (i === 0 ? FIRST_SLIDE_MS : SLIDE_MS);
const HINT_KEY = "svilla-hero-swipe-hint";

/**
 * Homepage hero, leading with the private pickleball court.
 * - With HERO_SLIDES set (src/lib/media.ts) the photos are the show: shown
 *   clean and bright — no overlay — with the words on a solid panel beside
 *   them. Phones and tablets stack photo over panel (the panel's rounded top
 *   overlaps the photo like a sheet); desktops split the screen, text left,
 *   photo right. Slides change with a soft parallax wipe, each zooming slowly
 *   and drifting on scroll; a thin progress line shows the timing, with a
 *   03 / 08 counter; visitors can pause, step through with the arrows, or swipe
 *   the photo on touch screens.
 * - Without slides, the illustrated court floats beside the text instead.
 * - Text entrance is pure CSS (staggered fade-up), so the headline is visible
 *   even before JavaScript loads — no blank hero on slow connections.
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
  const mediaY = useTransform(scrollYProgress, [0, 1], [0, 72]);
  const slides = HERO_SLIDES;
  const hasSlides = slides.length > 0;

  // Scroll-linked styles bypass MotionConfig, so switch parallax off explicitly.
  const still = useReducedMotion();
  const show = useSlideshow(slides.length, !!still);
  // Stacked layout (phones/tablets): the words sit below the photo, so they mustn't fade as the
  // visitor scrolls down to read them. Only the desktop split drifts and fades the text.
  const split = useMinWidth(1024);
  const textMotion = still || (hasSlides && !split) ? undefined : { y: textY, opacity: textOpacity };

  const step = (i: number) => ({ animationDelay: `${80 + i * 90}ms` });

  const copy = (
    <>
      <p className="eyebrow animate-fade-up !text-brass" style={step(0)}>
        Private indoor pickleball
      </p>
      <h1
        className={cn(
          "mt-5 text-5xl leading-[1.02] sm:text-6xl",
          // Split layout: sized to its column so "just for your group." stays on one line.
          hasSlides ? "lg:text-[clamp(2.75rem,4.1vw,4.25rem)]" : "lg:text-7xl",
        )}
      >
        {/* Balanced so a wide screen never leaves "court." alone on the second line. */}
        <span className="block animate-fade-up text-balance" style={step(1)}>
          Your private pickleball court.
        </span>
        <em className={cn("block animate-fade-up text-brass", hasSlides && "lg:whitespace-nowrap")} style={step(2)}>
          just for your group.
        </em>
      </h1>
      {/* Stacked layout: the buttons come straight after the headline (closer to the first screen);
          the description and facts follow them. */}
      <p className={cn("mt-6 max-w-xl animate-fade-up text-lg leading-relaxed text-ivory/80", hasSlides && "max-lg:order-last max-lg:mt-8 lg:mt-4 lg:text-base xl:mt-6 xl:text-lg")} style={step(3)}>
        Book the court by the hour, then add the KTV lounge, jacuzzi or badminton when you want more. One booking keeps all of
        S-Villa private for up to {maxGuests} guests.
      </p>
      <div className={cn("mt-9 flex animate-fade-up flex-wrap gap-3", hasSlides && "max-lg:mt-8 lg:mt-6 xl:mt-8")} style={step(4)}>
        <Button asChild variant="brass" size="lg">
          <Link href="/book?service=pickleball">
            Book the court <ArrowRight />
          </Link>
        </Button>
        <Button asChild variant="light" size="lg">
          <Link href="/availability">Check availability</Link>
        </Button>
      </div>
      <ul className={cn("mt-10 flex animate-fade-up flex-wrap gap-x-8 gap-y-3 text-sm text-ivory/75", hasSlides && "max-lg:order-last max-lg:mt-7 lg:mt-6 xl:mt-8")} style={step(5)}>
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
    </>
  );

  if (!hasSlides) {
    return (
      <section ref={ref} data-hero className="relative overflow-hidden bg-forest text-ivory">
        {/* Court lines drift diagonally; the layer is oversized by one tile so the loop is seamless. */}
        <div className="absolute -inset-[88px] opacity-60 motion-safe:animate-court-pan" aria-hidden>
          <div className="court-lines size-full" />
        </div>
        <div className="grain pointer-events-none absolute inset-0" aria-hidden />
        <motion.div style={still ? undefined : { y: glowY }} className="pointer-events-none absolute -right-40 -top-40" aria-hidden>
          <div className="size-[34rem] rounded-full bg-brass/20 blur-3xl motion-safe:animate-glow" />
        </motion.div>
        <div className="container-page relative grid items-center gap-12 py-20 md:py-28 lg:grid-cols-[1.15fr_1fr] lg:py-32">
          <motion.div style={textMotion}>{copy}</motion.div>
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

  return (
    <section
      ref={ref}
      data-hero
      className="relative bg-forest text-ivory lg:grid lg:min-h-[max(36rem,calc(100svh-5rem))] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
    >
      {/* The photo: clean and full-strength. Swipeable on touch screens (vertical drags still scroll). */}
      <div
        {...show.swipe}
        // Phones: tall enough to be the star, short enough that "Book the court" still makes the first screen.
        className="relative h-[min(45svh,30rem)] touch-pan-y touch-pinch-zoom overflow-hidden md:h-[min(50svh,34rem)] lg:order-2 lg:h-auto"
      >
        <SlideStage slides={slides} show={show} drift={still ? undefined : mediaY} />
      </div>

      {/* The words, on their own solid panel. Phones/tablets: a sheet whose rounded top overlaps the
          photo. Desktop: the left column, text aligned with the rest of the page. */}
      <div className="relative z-10 -mt-7 overflow-hidden rounded-t-[1.75rem] bg-forest lg:order-1 lg:mt-0 lg:flex lg:items-center lg:rounded-none">
        <div className="court-lines pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div className="grain pointer-events-none absolute inset-0" aria-hidden />
        <motion.div style={still ? undefined : { y: glowY }} className="pointer-events-none absolute -left-40 -top-48" aria-hidden>
          <div className="size-[30rem] rounded-full bg-brass/15 blur-3xl motion-safe:animate-glow" />
        </motion.div>

        <div className="container-page relative flex flex-col pb-14 pt-5 md:pb-20 md:pt-8 lg:mx-0 lg:max-w-none lg:py-10 xl:py-16 lg:pl-[max(2rem,calc((100vw-76rem)/2+2rem))] lg:pr-14">
          {/* Slide caption, progress and pause: top of the sheet on phones/tablets, foot of the column on desktop. */}
          <SlideControls slides={slides} show={show} className="border-b border-ivory/10 pb-3 lg:order-last lg:mt-6 lg:border-b-0 lg:border-t lg:pb-0 lg:pt-3 xl:mt-12 xl:pt-4" />
          <motion.div style={textMotion} className="mt-6 flex max-w-2xl flex-col md:mt-8 lg:mt-0">
            {copy}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/** True once the viewport is at least `px` wide (false during server render). */
function useMinWidth(px: number) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${px}px)`);
    const update = () => setMatch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [px]);
  return match;
}

type Show = ReturnType<typeof useSlideshow>;

/** The photos themselves: stacked, one on screen, changing with the parallax wipe. No overlay. */
function SlideStage({ slides, show, drift }: { slides: HeroSlide[]; show: Show; drift?: MotionValue<number> }) {
  const { active, prev, direction, turn, still } = show;
  return (
    // Starts 72px above the frame so the scroll drift never uncovers an edge.
    <motion.div
      style={drift ? { y: drift } : undefined}
      // isolate: keeps the slides' z-order (entering over leaving) inside this layer.
      className="absolute inset-x-0 -top-[72px] bottom-0 isolate"
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
                sizes="(min-width: 1024px) 54vw, 100vw"
                quality={85}
                preload={i === 0}
                // Only the slide on screen zooms; switching slides restarts it.
                className={cn("size-full", isActive && "motion-safe:animate-ken-burns")}
              />
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/**
 * "03 / 08 · Add-on: Jacuzzi" (plus the one-time swipe hint) on one line; on the next, a thin
 * display-only progress line and the ‹ › and pause buttons — all 44px, however many slides there are.
 * The line fills over the current slide's time (its animationend advances the show), freezing while
 * paused; with reduced motion it shows how far through the set you are instead.
 */
function SlideControls({ slides, show, className }: { slides: HeroSlide[]; show: Show; className?: string }) {
  const { active, run, turn, still } = show;
  if (slides.length < 2) return null;
  const total = String(slides.length).padStart(2, "0");
  const arrow = "grid size-11 shrink-0 place-items-center rounded-full border border-ivory/25 text-ivory transition-colors hover:border-ivory/60 hover:bg-ivory/10";
  return (
    <div
      className={cn("flex flex-col gap-1", className)}
      onMouseEnter={() => show.setHeld(true)}
      onMouseLeave={() => show.setHeld(false)}
      onFocus={() => show.setHeld(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && show.setHeld(false)}
    >
      <div className="relative">
        <p className="min-w-0 truncate text-sm font-medium text-ivory/85" aria-live={show.running ? "off" : "polite"}>
          {/* Rises in with each slide. */}
          <span key={`${active}-${turn}`} className="inline-block motion-safe:animate-hero-caption">
            <span className="tabular-nums text-brass">
              {String(active + 1).padStart(2, "0")} / {total}
            </span>
            <span className="mx-2 text-ivory/40" aria-hidden>
              ·
            </span>
            {slides[active].label}
          </span>
        </p>
        {/* One-time hint on touch screens (phones and tablets). Floats over the end of the caption
            line — the first slide's caption is short — so it never takes width from longer captions. */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute bottom-0 right-0 bg-forest pl-3 text-xs font-semibold uppercase tracking-wider text-ivory/80 transition-opacity duration-500 lg:hidden",
            show.hint ? "opacity-100" : "opacity-0",
          )}
        >
          Swipe for more
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span aria-hidden className="relative mr-2 block h-0.5 min-w-0 flex-1 overflow-hidden rounded-full bg-ivory/20">
          {still ? (
            // Reduced motion (no timer): how far through the set.
            <span className="absolute inset-y-0 left-0 rounded-full bg-brass" style={{ width: `${((active + 1) / slides.length) * 100}%` }} />
          ) : (
            // Filling over this slide's time; freezes while paused.
            <span
              key={run}
              className="absolute inset-0 origin-left rounded-full bg-brass"
              style={{ animation: `hero-progress ${slideMs(active)}ms linear both`, animationPlayState: show.running ? "running" : "paused" }}
              onAnimationEnd={show.advance}
            />
          )}
        </span>
        <button type="button" onClick={() => show.goTo(active - 1, "prev")} aria-label="Previous photo" className={arrow}>
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <button type="button" onClick={() => show.goTo(active + 1, "next")} aria-label="Next photo" className={arrow}>
          <ChevronRight className="size-5" aria-hidden />
        </button>
        {still ? null : (
          <button type="button" onClick={show.togglePause} aria-label={show.paused ? "Play slideshow" : "Pause slideshow"} className={arrow}>
            {show.paused ? <Play className="size-4 translate-x-px fill-current" aria-hidden /> : <Pause className="size-4 fill-current" aria-hidden />}
          </button>
        )}
      </div>
    </div>
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
  // Set on the first tap or swipe: someone who has already found the controls doesn't need the hint.
  const interacted = useRef(false);

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
    const show = window.setTimeout(() => !interacted.current && setHint(true), 2500);
    const hide = window.setTimeout(() => setHint(false), 6500);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [still, count]);

  const change = (i: number, dir: Direction) => {
    const target = (i + count) % count;
    if (target === active) return setRun((r) => r + 1);
    setPrev(active);
    setDirection(dir);
    setActive(target);
    setTurn((t) => t + 1);
    setRun((r) => r + 1);
    setHint(false);
  };
  // A visitor's own pick (arrows, swipe) — as opposed to the timer moving on.
  const goTo = (i: number, dir: Direction) => {
    interacted.current = true;
    change(i, dir);
  };

  // Touch swipes on the photo: left for the next slide, right for the previous one.
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
    togglePause: () => {
      interacted.current = true;
      setHint(false);
      setPaused((p) => !p);
    },
    setHeld,
    advance: () => change(active + 1, "next"),
    swipe,
  };
}
