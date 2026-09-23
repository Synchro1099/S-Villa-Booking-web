import Link from "next/link";
import { Search } from "lucide-react";
import { BOOKING_STATUSES, type BookingStatus } from "@/types";
import { countBookingsByStatus, listBookings } from "@/lib/data/bookings";
import { BOOKING_STATUS_LABEL } from "@/lib/booking/labels";
import { PageHeader } from "@/components/owner/page-header";
import { BookingRow } from "@/components/owner/booking-row";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Bookings" };

export default async function OwnerBookingsPage(props: PageProps<"/owner/bookings">) {
  const sp = await props.searchParams;
  const status = (BOOKING_STATUSES as readonly string[]).includes(String(sp.status)) ? (sp.status as BookingStatus) : "PENDING";
  const q = typeof sp.q === "string" ? sp.q : "";
  const [bookings, counts] = await Promise.all([listBookings({ status, q }), countBookingsByStatus()]);

  return (
    <>
      <PageHeader title="Bookings" intro="Every reservation, by status. Open one to verify payment and confirm or reject it." />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Filter by status">
          <ul className="flex flex-wrap gap-2">
            {BOOKING_STATUSES.map((s) => (
              <li key={s}>
                <Link
                  href={`/owner/bookings?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                  aria-current={s === status ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                    s === status ? "border-forest bg-forest text-ivory" : "border-line bg-cream hover:border-ink",
                  )}
                >
                  {BOOKING_STATUS_LABEL[s]}
                  <span className={cn("rounded-full px-2 text-xs", s === status ? "bg-ivory/15" : "bg-sand")}>{counts[s]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <form className="flex w-full gap-2 sm:w-auto" role="search">
          <input type="hidden" name="status" value={status} />
          <label htmlFor="q" className="sr-only">
            Search bookings
          </label>
          <Input id="q" name="q" defaultValue={q} placeholder="Name, mobile, email or SV-…" className="h-11 sm:w-72" />
          <Button type="submit" variant="outline" size="icon" aria-label="Search">
            <Search />
          </Button>
        </form>
      </div>

      <div className="mt-8 grid gap-3">
        {bookings.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-10 text-center text-muted">
            No {BOOKING_STATUS_LABEL[status].toLowerCase()} bookings{q ? ` matching “${q}”` : ""}.
          </p>
        ) : (
          bookings.map((b) => <BookingRow key={b.id} booking={b} />)
        )}
      </div>
    </>
  );
}
