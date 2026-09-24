import Link from "next/link";
import { cn } from "@/lib/utils";

// Same artwork as public/logo/logo-mark-{light,dark}.svg, drawn inline: an SVG loaded
// through <img> can't use the page's web fonts, so its "S" would fall back to Georgia.
const MARK_COLORS = {
  dark: { outer: "#A9895A", inner: "#D9C79E", letter: "#16241B" }, // logo-mark-light.svg, for light backgrounds
  light: { outer: "#C4A265", inner: "#5A6B54", letter: "#F1ECE1" }, // logo-mark-dark.svg, for dark backgrounds
};

export function Logo({ tone = "dark", className, href = "/" }: { tone?: "dark" | "light"; className?: string; href?: string }) {
  const mark = MARK_COLORS[tone];
  return (
    <Link href={href} className={cn("group flex items-center gap-3", className)} aria-label="S-Villa home">
      <svg
        viewBox="0 0 64 64"
        fill="none"
        className="size-10 shrink-0 transition-transform group-hover:rotate-6"
        aria-hidden
      >
        <circle cx="32" cy="32" r="31" stroke={mark.outer} strokeWidth="1" />
        <circle cx="32" cy="32" r="26.5" stroke={mark.inner} strokeWidth="0.75" />
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
        <span className={cn("mt-1 hidden text-[10px] font-bold uppercase tracking-[0.2em] sm:block", tone === "dark" ? "text-muted" : "text-ivory/60")}>
          Pickleball &amp; Courtyard
        </span>
      </span>
    </Link>
  );
}
