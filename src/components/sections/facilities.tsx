/* eslint-disable @next/next/no-img-element -- owner-supplied image URLs from any host */
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Service } from "@/types";
import { formatPeso, unitLabel } from "@/lib/pricing";
import { ServiceIcon } from "@/components/services/service-icon";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
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
          headingAs === "h2" ? (
            <Stagger as="ul" className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => (
                <StaggerItem as="li" key={s.id}>
                  <FacilityCard service={s} />
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            // Top of /facilities: CSS entrance so cards show even before JS loads.
            <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s, i) => (
                <li key={s.id} className="animate-fade-up" style={{ animationDelay: `${120 + i * 70}ms` }}>
                  <FacilityCard service={s} />
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </section>
  );
}

/**
 * Hover (desktop): lifts 4px, shadow deepens, brass edge glows, media zooms,
 * "Book" cue slides in. Press (touch): settles to 0.99. Transform/opacity only.
 */
function FacilityCard({ service: s }: { service: Service }) {
  return (
    <Link
      href={`/book?service=${s.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line/70 bg-cream shadow-soft transition-[transform,box-shadow,border-color] duration-300 ease-soft hover:-translate-y-1 hover:border-brass/50 hover:shadow-lift active:scale-[0.99] active:duration-100"
      aria-label={`${s.name} — ${formatPeso(s.price)} per ${unitLabel(s.pricing_unit)}. Book with ${s.name}`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-forest">
        {s.image_url ? (
          <img
            src={s.image_url}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.06]"
          />
        ) : (
          <div className="court-lines grid h-full place-items-center">
            <ServiceIcon name={s.icon} className="size-14 text-brass transition-transform duration-500 ease-soft group-hover:scale-110 group-hover:-rotate-3" strokeWidth={1.25} />
          </div>
        )}
        {/* Soft brass light that fades in on hover. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_120%,rgb(195_160_106/0.35),transparent_60%)] opacity-0 transition-opacity duration-500 ease-soft group-hover:opacity-100"
        />
      </div>
      <div className="flex flex-1 flex-col p-7">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-3xl">{s.name}</h3>
          <p className="shrink-0 text-right">
            <span className="font-semibold">{formatPeso(s.price)}</span>
            <span className="text-sm text-muted"> / {unitLabel(s.pricing_unit)}</span>
          </p>
        </div>
        <p className="mt-3 flex-1 leading-relaxed text-muted">{s.description}</p>
        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brass-deep opacity-70 transition-[opacity,transform] duration-300 ease-soft group-hover:translate-x-1 group-hover:opacity-100">
          Book with {s.name} <ArrowRight className="size-4" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
