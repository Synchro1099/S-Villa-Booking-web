import { CountUp } from "@/components/motion/count-up";
import { Stagger, StaggerItem } from "@/components/motion/reveal";

/** Three quick facts under the hero. Every number comes from live data. */
export function Highlights({ facilities, maxGuests, hoursDaily }: { facilities: number; maxGuests: number; hoursDaily: number }) {
  const items = [
    { value: facilities, label: "Private facilities", note: "under one roof" },
    { value: maxGuests, label: "Guests per booking", note: "your group only" },
    { value: hoursDaily, label: "Hours open daily", note: "book by the hour" },
  ].filter((i) => i.value > 0);

  return (
    <section aria-label="S-Villa at a glance" className="border-b border-line/70 bg-cream">
      <Stagger as="dl" className="container-page grid grid-cols-1 divide-y divide-line/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {items.map((i) => (
          <StaggerItem key={i.label} className="flex items-center gap-5 py-7 sm:justify-center sm:py-9">
            <dt className="order-2">
              <span className="block font-semibold">{i.label}</span>
              <span className="text-sm text-muted">{i.note}</span>
            </dt>
            <dd className="order-1 font-display text-6xl leading-none text-brass-deep tabular-nums">
              <CountUp value={i.value} />
            </dd>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
