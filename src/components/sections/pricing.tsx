import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Service, Settings } from "@/types";
import { formatPeso, unitLabel } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { ServiceIcon } from "@/components/services/service-icon";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { SectionHeading } from "./section-heading";

const STEPS = [
  ["Choose", "Pick a date, a start time and your facilities."],
  ["Pay", "Send the exact amount by GCash or bank transfer."],
  ["Upload", "Upload a screenshot of your receipt."],
  ["Confirmed", "We verify your payment and email your confirmation."],
];

/** Live price list — reads services.price, the single source of truth. */
export function Pricing({ services, settings, headingAs = "h2" }: { services: Service[]; settings: Settings; headingAs?: "h1" | "h2" }) {
  // On /pricing this is the first thing on screen, so it must not wait for a scroll reveal.
  const reveal = headingAs === "h2";
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
          <Stagger as="ol" enabled={reveal} className="mt-10 grid gap-5 sm:grid-cols-2">
            {STEPS.map(([title, body], i) => (
              <StaggerItem as="li" key={title} className="flex gap-4">
                <span className="font-display text-3xl italic text-brass-deep" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-sans text-base font-bold">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        <Reveal enabled={reveal} delay={0.1} className="rounded-[var(--radius-card)] bg-forest p-2 text-ivory shadow-lift">
          <div className="rounded-[calc(var(--radius-card)-6px)] border border-brass/25 p-6 sm:p-8">
            <p className="eyebrow !text-brass">Current rates</p>
            {services.length === 0 ? (
              <p className="mt-6 text-ivory/70">Prices will be published soon.</p>
            ) : (
              <Stagger as="ul" enabled={reveal} delay={0.2} gap={0.05} className="mt-4 divide-y divide-ivory/10">
                {services.map((s) => (
                  <StaggerItem as="li" key={s.id} className="group/rate flex items-center justify-between gap-4 py-4">
                    <span className="flex items-center gap-3">
                      <ServiceIcon name={s.icon} className="size-5 text-brass transition-transform duration-300 ease-soft group-hover/rate:scale-110" />
                      <span className="font-display text-2xl transition-colors duration-300 group-hover/rate:text-brass">{s.name}</span>
                    </span>
                    <span className="text-right">
                      <span className="text-lg font-semibold">{formatPeso(s.price)}</span>
                      <span className="text-sm text-ivory/60"> / {unitLabel(s.pricing_unit)}</span>
                    </span>
                  </StaggerItem>
                ))}
              </Stagger>
            )}
            <Button asChild variant="brass" size="lg" className="mt-6 w-full">
              <Link href="/book">
                Start a booking <ArrowRight />
              </Link>
            </Button>
            <p className="mt-4 text-center text-xs text-ivory/55">Payment by GCash or bank transfer only.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
