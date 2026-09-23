"use client";

import { useActionState } from "react";
import { lookupBooking } from "@/actions/bookings";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/form";

export function LookupForm() {
  const [state, action, pending] = useActionState(lookupBooking, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="mt-8 grid gap-5 rounded-[var(--radius-card)] border border-line/70 bg-cream p-6 shadow-soft sm:p-8">
      <Field label="Booking reference" htmlFor="reference" error={errors?.reference} hint="e.g. SV-2026-00125">
        <Input id="reference" name="reference" required autoCapitalize="characters" autoComplete="off" />
      </Field>
      <Field label="Email or mobile number" htmlFor="contact" error={errors?.contact}>
        <Input id="contact" name="contact" required autoComplete="email" />
      </Field>
      <FormError result={state} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Searching…" : "Find booking"}
      </Button>
    </form>
  );
}
