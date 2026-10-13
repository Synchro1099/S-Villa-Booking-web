"use server";

import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sniffProofType } from "@/lib/validation/file";
import { friendlyError } from "@/lib/booking/errors";
import { notifyBooking } from "@/lib/notifications";
import {
  arrivalSettingsSchema,
  blockDateSchema,
  blockTimeSchema,
  bookingRulesSchema,
  contactSettingsSchema,
  fieldErrors,
  houseRulesSchema,
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
  after(() => notifyBooking(bookingId, "CANCELLED", { cancelledBy: "OWNER" }));
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

const PHOTO_BUCKET = "service-photos";
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

/** The photo picked in the service dialog, checked by its bytes (JPG, PNG or WEBP, up to 5 MB). */
async function readServicePhoto(formData: FormData): Promise<{ bytes: Uint8Array; mime: string; ext: string } | null | string> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > PHOTO_MAX_BYTES) return "That photo is larger than 5 MB. Please choose a smaller one.";
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffProofType(bytes);
  if (!type || type.mime === "application/pdf") return "Please choose a JPG, PNG or WEBP photo.";
  return { bytes, mime: type.mime, ext: type.ext };
}

/** Upload a service photo and return its public URL. Call only after requireOwner(). */
async function uploadServicePhoto(serviceId: string, photo: { bytes: Uint8Array; mime: string; ext: string }) {
  const admin = createAdminClient();
  const path = `${serviceId}/${randomUUID()}.${photo.ext}`;
  const { error } = await admin.storage.from(PHOTO_BUCKET).upload(path, photo.bytes, { contentType: photo.mime, upsert: false });
  if (error) {
    console.error("[s-villa] service photo upload:", error.message);
    return null;
  }
  return admin.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Delete a photo this site uploaded (a URL from elsewhere is left alone). Best effort. */
async function removeServicePhoto(url: string | null) {
  const marker = `/storage/v1/object/public/${PHOTO_BUCKET}/`;
  const at = url?.indexOf(marker) ?? -1;
  if (!url || at < 0) return;
  const { error } = await createAdminClient().storage.from(PHOTO_BUCKET).remove([decodeURIComponent(url.slice(at + marker.length))]);
  if (error) console.error("[s-villa] service photo remove:", error.message);
}

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
  const photo = await readServicePhoto(formData);
  if (typeof photo === "string") return { ok: false, error: photo, fieldErrors: { photo: [photo] } };
  const removePhoto = formData.get("removePhoto") === "on";

  const supabase = await createClient();
  const { data: current } = await supabase.from("services").select("image_url").eq("id", d.id).maybeSingle<{ image_url: string | null }>();
  if (!current) return { ok: false, error: "We couldn't save this service. Please try again." };

  let imageUrl = current.image_url;
  if (photo) {
    imageUrl = await uploadServicePhoto(d.id, photo);
    if (!imageUrl) return { ok: false, error: "We couldn't upload the photo. Please try again." };
  } else if (removePhoto) {
    imageUrl = null;
  }

  const { error, count } = await supabase
    .from("services")
    .update(
      { name: d.name, description: d.description, price: d.price, pricing_unit: d.pricingUnit, is_active: d.isActive, image_url: imageUrl },
      { count: "exact" },
    )
    .eq("id", d.id);
  if (error || count === 0) {
    if (photo && imageUrl) await removeServicePhoto(imageUrl);
    return { ok: false, error: "We couldn't save this service. Please try again." };
  }
  if (imageUrl !== current.image_url) await removeServicePhoto(current.image_url);
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
  const photo = await readServicePhoto(formData);
  if (typeof photo === "string") return { ok: false, error: photo, fieldErrors: { photo: [photo] } };
  const slug =
    d.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "service";

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("services")
    .insert({
      slug: `${slug}-${Math.random().toString(36).slice(2, 6)}`,
      name: d.name,
      description: d.description,
      price: d.price,
      pricing_unit: d.pricingUnit,
      sort_order: 100,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !created) return { ok: false, error: "We couldn't add this service. Please try again." };

  if (photo) {
    const imageUrl = await uploadServicePhoto(created.id, photo);
    const saved = imageUrl && !(await supabase.from("services").update({ image_url: imageUrl }).eq("id", created.id)).error;
    if (!saved) {
      refreshEverywhere();
      return { ok: false, error: "The service was added, but its photo didn't upload. Use Edit to try the photo again." };
    }
  }
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

/** Caretaker contact (owner-only table) and the venue's Google Maps link. */
export async function saveArrivalSettings(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireOwner();
  const parsed = arrivalSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("caretaker_contact")
    .update({ name: d.caretakerName, mobile: d.caretakerMobile, viber: d.caretakerViber }, { count: "exact" })
    .eq("id", 1);
  if (error || count === 0) return { ok: false, error: "We couldn't save the caretaker's details. Please try again." };
  return updateSettings({ directions_url: d.directionsUrl });
}

export async function saveHouseRules(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireOwner();
  const parsed = houseRulesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Please check the house rules.", fieldErrors: fieldErrors(parsed.error) };
  return updateSettings({ house_rules: parsed.data.houseRules });
}

export async function saveBookingRules(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireOwner();
  const parsed = bookingRulesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  return updateSettings({
    booking_expiration_minutes: d.bookingExpirationMinutes,
    max_guests: d.maxGuests,
    booking_window_days: d.bookingWindowDays,
    min_lead_minutes: d.minLeadMinutes,
    time_slot_minutes: d.timeSlotMinutes,
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
