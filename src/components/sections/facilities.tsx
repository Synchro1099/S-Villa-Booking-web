/* eslint-disable @next/next/no-img-element -- owner-supplied image URLs from any host */
import type { Service } from "@/types";
import { formatPeso, unitLabel } from "@/lib/pricing";
import { ServiceIcon } from "@/components/services/service-icon";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "./section-heading";

/** Facilities with their current live prices from the database. */
export function Facilities({ services, headingAs = "h2" }: { services: Service[]; headingAs?: "h1" | "h2" }) {
  return (
    <section className="bg-sand/50 py-20 md:py-28" id="facilities">
      <div className="container-page">
        <SectionHeading
          as={headingAs}
          eyebrow="Facilities"
          title="Everything under one roof"
          intro="Add any combination of facilities to your booking. Your group has the whole venue either way."
        />
        {services.length === 0 ? (
          <p className="mt-12 text-muted">Facilities will be listed here soon.</p>
        ) : (
          <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s, i) => (
              <li key={s.id}>
                <Reveal delay={(i % 3) * 0.06} className="h-full">
                  <article className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line/70 bg-cream transition-shadow hover:shadow-lift">
                    <div className="relative aspect-[16/10] overflow-hidden bg-forest">
                      {s.image_url ? (
                        <img src={s.image_url} alt="" loading="lazy" className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      ) : (
                        <div className="court-lines grid h-full place-items-center">
                          <ServiceIcon name={s.icon} className="size-14 text-brass transition-transform duration-500 group-hover:scale-110" strokeWidth={1.25} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-7">
                      <div className="flex items-baseline justify-between gap-4">
                        <h3 className="text-3xl">{s.name}</h3>
                        <p className="shrink-0 text-right">
                          <span className="font-semibold">{formatPeso(s.price)}</span>
                          <span className="text-sm text-muted"> / {unitLabel(s.pricing_unit)}</span>
                        </p>
                      </div>
                      <p className="mt-3 leading-relaxed text-muted">{s.description}</p>
                    </div>
                  </article>
                </Reveal>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
