"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DURATION, EASE } from "@/lib/motion";
import { isActive, type NavLink } from "./nav-links";

export function MobileMenu({ links, account }: { links: NavLink[]; account: NavLink }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    // Close the menu after navigating.
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <div className="flex items-center gap-2">
        <Button asChild size="sm">
          <Link href="/book">Book Now</Link>
        </Button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="relative grid size-10 place-items-center overflow-hidden rounded-full border border-line transition-colors hover:border-ink"
        >
          <AnimatePresence initial={false} mode="wait">
            <motion.span
              key={open ? "close" : "open"}
              initial={{ opacity: 0, rotate: open ? -90 : 90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: open ? 90 : -90 }}
              transition={{ duration: DURATION.fast }}
              className="grid place-items-center"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <>
            {/* Dim the page; tap outside to close. */}
            <motion.div
              key="backdrop"
              aria-hidden
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION.fast }}
              className="absolute inset-x-0 top-full h-dvh bg-ink/25"
            />
            <motion.div
              key="panel"
              id="mobile-nav"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: DURATION.base, ease: EASE }}
              className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-line bg-ivory shadow-lift"
            >
              <motion.ul
                className="container-page flex flex-col py-4"
                initial="hidden"
                animate="shown"
                variants={{ shown: { transition: { staggerChildren: 0.03, delayChildren: 0.04 } } }}
              >
                {[...links, account].map((l) => {
                  const active = isActive(pathname, l.href);
                  return (
                    <motion.li
                      key={l.href}
                      variants={{ hidden: { opacity: 0, x: -8 }, shown: { opacity: 1, x: 0 } }}
                      transition={{ duration: DURATION.fast, ease: EASE }}
                    >
                      <Link
                        href={l.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center justify-between border-b border-line/60 py-4 font-display text-2xl transition-colors duration-200",
                          active ? "text-brass-deep" : "text-ink hover:text-brass-deep",
                        )}
                      >
                        {l.label}
                        {active ? <span className="size-1.5 rounded-full bg-brass-deep" aria-hidden /> : null}
                      </Link>
                    </motion.li>
                  );
                })}
              </motion.ul>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
