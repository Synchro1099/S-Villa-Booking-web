"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { Media } from "@/lib/media";
import { cn } from "@/lib/utils";
import { GalleryTile } from "./gallery-tile";
import { Lightbox, useLightbox } from "./lightbox";

/**
 * The gallery as one sideways-scrolling row: every tile is the same height,
 * portraits narrow and landscapes wide, snapping into place. Touch screens and
 * trackpads scroll it directly; desktops also get arrow buttons. It bleeds to
 * the screen edges but starts in line with the page content, and ends with a
 * card linking to the full gallery page.
 */
export function GalleryCarousel({
  items,
  total = items.length,
  moreHref,
  className,
}: {
  items: Media[];
  /** How many items the full gallery has, for the "View all" card. */
  total?: number;
  moreHref: string;
  className?: string;
}) {
  const { index, setIndex, opener, openAt } = useLightbox();
  const scroller = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const still = useReducedMotion();

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const update = () =>
      setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
    const frame = requestAnimationFrame(update);
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const page = (direction: 1 | -1) => {
    const el = scroller.current;
    el?.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: still ? "auto" : "smooth" });
  };

  // Phones: height follows screen width; landscape tiles are 4:3 there (most of the photos' own
  // shape) so one fills ~85% of the screen and the next still peeks in, portraits ~48%.
  // Tablets: 19rem, so at 768px wide the second tile ends short of the edge and the next one peeks in.
  // Laptops/iPad landscape: capped by screen height so heading and row fit on one screen.
  const tileHeight = "h-[min(20rem,64vw)] sm:h-[19rem] lg:h-[min(26rem,44svh)]";

  return (
    <div className={cn("relative", className)}>
      <ul
        ref={scroller}
        aria-label="Gallery — scroll sideways for more"
        className="scroller-bleed flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 sm:gap-4"
      >
        {items.map((m, i) => (
          <li key={m.src} className={cn("shrink-0 snap-start", tileHeight, m.orientation === "landscape" ? "aspect-[4/3] sm:aspect-[3/2]" : "aspect-[3/4]")}>
            <GalleryTile
              media={m}
              sizes={m.orientation === "landscape" ? "(min-width: 1024px) 624px, (min-width: 640px) 456px, 86vw" : "(min-width: 1024px) 312px, (min-width: 640px) 228px, 48vw"}
              onOpen={(el) => openAt(i, el)}
            />
          </li>
        ))}
        <li className={cn("shrink-0 snap-start aspect-[3/4]", tileHeight)}>
          <Link
            href={moreHref}
            className="group court-lines flex size-full flex-col justify-end gap-2 rounded-2xl bg-forest p-6 text-ivory transition-colors hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-deep"
          >
            <span className="eyebrow !text-brass">Gallery</span>
            <span className="font-display text-3xl leading-tight">
              View all {total}
              <br />
              photos &amp; clips
            </span>
            <ArrowRight className="mt-2 size-5 text-brass transition-transform duration-300 ease-soft group-hover:translate-x-1" aria-hidden />
          </Link>
        </li>
      </ul>

      {/* Desktop arrows, over the ends of the row; hidden once there's nothing further that way. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center justify-between px-3 md:flex lg:px-6">
        <CarouselButton label="Previous photos" hidden={edges.start} onClick={() => page(-1)}>
          <ChevronLeft className="size-5" aria-hidden />
        </CarouselButton>
        <CarouselButton label="More photos" hidden={edges.end} onClick={() => page(1)}>
          <ChevronRight className="size-5" aria-hidden />
        </CarouselButton>
      </div>

      <Lightbox items={items} index={index} onIndex={setIndex} opener={opener} />
    </div>
  );
}

function CarouselButton({ label, hidden, onClick, children }: { label: string; hidden: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      tabIndex={hidden ? -1 : undefined}
      aria-hidden={hidden || undefined}
      className={cn(
        "pointer-events-auto grid size-12 place-items-center rounded-full bg-cream/90 text-ink shadow-lift backdrop-blur-sm transition-[opacity,transform] duration-300 ease-soft hover:scale-105 hover:bg-cream",
        hidden && "pointer-events-none opacity-0",
      )}
    >
      {children}
    </button>
  );
}
