export const BOOKING_STATUSES = ["PENDING", "CONFIRMED", "REJECTED", "CANCELLED", "EXPIRED"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAYMENT_STATUSES = ["UNPAID", "PROOF_SUBMITTED", "VERIFIED", "REJECTED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["GCASH", "BANK_TRANSFER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type PricingUnit = "HOUR" | "BOOKING";
export type Role = "CUSTOMER" | "OWNER";

export interface Settings {
  business_name: string;
  business_description: string;
  address: string;
  contact_number: string;
  contact_email: string;
  facebook_url: string;
  messenger_url: string;
  gcash_name: string;
  gcash_number: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  booking_expiration_minutes: number;
  max_guests: number;
  max_booking_hours: number;
  booking_window_days: number;
  min_lead_minutes: number;
  timezone: string;
}

export interface Service {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Current live price (from the database). */
  price: number;
  pricing_unit: PricingUnit;
  icon: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface OperatingHours {
  weekday: number; // 0 = Sunday
  is_open: boolean;
  open_time: string; // "HH:MM:SS"
  close_time: string;
}

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  email: string;
  mobile_number: string;
}

export interface BookingItem {
  id: string;
  service_name_snapshot: string;
  pricing_unit_snapshot: PricingUnit;
  /** Price at the time of booking — never the current price. */
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface Payment {
  id: string;
  payment_method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  reference_number: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
}

export interface PaymentProof {
  id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  uploaded_at: string;
}

export interface Booking {
  id: string;
  booking_reference: string;
  customer_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_mobile: string;
  booking_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string;
  guest_count: number;
  status: BookingStatus;
  status_reason: string | null;
  subtotal: number;
  total_amount: number;
  payment_method: PaymentMethod;
  notes: string | null;
  expires_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  /** Hidden from the owner's default lists; never deleted. */
  archived_at: string | null;
}

export interface BookingDetail extends Booking {
  items: BookingItem[];
  payment: Payment | null;
  proofs?: PaymentProof[];
}

/** Occupied range from the public availability feed (no private data). */
export interface AvailabilityEntry {
  kind: "BOOKED" | "PENDING" | "BLOCKED" | "CLOSED_DATE";
  date: string;
  start_time: string | null;
  end_time: string | null;
}

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };
