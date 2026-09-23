"use client";

import { Ban, Check, Clock, Lock } from "lucide-react";
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

const SLOT_ICON = { AVAILABLE: Check, BOOKED: Lock, PENDING: Clock, BLOCKED: Ban, PAST: Ban } as const;

/**
 * Time slot list. Only AVAILABLE slots are selectable. When `selectedStart`
 * and `selectedHours` are given, the chosen range is highlighted.
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
  if (slots.length === 0) {
    return <p className="rounded-xl bg-off-bg px-4 py-6 text-center text-sm text-off">No time slots on this day.</p>;
  }
  const selectedEnd = selectedStart != null ? selectedStart + selectedHours * 60 : null;

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {slots.map((slot) => {
        const Icon = SLOT_ICON[slot.status];
        const available = slot.status === "AVAILABLE";
        const inRange = selectedStart != null && selectedEnd != null && slot.start >= selectedStart && slot.end <= selectedEnd;
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
                "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left transition-all",
                available && "border-line bg-white hover:border-forest",
                slot.status === "BOOKED" && "border-transparent bg-bad-bg/60 text-bad",
                slot.status === "PENDING" && "border-transparent bg-warn-bg/70 text-warn",
                (slot.status === "BLOCKED" || slot.status === "PAST") && "border-transparent bg-off-bg/70 text-off/70",
                !available && "cursor-not-allowed",
                !onSelect && available && "cursor-default hover:border-line",
                inRange && "!border-forest !bg-forest !text-ivory",
              )}
            >
              <span className="text-sm font-semibold tabular-nums">{formatTimeRange(slot.start, slot.end)}</span>
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
                <Icon className="size-3.5" aria-hidden />
                {inRange ? "Selected" : SLOT_LABEL[slot.status]}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
