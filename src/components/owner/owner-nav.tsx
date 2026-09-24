"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CalendarOff, CreditCard, LayoutDashboard, ListChecks, Settings, Tags } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/owner", label: "Dashboard", icon: LayoutDashboard },
  { href: "/owner/bookings", label: "Bookings", icon: ListChecks },
  { href: "/owner/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/owner/availability", label: "Availability", icon: CalendarOff },
  { href: "/owner/services", label: "Services & Pricing", icon: Tags },
  { href: "/owner/payments", label: "Payments", icon: CreditCard },
  { href: "/owner/settings", label: "Settings", icon: Settings },
];

export function OwnerNav() {
  const pathname = usePathname();
  const activeRef = useRef<HTMLAnchorElement>(null);

  // Small screens scroll the menu sideways: keep the current page's item in view.
  // (Scrolls only the list horizontally; scrollIntoView could also move the page.)
  useEffect(() => {
    const item = activeRef.current;
    const list = item?.closest("ul");
    if (!item || !list || list.scrollWidth <= list.clientWidth) return;
    list.scrollLeft = item.offsetLeft - (list.clientWidth - item.offsetWidth) / 2;
  }, [pathname]);

  return (
    <nav aria-label="Owner Portal" className="relative">
      <ul className="flex gap-1 overflow-x-auto px-3 pb-3 pr-10 lg:flex-col lg:px-3 lg:pb-0">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/owner" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                ref={active ? activeRef : undefined}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-ivory/10 text-brass" : "text-ivory/75 hover:bg-ivory/5 hover:text-ivory",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
      {/* Fade at the edge so it's clear more items are off-screen. */}
      <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-ink to-transparent lg:hidden" />
    </nav>
  );
}
