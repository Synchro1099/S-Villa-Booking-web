import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Service, Settings } from "@/types";
import { formatPeso, unitLabel } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { ServiceIcon } from "@/components/services/service-icon";
import { SectionHeading } from "./section-heading";

const STEPS = [
  ["Choose", "Pick a date, a start time and your facilities."],
  ["Pay", "Send the exact amount by GCash or bank transfer."],
  ["Upload", "Upload a screenshot of your receipt."],
  ["Confirmed", "We verify your payment and email your confirmation."],
];

/** Live price list — reads services.price, the single source of truth. */
export function Pricing({ services, settings, headingAs = "h2" }: { services: Service[]; settings: Settings; headingAs?: "h1" | "h2" }) {
  return (
    <section className="container-page py-20 md:py-28" id="pricing">
      <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <SectionHeading
            as={headingAs}
            eyebrow="Pricing"
            title="Simple, per-facility pricing"
            intro={`Choose the facilities you want for your time slot. One booking covers your whole group of up to ${settings.max_guests} guests.`}
          />
          <ol className="mt-10 grid gap-5 sm:grid-cols-2">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="flex gap-4">
                <span className="font-display text-3xl italic text-brass-deep" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-sans text-base font-bold">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-[var(--radius-card)] bg-forest p-2 text-ivory shadow-lift">
          <div className="rounded-[calc(var(--radius-card)-6px)] border border-brass/25 p-6 sm:p-8">
            <p className="eyebrow !text-brass">Current rates</p>
            {services.length === 0 ? (
              <p className="mt-6 text-ivory/70">Prices will be published soon.</p>
            ) : (
              <ul className="mt-4 divide-y divide-ivory/10">
                {services.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-4 py-4">
                    <span className="flex items-center gap-3">
                      <ServiceIcon name={s.icon} className="size-5 text-brass" />
                      <span className="font-display text-2xl">{s.name}</span>
                    </span>
                    <span className="text-right">
                      <span className="text-lg font-semibold">{formatPeso(s.price)}</span>
                      <span className="text-sm text-ivory/60"> / {unitLabel(s.pricing_unit)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="brass" size="lg" className="mt-6 w-full">
              <Link href="/book">
                Start a booking <ArrowRight />
              </Link>
            </Button>
            <p className="mt-4 text-center text-xs text-ivory/55">Payment by GCash or bank transfer only.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
