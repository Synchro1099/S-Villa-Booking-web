"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/booking/errors";
import { notifyBooking } from "@/lib/notifications";
import {
  blockDateSchema,
  blockTimeSchema,
  bookingRulesSchema,
  contactSettingsSchema,
  fieldErrors,
  newServiceSchema,
  operatingHoursSchema,
  paymentSettingsSchema,
  reasonSchema,
  servicePriceSchema,
} from "@/lib/validation/schemas";
import type { ActionResult } from "@/types";

/**
 * Owner Portal actions. Every action re-checks the OWNER role on the server,
 * and the database checks it again (RLS / is_owner()).
 */

const uuid = z.uuid();

function refreshEverywhere() {
  // Prices, hours and contact details appear across the public site.
  revalidatePath("/", "layout");
}

// --- Bookings -------------------------------------------------------------------

export async function confirmBooking(bookingId: string): Promise<ActionResult> {
  await requireOwner();
  if (!uuid.safeParse(bookingId).success) return { ok: false, error: "Invalid booking." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("owner_confirm_booking", { p_booking_id: bookingId });
  if (error) return { ok: false, error: friendlyError(error) };
  after(() => notifyBooking(bookingId, "CONFIRMED"));
  refreshEverywhere();
  return { ok: true };
}

export async function rejectBooking(bookingId: string, reason: string): Promise<ActionResult> {
  await requireOwner();
  const r = reasonSchema.safeParse(reason);
  if (!uuid.safeParse(bookingId).success || !r.success) return { ok: false, error: "Please choose or write a reason." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("owner_reject_booking", { p_booking_id: bookingId, p_reason: r.data });
  if (error) return { ok: false, error: friendlyError(error) };
  after(() => notifyBooking(bookingId, "REJECTED"));
  refreshEverywhere();
  return { ok: true };
}

export async function cancelBooking(bookingId: string, reason: string): Promise<ActionResult> {
  await requireOwner();
  const r = reasonSchema.safeParse(reason);
  if (!uuid.safeParse(bookingId).success || !r.success) return { ok: false, error: "Please write a reason." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("owner_cancel_booking", { p_booking_id: bookingId, p_reason: r.data });
  if (error) return { ok: false, error: friendlyError(error) };
  after(() => notifyBooking(bookingId, "CANCELLED"));
  refreshEverywhere();
  return { ok: true };
}

/** Hide settled bookings dated before `before` from the default lists. Nothing is deleted. */
export async function archiveBookings(beforeDate: string): Promise<ActionResult<{ count: number }>> {
  await requireOwner();
  const before = z.iso.date().safeParse(beforeDate);
  if (!before.success) return { ok: false, error: "Please choose a date." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("owner_archive_bookings", { p_before: before.data });
  if (error) return { ok: false, error: friendlyError(error, { action: "archiveBookings", before: before.data }) };
  revalidatePath("/owner/bookings");
  return { ok: true, data: { count: Number(data ?? 0) } };
}

export async function unarchiveBooking(bookingId: string): Promise<ActionResult> {
  await requireOwner();
  if (!uuid.safeParse(bookingId).success) return { ok: false, error: "Invalid booking." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("owner_unarchive_booking", { p_booking_id: bookingId });
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/owner/bookings");
  revalidatePath(`/owner/bookings/${bookingId}`);
  return { ok: true };
}

// --- Services & pricing -----------------------------------------------------------

export async function updateService(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireOwner();
  const parsed = servicePriceSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    price: formData.get("price"),
    pricingUnit: formData.get("pricingUnit"),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("services")
    .update(
      { name: d.name, description: d.description, price: d.price, pricing_unit: d.pricingUnit, is_active: d.isActive },
      { count: "exact" },
    )
    .eq("id", d.id);
  if (error || count === 0) return { ok: false, error: "We couldn't save this service. Please try again." };
  refreshEverywhere();
  return { ok: true };
}

export async function createService(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireOwner();
  const parsed = newServiceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    price: formData.get("price"),
    pricingUnit: formData.get("pricingUnit"),
    isActive: true,
  });
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  const slug =
    d.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "service";

  const supabase = await createClient();
  const { error } = await supabase.from("services").insert({
    slug: `${slug}-${Math.random().toString(36).slice(2, 6)}`,
    name: d.name,
    description: d.description,
    price: d.price,
    pricing_unit: d.pricingUnit,
    sort_order: 100,
  });
  if (error) return { ok: false, error: "We couldn't add this service. Please try again." };
  refreshEverywhere();
  return { ok: true };
}

// --- Availability -------------------------------------------------------------------

export async function saveOperatingHours(
  rows: { weekday: number; isOpen: boolean; openTime: string; closeTime: string }[],
): Promise<ActionResult> {
  await requireOwner();
  const parsed = operatingHoursSchema.safeParse(rows);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the hours." };

  const supabase = await createClient();
  for (const r of parsed.data) {
    const { error } = await supabase
      .from("operating_hours")
      .update({ is_open: r.isOpen, open_time: r.openTime, close_time: r.closeTime })
      .eq("weekday", r.weekday);
    if (error) return { ok: false, error: "We couldn't save the hours. Please try again." };
  }
  refreshEverywhere();
  return { ok: true };
}

export async function blockDate(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const owner = await requireOwner();
  const parsed = blockDateSchema.safeParse({ date: formData.get("date"), reason: formData.get("reason") ?? "" });
  if (!parsed.success) return { ok: false, error: "Please choose a date.", fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("blocked_dates")
    .insert({ date: parsed.data.date, reason: parsed.data.reason, created_by: owner.userId });
  if (error) return { ok: false, error: error.code === "23505" ? "That date is already closed." : "We couldn't close that date." };
  refreshEverywhere();
  return { ok: true };
}

export async function unblockDate(id: string): Promise<ActionResult> {
  await requireOwner();
  if (!uuid.safeParse(id).success) return { ok: false, error: "Invalid date." };
  const supabase = await createClient();
  const { error } = await supabase.from("blocked_dates").delete().eq("id", id);
  if (error) return { ok: false, error: "We couldn't reopen that date." };
  refreshEverywhere();
  return { ok: true };
}

export async function blockTime(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const owner = await requireOwner();
  const parsed = blockTimeSchema.safeParse({
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the times.", fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("blocked_times").insert({
    date: parsed.data.date,
    start_time: parsed.data.startTime,
    end_time: parsed.data.endTime,
    reason: parsed.data.reason,
    created_by: owner.userId,
  });
  if (error) return { ok: false, error: "We couldn't block that time." };
  refreshEverywhere();
  return { ok: true };
}

export async function unblockTime(id: string): Promise<ActionResult> {
  await requireOwner();
  if (!uuid.safeParse(id).success) return { ok: false, error: "Invalid time block." };
  const supabase = await createClient();
  const { error } = await supabase.from("blocked_times").delete().eq("id", id);
  if (error) return { ok: false, error: "We couldn't remove that block." };
  refreshEverywhere();
  return { ok: true };
}

// --- Settings -------------------------------------------------------------------------

async function updateSettings(values: Record<string, unknown>): Promise<ActionResult> {
  const supabase = await createClient();
  const { error, count } = await supabase.from("settings").update(values, { count: "exact" }).eq("id", 1);
  if (error || count === 0) return { ok: false, error: "We couldn't save these settings. Please try again." };
  refreshEverywhere();
  return { ok: true };
}

export async function saveContactSettings(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireOwner();
  const parsed = contactSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  return updateSettings({
    business_name: d.businessName,
    business_description: d.businessDescription,
    address: d.address,
    contact_number: d.contactNumber,
    contact_email: d.contactEmail,
    facebook_url: d.facebookUrl,
    messenger_url: d.messengerUrl,
  });
}

export async function saveBookingRules(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireOwner();
  const parsed = bookingRulesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  return updateSettings({
    booking_expiration_minutes: d.bookingExpirationMinutes,
    max_guests: d.maxGuests,
    max_booking_hours: d.maxBookingHours,
    booking_window_days: d.bookingWindowDays,
    min_lead_minutes: d.minLeadMinutes,
  });
}

export async function savePaymentSettings(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireOwner();
  const parsed = paymentSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  return updateSettings({
    gcash_name: d.gcashName,
    gcash_number: d.gcashNumber,
    bank_name: d.bankName,
    bank_account_name: d.bankAccountName,
    bank_account_number: d.bankAccountNumber,
  });
}
