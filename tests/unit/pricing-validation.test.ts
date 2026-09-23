import { describe, expect, it } from "vitest";
import { estimateBooking, formatPeso } from "@/lib/pricing";
import { createBookingSchema, mobileSchema } from "@/lib/validation/schemas";
import { sniffProofType, validateProofFile } from "@/lib/validation/file";
import { friendlyError } from "@/lib/booking/errors";
import { effectiveStatus } from "@/lib/booking/status";
import type { Service } from "@/types";

const svc = (id: string, price: number, unit: "HOUR" | "BOOKING" = "HOUR"): Service => ({
  id,
  slug: id,
  name: id,
  description: "",
  price,
  pricing_unit: unit,
  icon: "sparkles",
  image_url: null,
  is_active: true,
  sort_order: 0,
});

describe("live price estimate", () => {
  it("uses the prices it is given (loaded from the database)", () => {
    const before = estimateBooking([svc("jacuzzi", 500)], ["jacuzzi"], 1);
    const after = estimateBooking([svc("jacuzzi", 700)], ["jacuzzi"], 1);
    expect(before.total).toBe(500);
    expect(after.total).toBe(700);
  });

  it("multiplies hourly services by duration, flat services once", () => {
    const { total, lines } = estimateBooking([svc("a", 500), svc("b", 300, "BOOKING")], ["a", "b"], 3);
    expect(lines.map((l) => l.subtotal)).toEqual([1500, 300]);
    expect(total).toBe(1800);
  });

  it("formats pesos", () => {
    expect(formatPeso(1500)).toMatch(/₱\s?1,500/);
  });
});

describe("booking input validation", () => {
  const valid = {
    date: "2026-09-28",
    startTime: "14:00",
    durationHours: 1,
    guestCount: 3,
    serviceIds: ["6f1c2d7e-8b9a-4c3d-9e0f-1a2b3c4d5e6f"],
    paymentMethod: "GCASH",
    fullName: "Juan Dela Cruz",
    email: "Juan@Example.com",
    mobile: "+63 917 123 4567",
  };

  it("accepts a valid booking and normalises contact details", () => {
    const r = createBookingSchema.parse(valid);
    expect(r.email).toBe("juan@example.com");
    expect(r.mobile).toBe("09171234567");
  });

  it("has no price, total or status fields — the server ignores any sent", () => {
    const r = createBookingSchema.parse({ ...valid, total: 1, price: 1, status: "CONFIRMED" });
    expect(r).not.toHaveProperty("total");
    expect(r).not.toHaveProperty("price");
    expect(r).not.toHaveProperty("status");
  });

  it("rejects invalid payment methods", () => {
    expect(createBookingSchema.safeParse({ ...valid, paymentMethod: "CREDIT_CARD" }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...valid, paymentMethod: "BANK_TRANSFER" }).success).toBe(true);
  });

  it("rejects bad times and empty services", () => {
    expect(createBookingSchema.safeParse({ ...valid, startTime: "14:30" }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...valid, serviceIds: [] }).success).toBe(false);
  });

  it("validates PH mobile numbers", () => {
    expect(mobileSchema.safeParse("0917-123-4567").success).toBe(true);
    expect(mobileSchema.safeParse("12345").success).toBe(false);
  });
});

describe("payment proof files", () => {
  const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);

  it("identifies allowed types by content, not name", () => {
    expect(sniffProofType(bytes(0xff, 0xd8, 0xff))?.mime).toBe("image/jpeg");
    expect(sniffProofType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.mime).toBe("image/png");
    expect(sniffProofType(bytes(0x25, 0x50, 0x44, 0x46, 0x2d))?.mime).toBe("application/pdf");
  });

  it("rejects executables and scripts", () => {
    expect(sniffProofType(bytes(0x4d, 0x5a))).toBeNull(); // Windows .exe
    expect(sniffProofType(new TextEncoder().encode("<script>alert(1)</script>"))).toBeNull();
  });

  it("rejects empty and oversized files", () => {
    expect(validateProofFile(new File([], "a.png")).ok).toBe(false);
    expect(validateProofFile(new File([new Uint8Array(6 * 1024 * 1024)], "big.png")).ok).toBe(false);
    expect(validateProofFile(new File([new Uint8Array(10)], "ok.png")).ok).toBe(true);
  });
});

describe("customer-facing errors", () => {
  it("maps slot conflicts to a friendly message", () => {
    expect(friendlyError({ message: "SV_SLOT_TAKEN" })).toBe(
      "This schedule was just booked by another customer. Please choose another available time.",
    );
  });

  it("never leaks technical errors", () => {
    const original = console.error;
    console.error = () => {};
    expect(friendlyError({ message: 'relation "bookings" does not exist' })).not.toMatch(/relation|bookings/);
    console.error = original;
  });
});

describe("effective status", () => {
  it("shows lapsed pending holds as expired", () => {
    const now = Date.parse("2026-09-23T10:00:00Z");
    expect(effectiveStatus({ status: "PENDING", expires_at: "2026-09-23T09:59:00Z" }, now)).toBe("EXPIRED");
    expect(effectiveStatus({ status: "PENDING", expires_at: null }, now)).toBe("PENDING");
  });
});
