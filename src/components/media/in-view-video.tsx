"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * A silent looping clip that only downloads and plays while it's on screen,
 * so a gallery of clips doesn't pull megabytes up front on phones. With
 * reduced motion it stays on its poster.
 */
export function InViewVideo({
  src,
  poster,
  focus,
  className,
  eager = false,
}: {
  src: string;
  poster: string;
  focus?: string;
  className?: string;
  /** Start right away (hero) instead of waiting to scroll into view. */
  eager?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const still = useReducedMotion();

  useEffect(() => {
    const video = ref.current;
    if (!video || still) return;
    const play = () => video.play().catch(() => undefined); // autoplay can be refused (e.g. data saver); the poster stays
    if (eager) {
      play();
      return;
    }
    const observer = new IntersectionObserver(([entry]) => (entry.isIntersecting ? play() : video.pause()), { threshold: 0.35 });
    observer.observe(video);
    return () => observer.disconnect();
  }, [eager, still]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload={eager ? "auto" : "none"}
      aria-hidden
      className={cn("absolute inset-0 size-full object-cover", className)}
      style={focus ? { objectPosition: focus } : undefined}
    />
  );
}
