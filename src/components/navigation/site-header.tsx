"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MotionConfig, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { isActive, type NavLink } from "./nav-links";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Fixed site header. Fades/slides in once on first load, then condenses and
 * gains a translucent blurred background after the visitor scrolls past the
 * hero (or a few pixels on pages without one). Only one boolean changes on
 * scroll, so it re-renders at most once per threshold crossing.
 */
export function SiteHeader({ links, account }: { links: NavLink[]; account: NavLink }) {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [condensed, setCondensed] = useState(false);
  const threshold = useRef(24);

  // Where the hero ends on this page. Re-measured on navigation and resize.
  useEffect(() => {
    const measure = () => {
      const hero = document.querySelector<HTMLElement>("[data-hero]");
      threshold.current = hero ? Math.max(24, hero.offsetTop + hero.offsetHeight - 96) : 24;
    };
    measure();
    // Sync once in case the page was restored mid-scroll.
    const frame = requestAnimationFrame(() => setCondensed(window.scrollY > threshold.current));
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
  }, [pathname]);

  useMotionValueEvent(scrollY, "change", (y) => {
    const next = y > threshold.current;
    setCondensed((prev) => (prev === next ? prev : next));
  });

  return (
    <MotionConfig reducedMotion="user">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className={cn(
          "fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-out",
          condensed ? "border-line/60 bg-ivory/80 shadow-soft backdrop-blur-md backdrop-saturate-150" : "border-transparent bg-ivory",
        )}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-ivory"
        >
          Skip to content
        </a>
        <nav
          aria-label="Main"
          className={cn(
            "container-page relative flex items-center justify-between gap-6 transition-[height] duration-300 ease-out",
            condensed ? "h-14 md:h-16" : "h-16 md:h-20",
          )}
        >
          <div className={cn("origin-left transition-transform duration-300 ease-out", condensed && "scale-[0.92]")}>
            <Logo />
          </div>

          <ul className="hidden items-center gap-7 lg:flex">
            {links.map((l) => {
              const active = isActive(pathname, l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative py-2 text-sm font-medium transition-colors duration-200 hover:text-ink",
                      active ? "text-ink" : "text-ink/70",
                    )}
                  >
                    {l.label}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-x-0 bottom-0.5 h-px origin-left bg-brass-deep transition-transform duration-300 ease-out group-hover:scale-x-100",
                        active ? "scale-x-100" : "scale-x-0",
                      )}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="hidden items-center gap-2 lg:flex">
            <Button asChild variant="ghost" size="sm">
              <Link href={account.href}>{account.label}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/book">Book Now</Link>
            </Button>
          </div>

          <MobileMenu links={links} account={account} />
        </nav>
      </motion.header>
      {/* Reserves the header's full height so condensing never shifts the page. */}
      <div aria-hidden className="h-16 md:h-20" />
    </MotionConfig>
  );
}
