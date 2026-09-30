import { describe, expect, it } from "vitest";
import { getDayAvailability, maxHoursFrom, type AvailabilityRules } from "@/lib/availability/engine";
import type { AvailabilityEntry, OperatingHours } from "@/types";

const hours: OperatingHours[] = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  is_open: weekday !== 1, // Mondays closed
  open_time: "09:00:00",
  close_time: "17:00:00",
}));
// On-the-hour starts (step 60): the behaviour before start-time steps existed, unchanged.
const rules: AvailabilityRules = { hours, minLeadMinutes: 60, bookingWindowDays: 30, slotMinutes: 60 };
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

describe("availability engine: half-hour and quarter-hour starts", () => {
  const half: AvailabilityRules = { ...rules, slotMinutes: 30 };
  const at = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;

  it("offers a start every 30 minutes; the last is the one whose hour still fits before closing", () => {
    const starts = getDayAvailability(TUE, half, [], now).slots.map((s) => at(s.start));
    expect(starts).toEqual(["9:00", "9:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"]);
    // Each start is a one-hour window.
    expect(getDayAvailability(TUE, half, [], now).slots.every((s) => s.end - s.start === 60)).toBe(true);
  });

  it("offers every 15 minutes at step 15", () => {
    const slots = getDayAvailability(TUE, { ...rules, slotMinutes: 15 }, [], now).slots;
    expect(slots).toHaveLength(29); // 9:00 … 16:00
    expect(at(slots[1].start)).toBe("9:15");
    expect(at(slots.at(-1)!.start)).toBe("16:00");
  });

  it("falls back to on-the-hour starts for a step that isn't 15, 30 or 60", () => {
    const starts = getDayAvailability(TUE, { ...rules, slotMinutes: 45 }, [], now).slots.map((s) => s.start / 60);
    expect(starts).toEqual([9, 10, 11, 12, 13, 14, 15, 16]);
  });

  it("marks a start unavailable if any part of its hour is booked, pending or blocked", () => {
    const entries: AvailabilityEntry[] = [
      { kind: "BOOKED", date: TUE, start_time: "09:00:00", end_time: "11:00:00" },
      { kind: "PENDING", date: TUE, start_time: "12:00:00", end_time: "13:00:00" },
      { kind: "BLOCKED", date: TUE, start_time: "15:00:00", end_time: "17:00:00" },
    ];
    const byStart = Object.fromEntries(getDayAvailability(TUE, half, entries, now).slots.map((s) => [at(s.start), s.status]));
    expect(byStart).toEqual({
      "9:00": "BOOKED", "9:30": "BOOKED", "10:00": "BOOKED", "10:30": "BOOKED", // 10:30–11:30 overlaps the 9–11 booking
      "11:00": "AVAILABLE",
      "11:30": "PENDING", "12:00": "PENDING", "12:30": "PENDING",
      "13:00": "AVAILABLE", "13:30": "AVAILABLE", "14:00": "AVAILABLE",
      "14:30": "BLOCKED", "15:00": "BLOCKED", "15:30": "BLOCKED", "16:00": "BLOCKED",
    });
  });

  it("limits whole-hour durations from a half-hour start", () => {
    const entries: AvailabilityEntry[] = [{ kind: "PENDING", date: TUE, start_time: "12:00:00", end_time: "13:00:00" }];
    const slots = getDayAvailability(TUE, half, entries, now).slots;
    expect(maxHoursFrom(slots, 9 * 60 + 30, 4)).toBe(2); // 9:30–11:30; 11:30–12:30 hits the pending hour
    expect(maxHoursFrom(slots, 10 * 60 + 30, 4)).toBe(1);
    expect(maxHoursFrom(slots, 13 * 60 + 30, 10)).toBe(3); // 13:30–16:30; 16:30–17:30 would pass closing
  });

  it("applies minimum notice to half-hour starts today", () => {
    const today = getDayAvailability(now.date, half, [], now);
    // 10:00 now + 60 min notice → earliest start 11:00.
    expect(today.slots.filter((s) => s.status === "PAST").map((s) => at(s.start))).toEqual(["9:00", "9:30", "10:00", "10:30"]);
    const notice45 = getDayAvailability(now.date, { ...half, minLeadMinutes: 45 }, [], now);
    expect(notice45.slots.find((s) => s.status !== "PAST")?.start).toBe(11 * 60); // 10:45 isn't a start; 11:00 is
  });

  it("still closes closed weekdays and closed dates", () => {
    expect(getDayAvailability("2026-09-28", half, [], now).status).toBe("CLOSED");
    const closed: AvailabilityEntry[] = [{ kind: "CLOSED_DATE", date: TUE, start_time: null, end_time: null }];
    expect(getDayAvailability(TUE, half, closed, now).status).toBe("CLOSED");
  });

  it("going back to on-the-hour starts still respects half-hour bookings", () => {
    const entries: AvailabilityEntry[] = [{ kind: "BOOKED", date: TUE, start_time: "13:30:00", end_time: "14:30:00" }];
    const statuses = getDayAvailability(TUE, rules, entries, now).slots.map((s) => [s.start / 60, s.status]);
    expect(statuses.filter(([, st]) => st === "BOOKED")).toEqual([[13, "BOOKED"], [14, "BOOKED"]]);
  });
});
