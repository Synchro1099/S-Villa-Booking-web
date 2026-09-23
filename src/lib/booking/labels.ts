import type { BookingStatus, PaymentMethod, PaymentStatus } from "@/types";

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: "Awaiting payment",
  PROOF_SUBMITTED: "Proof submitted",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  GCASH: "GCash",
  BANK_TRANSFER: "Bank Transfer",
};

export const REJECTION_REASONS = [
  "Payment not received",
  "Payment amount does not match",
  "Payment proof is unclear or invalid",
  "Schedule no longer available",
  "Guest count exceeds our limit",
];
