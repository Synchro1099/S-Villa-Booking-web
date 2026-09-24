import { describe, expect, it } from "vitest";
import { renderBookingEmail } from "@/lib/notifications/templates";
import type { BookingDetail, Settings } from "@/types";

const booking = {
  id: "b1",
  booking_reference: "SV-2026-00012",
  customer_id: null,
  customer_name: "Maria Santos",
  customer_email: "maria@example.com",
  customer_mobile: "09171234567",
  booking_date: "2026-09-30",
  start_time: "19:00:00",
  end_time: "20:00:00",
  guest_count: 4,
  status: "PENDING",
  status_reason: null,
  subtotal: 600,
  total_amount: 600,
  payment_method: "GCASH",
  notes: null,
  expires_at: null,
  confirmed_at: null,
  created_at: "2026-09-24T10:00:00Z",
  archived_at: null,
  items: [{ id: "i1", service_name_snapshot: "Pickleball", pricing_unit_snapshot: "HOUR", unit_price: 600, quantity: 1, subtotal: 600 }],
  payment: null,
} as unknown as BookingDetail;

const settings = { business_name: "S-Villa", booking_expiration_minutes: 30 } as unknown as Settings;
const render = (event: "PENDING" | "PROOF_SUBMITTED", audience: "OWNER" | "CUSTOMER") =>
  renderBookingEmail({ event, audience, booking, settings, link: "https://example.com/x" });

describe("owner booking emails", () => {
  it("show when the reservation is for in the subject and prominently in the body", () => {
    const mail = render("PENDING", "OWNER");
    expect(mail.subject).toBe("New booking — SV-2026-00012 · Sep 30, 2026, 7:00 PM – 8:00 PM");
    expect(mail.text).toContain("Reservation for: September 30, 2026, 7:00 PM – 8:00 PM");
    expect(mail.html.replace(/<[^>]+>/g, "")).toContain("September 30, 2026, 7:00 PM – 8:00 PM");
    expect(mail.html).toContain('<span style="white-space:nowrap">7:00 PM – 8:00 PM</span>');
    // Existing details are still there.
    expect(mail.text).toContain("Booking: #SV-2026-00012");
    expect(mail.text).toContain("Name: Maria Santos");
  });

  it("does the same for the payment-proof email", () => {
    expect(render("PROOF_SUBMITTED", "OWNER").subject).toBe("Payment proof to review — SV-2026-00012 · Sep 30, 2026, 7:00 PM – 8:00 PM");
  });

  it("leaves customer emails unchanged", () => {
    const mail = render("PENDING", "CUSTOMER");
    expect(mail.subject).toBe("Reservation received — SV-2026-00012");
    expect(mail.text).not.toContain("Reservation for:");
  });
});

describe("owner emails when a slot frees up", () => {
  const renderOwner = (event: "CANCELLED" | "EXPIRED", overrides: Partial<BookingDetail> = {}, cancelledBy?: "CUSTOMER" | "OWNER") =>
    renderBookingEmail({ event, audience: "OWNER", booking: { ...booking, ...overrides }, settings, link: "https://example.com/x", cancelledBy });

  it("says the customer cancelled", () => {
    const mail = renderOwner("CANCELLED", { status: "CANCELLED", status_reason: "Cancelled by customer." }, "CUSTOMER");
    expect(mail.subject).toBe("Booking cancelled — SV-2026-00012 · Sep 30, 2026, 7:00 PM – 8:00 PM");
    expect(mail.text).toContain("The customer cancelled this booking.");
    expect(mail.text).toContain("Slot available again: September 30, 2026, 7:00 PM – 8:00 PM");
  });

  it("says it was cancelled from the Owner Portal, with the reason", () => {
    const mail = renderOwner("CANCELLED", { status: "CANCELLED", status_reason: "Rain" }, "OWNER");
    expect(mail.text).toContain("This booking was cancelled from the Owner Portal. Reason: Rain");
  });

  it("explains an expiry", () => {
    const mail = renderOwner("EXPIRED", { status: "EXPIRED" });
    expect(mail.subject).toBe("Booking expired — SV-2026-00012 · Sep 30, 2026, 7:00 PM – 8:00 PM");
    expect(mail.text).toContain("within 30 minutes");
    expect(mail.text).toContain("Slot available again:");
  });
});
