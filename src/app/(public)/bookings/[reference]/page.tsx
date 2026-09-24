import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, Hourglass, XCircle, Ban } from "lucide-react";
import { getBookingForViewer } from "@/lib/data/bookings";
import { getSettings } from "@/lib/data/public";
import { effectiveStatus } from "@/lib/booking/status";
import { BookingDetails } from "@/components/booking/booking-details";
import { PaymentPanel } from "@/components/booking/payment-panel";
import { CancelBookingButton } from "@/components/booking/cancel-booking-button";
import { ContactActions } from "@/components/contact/contact-actions";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Your booking",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function BookingStatusPage(props: PageProps<"/bookings/[reference]">) {
  const { reference } = await props.params;
  const { t } = await props.searchParams;
  const token = typeof t === "string" ? t : null;

  const [access, settings] = await Promise.all([getBookingForViewer(reference.toUpperCase(), token), getSettings()]);
  if (!access) notFound();
  const { booking, via } = access;
  const payment = booking.payment;
  const status = effectiveStatus(booking);
  const awaitingPayment = status === "PENDING" && payment?.status === "UNPAID";
  const awaitingReview = status === "PENDING" && payment?.status === "PROOF_SUBMITTED";
  const actionToken = via === "token" ? token : null;

  const hero = {
    PENDING: awaitingReview
      ? { icon: Clock, title: "Reservation request received", body: `Your reservation is pending confirmation. We received your booking and payment information. You will receive an email when ${settings.business_name} confirms or rejects your reservation.` }
      : { icon: Clock, title: "Almost done — complete your payment", body: "Your time slot is being held. Send your payment and upload the receipt to finish your reservation." },
    CONFIRMED: { icon: CheckCircle2, title: "Your reservation is confirmed", body: "Your payment has been verified. We look forward to hosting your group!" },
    REJECTED: { icon: XCircle, title: "Reservation not approved", body: booking.status_reason ? `Reason: ${booking.status_reason}` : "Please contact us for details." },
    CANCELLED: { icon: Ban, title: "Reservation cancelled", body: booking.status_reason ?? "This reservation was cancelled." },
    EXPIRED: { icon: Hourglass, title: "Reservation expired", body: "We didn't receive a payment proof in time, so the slot was released. You're welcome to book again." },
  }[status];

  return (
    <section className="container-page max-w-4xl py-12 md:py-16">
      <p className="eyebrow">Booking #{booking.booking_reference}</p>
      <div className="mt-4 flex items-start gap-4">
        <hero.icon className="mt-1 size-8 shrink-0 text-brass-deep" aria-hidden />
        <div>
          <h1 className="text-4xl sm:text-5xl">{hero.title}</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted">{hero.body}</p>
        </div>
      </div>

      {via === "token" ? (
        <p className="mt-6 rounded-xl bg-info-bg px-4 py-3 text-sm text-info">
          Bookmark this page — it&apos;s your private link to check this booking&apos;s status anytime. If you lose it, open{" "}
          <Link href="/bookings/lookup" className="font-semibold underline underline-offset-2">
            Find my booking
          </Link>{" "}
          and enter your reference <strong>{booking.booking_reference}</strong> with the email or mobile number you booked with.
        </p>
      ) : null}

      <div className="mt-10 grid gap-8">
        {awaitingPayment && payment ? (
          <PaymentPanel
            reference={booking.booking_reference}
            token={actionToken}
            method={booking.payment_method}
            amount={booking.total_amount}
            expiresAt={booking.expires_at}
            details={settings}
          />
        ) : null}

        <BookingDetails booking={{ ...booking, status }} />

        {awaitingReview && via !== "owner" ? (
          <details className="rounded-[var(--radius-card)] border border-line/70 bg-cream p-6">
            <summary className="cursor-pointer font-semibold">Uploaded the wrong receipt?</summary>
            <PaymentPanel
              replacing
              reference={booking.booking_reference}
              token={actionToken}
              method={booking.payment_method}
              amount={booking.total_amount}
              expiresAt={null}
              details={settings}
            />
          </details>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          {via === "customer" ? (
            <Button asChild variant="outline">
              <Link href="/my-bookings">View my bookings</Link>
            </Button>
          ) : null}
          {status === "PENDING" && via !== "owner" ? <CancelBookingButton reference={booking.booking_reference} token={actionToken} /> : null}
          {status === "EXPIRED" || status === "CANCELLED" || status === "REJECTED" ? (
            <Button asChild>
              <Link href="/book">Make a new booking</Link>
            </Button>
          ) : null}
        </div>

        <div className="rounded-[var(--radius-card)] border border-line/70 bg-cream p-6">
          <h2 className="text-2xl">Contact S-Villa</h2>
          <p className="mt-1 text-sm text-muted">Questions about this booking? Mention reference {booking.booking_reference}.</p>
          <ContactActions settings={settings} className="mt-4" />
        </div>
      </div>
    </section>
  );
}
