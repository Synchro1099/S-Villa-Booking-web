import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Service } from "@/types";
import { formatPeso, unitLabel } from "@/lib/pricing";
import { FACILITY_PHOTOS } from "@/lib/media";
import { ServiceIcon } from "@/components/services/service-icon";
import { MediaFrame } from "@/components/media/media-frame";
import { cn } from "@/lib/utils";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { SectionHeading } from "./section-heading";

// Two columns on tablets, three on desktop. A wrapping flex row (not a grid)
// so a short last row, e.g. 3 + 2 cards, sits centred instead of leaving a gap.
const LIST = "mt-14 flex flex-wrap justify-center gap-6";
const ITEM = "w-full sm:w-[calc((100%_-_1.5rem)/2)] lg:w-[calc((100%_-_3rem)/3)]";

/** Facilities with their current live prices from the database. */
export function Facilities({ services, headingAs = "h2" }: { services: Service[]; headingAs?: "h1" | "h2" }) {
  return (
    <section className="bg-sand/50 py-20 md:py-28" id="facilities">
      <div className="container-page">
        <SectionHeading
          as={headingAs}
          eyebrow="Facilities"
          title="The court, plus the extras"
          intro="Book the pickleball court, then add any of the others. Your group has the whole venue either way."
        />
        {services.length === 0 ? (
          <p className="mt-12 text-muted">Facilities will be listed here soon.</p>
        ) : (
          headingAs === "h2" ? (
            <Stagger as="ul" className={LIST}>
              {services.map((s) => (
                <StaggerItem as="li" key={s.id} className={ITEM}>
                  <FacilityCard service={s} />
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            // Top of /facilities: CSS entrance so cards show even before JS loads.
            <ul className={LIST}>
              {services.map((s, i) => (
                <li key={s.id} className={cn(ITEM, "animate-fade-up")} style={{ animationDelay: `${120 + i * 70}ms` }}>
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
      <div className="relative">
        <MediaFrame
          media={s.image_url ? { kind: "photo", src: s.image_url, alt: "", orientation: "landscape" } : FACILITY_PHOTOS[s.slug]}
          ratio="16/10"
          // The link's label already names the facility, so the photo is decorative here.
          alt=""
          sizes="(min-width: 1280px) 400px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="bg-forest"
          mediaClassName="transition-transform duration-700 ease-soft group-hover:scale-[1.06]"
        >
          <div className="court-lines grid h-full place-items-center">
            <ServiceIcon name={s.icon} className="size-14 text-brass transition-transform duration-500 ease-soft group-hover:scale-110 group-hover:-rotate-3" strokeWidth={1.25} />
          </div>
        </MediaFrame>
        {/* Soft brass light that fades in on hover. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_120%,rgb(203_191_168/0.35),transparent_60%)] opacity-0 transition-opacity duration-500 ease-soft group-hover:opacity-100"
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
        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brass-deep transition-transform duration-300 ease-soft group-hover:translate-x-1">
          Book with {s.name} <ArrowRight className="size-4" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
