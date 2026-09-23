"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { addDays, formatDate, formatMonth, monthBounds, weekdayOf } from "@/lib/time";
import type { DayStatus } from "@/lib/availability/engine";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const DAY_STATUS_LABEL: Record<DayStatus, string> = {
  AVAILABLE: "Available",
  LIMITED: "Limited availability",
  FULL: "Fully booked",
  CLOSED: "Closed",
  PAST: "Unavailable",
  OUT_OF_RANGE: "Not yet open for booking",
};

/** Colour + a distinct marker shape per state (never colour alone). */
const DAY_STYLE: Record<DayStatus, { cell: string; marker: React.ReactNode }> = {
  AVAILABLE: {
    cell: "bg-white border-line hover:border-forest text-ink",
    marker: <span className="size-1.5 rounded-full bg-ok" />,
  },
  LIMITED: {
    cell: "bg-white border-warn/40 hover:border-warn text-ink",
    marker: <span className="size-1.5 rotate-45 bg-warn" />,
  },
  FULL: {
    cell: "bg-bad-bg/60 border-transparent text-bad/80 line-through",
    marker: <span className="h-0.5 w-2.5 bg-bad" />,
  },
  CLOSED: {
    cell: "border-transparent text-off/70 bg-[repeating-linear-gradient(135deg,#ebe9e4_0,#ebe9e4_4px,transparent_4px,transparent_8px)]",
    marker: <span className="text-[9px] font-bold uppercase leading-none">closed</span>,
  },
  PAST: { cell: "border-transparent text-ink/25", marker: null },
  OUT_OF_RANGE: { cell: "border-transparent text-ink/30", marker: null },
};

export function MonthCalendar({
  month,
  statusOf,
  selected,
  onSelect,
  onMonthChange,
  canGoBack,
  canGoForward,
  loading,
  isSelectable,
}: {
  month: string; // any date in the displayed month
  statusOf: (date: string) => DayStatus;
  selected: string | null;
  onSelect: (date: string) => void;
  onMonthChange: (month: string) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  loading?: boolean;
  isSelectable: (status: DayStatus) => boolean;
}) {
  const { first, last } = monthBounds(month);
  const leading = weekdayOf(first);
  const days: string[] = [];
  for (let d = first; d <= last; d = addDays(d, 1)) days.push(d);

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(addDays(first, -1))}
          disabled={!canGoBack}
          className="grid size-10 place-items-center rounded-full border border-line hover:border-ink disabled:opacity-30"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h3 className="flex items-center gap-2 font-display text-2xl" aria-live="polite">
          {formatMonth(first)}
          {loading ? <Loader2 className="size-4 animate-spin text-muted" aria-label="Loading availability" /> : null}
        </h3>
        <button
          type="button"
          onClick={() => onMonthChange(addDays(last, 1))}
          disabled={!canGoForward}
          className="grid size-10 place-items-center rounded-full border border-line hover:border-ink disabled:opacity-30"
          aria-label="Next month"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-center text-[11px] font-bold uppercase tracking-wider text-muted" aria-hidden>
            {w}
          </div>
        ))}
        {Array.from({ length: leading }, (_, i) => (
          <div key={`pad-${i}`} aria-hidden />
        ))}
        {days.map((date) => {
          const status = statusOf(date);
          const selectable = isSelectable(status);
          const isSelected = selected === date;
          const style = DAY_STYLE[status];
          return (
            <button
              key={date}
              type="button"
              disabled={!selectable}
              aria-pressed={isSelected}
              aria-label={`${formatDate(date, "full")} — ${DAY_STATUS_LABEL[status]}`}
              onClick={() => onSelect(date)}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border text-sm font-semibold tabular-nums transition-all sm:text-base",
                style.cell,
                !selectable && "cursor-not-allowed",
                isSelected && "!border-forest !bg-forest !text-ivory shadow-soft ring-2 ring-brass ring-offset-2 ring-offset-cream",
              )}
            >
              <span>{Number(date.slice(8))}</span>
              <span className="flex h-2 items-center" aria-hidden>
                {isSelected ? <span className="size-1.5 rounded-full bg-brass" /> : style.marker}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarLegend({ className }: { className?: string }) {
  const items: DayStatus[] = ["AVAILABLE", "LIMITED", "FULL", "CLOSED"];
  return (
    <ul className={cn("flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted", className)} aria-label="Calendar legend">
      {items.map((s) => (
        <li key={s} className="flex items-center gap-2">
          <span className={cn("grid h-5 w-7 place-items-center rounded-md border no-underline", DAY_STYLE[s].cell)} aria-hidden>
            {s === "CLOSED" ? null : DAY_STYLE[s].marker}
          </span>
          {DAY_STATUS_LABEL[s]}
        </li>
      ))}
      <li className="flex items-center gap-2">
        <span className="h-5 w-7 rounded-md bg-forest ring-2 ring-brass ring-offset-1" aria-hidden /> Selected
      </li>
    </ul>
  );
}
