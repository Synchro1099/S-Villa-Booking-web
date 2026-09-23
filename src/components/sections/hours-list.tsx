import type { OperatingHours } from "@/types";
import { formatTimeRange } from "@/lib/time";
import { cn } from "@/lib/utils";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function HoursList({ hours, className }: { hours: OperatingHours[]; className?: string }) {
  // Monday first.
  const ordered = [...hours].sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7));
  return (
    <dl className={cn("grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm", className)}>
      {ordered.map((h) => (
        <div key={h.weekday} className="contents">
          <dt>{DAYS[h.weekday]}</dt>
          <dd className="text-right tabular-nums">{h.is_open ? formatTimeRange(h.open_time, h.close_time) : "Closed"}</dd>
        </div>
      ))}
    </dl>
  );
}
