import Link from "next/link";
import { Search } from "lucide-react";
import { BOOKING_STATUSES, type BookingStatus } from "@/types";
import { countArchivedBookings, countBookingsByStatus, listBookings } from "@/lib/data/bookings";
import { getSettings } from "@/lib/data/public";
import { BOOKING_STATUS_LABEL } from "@/lib/booking/labels";
import { addDays, nowIn } from "@/lib/time";
import { PageHeader } from "@/components/owner/page-header";
import { BookingRow } from "@/components/owner/booking-row";
import { ArchiveOldBookings } from "@/components/owner/archive-controls";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Bookings" };

type Filter = BookingStatus | "ARCHIVED";
const FILTERS: Filter[] = [...BOOKING_STATUSES, "ARCHIVED"];
const FILTER_LABEL: Record<Filter, string> = { ...BOOKING_STATUS_LABEL, ARCHIVED: "Archived" };

export default async function OwnerBookingsPage(props: PageProps<"/owner/bookings">) {
  const sp = await props.searchParams;
  const filter: Filter = (FILTERS as readonly string[]).includes(String(sp.status)) ? (sp.status as Filter) : "PENDING";
  const archived = filter === "ARCHIVED";
  const q = typeof sp.q === "string" ? sp.q : "";
  const settings = await getSettings();
  const today = nowIn(settings.timezone).date;
  const [bookings, statusCounts, archivedCount] = await Promise.all([
    listBookings(archived ? { status: "ALL", q, archived: true } : { status: filter, q, archived: false }),
    countBookingsByStatus({ excludeArchived: true }),
    countArchivedBookings(),
  ]);
  const counts: Record<Filter, number> = { ...statusCounts, ARCHIVED: archivedCount };

  return (
    <>
      <PageHeader title="Bookings" intro="Every reservation, by status. Open one to verify payment and confirm or reject it." />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Filter by status">
          <ul className="flex flex-wrap gap-2">
            {FILTERS.map((s) => (
              <li key={s}>
                <Link
                  href={`/owner/bookings?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                  aria-current={s === filter ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                    s === filter ? "border-forest bg-forest text-ivory" : "border-line bg-cream hover:border-ink",
                  )}
                >
                  {FILTER_LABEL[s]}
                  <span className={cn("rounded-full px-2 text-xs", s === filter ? "bg-ivory/15" : "bg-sand")}>{counts[s]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <form className="flex w-full gap-2 sm:w-auto" role="search">
          <input type="hidden" name="status" value={filter} />
          <label htmlFor="q" className="sr-only">
            Search bookings
          </label>
          <Input id="q" name="q" defaultValue={q} placeholder="Name, mobile, email or SV-…" className="h-11 sm:w-72" />
          <Button type="submit" variant="outline" size="icon" aria-label="Search">
            <Search />
          </Button>
        </form>
      </div>

      {archived ? (
        <p className="mt-6 text-sm text-muted">
          Archived bookings are kept in full, with prices and payment records. Open one to restore it to the main list.
        </p>
      ) : null}

      <div className="mt-8 grid gap-3">
        {bookings.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-10 text-center text-muted">
            No {FILTER_LABEL[filter].toLowerCase()} bookings{q ? ` matching “${q}”` : ""}.
          </p>
        ) : (
          bookings.map((b) => <BookingRow key={b.id} booking={b} />)
        )}
      </div>

      {archived ? null : (
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line/70 pt-6">
          <p className="max-w-prose text-sm text-muted">
            Tidy up the lists by archiving past bookings. Nothing is deleted, and archived bookings stay under the Archived filter.
          </p>
          <ArchiveOldBookings today={today} defaultBefore={addDays(today, -90)} />
        </div>
      )}
    </>
  );
}
