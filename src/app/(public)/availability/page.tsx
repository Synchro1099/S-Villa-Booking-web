import type { Metadata } from "next";
import { loadAvailabilitySnapshot } from "@/lib/availability/snapshot";
import { AvailabilityBrowser } from "@/components/calendar/availability-browser";
import { SectionHeading } from "@/components/sections/section-heading";

export const metadata: Metadata = {
  title: "Check Availability",
  description: "See which dates and start times are open at S-Villa, live from our booking calendar.",
};

export default async function AvailabilityPage() {
  const { config, snapshot, error } = await loadAvailabilitySnapshot();
  return (
    <section className="container-page py-16 md:py-24">
      <SectionHeading
        as="h1"
        eyebrow="Live calendar"
        title="Check availability"
        intro="Times shown are start times for a booking of one hour or more. Each booking reserves the whole villa for one group; pending times are held while a customer completes payment."
      />
      {error ? (
        <p role="alert" className="mt-8 rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad">
          {error}
        </p>
      ) : null}
      <div className="mt-12">
        <AvailabilityBrowser config={config} initial={snapshot} />
      </div>
    </section>
  );
}
