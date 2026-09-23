import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { listBookings } from "@/lib/data/bookings";
import { getBlockedDates, getBlockedTimes } from "@/lib/data/owner";
import { getOperatingHours, getSettings } from "@/lib/data/public";
import { effectiveStatus } from "@/lib/booking/status";
import { addDays, formatDate, formatMonth, formatTimeRange, monthBounds, nowIn, weekdayOf } from "@/lib/time";
import { PageHeader } from "@/components/owner/page-header";
import { BookingRow } from "@/components/owner/booking-row";
import { BlockDateForm, BlockTimeForm, BlockedDateList, BlockedTimeList } from "@/components/owner/closures";
import { cn } from "@/lib/utils";

export const metadata = { title: "Calendar" };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export default async function OwnerCalendarPage(props: PageProps<"/owner/calendar">) {
  const sp = await props.searchParams;
  const settings = await getSettings();
  const today = nowIn(settings.timezone).date;
  const day = isDate(sp.day) ? sp.day : today;
  const { first, last } = monthBounds(isDate(sp.month) ? sp.month : day);

  const [bookings, closedDates, blockedTimes, hours] = await Promise.all([
    listBookings({ status: "ALL", from: first, to: last, limit: 1000 }),
    getBlockedDates(first, last),
    getBlockedTimes(first, last),
    getOperatingHours(),
  ]);
  const active = bookings.filter((b) => {
    const s = effectiveStatus(b);
    return s === "PENDING" || s === "CONFIRMED";
  });

  const days: string[] = [];
  for (let d = first; d <= last; d = addDays(d, 1)) days.push(d);
  const dayBookings = active.filter((b) => b.booking_date === day);
  const dayClosed = closedDates.filter((d) => d.date === day);
  const dayBlocks = blockedTimes.filter((t) => t.date === day);
  const weekday = hours.find((h) => h.weekday === weekdayOf(day));

  return (
    <>
      <PageHeader title="Calendar" intro="See what's booked and close days or hours directly from here." />

      <div className="grid gap-8 2xl:grid-cols-[1.3fr_1fr]">
        <section className="rounded-[var(--radius-card)] border border-line/70 bg-cream p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <Link href={`/owner/calendar?month=${addDays(first, -1)}&day=${day}`} className="grid size-10 place-items-center rounded-full border border-line hover:border-ink" aria-label="Previous month">
              <ChevronLeft className="size-5" />
            </Link>
            <h2 className="text-2xl">{formatMonth(first)}</h2>
            <Link href={`/owner/calendar?month=${addDays(last, 1)}&day=${day}`} className="grid size-10 place-items-center rounded-full border border-line hover:border-ink" aria-label="Next month">
              <ChevronRight className="size-5" />
            </Link>
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {WEEKDAYS.map((w) => (
              <div key={w} className="pb-1 text-center text-[11px] font-bold uppercase tracking-wider text-muted" aria-hidden>
                {w}
              </div>
            ))}
            {Array.from({ length: weekdayOf(first) }, (_, i) => (
              <div key={i} aria-hidden />
            ))}
            {days.map((d) => {
              const confirmed = active.filter((b) => b.booking_date === d && b.status === "CONFIRMED").length;
              const pending = active.filter((b) => b.booking_date === d && b.status === "PENDING").length;
              const closed = closedDates.some((c) => c.date === d) || !hours.find((h) => h.weekday === weekdayOf(d))?.is_open;
              const blocks = blockedTimes.filter((t) => t.date === d).length;
              const parts = [confirmed && `${confirmed} confirmed`, pending && `${pending} pending`, closed && "closed", blocks && `${blocks} blocked`].filter(Boolean);
              return (
                <Link
                  key={d}
                  href={`/owner/calendar?month=${first}&day=${d}`}
                  aria-current={d === day ? "date" : undefined}
                  aria-label={`${formatDate(d, "full")}${parts.length ? `: ${parts.join(", ")}` : ""}`}
                  className={cn(
                    "flex min-h-16 flex-col gap-1 rounded-lg border p-1.5 text-left text-xs transition-colors sm:min-h-20 sm:p-2",
                    closed ? "border-transparent bg-[repeating-linear-gradient(135deg,#ebe9e4_0,#ebe9e4_4px,transparent_4px,transparent_8px)] text-off" : "border-line bg-white hover:border-forest",
                    d === day && "ring-2 ring-forest",
                    d === today && "font-bold",
                  )}
                >
                  <span className="text-sm">{Number(d.slice(8))}</span>
                  {confirmed ? <span className="truncate rounded bg-ok-bg px-1 font-semibold text-ok">✓ {confirmed}</span> : null}
                  {pending ? <span className="truncate rounded bg-warn-bg px-1 font-semibold text-warn">◷ {pending}</span> : null}
                  {closed ? <span className="truncate font-semibold uppercase">Closed</span> : blocks ? <span className="truncate text-off">⊘ {blocks}</span> : null}
                </Link>
              );
            })}
          </div>
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted" aria-label="Legend">
            <li>
              <span className="rounded bg-ok-bg px-1 font-semibold text-ok">✓</span> Confirmed
            </li>
            <li>
              <span className="rounded bg-warn-bg px-1 font-semibold text-warn">◷</span> Pending
            </li>
            <li>⊘ Blocked hours</li>
            <li>Striped = Closed</li>
          </ul>
        </section>

        <section className="space-y-6">
          <div>
            <p className="eyebrow">{weekday?.is_open ? `Open ${formatTimeRange(weekday.open_time, weekday.close_time)}` : "Closed every week"}</p>
            <h2 className="mt-1 text-3xl">{formatDate(day, "full")}</h2>
          </div>
          <div className="grid gap-3">
            {dayBookings.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-muted">No active bookings on this day.</p>
            ) : (
              dayBookings.map((b) => <BookingRow key={b.id} booking={b} />)
            )}
          </div>

          {day >= today ? (
            <div className="rounded-[var(--radius-card)] border border-line/70 bg-cream p-6">
              <h3 className="text-xl">Close this day</h3>
              {dayClosed.length ? <BlockedDateList items={dayClosed} /> : <BlockDateForm key={`d-${day}`} min={today} defaultDate={day} />}
              <h3 className="mt-8 text-xl">Block hours</h3>
              <BlockTimeForm key={`t-${day}`} min={today} defaultDate={day} />
              {dayBlocks.length ? <BlockedTimeList items={dayBlocks} /> : null}
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}
