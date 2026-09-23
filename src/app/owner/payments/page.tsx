import { listBookings } from "@/lib/data/bookings";
import { getSettings } from "@/lib/data/public";
import { PageHeader } from "@/components/owner/page-header";
import { BookingRow } from "@/components/owner/booking-row";
import { PaymentSettingsForm } from "@/components/owner/settings-forms";

export const metadata = { title: "Payments" };

export default async function OwnerPaymentsPage() {
  const [pending, settings] = await Promise.all([listBookings({ status: "PENDING", limit: 100 }), getSettings()]);
  const toReview = pending.filter((b) => b.payment?.status === "PROOF_SUBMITTED");

  return (
    <>
      <PageHeader title="Payments" intro="Verify uploaded receipts against your GCash or bank records, then confirm the booking." />

      <section>
        <h2 className="text-2xl">Proofs waiting for review</h2>
        <div className="mt-4 grid gap-3">
          {toReview.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">Nothing to review right now.</p>
          ) : (
            toReview.map((b) => <BookingRow key={b.id} booking={b} />)
          )}
        </div>
      </section>

      <section className="mt-12 max-w-2xl rounded-[var(--radius-card)] border border-line/70 bg-cream p-6 sm:p-8">
        <h2 className="text-2xl">Payment details shown to customers</h2>
        <p className="mt-1 text-sm text-muted">Customers see these on their payment page right after they book.</p>
        <PaymentSettingsForm settings={settings} />
      </section>
    </>
  );
}
