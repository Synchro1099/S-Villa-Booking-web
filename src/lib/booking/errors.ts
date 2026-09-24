/**
 * Maps the database's SV_* error codes to customer-friendly messages.
 * Technical details are logged on the server, never shown to customers.
 */
const MESSAGES: Record<string, string> = {
  SV_SLOT_TAKEN: "This schedule was just booked by another customer. Please choose another available time.",
  SV_GUESTS_INVALID: "That's more guests than we can host in one booking.",
  SV_PAYMENT_METHOD_INVALID: "Please choose GCash or Bank Transfer.",
  SV_DURATION_INVALID: "Please choose a valid booking length.",
  SV_TIME_INVALID: "Please choose one of the available start times.",
  SV_CUSTOMER_INVALID: "Please fill in your name, email and mobile number.",
  SV_TOO_SOON: "That time has already passed or is too soon to book. Please choose a later time.",
  SV_TOO_FAR: "We're not taking bookings that far ahead yet. Please choose an earlier date.",
  SV_CLOSED_DAY: "S-Villa is closed on that day. Please choose another date.",
  SV_CLOSED_DATE: "S-Villa is closed on that date. Please choose another date.",
  SV_OUTSIDE_HOURS: "That time is outside our opening hours. Please choose another time.",
  SV_BLOCKED_TIME: "That time isn't available. Please choose another time.",
  SV_SERVICE_REQUIRED: "Please choose at least one service.",
  SV_SERVICE_INVALID: "One of the selected services is no longer available. Please review your selection.",
  SV_BOOKING_EXPIRED: "The payment window for this booking has ended, so the slot was released. Please make a new booking.",
  SV_BOOKING_NOT_PENDING: "This booking is no longer awaiting payment.",
  SV_PAYMENT_LOCKED: "Payment for this booking has already been reviewed.",
  SV_INVALID_TRANSITION: "This booking's status has already changed. Please refresh the page.",
  SV_REASON_REQUIRED: "Please give a reason.",
  SV_FORBIDDEN: "You don't have permission to do that.",
  SV_NOT_FOUND: "We couldn't find that booking.",
  SV_ARCHIVE_DATE_INVALID: "Please choose today or an earlier date. Upcoming bookings can't be archived.",
  SV_NOT_CONFIGURED: "Bookings are temporarily unavailable. Please contact us directly.",
};

const GENERIC = "Something went wrong on our side. Please try again, or contact S-Villa if it keeps happening.";

/**
 * `context` names the operation and may carry non-sensitive details (no
 * contact info or tokens). Unexpected errors are logged with a short incident
 * id that is also shown to the customer, so a support report can be matched
 * to the exact server log line.
 */
export function friendlyError(error: unknown, context?: { action: string; [key: string]: unknown }): string {
  const e = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
  const message = "message" in e ? String(e.message) : "";
  const code = message.match(/SV_[A-Z_]+/)?.[0];
  if (code && MESSAGES[code]) return MESSAGES[code];

  const incident = crypto.randomUUID().slice(0, 8).toUpperCase();
  console.error(
    `[s-villa] unexpected error (incident ${incident})`,
    JSON.stringify({
      incident,
      ...context,
      message: message || (error == null ? "no error object (empty result)" : String(error)),
      code: e.code,
      details: e.details,
      hint: e.hint,
      status: e.status,
    }),
  );
  return `${GENERIC} (Reference: ${incident})`;
}
