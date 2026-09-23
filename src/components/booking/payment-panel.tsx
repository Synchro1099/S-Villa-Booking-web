"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { uploadPaymentProof } from "@/actions/bookings";
import type { PaymentMethod } from "@/types";
import { formatPeso } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/form";

export interface PaymentDetails {
  gcash_name: string;
  gcash_number: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
}

/** Payment instructions + receipt upload for a PENDING, UNPAID booking. */
export function PaymentPanel({
  reference,
  token,
  method,
  amount,
  expiresAt,
  details,
  replacing = false,
}: {
  reference: string;
  token: string | null;
  method: PaymentMethod;
  amount: number;
  expiresAt: string | null;
  details: PaymentDetails;
  replacing?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(uploadPaymentProof, null);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Payment proof received. We'll review it shortly.");
      router.refresh();
    }
  }, [state, router]);

  const lines =
    method === "GCASH"
      ? [
          ["GCash name", details.gcash_name],
          ["GCash number", details.gcash_number],
        ]
      : [
          ["Bank", details.bank_name],
          ["Account name", details.bank_account_name],
          ["Account number", details.bank_account_number],
        ];

  return (
    <section className="rounded-[var(--radius-card)] border-2 border-brass/60 bg-cream p-6 shadow-soft sm:p-8" aria-labelledby="pay-title">
      {!replacing && (
        <>
          <p className="eyebrow">Next step</p>
          <h2 id="pay-title" className="mt-2 text-3xl">
            Send your payment
          </h2>
          {expiresAt ? <Countdown expiresAt={expiresAt} /> : null}

          <div className="mt-6 rounded-2xl bg-forest p-6 text-ivory">
            <p className="text-sm text-ivory/70">Amount to pay</p>
            <p className="font-display text-5xl tabular-nums">{formatPeso(amount)}</p>
            <dl className="mt-5 space-y-3 border-t border-ivory/10 pt-5">
              {lines.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3">
                  <dt className="text-sm text-ivory/60">{k}</dt>
                  <dd className="flex items-center gap-2 font-semibold">
                    {v || "—"}
                    {v ? <CopyButton value={v} label={k} /> : null}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="mt-4 text-sm text-muted">
            Please send the exact amount, then upload a screenshot of your receipt below. Include your booking reference <strong>{reference}</strong> in the
            message if your app allows it.
          </p>
        </>
      )}

      <form action={formAction} className="mt-6 grid gap-5">
        {replacing ? <h2 id="pay-title" className="text-2xl">Upload another receipt</h2> : null}
        <input type="hidden" name="reference" value={reference} />
        <input type="hidden" name="token" value={token ?? ""} />
        <Field label="Payment receipt" htmlFor="file" hint="JPG, PNG, WEBP or PDF · up to 5 MB">
          <label
            htmlFor="file"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-white px-4 py-8 text-center transition-colors hover:border-forest has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brass"
          >
            <Upload className="size-6 text-brass-deep" aria-hidden />
            <span className="font-semibold">{fileName ?? "Choose a screenshot or PDF"}</span>
            <span className="text-xs text-muted">Tap to select from your phone</span>
            <input
              id="file"
              name="file"
              type="file"
              required
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="sr-only"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
          </label>
        </Field>
        <Field label="Reference number (optional)" htmlFor="referenceNumber" hint="The transaction/reference no. shown on your receipt">
          <Input id="referenceNumber" name="referenceNumber" maxLength={64} autoComplete="off" />
        </Field>
        <FormError result={state} />
        <Button type="submit" size="lg" variant="brass" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Upload />}
          {pending ? "Uploading…" : "Submit payment proof"}
        </Button>
      </form>
    </section>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(value).then(() => toast.success(`${label} copied`))}
      className="rounded-full p-1.5 text-ivory/60 hover:bg-ivory/10 hover:text-ivory"
      aria-label={`Copy ${label}`}
    >
      <Copy className="size-4" />
    </button>
  );
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const router = useRouter();
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const end = new Date(expiresAt).getTime();
    const tick = () => {
      const ms = end - Date.now();
      setRemaining(Math.max(0, ms));
      if (ms <= 0) router.refresh();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, router]);

  if (remaining == null) return null;
  const m = Math.floor(remaining / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return (
    <p className="mt-2 text-sm text-warn" role="timer" aria-live="off">
      {remaining > 0 ? (
        <>
          Your slot is held for <strong className="tabular-nums">{m}:{String(s).padStart(2, "0")}</strong> more minutes.
        </>
      ) : (
        "The payment window has ended."
      )}
    </p>
  );
}
