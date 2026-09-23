"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { isSelectableDay } from "@/lib/availability/engine";
import { formatDate } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { CalendarLegend, DAY_STATUS_LABEL, MonthCalendar } from "./month-calendar";
import { TimeSlots } from "./time-slots";
import { useAvailability, type AvailabilityConfig, type AvailabilitySnapshot } from "./use-availability";

/** Public "Check availability" view: calendar + read-only slot list. */
export function AvailabilityBrowser({ config, initial }: { config: AvailabilityConfig; initial: AvailabilitySnapshot }) {
  const av = useAvailability(config, initial);
  const [selected, setSelected] = useState<string | null>(null);
  const day = selected ? av.dayAvailability(selected) : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div className="rounded-[var(--radius-card)] border border-line/70 bg-cream p-5 shadow-soft sm:p-8">
        <MonthCalendar
          month={av.month}
          statusOf={(d) => av.dayAvailability(d).status}
          selected={selected}
          onSelect={setSelected}
          onMonthChange={av.setMonth}
          canGoBack={av.canGoBack}
          canGoForward={av.canGoForward}
          loading={av.loading}
          isSelectable={isSelectableDay}
        />
        <CalendarLegend className="mt-6" />
        {av.error ? (
          <p role="alert" className="mt-4 text-sm text-bad">
            {av.error}
          </p>
        ) : null}
      </div>

      <div className="rounded-[var(--radius-card)] border border-line/70 bg-cream p-5 shadow-soft sm:p-8" aria-live="polite">
        {day ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow">{DAY_STATUS_LABEL[day.status]}</p>
                <h2 className="mt-1 text-3xl">{formatDate(day.date, "full")}</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => void av.refresh()} aria-label="Refresh availability">
                <RefreshCw /> Refresh
              </Button>
            </div>
            <div className="mt-6">
              <TimeSlots slots={day.slots} />
            </div>
            <Button asChild size="lg" className="mt-8 w-full">
              <Link href={`/book?date=${day.date}`}>
                Book this date <ArrowRight />
              </Link>
            </Button>
          </>
        ) : (
          <div className="flex h-full min-h-60 flex-col items-center justify-center text-center">
            <h2 className="text-3xl">Choose a date</h2>
            <p className="mt-2 max-w-xs text-muted">Select a day on the calendar to see which time slots are open.</p>
          </div>
        )}
      </div>
    </div>
  );
}
