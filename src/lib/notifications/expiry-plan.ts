export type Audience = "CUSTOMER" | "OWNER";

/** Failed attempts after which an expiry email is given up on. */
export const MAX_EXPIRY_EMAIL_ATTEMPTS = 3;

export interface LoggedEmail {
  booking_id: string;
  audience: Audience;
  status: "SENT" | "SKIPPED" | "FAILED";
}

/**
 * Which expired bookings still need their EXPIRED email, and for whom.
 *
 * - Never attempted: send to everyone.
 * - Attempted: resend only to an audience whose every attempt failed, up to
 *   MAX_EXPIRY_EMAIL_ATTEMPTS. An audience with no attempt at all is left
 *   alone, so bookings that expired before owners were emailed don't get a
 *   late owner email.
 */
export function planExpiryEmails(bookingIds: string[], logged: LoggedEmail[]): { bookingId: string; audiences: Audience[] | "ALL" }[] {
  const plan: { bookingId: string; audiences: Audience[] | "ALL" }[] = [];
  for (const bookingId of bookingIds) {
    const rows = logged.filter((r) => r.booking_id === bookingId);
    if (rows.length === 0) {
      plan.push({ bookingId, audiences: "ALL" });
      continue;
    }
    const retry = (["CUSTOMER", "OWNER"] as const).filter((audience) => {
      const mine = rows.filter((r) => r.audience === audience);
      return mine.length > 0 && mine.length < MAX_EXPIRY_EMAIL_ATTEMPTS && mine.every((r) => r.status === "FAILED");
    });
    if (retry.length > 0) plan.push({ bookingId, audiences: retry });
  }
  return plan;
}
