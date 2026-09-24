import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";
import { toBookingDetail, DETAIL_COLUMNS } from "@/lib/data/bookings";
import type { BookingDetail, Settings } from "@/types";
import { customerEmailBlockedReason, envValue, getEmailProvider, getSmsProvider, type DeliveryResult } from "./providers";
import { planExpiryEmails, type Audience, type LoggedEmail } from "./expiry-plan";
import { OWNER_EVENTS, renderBookingEmail, renderBookingSms, type BookingEvent, type CancelledBy } from "./templates";

/**
 * Notification entry point. Sends to every configured channel and records each
 * attempt in the `notifications` table. Never throws — a failed email must not
 * break a booking.
 */

async function loadContext(bookingId: string) {
  const admin = createAdminClient();
  const [{ data: row }, { data: settings }] = await Promise.all([
    admin.from("bookings").select(`${DETAIL_COLUMNS}, access_token`).eq("id", bookingId).single(),
    admin.from("settings").select("*").eq("id", 1).single(),
  ]);
  if (!row || !settings) throw new Error(`Booking ${bookingId} or settings not found`);
  return { admin, booking: toBookingDetail(row), token: String(row.access_token), settings: settings as Settings };
}

async function log(
  admin: ReturnType<typeof createAdminClient>,
  entry: { bookingId: string; channel: "EMAIL" | "SMS"; audience: "CUSTOMER" | "OWNER"; template: string; recipient: string; result: DeliveryResult },
) {
  await admin.from("notifications").insert({
    booking_id: entry.bookingId,
    channel: entry.channel,
    audience: entry.audience,
    template: entry.template,
    recipient: entry.recipient,
    status: entry.result.status,
    error: entry.result.error ?? null,
    sent_at: entry.result.status === "SENT" ? new Date().toISOString() : null,
  });
}

function customerLink(booking: BookingDetail, token: string) {
  return `${publicEnv.siteUrl()}/bookings/${booking.booking_reference}?t=${token}`;
}

function ownerRecipient(settings: Settings) {
  return envValue("OWNER_NOTIFICATION_EMAIL") || settings.contact_email.trim();
}

/**
 * `audiences` limits who is emailed (default: everyone); `emailOnly` skips SMS.
 * Both are used when resending an email that failed earlier.
 */
export async function notifyBooking(
  bookingId: string,
  event: BookingEvent,
  opts: { cancelledBy?: CancelledBy; audiences?: Audience[]; emailOnly?: boolean } = {},
) {
  const to = (audience: Audience) => !opts.audiences || opts.audiences.includes(audience);
  try {
    const { admin, booking, token, settings } = await loadContext(bookingId);
    const email = getEmailProvider();
    const sms = getSmsProvider();
    const link = customerLink(booking, token);

    // Customer: email (+ SMS when a provider is configured).
    if (to("CUSTOMER")) {
      const blocked = customerEmailBlockedReason();
      const customerMail = renderBookingEmail({ event, audience: "CUSTOMER", booking, settings, link });
      const mailResult: DeliveryResult = blocked
        ? { status: "SKIPPED", error: blocked }
        : await email.send({ to: booking.customer_email, ...customerMail });
      await log(admin, { bookingId, channel: "EMAIL", audience: "CUSTOMER", template: event, recipient: booking.customer_email, result: mailResult });

      if (sms.enabled && !opts.emailOnly && event !== "PROOF_SUBMITTED") {
        const smsResult = await sms.send(booking.customer_mobile, renderBookingSms(event, booking, settings, link));
        await log(admin, { bookingId, channel: "SMS", audience: "CUSTOMER", template: event, recipient: booking.customer_mobile, result: smsResult });
      }
    }

    // Owner: new bookings and uploaded proofs need attention; cancellations and expiries free a slot.
    const ownerTo = ownerRecipient(settings);
    if (to("OWNER") && OWNER_EVENTS.includes(event) && ownerTo) {
      const ownerMail = renderBookingEmail({
        event,
        audience: "OWNER",
        booking,
        settings,
        link: `${publicEnv.siteUrl()}/owner/bookings/${booking.id}`,
        cancelledBy: opts.cancelledBy,
      });
      const ownerResult = await email.send({ to: ownerTo, ...ownerMail });
      await log(admin, { bookingId, channel: "EMAIL", audience: "OWNER", template: event, recipient: ownerTo, result: ownerResult });
    }
  } catch (e) {
    console.error(`[s-villa] notification ${event} for ${bookingId} failed:`, e);
  }
}

// Named helpers, one per customer-facing status.
export const sendBookingPendingEmail = (bookingId: string) => notifyBooking(bookingId, "PENDING");
export const sendPaymentProofReceivedEmail = (bookingId: string) => notifyBooking(bookingId, "PROOF_SUBMITTED");
export const sendBookingConfirmedEmail = (bookingId: string) => notifyBooking(bookingId, "CONFIRMED");
export const sendBookingRejectedEmail = (bookingId: string) => notifyBooking(bookingId, "REJECTED");
export const sendBookingCancelledEmail = (bookingId: string) => notifyBooking(bookingId, "CANCELLED");
export const sendBookingExpiredEmail = (bookingId: string) => notifyBooking(bookingId, "EXPIRED");

/**
 * Expire lapsed pending bookings and email every expired booking that hasn't
 * been told yet (bookings can also be expired inside create_booking()).
 * Emails that failed earlier are resent, up to MAX_EXPIRY_EMAIL_ATTEMPTS.
 * Returns the number of bookings emailed, or null when skipped because another
 * sweep ran within the last minute.
 */
export async function sweepExpiredBookings(): Promise<number | null> {
  // Several Owner Portal pages (and the cron job) can trigger this at the same
  // moment; overlapping sweeps would email the same booking twice. The shared
  // counter lets only one sweep through per minute, across all server instances.
  // Unlike the request rate limits, this fails closed: if the check itself
  // errors, skip (the next sweep sends the emails) rather than risk duplicates.
  const admin = createAdminClient();
  const { data: mayRun, error: guardError } = await admin.rpc("hit_rate_limit", {
    p_key: "sweep:expired-bookings",
    p_limit: 1,
    p_window_seconds: 60,
  });
  if (guardError) console.error("[s-villa] expiry sweep guard failed; skipping this sweep:", guardError.message);
  if (mayRun !== true) return null;

  await admin.rpc("expire_stale_bookings");

  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: expired } = await admin.from("bookings").select("id").eq("status", "EXPIRED").gte("updated_at", since).limit(100);
  if (!expired?.length) return 0;

  const ids = expired.map((b) => b.id as string);
  const { data: logged } = await admin
    .from("notifications")
    .select("booking_id, audience, status")
    .in("booking_id", ids)
    .eq("template", "EXPIRED")
    .eq("channel", "EMAIL");
  const plan = planExpiryEmails(ids, (logged ?? []) as LoggedEmail[]);
  for (const { bookingId, audiences } of plan) {
    if (audiences === "ALL") await sendBookingExpiredEmail(bookingId);
    else await notifyBooking(bookingId, "EXPIRED", { audiences, emailOnly: true });
  }
  return plan.length;
}
