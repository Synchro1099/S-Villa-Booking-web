import { describe, expect, it, vi } from "vitest";
import { MAX_EXPIRY_EMAIL_ATTEMPTS, planExpiryEmails, type LoggedEmail } from "@/lib/notifications/expiry-plan";

vi.mock("server-only", () => ({}));

const { RetryOnceEmailProvider } = await import("@/lib/notifications/providers");

const message = { to: "guest@example.com", subject: "s", text: "t", html: "" };

describe("RetryOnceEmailProvider", () => {
  it("retries a temporary failure once and returns the retry's result", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ status: "FAILED", error: "fetch failed", retryable: true })
      .mockResolvedValueOnce({ status: "SENT" });
    expect(await new RetryOnceEmailProvider({ send }, 0).send(message)).toEqual({ status: "SENT" });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("does not retry a permanent failure (e.g. invalid from)", async () => {
    const send = vi.fn().mockResolvedValue({ status: "FAILED", error: "Resend 422", retryable: false });
    expect((await new RetryOnceEmailProvider({ send }, 0).send(message)).status).toBe("FAILED");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("reports both errors when the retry also fails, and stops there", async () => {
    const send = vi.fn().mockResolvedValue({ status: "FAILED", error: "Resend 503", retryable: true });
    const result = await new RetryOnceEmailProvider({ send }, 0).send(message);
    expect(send).toHaveBeenCalledTimes(2);
    expect(result.error).toBe("Failed twice. First: Resend 503 · Retry: Resend 503");
  });
});

describe("planExpiryEmails", () => {
  const row = (booking_id: string, audience: "CUSTOMER" | "OWNER", status: LoggedEmail["status"]): LoggedEmail => ({ booking_id, audience, status });

  it("emails everyone for a booking that was never emailed", () => {
    expect(planExpiryEmails(["a"], [])).toEqual([{ bookingId: "a", audiences: "ALL" }]);
  });

  it("skips bookings already emailed", () => {
    expect(planExpiryEmails(["a"], [row("a", "CUSTOMER", "SENT"), row("a", "OWNER", "SENT")])).toEqual([]);
  });

  it("resends only to the audience whose attempts all failed", () => {
    expect(planExpiryEmails(["a"], [row("a", "CUSTOMER", "FAILED"), row("a", "OWNER", "SENT")])).toEqual([
      { bookingId: "a", audiences: ["CUSTOMER"] },
    ]);
  });

  it("stops after the maximum number of failed attempts", () => {
    const failures = Array.from({ length: MAX_EXPIRY_EMAIL_ATTEMPTS }, () => row("a", "CUSTOMER", "FAILED"));
    expect(planExpiryEmails(["a"], failures)).toEqual([]);
  });

  it("does not send a late owner email for bookings emailed before owners were notified", () => {
    expect(planExpiryEmails(["a"], [row("a", "CUSTOMER", "SENT")])).toEqual([]);
  });
});
