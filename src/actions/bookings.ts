"use server";

import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/auth";
import { friendlyError } from "@/lib/booking/errors";
import { findBookingToken, getBookingForViewer } from "@/lib/data/bookings";
import { notifyBooking } from "@/lib/notifications";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createBookingSchema, fieldErrors, lookupSchema, type CreateBookingInput } from "@/lib/validation/schemas";
import { safeFileName, sniffProofType, validateProofFile } from "@/lib/validation/file";
import type { ActionResult } from "@/types";

/**
 * Create a reservation. The browser sends only choices (date, time, services,
 * guests, contact details). Price, total, status and customer id are decided
 * on the server/database.
 */
export async function createBooking(
  input: CreateBookingInput,
): Promise<ActionResult<{ reference: string; token: string }>> {
  const parsed = createBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted details.", fieldErrors: fieldErrors(parsed.error) };
  }
  const d = parsed.data;

  if (!(await rateLimit(`book:${await clientIp()}`, 8, 3600))) {
    return { ok: false, error: "Too many booking attempts. Please wait a little or contact us directly." };
  }

  const viewer = await getViewer();
  const admin = createAdminClient();
  const { data, error } = await admin
    .rpc("create_booking", {
      p_customer_id: viewer?.userId ?? null,
      p_customer_name: d.fullName,
      p_customer_email: d.email,
      p_customer_mobile: d.mobile,
      p_booking_date: d.date,
      p_start_time: d.startTime,
      p_duration_hours: d.durationHours,
      p_guest_count: d.guestCount,
      p_service_ids: d.serviceIds,
      p_payment_method: d.paymentMethod,
      p_notes: d.notes || null,
    })
    .single<{ booking_id: string; booking_reference: string; access_token: string }>();

  if (error || !data) {
    return {
      ok: false,
      error: friendlyError(error, {
        action: "createBooking",
        date: d.date,
        startTime: d.startTime,
        durationHours: d.durationHours,
        guestCount: d.guestCount,
        serviceCount: d.serviceIds.length,
        paymentMethod: d.paymentMethod,
        signedIn: !!viewer,
      }),
    };
  }

  after(() => notifyBooking(data.booking_id, "PENDING"));
  revalidatePath("/availability");
  return { ok: true, data: { reference: data.booking_reference, token: data.access_token } };
}

/** Upload a GCash / bank transfer receipt for a pending booking. */
export async function uploadPaymentProof(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const reference = String(formData.get("reference") ?? "");
  const token = String(formData.get("token") ?? "");
  const referenceNumber = String(formData.get("referenceNumber") ?? "").trim().slice(0, 64);

  const access = await getBookingForViewer(reference, token || null);
  if (!access) return { ok: false, error: "We couldn't find that booking." };
  const { booking } = access;

  if (!(await rateLimit(`proof:${booking.id}`, 10, 3600))) {
    return { ok: false, error: "Too many uploads. Please contact us if you need help." };
  }

  const checked = validateProofFile(formData.get("file"));
  if (!checked.ok) return { ok: false, error: checked.error };

  const bytes = new Uint8Array(await checked.file.arrayBuffer());
  const type = sniffProofType(bytes);
  if (!type) return { ok: false, error: "Please upload a JPG, PNG or WEBP screenshot, or a PDF receipt." };

  // Server-generated path: nothing from the client ends up in the storage key.
  const path = `${booking.id}/${randomUUID()}.${type.ext}`;
  const admin = createAdminClient();
  const upload = await admin.storage.from("payment-proofs").upload(path, bytes, { contentType: type.mime, upsert: false });
  if (upload.error) {
    console.error("[s-villa] proof upload:", upload.error.message);
    return { ok: false, error: "We couldn't upload your file. Please try again." };
  }

  const { error } = await admin.rpc("submit_payment_proof", {
    p_booking_id: booking.id,
    p_file_path: path,
    p_file_name: safeFileName(checked.file.name),
    p_mime_type: type.mime,
    p_file_size: bytes.byteLength,
    p_reference_number: referenceNumber || null,
  });
  if (error) {
    await admin.storage.from("payment-proofs").remove([path]);
    return { ok: false, error: friendlyError(error) };
  }

  after(() => notifyBooking(booking.id, "PROOF_SUBMITTED"));
  revalidatePath(`/bookings/${reference}`);
  return { ok: true };
}

/** Customers may cancel their own booking while it is still pending. */
export async function cancelMyBooking(reference: string, token: string | null): Promise<ActionResult> {
  const access = await getBookingForViewer(reference, token);
  if (!access || access.via === "owner") return { ok: false, error: "We couldn't find that booking." };

  const { error } = await createAdminClient().rpc("customer_cancel_booking", { p_booking_id: access.booking.id });
  if (error) return { ok: false, error: friendlyError(error) };

  after(() => notifyBooking(access.booking.id, "CANCELLED", { cancelledBy: "CUSTOMER" }));
  revalidatePath(`/bookings/${reference}`);
  return { ok: true };
}

/** Booking reference + email/mobile → redirect to the private status page. */
export async function lookupBooking(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = lookupSchema.safeParse({ reference: formData.get("reference"), contact: formData.get("contact") });
  if (!parsed.success) return { ok: false, error: "Please check the details.", fieldErrors: fieldErrors(parsed.error) };

  if (!(await rateLimit(`lookup:${await clientIp()}`, 10, 600))) {
    return { ok: false, error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const token = await findBookingToken(parsed.data.reference, parsed.data.contact);
  if (!token) return { ok: false, error: "We couldn't find a booking with those details." };
  redirect(`/bookings/${parsed.data.reference}?t=${token}`);
}
