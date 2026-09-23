import type { Booking, BookingStatus } from "@/types";

/**
 * Status to display. A PENDING booking whose payment window has passed is
 * shown as EXPIRED right away, even before the database sweep marks it.
 */
export function effectiveStatus(booking: Pick<Booking, "status" | "expires_at">, now: number = Date.now()): BookingStatus {
  if (booking.status === "PENDING" && booking.expires_at && new Date(booking.expires_at).getTime() <= now) return "EXPIRED";
  return booking.status;
}
