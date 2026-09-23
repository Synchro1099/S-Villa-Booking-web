import type { BookingDetail } from "@/types";
import { formatPeso } from "@/lib/pricing";
import { formatDate, formatTimeRange } from "@/lib/time";
import { PAYMENT_METHOD_LABEL } from "@/lib/booking/labels";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/ui/status-badge";

/**
 * Booking summary shared by the customer status page and the Owner Portal.
 * Prices come ONLY from the booking's own snapshots (booking_items), never
 * from the current service prices.
 */
export function BookingDetails({ booking, showContact = false }: { booking: BookingDetail; showContact?: boolean }) {
  const rows: [string, React.ReactNode][] = [
    ["Date", formatDate(booking.booking_date, "full")],
    ["Time", formatTimeRange(booking.start_time, booking.end_time)],
    ["Guests", booking.guest_count],
    ["Payment method", PAYMENT_METHOD_LABEL[booking.payment_method]],
  ];
  if (showContact) {
    rows.unshift(["Customer", booking.customer_name], ["Mobile", <a key="m" className="underline" href={`tel:${booking.customer_mobile}`}>{booking.customer_mobile}</a>], ["Email", <a key="e" className="underline break-all" href={`mailto:${booking.customer_email}`}>{booking.customer_email}</a>]);
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-line/70 bg-cream shadow-soft">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-6">
        <BookingStatusBadge status={booking.status} />
        {booking.payment ? <PaymentStatusBadge status={booking.payment.status} /> : null}
      </div>
      <dl className="grid gap-x-8 gap-y-4 p-6 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs font-bold uppercase tracking-wider text-muted">{k}</dt>
            <dd className="mt-1 font-semibold">{v}</dd>
          </div>
        ))}
        {booking.notes ? (
          <div className="sm:col-span-2">
            <dt className="text-xs font-bold uppercase tracking-wider text-muted">Notes</dt>
            <dd className="mt-1 whitespace-pre-line">{booking.notes}</dd>
          </div>
        ) : null}
      </dl>
      <div className="border-t border-line p-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Services</h3>
        <ul className="mt-3 space-y-2">
          {booking.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4">
              <span>
                {i.service_name_snapshot}
                <span className="text-sm text-muted">
                  {" "}
                  · {formatPeso(i.unit_price)}
                  {i.pricing_unit_snapshot === "HOUR" ? ` × ${i.quantity}h` : ""}
                </span>
              </span>
              <span className="font-semibold tabular-nums">{formatPeso(i.subtotal)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
          <span className="text-sm font-bold uppercase tracking-wider">Total</span>
          <span className="font-display text-3xl tabular-nums">{formatPeso(booking.total_amount)}</span>
        </div>
      </div>
    </div>
  );
}
