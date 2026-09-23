import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ProofViewer } from "@/components/owner/proof-viewer";
import { getBookingById } from "@/lib/data/bookings";
import { effectiveStatus } from "@/lib/booking/status";
import { formatDate } from "@/lib/time";
import { formatPeso } from "@/lib/pricing";
import { BookingDetails } from "@/components/booking/booking-details";
import { BookingActions } from "@/components/owner/booking-actions";
import { PageHeader } from "@/components/owner/page-header";

export const metadata = { title: "Booking" };

const dateTime = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });

export default async function OwnerBookingPage(props: PageProps<"/owner/bookings/[id]">) {
  const { id } = await props.params;
  const booking = await getBookingById(id);
  if (!booking) notFound();
  const status = effectiveStatus(booking);
  const payment = booking.payment;

  return (
    <>
      <Link href="/owner/bookings" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All bookings
      </Link>
      <PageHeader title={`Booking #${booking.booking_reference}`} intro={`Created ${dateTime.format(new Date(booking.created_at))}`} />

      <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <BookingDetails booking={{ ...booking, status }} showContact />
          {booking.status_reason && status !== "PENDING" ? (
            <p className="rounded-xl bg-off-bg px-4 py-3 text-sm text-off">Reason: {booking.status_reason}</p>
          ) : null}
        </div>

        <div className="space-y-6">
          <section className="rounded-[var(--radius-card)] border border-line/70 bg-cream p-6">
            <h2 className="text-2xl">Payment</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Amount due</dt>
                <dd className="font-semibold">{payment ? formatPeso(payment.amount) : "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Reference no.</dt>
                <dd className="font-semibold">{payment?.reference_number || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Submitted</dt>
                <dd className="font-semibold">{payment?.submitted_at ? dateTime.format(new Date(payment.submitted_at)) : "—"}</dd>
              </div>
            </dl>

            <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-muted">Payment proof</h3>
            <ProofViewer
              proofs={(booking.proofs ?? []).map((p) => ({
                id: p.id,
                mimeType: p.mime_type,
                uploadedLabel: dateTime.format(new Date(p.uploaded_at)),
              }))}
            />
          </section>

          <BookingActions bookingId={booking.id} status={status} paymentStatus={payment?.status ?? "UNPAID"} />

          <p className="text-xs text-muted">
            Prices shown are the prices at the time of booking ({formatDate(booking.created_at.slice(0, 10), "short")}), not today&apos;s rates.
          </p>
        </div>
      </div>
    </>
  );
}
