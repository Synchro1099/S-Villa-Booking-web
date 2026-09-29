import { getSettings } from "@/lib/data/public";
import { getCaretaker } from "@/lib/data/caretaker";
import { placeholderContactFields } from "@/lib/contact";
import { PageHeader } from "@/components/owner/page-header";
import { ArrivalSettingsForm, BookingRulesForm, ContactSettingsForm, HouseRulesForm, PaymentSettingsForm } from "@/components/owner/settings-forms";

export const metadata = { title: "Settings" };

export default async function OwnerSettingsPage() {
  const [settings, caretaker] = await Promise.all([getSettings(), getCaretaker()]);
  const placeholders = placeholderContactFields(settings);
  return (
    <>
      <PageHeader title="Settings" intro="Your contact details appear across the website and in customer emails." />
      <div className="grid max-w-3xl gap-8">
        {placeholders.length > 0 ? (
          <p role="status" className="rounded-xl border border-warn/30 bg-warn-bg px-4 py-3 text-sm text-warn">
            <strong>Still using sample details:</strong> {placeholders.join(", ")}. Customers use these to reach you about their booking,
            so please enter your real ones below. Until then, those contact buttons are hidden on the website.
          </p>
        ) : null}
        <section className="rounded-[var(--radius-card)] border border-line/70 bg-cream p-6 sm:p-8">
          <h2 className="text-2xl">Business & contact</h2>
          <ContactSettingsForm settings={settings} />
        </section>
        <section id="payment-details" className="scroll-mt-8 rounded-[var(--radius-card)] border border-line/70 bg-cream p-6 sm:p-8">
          <h2 className="text-2xl">Payment details (GCash / bank)</h2>
          <p className="mt-1 text-sm text-muted">Customers see these on their payment page right after they book.</p>
          <PaymentSettingsForm settings={settings} />
        </section>
        <section id="arrival" className="scroll-mt-8 rounded-[var(--radius-card)] border border-line/70 bg-cream p-6 sm:p-8">
          <h2 className="text-2xl">Caretaker & arrival</h2>
          <p className="mt-1 text-sm text-muted">
            The caretaker&apos;s name and numbers are shown to customers only once their booking is confirmed: on their booking page and in the
            confirmation email. The directions link also appears before payment.
          </p>
          <ArrivalSettingsForm settings={settings} caretaker={caretaker} />
        </section>
        <section id="house-rules" className="scroll-mt-8 rounded-[var(--radius-card)] border border-line/70 bg-cream p-6 sm:p-8">
          <h2 className="text-2xl">House rules</h2>
          <p className="mt-1 text-sm text-muted">
            Shown before payment (customers tick a box to confirm they&apos;ve read them), then again on the confirmed booking page and in the
            confirmation email.
          </p>
          <HouseRulesForm settings={settings} />
        </section>
        <section className="rounded-[var(--radius-card)] border border-line/70 bg-cream p-6 sm:p-8">
          <h2 className="text-2xl">Booking rules</h2>
          <BookingRulesForm settings={settings} />
        </section>
      </div>
    </>
  );
}
