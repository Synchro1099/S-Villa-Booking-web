import { MapPin } from "lucide-react";
import type { OperatingHours, Settings } from "@/types";
import { ContactActions } from "@/components/contact/contact-actions";
import { HoursList } from "./hours-list";
import { SectionHeading } from "./section-heading";

export function Contact({ settings, hours, headingAs = "h2" }: { settings: Settings; hours: OperatingHours[]; headingAs?: "h1" | "h2" }) {
  return (
    <section className="container-page py-20 md:py-28" id="contact">
      <div className="grid gap-12 rounded-[var(--radius-card)] border border-line/70 bg-cream p-8 sm:p-12 lg:grid-cols-2">
        <div>
          <SectionHeading
            as={headingAs}
            eyebrow="Contact"
            title="Questions? Message us."
            intro="For special requests, group events or help with a booking, reach us directly — we usually reply quickly."
          />
          <ContactActions settings={settings} className="mt-8" />
          {settings.address ? (
            <p className="mt-8 flex items-start gap-2 text-sm text-muted">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden /> {settings.address}
            </p>
          ) : null}
        </div>
        <div className="lg:border-l lg:border-line lg:pl-12">
          <h3 className="text-2xl">Opening hours</h3>
          <HoursList hours={hours} className="mt-5 text-ink/80" />
        </div>
      </div>
    </section>
  );
}
