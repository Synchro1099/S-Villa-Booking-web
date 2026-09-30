"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import type { ActionResult, Settings } from "@/types";
import { saveArrivalSettings, saveBookingRules, saveContactSettings, saveHouseRules, savePaymentSettings } from "@/actions/owner";
import { HOUSE_RULE_TAGS, type Caretaker } from "@/lib/house-rules";
import { publicHouseRules } from "@/lib/house-rules-context";
import { HouseRules } from "@/components/booking/house-rules";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";

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
      <Field label="Start times every" htmlFor="timeSlotMinutes" error={errors?.timeSlotMinutes} hint="Bookings stay whole hours; this sets when they can start">
        <Select id="timeSlotMinutes" name="timeSlotMinutes" defaultValue={String(settings.time_slot_minutes)}>
          <option value="15">15 minutes (3:00, 3:15, 3:30…)</option>
          <option value="30">30 minutes (3:00, 3:30, 4:00…)</option>
          <option value="60">60 minutes (on the hour only)</option>
        </Select>
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

export function ArrivalSettingsForm({ settings, caretaker }: { settings: Settings; caretaker: Caretaker }) {
  const { state, formAction, pending, errors } = useSettingsForm(saveArrivalSettings, "Caretaker & arrival details saved.");
  return (
    <form action={formAction} className="mt-6 grid gap-5 sm:grid-cols-2">
      <Field label="Caretaker's name" htmlFor="caretakerName" error={errors?.caretakerName} className="sm:col-span-2">
        <Input id="caretakerName" name="caretakerName" defaultValue={caretaker.name} maxLength={80} autoComplete="off" />
      </Field>
      <Field label="Caretaker's mobile" htmlFor="caretakerMobile" error={errors?.caretakerMobile}>
        <Input id="caretakerMobile" name="caretakerMobile" type="tel" inputMode="tel" defaultValue={caretaker.mobile} maxLength={20} autoComplete="off" />
      </Field>
      <Field label="Caretaker's Viber" htmlFor="caretakerViber" error={errors?.caretakerViber} hint="Leave blank if it's the same as the mobile">
        <Input id="caretakerViber" name="caretakerViber" type="tel" inputMode="tel" defaultValue={caretaker.viber} maxLength={20} autoComplete="off" />
      </Field>
      <Field
        label="Directions link (Google Maps)"
        htmlFor="directionsUrl"
        error={errors?.directionsUrl}
        hint="In Google Maps, tap Share on the venue and paste the link here"
        className="sm:col-span-2"
      >
        <Input id="directionsUrl" name="directionsUrl" type="url" defaultValue={settings.directions_url} placeholder="https://maps.app.goo.gl/…" />
      </Field>
      <div className="grid gap-3 sm:col-span-2">
        <FormError result={state} />
        <Button type="submit" disabled={pending} className="justify-self-start">
          {pending ? "Saving…" : "Save caretaker & arrival"}
        </Button>
      </div>
    </form>
  );
}

export function HouseRulesForm({ settings }: { settings: Settings }) {
  const { state, formAction, pending, errors } = useSettingsForm(saveHouseRules, "House rules saved. The website is updated.");
  const [text, setText] = useState(settings.house_rules);
  const preview = publicHouseRules({ ...settings, house_rules: text });
  return (
    <form action={formAction} className="mt-6 grid gap-5">
      <Field label="House rules" htmlFor="houseRules" error={errors?.houseRules} hint="One rule per line. Leave empty to hide the house rules everywhere.">
        <Textarea
          id="houseRules"
          name="houseRules"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          maxLength={4000}
          className="min-h-72 text-sm leading-relaxed"
        />
      </Field>
      <div className="rounded-xl bg-sand/50 px-4 py-3 text-sm text-muted">
        <p>
          Put <strong className="text-ink">**two asterisks**</strong> around the bold start of a rule. These tags fill in automatically:
        </p>
        <ul className="mt-2 grid gap-1">
          {HOUSE_RULE_TAGS.map((t) => (
            <li key={t.tag}>
              <code className="rounded bg-cream px-1.5 py-0.5 text-xs text-ink">{t.tag}</code> {t.help}
            </li>
          ))}
        </ul>
        <p className="mt-2">A line whose details aren&apos;t filled in yet (like the directions link) is hidden until they are.</p>
      </div>
      {preview.length > 0 ? (
        <details className="group">
          <summary className="-my-3 cursor-pointer py-3 text-sm font-semibold">Preview: how customers see it before paying</summary>
          <HouseRules lines={preview} title="Before you pay: house rules" id="rules-preview" className="mt-3" />
        </details>
      ) : null}
      <div className="grid gap-3">
        <FormError result={state} />
        <Button type="submit" disabled={pending} className="justify-self-start">
          {pending ? "Saving…" : "Save house rules"}
        </Button>
      </div>
    </form>
  );
}
