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
      className="group grid gap-3 rounded-2xl border border-line/70 bg-cream p-4 transition-shadow hover:shadow-soft sm:grid-cols-[1fr_auto] sm:items-center sm:p-5"
    >
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">
          #{b.booking_reference} · {formatDate(b.booking_date, "short")} · {formatTimeRange(b.start_time, b.end_time)}
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
        <ChevronRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
      </div>
    </Link>
  );
}
