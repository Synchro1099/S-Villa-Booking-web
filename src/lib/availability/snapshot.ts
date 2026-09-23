import "server-only";
import { getAvailabilityEntries, getOperatingHours, getSettings } from "@/lib/data/public";
import { daysBetween, monthBounds, nowIn } from "@/lib/time";
import type { AvailabilityConfig, AvailabilitySnapshot } from "@/components/calendar/use-availability";

/** Server-side starting point for the interactive calendars. */
export async function loadAvailabilitySnapshot(preferredDate?: string | null) {
  const [settings, hours] = await Promise.all([getSettings(), getOperatingHours()]);
  const now = nowIn(settings.timezone);

  const valid =
    preferredDate && /^\d{4}-\d{2}-\d{2}$/.test(preferredDate) && daysBetween(now.date, preferredDate) >= 0 && daysBetween(now.date, preferredDate) <= settings.booking_window_days;
  const month = valid ? preferredDate : now.date;
  const { first, last } = monthBounds(month);

  let entries: AvailabilitySnapshot["entries"] = [];
  let error: string | null = null;
  try {
    entries = await getAvailabilityEntries(first, last);
  } catch {
    error = "We couldn't load availability. Please refresh the page.";
  }

  const config: AvailabilityConfig = {
    hours,
    minLeadMinutes: settings.min_lead_minutes,
    bookingWindowDays: settings.booking_window_days,
    timezone: settings.timezone,
  };
  const snapshot: AvailabilitySnapshot = { month, entries, now };
  return { settings, config, snapshot, selectedDate: valid ? preferredDate : null, error };
}
