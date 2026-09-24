import { getSettings } from "@/lib/data/public";
import { PageHeader } from "@/components/owner/page-header";
import { BookingRulesForm, ContactSettingsForm, PaymentSettingsForm } from "@/components/owner/settings-forms";

export const metadata = { title: "Settings" };

export default async function OwnerSettingsPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHeader title="Settings" intro="Your contact details appear across the website and in customer emails." />
      <div className="grid max-w-3xl gap-8">
        <section className="rounded-[var(--radius-card)] border border-line/70 bg-cream p-6 sm:p-8">
          <h2 className="text-2xl">Business & contact</h2>
          <ContactSettingsForm settings={settings} />
        </section>
        <section id="payment-details" className="scroll-mt-8 rounded-[var(--radius-card)] border border-line/70 bg-cream p-6 sm:p-8">
          <h2 className="text-2xl">Payment details (GCash / bank)</h2>
          <p className="mt-1 text-sm text-muted">Customers see these on their payment page right after they book.</p>
          <PaymentSettingsForm settings={settings} />
        </section>
        <section className="rounded-[var(--radius-card)] border border-line/70 bg-cream p-6 sm:p-8">
          <h2 className="text-2xl">Booking rules</h2>
          <BookingRulesForm settings={settings} />
        </section>
      </div>
    </>
  );
}
