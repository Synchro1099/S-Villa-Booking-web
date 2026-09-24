import type { BookingDetail, Settings } from "@/types";
import { formatPeso } from "@/lib/pricing";
import { formatDate, formatTimeRange } from "@/lib/time";
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, BOOKING_STATUS_LABEL } from "@/lib/booking/labels";
import { isPlaceholderEmail, isPlaceholderPhone, isPlaceholderUrl } from "@/lib/contact";

export type BookingEvent = "PENDING" | "PROOF_SUBMITTED" | "CONFIRMED" | "REJECTED" | "CANCELLED" | "EXPIRED";

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface Copy {
  subject: string;
  heading: string;
  intro: string;
  /** Shown prominently above the details table. */
  highlight?: { label: string; value: string };
}

/** "September 30, 2026, 7:00 PM – 8:00 PM" */
export function reservationWhen(b: Pick<BookingDetail, "booking_date" | "start_time" | "end_time">, dateStyle: "long" | "short" = "long") {
  return `${formatDate(b.booking_date, dateStyle)}, ${formatTimeRange(b.start_time, b.end_time)}`;
}

function customerCopy(event: BookingEvent, b: BookingDetail, s: Settings): Copy {
  const ref = b.booking_reference;
  switch (event) {
    case "PENDING":
      return {
        subject: `Reservation received — ${ref}`,
        heading: "We received your reservation request",
        intro: `Please send your payment and upload the proof within ${s.booking_expiration_minutes} minutes to hold your slot. We'll email you once ${s.business_name} confirms.`,
      };
    case "PROOF_SUBMITTED":
      return {
        subject: `Payment proof received — ${ref}`,
        heading: "Thanks — we received your payment proof",
        intro: "Your reservation is pending confirmation. We'll email you as soon as we've verified the payment.",
      };
    case "CONFIRMED":
      return {
        subject: `Confirmed — ${ref}`,
        heading: "Your reservation is confirmed",
        intro: "Your payment has been verified and the villa is reserved for your group. We look forward to hosting you!",
      };
    case "REJECTED":
      return {
        subject: `Reservation not approved — ${ref}`,
        heading: "We couldn't approve your reservation",
        intro: `Reason: ${b.status_reason ?? "Not specified"}. If you have questions or already paid, please contact us.`,
      };
    case "CANCELLED":
      return {
        subject: `Reservation cancelled — ${ref}`,
        heading: "Your reservation was cancelled",
        intro: `Reason: ${b.status_reason ?? "Not specified"}. Please contact us if you have any questions.`,
      };
    case "EXPIRED":
      return {
        subject: `Reservation expired — ${ref}`,
        heading: "Your reservation request expired",
        intro: "We didn't receive a payment proof in time, so the slot was released. You're welcome to book again.",
      };
  }
}

/** Who cancelled a booking, when known (the customer or the owner). */
export type CancelledBy = "CUSTOMER" | "OWNER";

/** Owner-facing events: new bookings and proofs need action; cancellations and expiries free a slot. */
export const OWNER_EVENTS: readonly BookingEvent[] = ["PENDING", "PROOF_SUBMITTED", "CANCELLED", "EXPIRED"];

function ownerCopy(event: BookingEvent, b: BookingDetail, s: Settings, cancelledBy?: CancelledBy): Copy {
  // When the reservation is for, up front: in the subject (for the inbox list) and highlighted in the body.
  const when = reservationWhen(b);
  const inSubject = reservationWhen(b, "short");
  const ref = b.booking_reference;
  const reservedFor = { label: "Reservation for", value: when };
  const freed = { label: "Slot available again", value: when };
  switch (event) {
    case "PROOF_SUBMITTED":
      return {
        subject: `Payment proof to review — ${ref} · ${inSubject}`,
        heading: "A customer uploaded a payment proof",
        intro: "Review the proof in the Owner Portal, then confirm or reject the booking.",
        highlight: reservedFor,
      };
    case "CANCELLED": {
      const reason = b.status_reason ? ` Reason: ${b.status_reason}` : "";
      const who =
        cancelledBy === "CUSTOMER"
          ? "The customer cancelled this booking."
          : cancelledBy === "OWNER"
            ? `This booking was cancelled from the Owner Portal.${reason}`
            : `This booking was cancelled.${reason}`;
      return {
        subject: `Booking cancelled — ${ref} · ${inSubject}`,
        heading: "A booking was cancelled — the slot is free",
        intro: `${who} The time slot is open for new bookings again.`,
        highlight: freed,
      };
    }
    case "EXPIRED":
      return {
        subject: `Booking expired — ${ref} · ${inSubject}`,
        heading: "A booking expired — the slot is free",
        intro: `No payment proof was uploaded within ${s.booking_expiration_minutes} minutes, so the hold was released. The time slot is open for new bookings again.`,
        highlight: freed,
      };
    default:
      return {
        subject: `New booking — ${ref} · ${inSubject}`,
        heading: "New reservation request",
        intro: "A new booking is waiting for payment. You'll get another email when the payment proof is uploaded.",
        highlight: reservedFor,
      };
  }
}

