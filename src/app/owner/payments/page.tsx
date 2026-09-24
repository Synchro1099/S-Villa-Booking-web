import Link from "next/link";
import { listBookings } from "@/lib/data/bookings";
import { getSettings } from "@/lib/data/public";
import { PageHeader } from "@/components/owner/page-header";
import { BookingRow } from "@/components/owner/booking-row";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Payments" };

export default async function OwnerPaymentsPage() {
  const [pending, settings] = await Promise.all([listBookings({ status: "PENDING", limit: 100 }), getSettings()]);
  const toReview = pending.filter((b) => b.payment?.status === "PROOF_SUBMITTED");
  const details = [
    ["GCash", [settings.gcash_name, settings.gcash_number].filter(Boolean).join(" · ")],
    ["Bank transfer", [settings.bank_name, settings.bank_account_name, settings.bank_account_number].filter(Boolean).join(" · ")],
  ];

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
        <dl className="mt-4 space-y-3 text-sm">
          {details.map(([k, v]) => (
            <div key={k} className="flex flex-wrap justify-between gap-x-4 gap-y-1">
              <dt className="text-muted">{k}</dt>
              <dd className="font-semibold">{v || "Not set"}</dd>
            </div>
          ))}
        </dl>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/owner/settings#payment-details">Edit in Settings</Link>
        </Button>
      </section>
    </>
  );
}
