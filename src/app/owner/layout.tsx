import type { Metadata } from "next";
import { after } from "next/server";
import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { sweepExpiredBookings } from "@/lib/notifications";
import { logout } from "@/actions/auth";
import { Logo } from "@/components/navigation/logo";
import { OwnerNav } from "@/components/owner/owner-nav";

export const metadata: Metadata = {
  title: { default: "Owner Portal", template: "%s · Owner Portal" },
  robots: { index: false, follow: false },
};

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const owner = await requireOwner();
  // Keep expired holds and their emails up to date whenever the owner is active.
  after(() => sweepExpiredBookings().catch(() => undefined));

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="border-b border-ivory/10 bg-ink text-ivory lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col lg:border-b-0">
        <div className="flex items-center justify-between gap-4 px-5 py-4 lg:py-6">
          <Logo tone="light" href="/owner" />
          {/* Small screens: the sidebar footer is hidden, so offer these here. */}
          <div className="flex items-center gap-1 lg:hidden">
            <Link
              href="/"
              target="_blank"
              className="grid size-11 place-items-center rounded-full text-ivory/80 hover:bg-ivory/10 hover:text-brass"
              aria-label="View website (opens in a new tab)"
            >
              <ExternalLink className="size-5" aria-hidden />
            </Link>
            <form action={logout}>
              <button type="submit" className="flex h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-ivory/80 hover:bg-ivory/10 hover:text-brass">
                <LogOut className="size-5" aria-hidden /> Sign out
              </button>
            </form>
          </div>
        </div>
        <OwnerNav />
        <div className="mt-auto hidden border-t border-ivory/10 p-5 text-sm lg:block">
          <p className="truncate text-ivory/60">{owner.profile?.full_name || owner.email}</p>
          <div className="mt-3 flex flex-col gap-2">
            <Link href="/" className="flex items-center gap-2 text-ivory/80 hover:text-brass" target="_blank">
              <ExternalLink className="size-4" aria-hidden /> View website
            </Link>
            <form action={logout}>
              <button type="submit" className="flex items-center gap-2 text-ivory/80 hover:text-brass">
                <LogOut className="size-4" aria-hidden /> Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main id="main" className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        {children}
      </main>
    </div>
  );
}
