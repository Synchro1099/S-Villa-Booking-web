"use client";

import { useState } from "react";
import { Ban, Check, ChevronDown, Clock, Lock } from "lucide-react";
import type { Slot, SlotStatus } from "@/lib/availability/engine";
import { formatTime } from "@/lib/time";
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
 * Start-time list. Each button is a start time; its status says whether a
 * one-hour booking can start there (start times may be every 15, 30 or 60
 * minutes, so the hour after one start overlaps the next). Only AVAILABLE
 * times are selectable, and only the chosen start is highlighted: the full
 * range shows in the "How long?" box. When picking (`onSelect` given), only
 * open times show at first, with a toggle for the rest, so a mostly-booked
 * day doesn't bury the few open ones.
 */
export function TimeSlots({
  slots,
  selectedStart,
  onSelect,
}: {
  slots: Slot[];
  selectedStart?: number | null;
  onSelect?: (start: number) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  if (slots.length === 0) {
    return (
      <p className="rounded-xl bg-off-bg px-4 py-6 text-center text-sm text-off">
        No start times on this day.
      </p>
    );
  }
  const isOpen = (s: Slot) => s.status === "AVAILABLE" || s.start === selectedStart;
  const hiddenCount = onSelect ? slots.filter((s) => !isOpen(s)).length : 0;
  const shown = onSelect && !showAll ? slots.filter(isOpen) : slots;

  return (
    <>
      {shown.length === 0 ? (
        <p className="rounded-xl bg-off-bg px-4 py-6 text-center text-sm text-off">
          No open start times left on this day.
        </p>
      ) : null}
      {/* Two per row on phones, three on tablets; two at 1024–1279px, where the booking summary takes width. */}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
        {shown.map((slot) => {
          const Icon = SLOT_ICON[slot.status];
          const available = slot.status === "AVAILABLE";
          const selected = selectedStart != null && slot.start === selectedStart;
          const label = `${formatTime(slot.start)} start — ${selected ? "Selected" : SLOT_LABEL[slot.status]}`;
          return (
            <li key={slot.start}>
              <button
                type="button"
                disabled={!available || !onSelect}
                aria-pressed={onSelect ? selected : undefined}
                aria-label={label}
                onClick={() => onSelect?.(slot.start)}
                className={cn(
                  "flex w-full flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition-[transform,background-color,border-color,color] duration-200 ease-soft",
                  available && onSelect && "active:scale-[0.98] active:duration-100",
                  available && "border-line bg-white hover:border-forest",
                  slot.status === "BOOKED" && "border-transparent bg-bad-bg/60 text-bad",
                  slot.status === "PENDING" && "border-transparent bg-warn-bg/70 text-warn",
                  (slot.status === "BLOCKED" || slot.status === "PAST") && "border-transparent bg-off-bg/70 text-off/70",
                  !available && "cursor-not-allowed",
                  !onSelect && available && "cursor-default hover:border-line",
                  selected && "!border-forest !bg-forest !text-ivory",
                )}
              >
                <span className="whitespace-nowrap text-base font-semibold tabular-nums">{formatTime(slot.start)}</span>
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
                  <Icon className="size-3.5" aria-hidden />
                  {selected ? "Selected" : SLOT_LABEL[slot.status]}
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
          {showAll ? "Hide unavailable times" : `Show all times (${hiddenCount} unavailable)`}
          <ChevronDown className={cn("size-4 transition-transform", showAll && "rotate-180")} aria-hidden />
        </button>
      ) : null}
    </>
  );
}
