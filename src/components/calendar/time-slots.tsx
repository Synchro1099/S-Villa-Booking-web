"use client";

import { useState } from "react";
import { Ban, Check, ChevronDown, Clock, Lock } from "lucide-react";
import type { Slot, SlotStatus } from "@/lib/availability/engine";
import { formatTimeRange } from "@/lib/time";
import { cn } from "@/lib/utils";

const SLOT_LABEL: Record<SlotStatus, string> = {
  AVAILABLE: "Available",
  BOOKED: "Booked",
  PENDING: "Pending",
  BLOCKED: "Closed",
  PAST: "Unavailable",
};

const SLOT_ICON = {
  AVAILABLE: Check,
  BOOKED: Lock,
  PENDING: Clock,
  BLOCKED: Ban,
  PAST: Ban,
} as const;

/**
 * Time slot list. Only AVAILABLE slots are selectable. When `selectedStart`
 * and `selectedHours` are given, the chosen range is highlighted. When picking
 * (`onSelect` given), only open times show at first, with a toggle for the
 * rest, so a mostly-booked day doesn't bury the few open slots.
 */
export function TimeSlots({
  slots,
  selectedStart,
  selectedHours = 1,
  onSelect,
}: {
  slots: Slot[];
  selectedStart?: number | null;
  selectedHours?: number;
  onSelect?: (start: number) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  if (slots.length === 0) {
    return (
      <p className="rounded-xl bg-off-bg px-4 py-6 text-center text-sm text-off">
        No time slots on this day.
      </p>
    );
  }
  const selectedEnd =
    selectedStart != null ? selectedStart + selectedHours * 60 : null;
  const isOpen = (s: Slot) =>
    s.status === "AVAILABLE" ||
    (selectedStart != null &&
      selectedEnd != null &&
      s.start >= selectedStart &&
      s.end <= selectedEnd);
  const hiddenCount = onSelect ? slots.filter((s) => !isOpen(s)).length : 0;
  const shown = onSelect && !showAll ? slots.filter(isOpen) : slots;

  return (
    <>
      {shown.length === 0 ? (
        <p className="rounded-xl bg-off-bg px-4 py-6 text-center text-sm text-off">
          No open times left on this day.
        </p>
      ) : null}
      {/* One column at 1024–1279px, where the booking summary leaves too little width for two. */}
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {shown.map((slot) => {
          const Icon = SLOT_ICON[slot.status];
          const available = slot.status === "AVAILABLE";
          const inRange =
            selectedStart != null &&
            selectedEnd != null &&
            slot.start >= selectedStart &&
            slot.end <= selectedEnd;
          const label = `${formatTimeRange(slot.start, slot.end)} — ${inRange ? "Selected" : SLOT_LABEL[slot.status]}`;
          return (
            <li key={slot.start}>
              <button
                type="button"
                disabled={!available || !onSelect}
                aria-pressed={inRange}
                aria-label={label}
                onClick={() => onSelect?.(slot.start)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left transition-[transform,background-color,border-color,color] duration-200 ease-soft",
                  available &&
                    onSelect &&
                    "active:scale-[0.98] active:duration-100",
                  available && "border-line bg-white hover:border-forest",
                  slot.status === "BOOKED" &&
                    "border-transparent bg-bad-bg/60 text-bad",
                  slot.status === "PENDING" &&
                    "border-transparent bg-warn-bg/70 text-warn",
                  (slot.status === "BLOCKED" || slot.status === "PAST") &&
                    "border-transparent bg-off-bg/70 text-off/70",
                  !available && "cursor-not-allowed",
                  !onSelect && available && "cursor-default hover:border-line",
                  inRange && "!border-forest !bg-forest !text-ivory",
                )}
              >
                <span className="whitespace-nowrap text-sm font-semibold tabular-nums">
                  {formatTimeRange(slot.start, slot.end)}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
                  <Icon className="size-3.5" aria-hidden />
                  {inRange ? "Selected" : SLOT_LABEL[slot.status]}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
          className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brass-deep hover:underline"
        >
          {showAll
            ? "Hide unavailable times"
            : `Show all times (${hiddenCount} unavailable)`}
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              showAll && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      ) : null}
    </>
  );
}
