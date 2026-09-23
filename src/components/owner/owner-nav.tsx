"use client";

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
  return (
    <nav aria-label="Owner Portal">
      <ul className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3 lg:pb-0">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/owner" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
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
    </nav>
  );
}
