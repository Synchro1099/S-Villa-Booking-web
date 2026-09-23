"use client";

import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { register } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/form";

export function RegisterForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(register, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  if (state?.ok) {
    return (
      <div className="mt-8 rounded-[var(--radius-card)] border border-line/70 bg-cream p-8 text-center shadow-soft" role="status">
        <MailCheck className="mx-auto size-10 text-brass-deep" aria-hidden />
        <h2 className="mt-4 text-3xl">Check your email</h2>
        <p className="mt-2 text-muted">We sent you a confirmation link. Open it to activate your account.</p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-8 grid gap-5 rounded-[var(--radius-card)] border border-line/70 bg-cream p-6 shadow-soft sm:p-8">
      <input type="hidden" name="next" value={next} />
      <Field label="Full name" htmlFor="fullName" error={errors?.fullName}>
        <Input id="fullName" name="fullName" autoComplete="name" required />
      </Field>
      <Field label="Mobile number" htmlFor="mobile" error={errors?.mobile} hint="e.g. 0917 123 4567">
        <Input id="mobile" name="mobile" type="tel" inputMode="tel" autoComplete="tel" required />
      </Field>
      <Field label="Email address" htmlFor="email" error={errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password" error={errors?.password} hint="At least 8 characters">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <FormError result={state} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
