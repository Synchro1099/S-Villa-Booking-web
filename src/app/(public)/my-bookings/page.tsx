import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarPlus } from "lucide-react";
import { requireCustomer } from "@/lib/auth";
import { getMyBookings } from "@/lib/data/bookings";
import { effectiveStatus } from "@/lib/booking/status";
import { formatPeso } from "@/lib/pricing";
import { formatDate, formatTimeRange, nowIn } from "@/lib/time";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { logout } from "@/actions/auth";
import type { BookingDetail } from "@/types";

export const metadata: Metadata = { title: "My Bookings", robots: { index: false } };

export default async function MyBookingsPage() {
  const viewer = await requireCustomer("/my-bookings");
  const today = nowIn("Asia/Manila").date;
  // Same display status as the booking page (a lapsed payment window shows as Expired).
  const bookings = (await getMyBookings()).map((b) => ({ ...b, status: effectiveStatus(b) }));
  const upcoming = bookings.filter((b) => b.booking_date >= today && (b.status === "PENDING" || b.status === "CONFIRMED")).reverse();
  const past = bookings.filter((b) => !upcoming.includes(b));

  return (
    <section className="container-page max-w-4xl py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Hello, {viewer.profile?.full_name?.split(" ")[0] || "there"}</p>
          <h1 className="mt-3 text-4xl sm:text-5xl">My bookings</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/account">Profile</Link>
          </Button>
          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit">
              Sign out
            </Button>
          </form>
          <Button asChild size="sm">
            <Link href="/book">
              <CalendarPlus /> New booking
            </Link>
          </Button>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="mt-12 rounded-[var(--radius-card)] border border-dashed border-line p-12 text-center">
          <h2 className="text-3xl">No bookings yet</h2>
          <p className="mt-2 text-muted">When you reserve S-Villa, your bookings and their status will appear here.</p>
          <Button asChild className="mt-6">
            <Link href="/book">Book your first visit</Link>
          </Button>
        </div>
      ) : (
        <>
          <BookingList title="Upcoming" bookings={upcoming} empty="No upcoming bookings." />
          <BookingList title="Past & closed" bookings={past} empty="Nothing here yet." />
        </>
      )}
    </section>
  );
}

function BookingList({ title, bookings, empty }: { title: string; bookings: BookingDetail[]; empty: string }) {
  return (
    <div className="mt-12">
      <h2 className="text-2xl">{title}</h2>
      {bookings.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {bookings.map((b) => (
            <li key={b.id}>
              <Link
                href={`/bookings/${b.booking_reference}`}
                className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line/70 bg-cream p-5 transition-shadow hover:shadow-soft"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">#{b.booking_reference}</p>
                  <p className="mt-1 font-display text-2xl">{formatDate(b.booking_date, "full")}</p>
                  <p className="text-sm text-muted">
                    {formatTimeRange(b.start_time, b.end_time)} · {b.guest_count} guest{b.guest_count === 1 ? "" : "s"} · {b.items.map((i) => i.service_name_snapshot).join(", ")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <BookingStatusBadge status={b.status} />
                  {b.payment ? <PaymentStatusBadge status={b.payment.status} /> : null}
                  <span className="font-semibold tabular-nums">{formatPeso(b.total_amount)}</span>
                  <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-1" aria-hidden />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
