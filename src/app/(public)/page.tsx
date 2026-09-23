import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getActiveServices, getAvailabilityEntries, getOperatingHours, getSettings } from "@/lib/data/public";
import { getDayAvailability } from "@/lib/availability/engine";
import { addDays, formatDate, nowIn, toMinutes } from "@/lib/time";
import { Hero } from "@/components/sections/hero";
import { Experience } from "@/components/sections/experience";
import { Facilities } from "@/components/sections/facilities";
import { Pricing } from "@/components/sections/pricing";
import { Contact } from "@/components/sections/contact";
import { Highlights } from "@/components/sections/highlights";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/sections/section-heading";
import { DAY_STATUS_LABEL } from "@/components/calendar/month-calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const [settings, services, hours] = await Promise.all([getSettings(), getActiveServices(), getOperatingHours()]);

  return (
    <>
      <Hero maxGuests={settings.max_guests} />
      <Highlights facilities={services.length} maxGuests={settings.max_guests} hoursDaily={longestDay(hours)} />
      <Experience />
      <Facilities services={services} />
      <Pricing services={services} settings={settings} />
      <WeekAhead settings={settings} hours={hours} />
      <Contact settings={settings} hours={hours} />
    </>
  );
}

/** Longest opening day, in whole hours (live from operating hours). */
function longestDay(hours: Awaited<ReturnType<typeof getOperatingHours>>) {
  return Math.max(0, ...hours.filter((h) => h.is_open).map((h) => (toMinutes(h.close_time) - toMinutes(h.open_time)) / 60));
}

/** Next 7 days at a glance, from the live availability feed. */
async function WeekAhead({ settings, hours }: { settings: Awaited<ReturnType<typeof getSettings>>; hours: Awaited<ReturnType<typeof getOperatingHours>> }) {
  const now = nowIn(settings.timezone);
  const days = Array.from({ length: 7 }, (_, i) => addDays(now.date, i));
  let entries: Awaited<ReturnType<typeof getAvailabilityEntries>> = [];
  try {
    entries = await getAvailabilityEntries(days[0], days[6]);
  } catch {
    return null;
  }
  const rules = { hours, minLeadMinutes: settings.min_lead_minutes, bookingWindowDays: settings.booking_window_days };

  return (
    <section className="bg-forest py-20 text-ivory md:py-24" id="availability">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Availability"
            title={<span className="text-ivory">This week at S-Villa</span>}
            intro={<span className="text-ivory/70">Live from our booking calendar. Pick a day to see open time slots.</span>}
          />
          <Button asChild variant="brass">
            <Link href="/availability">
              Full calendar <ArrowRight />
            </Link>
          </Button>
        </div>
        <Stagger as="ul" gap={0.05} className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {days.map((date) => {
            const day = getDayAvailability(date, rules, entries, now);
            const open = day.slots.filter((s) => s.status === "AVAILABLE").length;
            const selectable = day.status === "AVAILABLE" || day.status === "LIMITED";
            const content = (
              <>
                <span className="text-xs font-bold uppercase tracking-wider text-ivory/60">{formatDate(date, "full").split(",")[0]}</span>
                <span className="font-display text-4xl">{Number(date.slice(8))}</span>
                <span className={cn("text-xs font-semibold", selectable ? "text-brass" : "text-ivory/50")}>
                  {selectable ? `${open} slot${open === 1 ? "" : "s"} open` : DAY_STATUS_LABEL[day.status]}
                </span>
              </>
            );
            return (
              <StaggerItem as="li" key={date}>
                {selectable ? (
                  <Link
                    href={`/book?date=${date}`}
                    className="flex flex-col gap-1 rounded-2xl border border-ivory/15 p-4 transition-[transform,background-color,border-color] duration-300 ease-soft hover:-translate-y-1 hover:border-brass hover:bg-ivory/5 active:scale-[0.98] active:duration-100"
                    aria-label={`${formatDate(date, "full")}: ${open} slots open — book this day`}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex flex-col gap-1 rounded-2xl border border-ivory/5 p-4 opacity-70">{content}</div>
                )}
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
