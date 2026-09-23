import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ tone = "dark", className, href = "/" }: { tone?: "dark" | "light"; className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group flex items-center gap-3", className)} aria-label="S-Villa home">
      <span
        className={cn(
          "grid size-10 place-items-center rounded-full border font-display text-xl italic transition-transform group-hover:rotate-6",
          tone === "dark" ? "border-forest/30 text-forest" : "border-brass/50 text-brass",
        )}
        aria-hidden
      >
        S
      </span>
      <span className="flex flex-col leading-none">
        <span className={cn("font-display text-2xl tracking-wide", tone === "dark" ? "text-ink" : "text-ivory")}>S-Villa</span>
        <span className={cn("mt-1 text-[10px] font-bold uppercase tracking-[0.2em]", tone === "dark" ? "text-muted" : "text-ivory/60")}>
          Pickleball &amp; Courtyard
        </span>
      </span>
    </Link>
  );
}
