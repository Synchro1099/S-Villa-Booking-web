import Link from "next/link";
import { cn } from "@/lib/utils";

// Same artwork as public/logo/logo-mark-{light,dark}.svg, drawn inline: an SVG loaded
// through <img> can't use the page's web fonts, so its "S" would fall back to Georgia.
// The rings stay a full screen pixel wide at any size so they read crisply on 1x screens.
const MARK_COLORS = {
  dark: { outer: "#8F8672", inner: "#D8D0C1", letter: "#1C1E20" }, // logo-mark-light.svg, for light backgrounds
  light: { outer: "#CBBFA8", inner: "#5F6164", letter: "#F1ECE1" }, // logo-mark-dark.svg, for dark backgrounds
};

export function Logo({
  tone = "dark",
  className,
  href = "/",
  tagline = true,
}: {
  tone?: "dark" | "light";
  className?: string;
  href?: string;
  /** The "Pickleball & Courtyard" line under the name (from 640px up). */
  tagline?: boolean;
}) {
  const mark = MARK_COLORS[tone];
  return (
    <Link href={href} className={cn("group flex min-h-11 items-center gap-3", className)} aria-label="S-Villa home">
      <svg
        viewBox="0 0 64 64"
        fill="none"
        className="size-10 shrink-0 transition-transform group-hover:rotate-6"
        aria-hidden
      >
        <circle cx="32" cy="32" r="31" stroke={mark.outer} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <circle cx="32" cy="32" r="26.5" stroke={mark.inner} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <text
          x="32"
          y="41"
          textAnchor="middle"
          className="font-display italic"
          fontWeight="500"
          fontSize="28"
          fill={mark.letter}
        >
          S
        </text>
      </svg>
      <span className="flex flex-col leading-none">
        <span className={cn("font-display text-2xl tracking-wide", tone === "dark" ? "text-ink" : "text-ivory")}>S-Villa</span>
        {tagline ? (
          <span className={cn("mt-1 hidden text-xs font-bold uppercase tracking-[0.12em] sm:block", tone === "dark" ? "text-muted" : "text-ivory/60")}>
            Pickleball &amp; Courtyard
          </span>
        ) : null}
      </span>
    </Link>
  );
}
