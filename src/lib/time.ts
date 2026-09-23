/**
 * Date/time helpers. Dates are plain "YYYY-MM-DD" strings and times are
 * minutes since midnight in the venue's local time zone, so nothing depends
 * on the server's or visitor's own time zone.
 */

export const SLOT_MINUTES = 60;

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** 870 → "14:30". 1440 → "24:00". */
export function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "14:00" or 840 → "2:00 PM". */
export function formatTime(value: string | number): string {
  const minutes = typeof value === "number" ? value : toMinutes(value);
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const suffix = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatTimeRange(start: string | number, end: string | number): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

/** "2026-09-28" → "September 28, 2026" (or a custom style). */
export function formatDate(date: string, style: "long" | "full" | "short" = "long"): string {
  const options: Intl.DateTimeFormatOptions =
    style === "full"
      ? { weekday: "long", year: "numeric", month: "long", day: "numeric" }
      : style === "short"
        ? { month: "short", day: "numeric", year: "numeric" }
        : { year: "numeric", month: "long", day: "numeric" };
  return parseDate(date).toLocaleDateString("en-US", { ...options, timeZone: "UTC" });
}

export function addDays(date: string, days: number): string {
  const d = parseDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday (same as Postgres extract(dow)). */
export function weekdayOf(date: string): number {
  return parseDate(date).getUTCDay();
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000);
}

export interface LocalNow {
  date: string;
  minutes: number;
}

/** Current date and minutes-since-midnight in the given IANA time zone. */
export function nowIn(timeZone: string, at: Date = new Date()): LocalNow {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/** First and last day of the month containing `date`. */
export function monthBounds(date: string): { first: string; last: string } {
  const d = parseDate(date);
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return { first: first.toISOString().slice(0, 10), last: last.toISOString().slice(0, 10) };
}

export function formatMonth(date: string): string {
  return parseDate(date).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}
