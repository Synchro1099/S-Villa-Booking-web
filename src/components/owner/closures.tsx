"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { blockDate, blockTime, unblockDate, unblockTime } from "@/actions/owner";
import type { BlockedDate, BlockedTime } from "@/lib/data/owner";
import { formatDate, formatTime, formatTimeRange } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select } from "@/components/ui/form";
import { HOUR_OPTIONS } from "./operating-hours-form";

function useResetOnSuccess(ok: boolean | undefined, message: string) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (ok) {
      toast.success(message);
      ref.current?.reset();
    }
  }, [ok, message]);
  return ref;
}

export function BlockDateForm({ min, defaultDate }: { min: string; defaultDate?: string }) {
  const [state, action, pending] = useActionState(blockDate, null);
  const ref = useResetOnSuccess(state?.ok, "Date closed. Customers can no longer book it.");
  return (
    <form ref={ref} action={action} className="mt-5 grid gap-4 sm:grid-cols-[auto_1fr_auto] sm:items-end">
      <Field label="Date" htmlFor="block-date">
        <Input id="block-date" name="date" type="date" min={min} defaultValue={defaultDate} required />
      </Field>
      <Field label="Reason (private)" htmlFor="block-date-reason">
        <Input id="block-date-reason" name="reason" placeholder="e.g. Private event" maxLength={200} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Closing…" : "Close day"}
      </Button>
      <div className="sm:col-span-3">
        <FormError result={state} />
      </div>
    </form>
  );
}

export function BlockTimeForm({ min, defaultDate }: { min: string; defaultDate?: string }) {
  const [state, action, pending] = useActionState(blockTime, null);
  const ref = useResetOnSuccess(state?.ok, "Time blocked.");
  return (
    <form ref={ref} action={action} className="mt-5 grid gap-4 sm:grid-cols-2">
      <Field label="Date" htmlFor="bt-date">
        <Input id="bt-date" name="date" type="date" min={min} defaultValue={defaultDate} required />
      </Field>
      <Field label="Reason (private)" htmlFor="bt-reason">
        <Input id="bt-reason" name="reason" placeholder="e.g. Private event" maxLength={200} />
      </Field>
      <Field label="From" htmlFor="bt-start">
        <Select id="bt-start" name="startTime" defaultValue="17:00">
          {HOUR_OPTIONS.slice(0, 24).map((t) => (
            <option key={t} value={t}>
              {formatTime(t)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Until" htmlFor="bt-end">
        <Select id="bt-end" name="endTime" defaultValue="21:00">
          {HOUR_OPTIONS.slice(1).map((t) => (
            <option key={t} value={t}>
              {t === "24:00" ? "Midnight" : formatTime(t)}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-3 sm:col-span-2">
        <FormError result={state} />
        <Button type="submit" disabled={pending} className="justify-self-start">
          {pending ? "Blocking…" : "Block these hours"}
        </Button>
      </div>
    </form>
  );
}

function RemoveButton({ label, onRemove }: { label: string; onRemove: () => Promise<{ ok: boolean; error?: string }> }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label={label}
      onClick={() =>
        start(async () => {
          const res = await onRemove();
          if (res.ok) toast.success("Reopened for booking.");
          else toast.error(res.error ?? "Something went wrong.");
        })
      }
    >
      <Trash2 /> Reopen
    </Button>
  );
}

export function BlockedDateList({ items }: { items: BlockedDate[] }) {
  if (items.length === 0) return <p className="mt-6 text-sm text-muted">No upcoming closed dates.</p>;
  return (
    <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-white">
      {items.map((d) => (
        <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <span>
            <span className="font-semibold">{formatDate(d.date, "full")}</span>
            {d.reason ? <span className="block text-sm text-muted">{d.reason}</span> : null}
          </span>
          <RemoveButton label={`Reopen ${formatDate(d.date)}`} onRemove={() => unblockDate(d.id)} />
        </li>
      ))}
    </ul>
  );
}

export function BlockedTimeList({ items }: { items: BlockedTime[] }) {
  if (items.length === 0) return <p className="mt-6 text-sm text-muted">No upcoming blocked hours.</p>;
  return (
    <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-white">
      {items.map((t) => (
        <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <span>
            <span className="font-semibold">
              {formatDate(t.date, "short")} · {formatTimeRange(t.start_time, t.end_time)}
            </span>
            {t.reason ? <span className="block text-sm text-muted">{t.reason}</span> : null}
          </span>
          <RemoveButton label={`Remove block on ${formatDate(t.date)}`} onRemove={() => unblockTime(t.id)} />
        </li>
      ))}
    </ul>
  );
}
