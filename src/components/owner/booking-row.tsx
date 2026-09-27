import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { BookingDetail } from "@/types";
import { formatPeso } from "@/lib/pricing";
import { formatDate, formatTimeRange } from "@/lib/time";
import { effectiveStatus } from "@/lib/booking/status";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/ui/status-badge";

/** Answers at a glance: who, when, how many, what, how much, paid?, confirmed? */
export function BookingRow({ booking: b }: { booking: BookingDetail }) {
  return (
    <Link
      href={`/owner/bookings/${b.id}`}
      // The chevron sits in its own right-hand gutter so it never wraps under the badges.
      className="group relative grid gap-3 rounded-2xl border border-line/70 bg-cream p-4 pr-10 transition-shadow hover:shadow-soft sm:grid-cols-[1fr_auto] sm:items-center sm:p-5 sm:pr-12"
    >
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">
          #{b.booking_reference} · <span className="whitespace-nowrap">{formatDate(b.booking_date, "short")}</span> ·{" "}
          <span className="whitespace-nowrap">{formatTimeRange(b.start_time, b.end_time)}</span>
        </p>
        <p className="mt-1 truncate text-lg font-semibold">
          {b.customer_name} <span className="font-normal text-muted">· {b.guest_count} guest{b.guest_count === 1 ? "" : "s"}</span>
        </p>
        <p className="truncate text-sm text-muted">{b.items.map((i) => i.service_name_snapshot).join(", ")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <BookingStatusBadge status={effectiveStatus(b)} />
        {b.payment ? <PaymentStatusBadge status={b.payment.status} /> : null}
        <span className="font-semibold tabular-nums">{formatPeso(b.total_amount)}</span>
      </div>
      <ChevronRight
        className="absolute right-3 top-4 size-4 text-muted transition-transform group-hover:translate-x-0.5 sm:right-4 sm:top-1/2 sm:-translate-y-1/2"
        aria-hidden
      />
    </Link>
  );
}