function detailRows(b: BookingDetail): [string, string][] {
  return [
    ["Booking", `#${b.booking_reference}`],
    ["Name", b.customer_name],
    ["Date", formatDate(b.booking_date, "full")],
    ["Time", formatTimeRange(b.start_time, b.end_time)],
    ["Guests", String(b.guest_count)],
    ["Services", b.items.map((i) => `${i.service_name_snapshot} (${formatPeso(i.subtotal)})`).join(", ")],
    ["Total", formatPeso(b.total_amount)],
    ["Payment method", PAYMENT_METHOD_LABEL[b.payment_method]],
    ["Payment status", b.payment ? PAYMENT_STATUS_LABEL[b.payment.status] : "—"],
    ["Booking status", BOOKING_STATUS_LABEL[b.status]],
  ];
}

export function renderBookingEmail(opts: {
  event: BookingEvent;
  audience: "CUSTOMER" | "OWNER";
  booking: BookingDetail;
  settings: Settings;
  link: string;
  cancelledBy?: CancelledBy;
}) {
  const { event, audience, booking: b, settings: s, link } = opts;
  const copy = audience === "CUSTOMER" ? customerCopy(event, b, s) : ownerCopy(event, b, s, opts.cancelledBy);
  const rows = detailRows(b);
  if (audience === "OWNER") rows.push(["Mobile", b.customer_mobile], ["Email", b.customer_email]);
  // Placeholder details (from the initial setup) are left out, as on the website.
  const contact = [
    !isPlaceholderPhone(s.contact_number) && `Call/SMS: ${s.contact_number}`,
    !isPlaceholderUrl(s.messenger_url) && `Messenger: ${s.messenger_url}`,
    !isPlaceholderEmail(s.contact_email) && `Email: ${s.contact_email}`,
  ]
    .filter(Boolean)
    .join("\n");
  const buttonLabel = audience === "OWNER" ? "Open in Owner Portal" : "View your booking";

  const text = [
    copy.heading,
    "",
    copy.intro,
    "",
    ...(copy.highlight ? [`${copy.highlight.label}: ${copy.highlight.value}`, ""] : []),
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    `${buttonLabel}: ${link}`,
    "",
    s.business_name,
    ...(contact ? [contact] : []),
  ].join("\n");

  const html = `<!doctype html><html><body style="margin:0;background:#f5f1ea;font-family:Helvetica,Arial,sans-serif;color:#1d2a22">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#1d2a22;padding:28px 32px;color:#f5f1ea">
<div style="font-family:Georgia,serif;font-size:22px;letter-spacing:.04em">${escape(s.business_name)}</div></td></tr>
<tr><td style="padding:32px">
<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 12px">${escape(copy.heading)}</h1>
<p style="font-size:15px;line-height:1.6;margin:0 0 24px;color:#3d4a42">${escape(copy.intro)}</p>
${
  copy.highlight
    ? `<div style="margin:0 0 24px;padding:16px 20px;background:#f5f1ea;border-left:4px solid #b08d57;border-radius:8px">
<div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b746e">${escape(copy.highlight.label)}</div>
<div style="margin-top:4px;font-family:Georgia,serif;font-size:20px;color:#1d2a22">${escape(copy.highlight.value).replace(
        /\d{1,2}:\d{2} [AP]M – \d{1,2}:\d{2} [AP]M/,
        (range) => `<span style="white-space:nowrap">${range}</span>`, // keep the time range on one line
      )}</div></div>
`
    : ""
}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-top:1px solid #e8e1d4">
${rows
  .map(
    ([k, v]) =>
      `<tr><td style="padding:10px 0;color:#6b746e;border-bottom:1px solid #e8e1d4;width:40%">${escape(k)}</td><td style="padding:10px 0;border-bottom:1px solid #e8e1d4;font-weight:600">${escape(v)}</td></tr>`,
  )
  .join("")}
</table>
<p style="margin:28px 0 0"><a href="${escape(link)}" style="display:inline-block;background:#1d2a22;color:#f5f1ea;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px">${buttonLabel}</a></p>
</td></tr>
${contact ? `<tr><td style="padding:20px 32px;background:#faf7f2;font-size:12px;line-height:1.6;color:#6b746e;white-space:pre-line">${escape(contact)}</td></tr>` : ""}
</table></td></tr></table></body></html>`;

  return { subject: copy.subject, html, text };
}

export function renderBookingSms(event: BookingEvent, b: BookingDetail, s: Settings, link: string) {
  const when = `${formatDate(b.booking_date, "short")} ${formatTimeRange(b.start_time, b.end_time)}`;
  const status: Record<BookingEvent, string> = {
    PENDING: "received. Please upload your payment proof",
    PROOF_SUBMITTED: "payment proof received, pending confirmation",
    CONFIRMED: "is CONFIRMED",
    REJECTED: `was not approved (${b.status_reason ?? ""})`,
    CANCELLED: "was cancelled",
    EXPIRED: "expired (no payment received)",
  };
  return `${s.business_name}: Booking ${b.booking_reference} (${when}) ${status[event]}. ${link}`;
}
