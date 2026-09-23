import { NextResponse, type NextRequest } from "next/server";
import { sweepExpiredBookings } from "@/lib/notifications";

/**
 * Expires lapsed pending bookings and sends "expired" emails.
 * Availability is always correct even without this job (expired holds are
 * ignored and cleared inside create_booking); the job exists for the emails.
 *
 * Call with header `Authorization: Bearer $CRON_SECRET` (Vercel Cron does this
 * automatically) — e.g. every 5–10 minutes from any free cron service.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const notified = await sweepExpiredBookings();
  return NextResponse.json({ ok: true, notified });
}
