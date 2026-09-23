import * as React from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-xl border border-line bg-white px-4 text-[15px] text-ink placeholder:text-muted/70 transition-colors focus-visible:outline-none focus-visible:border-forest focus-visible:ring-2 focus-visible:ring-forest/15 aria-invalid:border-bad aria-invalid:ring-bad/15 disabled:opacity-60";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(control, "h-12", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-24 py-3", className)} {...props} />;
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(control, "h-12 pr-10", className)} {...props} />;
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-sm font-semibold text-ink", className)} {...props} />;
}

/** Label + control + hint/error, wired together for screen readers. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string | string[];
  children: React.ReactElement<{ "aria-invalid"?: boolean; "aria-describedby"?: string }>;
  className?: string;
}) {
  const message = Array.isArray(error) ? error[0] : error;
  const describedBy = message ? `${htmlFor}-error` : hint ? `${htmlFor}-hint` : undefined;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {React.cloneElement(children, { "aria-invalid": message ? true : undefined, "aria-describedby": describedBy })}
      {message ? (
        <p id={`${htmlFor}-error`} className="text-sm text-bad" role="alert">
          {message}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Error banner for a failed action result. */
export function FormError({ result }: { result: { ok: boolean; error?: string } | null }) {
  if (!result || result.ok || !result.error) return null;
  return (
    <p role="alert" className="rounded-xl border border-bad/25 bg-bad-bg px-4 py-3 text-sm text-bad">
      {result.error}
    </p>
  );
}
