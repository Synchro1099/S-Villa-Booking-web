/**
 * Availability engine (pure, shared by server and browser).
 *
 * It turns the configured rules plus the public availability feed into slots
 * and day states for display. The database (create_booking) re-checks every
 * rule when a booking is actually made, so this engine can never allow a
 * booking the database would refuse.
 */
import type { AvailabilityEntry, OperatingHours } from "@/types";
import { SLOT_MINUTES, daysBetween, toMinutes, weekdayOf, type LocalNow } from "@/lib/time";

export type SlotStatus = "AVAILABLE" | "BOOKED" | "PENDING" | "BLOCKED" | "PAST";
export type DayStatus = "AVAILABLE" | "LIMITED" | "FULL" | "CLOSED" | "PAST" | "OUT_OF_RANGE";

export interface Slot {
  start: number; // minutes since midnight
  end: number;
  status: SlotStatus;
}

export interface AvailabilityRules {
  hours: OperatingHours[];
  minLeadMinutes: number;
  bookingWindowDays: number;
}

export interface DayAvailability {
  date: string;
  status: DayStatus;
  slots: Slot[];
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

export function getDayAvailability(
  date: string,
  rules: AvailabilityRules,
  entries: AvailabilityEntry[],
  now: LocalNow,
): DayAvailability {
  const offset = daysBetween(now.date, date);
  if (offset < 0) return { date, status: "PAST", slots: [] };
  if (offset > rules.bookingWindowDays) return { date, status: "OUT_OF_RANGE", slots: [] };

  const hours = rules.hours.find((h) => h.weekday === weekdayOf(date));
  const dayEntries = entries.filter((e) => e.date === date);
  if (!hours || !hours.is_open || dayEntries.some((e) => e.kind === "CLOSED_DATE")) {
    return { date, status: "CLOSED", slots: [] };
  }

  const open = toMinutes(hours.open_time);
  const close = toMinutes(hours.close_time);
  const earliestStart = offset === 0 ? now.minutes + rules.minLeadMinutes : -Infinity;

  const slots: Slot[] = [];
  for (let start = open; start + SLOT_MINUTES <= close; start += SLOT_MINUTES) {
    const end = start + SLOT_MINUTES;
    const hits = dayEntries.filter(
      (e) => e.start_time && e.end_time && overlaps(start, end, toMinutes(e.start_time), toMinutes(e.end_time)),
    );
    let status: SlotStatus = "AVAILABLE";
    if (start < earliestStart) status = "PAST";
    else if (hits.some((e) => e.kind === "BLOCKED")) status = "BLOCKED";
    else if (hits.some((e) => e.kind === "BOOKED")) status = "BOOKED";
    else if (hits.some((e) => e.kind === "PENDING")) status = "PENDING";
    slots.push({ start, end, status });
  }

  return { date, status: summarize(slots), slots };
}

function summarize(slots: Slot[]): DayStatus {
  const bookable = slots.filter((s) => s.status !== "PAST");
  if (slots.length === 0) return "CLOSED";
  if (bookable.length === 0) return "PAST";
  const available = bookable.filter((s) => s.status === "AVAILABLE").length;
  if (available === 0) return "FULL";
  if (available <= 2 || available / bookable.length <= 0.34) return "LIMITED";
  return "AVAILABLE";
}

export function isSelectableDay(status: DayStatus) {
  return status === "AVAILABLE" || status === "LIMITED";
}

/**
 * How many consecutive hours can be booked starting at `start`
 * (bounded by the next unavailable slot, closing time and the max duration).
 */
export function maxHoursFrom(slots: Slot[], start: number, maxHours: number): number {
  let hours = 0;
  let cursor = start;
  while (hours < maxHours) {
    const slot = slots.find((s) => s.start === cursor);
    if (!slot || slot.status !== "AVAILABLE") break;
    hours += 1;
    cursor = slot.end;
  }
  return hours;
}
