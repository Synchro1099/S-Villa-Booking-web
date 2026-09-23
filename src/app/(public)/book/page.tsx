import type { Metadata } from "next";
import { loadAvailabilitySnapshot } from "@/lib/availability/snapshot";
import { getActiveServices } from "@/lib/data/public";
import { getViewer } from "@/lib/auth";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { SectionHeading } from "@/components/sections/section-heading";

export const metadata: Metadata = {
  title: "Book Now",
  description: "Reserve S-Villa for your group in a few steps. Pay by GCash or bank transfer.",
};

export default async function BookPage(props: PageProps<"/book">) {
  const { date } = await props.searchParams;
  const [{ settings, config, snapshot, selectedDate, error }, services, viewer] = await Promise.all([
    loadAvailabilitySnapshot(typeof date === "string" ? date : null),
    getActiveServices(),
    getViewer(),
  ]);

  return (
    <section className="container-page py-12 md:py-16">
      <SectionHeading as="h1" eyebrow="Reservations" title="Book your private time" />
      {error ? (
        <p role="alert" className="mt-8 rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad">
          {error}
        </p>
      ) : null}
      <div className="mt-10">
        <BookingWizard
          config={config}
          initial={snapshot}
          initialDate={selectedDate}
          services={services}
          rules={{
            maxGuests: settings.max_guests,
            maxBookingHours: settings.max_booking_hours,
            expirationMinutes: settings.booking_expiration_minutes,
          }}
          prefill={{
            fullName: viewer?.profile?.full_name ?? "",
            email: viewer?.email ?? "",
            mobile: viewer?.profile?.mobile_number ?? "",
          }}
        />
      </div>
    </section>
  );
}
