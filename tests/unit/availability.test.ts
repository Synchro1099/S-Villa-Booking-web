import { describe, expect, it } from "vitest";
import { getDayAvailability, maxHoursFrom, type AvailabilityRules } from "@/lib/availability/engine";
import type { AvailabilityEntry, OperatingHours } from "@/types";

const hours: OperatingHours[] = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  is_open: weekday !== 1, // Mondays closed
  open_time: "09:00:00",
  close_time: "17:00:00",
}));
const rules: AvailabilityRules = { hours, minLeadMinutes: 60, bookingWindowDays: 30 };
const now = { date: "2026-09-23", minutes: 10 * 60 }; // Wed 10:00
const TUE = "2026-09-29";

describe("availability engine", () => {
  it("lists hourly slots within operating hours", () => {
    const day = getDayAvailability(TUE, rules, [], now);
    expect(day.status).toBe("AVAILABLE");
    expect(day.slots.map((s) => s.start / 60)).toEqual([9, 10, 11, 12, 13, 14, 15, 16]);
  });

  it("treats recurring closed weekdays as closed", () => {
    expect(getDayAvailability("2026-09-28", rules, [], now).status).toBe("CLOSED");
  });

  it("treats whole-day closures as closed", () => {
    const entries: AvailabilityEntry[] = [{ kind: "CLOSED_DATE", date: TUE, start_time: null, end_time: null }];
    expect(getDayAvailability(TUE, rules, entries, now).status).toBe("CLOSED");
  });

  it("marks booked, pending and blocked slots", () => {
    const entries: AvailabilityEntry[] = [
      { kind: "BOOKED", date: TUE, start_time: "09:00:00", end_time: "11:00:00" },
      { kind: "PENDING", date: TUE, start_time: "12:00:00", end_time: "13:00:00" },
      { kind: "BLOCKED", date: TUE, start_time: "15:00:00", end_time: "17:00:00" },
    ];
    const statuses = getDayAvailability(TUE, rules, entries, now).slots.map((s) => s.status);
    // 9 10 | 11 | 12 | 13 14 | 15 16
    expect(statuses).toEqual(["BOOKED", "BOOKED", "AVAILABLE", "PENDING", "AVAILABLE", "AVAILABLE", "BLOCKED", "BLOCKED"]);
  });

  it("reports full and limited days", () => {
    const full: AvailabilityEntry[] = [{ kind: "BOOKED", date: TUE, start_time: "09:00:00", end_time: "17:00:00" }];
    expect(getDayAvailability(TUE, rules, full, now).status).toBe("FULL");
    const limited: AvailabilityEntry[] = [{ kind: "BOOKED", date: TUE, start_time: "09:00:00", end_time: "15:00:00" }];
    expect(getDayAvailability(TUE, rules, limited, now).status).toBe("LIMITED");
  });

  it("hides past slots today, respecting minimum notice", () => {
    const today = getDayAvailability(now.date, rules, [], now);
    // 10:00 now + 60 min notice → earliest start 11:00
    expect(today.slots.filter((s) => s.status === "PAST").map((s) => s.start / 60)).toEqual([9, 10]);
  });

  it("past dates and dates beyond the window are not bookable", () => {
    expect(getDayAvailability("2026-09-22", rules, [], now).status).toBe("PAST");
    expect(getDayAvailability("2026-11-30", rules, [], now).status).toBe("OUT_OF_RANGE");
  });

  it("limits duration to consecutive free slots", () => {
    const entries: AvailabilityEntry[] = [{ kind: "PENDING", date: TUE, start_time: "12:00:00", end_time: "13:00:00" }];
    const slots = getDayAvailability(TUE, rules, entries, now).slots;
    expect(maxHoursFrom(slots, 9 * 60, 4)).toBe(3);
    expect(maxHoursFrom(slots, 13 * 60, 10)).toBe(4); // until closing
    expect(maxHoursFrom(slots, 12 * 60, 4)).toBe(0);
  });
});
