import "server-only";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import type { Booking, BookingDetail, BookingItem, BookingStatus, Payment, PaymentProof } from "@/types";

export const BOOKING_COLUMNS =
  "id, booking_reference, customer_id, customer_name, customer_email, customer_mobile, booking_date, start_time, end_time, guest_count, status, status_reason, subtotal, total_amount, payment_method, notes, expires_at, confirmed_at, created_at";

export const DETAIL_COLUMNS = `${BOOKING_COLUMNS},
  booking_items (id, service_name_snapshot, pricing_unit_snapshot, unit_price, quantity, subtotal),
  payments (id, payment_method, amount, status, reference_number, submitted_at, verified_at, rejection_reason)`;

type Row = Record<string, unknown>;

export function toBooking(row: Row): Booking {
  return {
    ...(row as unknown as Booking),
    subtotal: Number(row.subtotal),
    total_amount: Number(row.total_amount),
  };
}

export function toBookingDetail(row: Row): BookingDetail {
  const items = ((row.booking_items as Row[] | null) ?? []).map(
    (i): BookingItem => ({
      ...(i as unknown as BookingItem),
      unit_price: Number(i.unit_price),
      quantity: Number(i.quantity),
      subtotal: Number(i.subtotal),
    }),
  );
  const rawPayment = Array.isArray(row.payments) ? (row.payments[0] as Row | undefined) : (row.payments as Row | null);
  const payment = rawPayment ? ({ ...(rawPayment as unknown as Payment), amount: Number(rawPayment.amount) } as Payment) : null;
  const { booking_items: _items, payments: _payments, access_token: _token, ...rest } = row;
  return { ...toBooking(rest), items, payment };
}

function tokensMatch(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export interface BookingAccess {
  booking: BookingDetail;
  /** How the viewer is allowed to see it. */
  via: "token" | "customer" | "owner";
  accessToken: string;
}

/**
 * Loads a booking for the status page. Allowed when the viewer has the secret
 * link token, is the signed-in customer who made it, or is the owner.
 */
export async function getBookingForViewer(reference: string, token?: string | null): Promise<BookingAccess | null> {
  if (!/^SV-\d{4}-\d{5}$/.test(reference)) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select(`${DETAIL_COLUMNS}, access_token`)
    .eq("booking_reference", reference)
    .maybeSingle();
  if (!data) return null;

  const accessToken = String(data.access_token);
  let via: BookingAccess["via"] | null = null;
  if (token && tokensMatch(token, accessToken)) via = "token";
  if (!via) {
    const viewer = await getViewer();
    if (viewer && data.customer_id === viewer.userId) via = "customer";
    else if (viewer?.isOwner) via = "owner";
  }
  if (!via) return null;

  return { booking: toBookingDetail(data), via, accessToken };
}

/** Booking reference + email or mobile → secret token (for the lookup page). */
export async function findBookingToken(reference: string, contact: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select("customer_email, customer_mobile, access_token")
    .eq("booking_reference", reference)
    .maybeSingle();
  if (!data) return null;
  const normalized = contact.trim().toLowerCase();
  const mobile = normalized.replace(/[\s-]/g, "").replace(/^\+?63/, "0");
  const matches = normalized === data.customer_email || mobile === data.customer_mobile;
  return matches ? String(data.access_token) : null;
}

/** Signed-in customer's bookings (RLS limits rows to their own). */
export async function getMyBookings(): Promise<BookingDetail[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(DETAIL_COLUMNS)
    .order("booking_date", { ascending: false })
    .order("start_time", { ascending: false });
  if (error) console.error("[s-villa] my bookings:", error.message);
  return (data ?? []).map(toBookingDetail);
}

// ---------------------------------------------------------------------------
// Owner reads — use the session client so RLS (is_owner) also applies.
// ---------------------------------------------------------------------------

export async function listBookings(opts: { status?: BookingStatus | "ALL"; q?: string; from?: string; to?: string; limit?: number }) {
  const supabase = await createClient();
  let query = supabase.from("bookings").select(DETAIL_COLUMNS);
  if (opts.status && opts.status !== "ALL") query = query.eq("status", opts.status);
  if (opts.from) query = query.gte("booking_date", opts.from);
  if (opts.to) query = query.lte("booking_date", opts.to);
  if (opts.q) {
    const q = opts.q.replace(/[%,()*]/g, "").slice(0, 60);
    if (q) {
      query = query.or(
        `booking_reference.ilike.%${q}%,customer_name.ilike.%${q}%,customer_mobile.ilike.%${q}%,customer_email.ilike.%${q}%`,
      );
    }
  }
  const { data, error } = await query
    .order("booking_date", { ascending: opts.status === "PENDING" || !!opts.from })
    .order("start_time", { ascending: true })
    .limit(opts.limit ?? 200);
  if (error) console.error("[s-villa] list bookings:", error.message);
  return (data ?? []).map(toBookingDetail);
}

export async function getBookingById(id: string): Promise<BookingDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("bookings").select(DETAIL_COLUMNS).eq("id", id).maybeSingle();
  if (!data) return null;
  const booking = toBookingDetail(data);
  if (booking.payment) {
    const { data: proofs } = await supabase
      .from("payment_proofs")
      .select("id, file_name, mime_type, file_size, uploaded_at")
      .eq("payment_id", booking.payment.id)
      .order("uploaded_at", { ascending: false });
    booking.proofs = (proofs ?? []) as PaymentProof[];
  }
  return booking;
}

export async function countBookingsByStatus() {
  const supabase = await createClient();
  const statuses: BookingStatus[] = ["PENDING", "CONFIRMED", "REJECTED", "CANCELLED", "EXPIRED"];
  const counts = await Promise.all(
    statuses.map(async (s) => {
      const { count } = await supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", s);
      return [s, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(counts) as Record<BookingStatus, number>;
}
