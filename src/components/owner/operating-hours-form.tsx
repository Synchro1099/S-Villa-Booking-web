"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { OperatingHours } from "@/types";
import { saveOperatingHours } from "@/actions/owner";
import { formatTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const HOUR_OPTIONS = Array.from({ length: 25 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

export function OperatingHoursForm({ hours }: { hours: OperatingHours[] }) {
  const [rows, setRows] = useState(() =>
    [1, 2, 3, 4, 5, 6, 0].map((weekday) => {
      const h = hours.find((x) => x.weekday === weekday);
      return {
        weekday,
        isOpen: h?.is_open ?? false,
        openTime: (h?.open_time ?? "08:00").slice(0, 5),
        closeTime: (h?.close_time ?? "22:00").slice(0, 5),
      };
    }),
  );
  const [pending, start] = useTransition();

  const update = (weekday: number, patch: Partial<(typeof rows)[number]>) =>
    setRows((rs) => rs.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)));

  return (
    <div className="mt-6">
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.weekday} className="flex flex-wrap items-center gap-3 py-3">
            <label className="flex w-36 items-center gap-3 font-semibold">
              <input
                type="checkbox"
                checked={r.isOpen}
                onChange={(e) => update(r.weekday, { isOpen: e.target.checked })}
                className="size-5 accent-forest"
              />
              {DAYS[r.weekday]}
            </label>
            {r.isOpen ? (
              <div className="flex items-center gap-2">
                <label className="sr-only" htmlFor={`open-${r.weekday}`}>
                  {DAYS[r.weekday]} opening time
                </label>
                <Select id={`open-${r.weekday}`} value={r.openTime} onChange={(e) => update(r.weekday, { openTime: e.target.value })} className="h-10 w-32">
                  {HOUR_OPTIONS.slice(0, 24).map((t) => (
                    <option key={t} value={t}>
                      {formatTime(t)}
                    </option>
                  ))}
                </Select>
                <span className="text-muted">to</span>
                <label className="sr-only" htmlFor={`close-${r.weekday}`}>
                  {DAYS[r.weekday]} closing time
                </label>
                <Select id={`close-${r.weekday}`} value={r.closeTime} onChange={(e) => update(r.weekday, { closeTime: e.target.value })} className="h-10 w-32">
                  {HOUR_OPTIONS.slice(1).map((t) => (
                    <option key={t} value={t}>
                      {t === "24:00" ? "Midnight" : formatTime(t)}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <span className="text-sm font-semibold uppercase tracking-wider text-off">Closed every week</span>
            )}
          </li>
        ))}
      </ul>
      <Button
        className="mt-6"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await saveOperatingHours(rows);
            if (res.ok) toast.success("Opening hours saved. The booking calendar is updated.");
            else toast.error(res.error);
          })
        }
      >
        {pending ? "Saving…" : "Save opening hours"}
      </Button>
    </div>
  );
}
