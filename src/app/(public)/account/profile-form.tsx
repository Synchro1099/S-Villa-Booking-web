"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updateProfile } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/form";

export function ProfileForm({ fullName, mobile }: { fullName: string; mobile: string }) {
  const [state, action, pending] = useActionState(updateProfile, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  useEffect(() => {
    if (state?.ok) toast.success("Profile saved");
  }, [state]);

  return (
    <form action={action} className="mt-8 grid gap-5 rounded-[var(--radius-card)] border border-line/70 bg-cream p-6 shadow-soft sm:p-8">
      <Field label="Full name" htmlFor="fullName" error={errors?.fullName}>
        <Input id="fullName" name="fullName" defaultValue={fullName} autoComplete="name" required />
      </Field>
      <Field label="Mobile number" htmlFor="mobile" error={errors?.mobile}>
        <Input id="mobile" name="mobile" type="tel" defaultValue={mobile} autoComplete="tel" required />
      </Field>
      <FormError result={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
