"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { AvailabilityEntry, OperatingHours } from "@/types";
import { getDayAvailability, type AvailabilityRules } from "@/lib/availability/engine";
import { addDays, monthBounds, nowIn, type LocalNow } from "@/lib/time";

export interface AvailabilityConfig {
  hours: OperatingHours[];
  minLeadMinutes: number;
  bookingWindowDays: number;
  timezone: string;
}

export interface AvailabilitySnapshot {
  month: string;
  entries: AvailabilityEntry[];
  now: LocalNow;
}

/**
 * Live availability for the visible month. The first month is rendered from
 * server data (no loading flash, no hydration mismatch); later months and
 * refreshes are fetched from /api/availability.
 */
export function useAvailability(config: AvailabilityConfig, initial: AvailabilitySnapshot) {
  const [month, setMonthState] = useState(initial.month);
  const [entries, setEntries] = useState(initial.entries);
  const [now, setNow] = useState(initial.now);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const rules: AvailabilityRules = useMemo(
    () => ({ hours: config.hours, minLeadMinutes: config.minLeadMinutes, bookingWindowDays: config.bookingWindowDays }),
    [config.hours, config.minLeadMinutes, config.bookingWindowDays],
  );

  const load = useCallback(async (m: string) => {
    const id = ++requestId.current;
    const { first, last } = monthBounds(m);
    setLoading(true);
    try {
      const res = await fetch(`/api/availability?from=${first}&to=${last}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as { entries: AvailabilityEntry[] };
      if (id === requestId.current) {
        setEntries(json.entries);
        setError(null);
      }
    } catch {
      if (id === requestId.current) setError("We couldn't load availability. Please check your connection and try again.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  const setMonth = useCallback(
    (m: string) => {
      setMonthState(m);
      setNow(nowIn(config.timezone));
      void load(m);
    },
    [config.timezone, load],
  );

  const refresh = useCallback(() => {
    setNow(nowIn(config.timezone));
    return load(month);
  }, [config.timezone, load, month]);

  const dayAvailability = useCallback((date: string) => getDayAvailability(date, rules, entries, now), [rules, entries, now]);

  const lastBookable = addDays(now.date, config.bookingWindowDays);
  return {
    month,
    setMonth,
    loading,
    error,
    now,
    dayAvailability,
    refresh,
    canGoBack: monthBounds(month).first > monthBounds(now.date).first,
    canGoForward: monthBounds(month).last < lastBookable,
  };
}
