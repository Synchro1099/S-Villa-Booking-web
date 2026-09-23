"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import type { ActionResult, Settings } from "@/types";
import { saveBookingRules, saveContactSettings, savePaymentSettings } from "@/actions/owner";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Textarea } from "@/components/ui/form";

type SettingsAction = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

function useSettingsForm(action: SettingsAction, success: string) {
  const [state, formAction, pending] = useActionState(action, null);
  useEffect(() => {
    if (state?.ok) toast.success(success);
  }, [state, success]);
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  return { state, formAction, pending, errors };
}

export function PaymentSettingsForm({ settings }: { settings: Settings }) {
  const { state, formAction, pending, errors } = useSettingsForm(savePaymentSettings, "Payment details saved.");
  return (
    <form action={formAction} className="mt-6 grid gap-6">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-semibold">GCash</legend>
        <Field label="Account name" htmlFor="gcashName" error={errors?.gcashName}>
          <Input id="gcashName" name="gcashName" defaultValue={settings.gcash_name} />
        </Field>
        <Field label="GCash number" htmlFor="gcashNumber" error={errors?.gcashNumber}>
          <Input id="gcashNumber" name="gcashNumber" type="tel" defaultValue={settings.gcash_number} />
        </Field>
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-semibold">Bank transfer</legend>
        <Field label="Bank" htmlFor="bankName" error={errors?.bankName}>
          <Input id="bankName" name="bankName" defaultValue={settings.bank_name} />
        </Field>
        <Field label="Account name" htmlFor="bankAccountName" error={errors?.bankAccountName}>
          <Input id="bankAccountName" name="bankAccountName" defaultValue={settings.bank_account_name} />
        </Field>
        <Field label="Account number" htmlFor="bankAccountNumber" error={errors?.bankAccountNumber} className="sm:col-span-2">
          <Input id="bankAccountNumber" name="bankAccountNumber" defaultValue={settings.bank_account_number} />
        </Field>
      </fieldset>
      <FormError result={state} />
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Saving…" : "Save payment details"}
      </Button>
    </form>
  );
}

export function ContactSettingsForm({ settings }: { settings: Settings }) {
  const { state, formAction, pending, errors } = useSettingsForm(saveContactSettings, "Contact details saved. The website is updated.");
  return (
    <form action={formAction} className="mt-6 grid gap-5 sm:grid-cols-2">
      <Field label="Business name" htmlFor="businessName" error={errors?.businessName} className="sm:col-span-2">
        <Input id="businessName" name="businessName" defaultValue={settings.business_name} required />
      </Field>
      <Field label="Short description" htmlFor="businessDescription" error={errors?.businessDescription} className="sm:col-span-2">
        <Textarea id="businessDescription" name="businessDescription" defaultValue={settings.business_description} maxLength={600} />
      </Field>
      <Field label="Mobile number (Call / SMS)" htmlFor="contactNumber" error={errors?.contactNumber}>
        <Input id="contactNumber" name="contactNumber" type="tel" defaultValue={settings.contact_number} />
      </Field>
      <Field label="Email address" htmlFor="contactEmail" error={errors?.contactEmail} hint="Also receives new-booking alerts">
        <Input id="contactEmail" name="contactEmail" type="email" defaultValue={settings.contact_email} />
      </Field>
      <Field label="Facebook Messenger link" htmlFor="messengerUrl" error={errors?.messengerUrl} hint="e.g. https://m.me/yourpage">
        <Input id="messengerUrl" name="messengerUrl" type="url" defaultValue={settings.messenger_url} />
      </Field>
      <Field label="Facebook page link" htmlFor="facebookUrl" error={errors?.facebookUrl}>
        <Input id="facebookUrl" name="facebookUrl" type="url" defaultValue={settings.facebook_url} />
      </Field>
      <Field label="Address" htmlFor="address" error={errors?.address} className="sm:col-span-2">
        <Input id="address" name="address" defaultValue={settings.address} />
      </Field>
      <div className="grid gap-3 sm:col-span-2">
        <FormError result={state} />
        <Button type="submit" disabled={pending} className="justify-self-start">
          {pending ? "Saving…" : "Save contact details"}
        </Button>
      </div>
    </form>
  );
}

export function BookingRulesForm({ settings }: { settings: Settings }) {
  const { state, formAction, pending, errors } = useSettingsForm(saveBookingRules, "Booking rules saved.");
  return (
    <form action={formAction} className="mt-6 grid gap-5 sm:grid-cols-2">
      <Field label="Maximum guests per booking" htmlFor="maxGuests" error={errors?.maxGuests}>
        <Input id="maxGuests" name="maxGuests" type="number" min={1} max={100} defaultValue={settings.max_guests} required />
      </Field>
      <Field label="Payment time limit (minutes)" htmlFor="bookingExpirationMinutes" error={errors?.bookingExpirationMinutes} hint="Unpaid bookings are released after this">
        <Input id="bookingExpirationMinutes" name="bookingExpirationMinutes" type="number" min={5} max={1440} defaultValue={settings.booking_expiration_minutes} required />
      </Field>
      <Field label="Longest booking (hours)" htmlFor="maxBookingHours" error={errors?.maxBookingHours}>
        <Input id="maxBookingHours" name="maxBookingHours" type="number" min={1} max={24} defaultValue={settings.max_booking_hours} required />
      </Field>
      <Field label="Book up to (days ahead)" htmlFor="bookingWindowDays" error={errors?.bookingWindowDays}>
        <Input id="bookingWindowDays" name="bookingWindowDays" type="number" min={1} max={365} defaultValue={settings.booking_window_days} required />
      </Field>
      <Field label="Minimum notice (minutes)" htmlFor="minLeadMinutes" error={errors?.minLeadMinutes} hint="How soon before start time customers can book">
        <Input id="minLeadMinutes" name="minLeadMinutes" type="number" min={0} max={10080} defaultValue={settings.min_lead_minutes} required />
      </Field>
      <div className="grid gap-3 sm:col-span-2">
        <FormError result={state} />
        <Button type="submit" disabled={pending} className="justify-self-start">
          {pending ? "Saving…" : "Save booking rules"}
        </Button>
      </div>
    </form>
  );
}
