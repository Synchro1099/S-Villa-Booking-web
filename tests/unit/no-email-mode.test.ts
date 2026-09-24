import { afterEach, describe, expect, it, vi } from "vitest";
import { isPlaceholderEmail, isPlaceholderPhone, isPlaceholderUrl, placeholderContactFields } from "@/lib/contact";
import { lookupSchema } from "@/lib/validation/schemas";

vi.mock("server-only", () => ({}));

const { customerEmailBlockedReason } = await import("@/lib/notifications/providers");

describe("placeholder contact details", () => {
  it("recognises the seeded sample values", () => {
    expect(placeholderContactFields({
      contact_number: "09XXXXXXXXX",
      contact_email: "hello@example.com",
      messenger_url: "https://m.me/",
      facebook_url: "https://facebook.com/",
    })).toEqual(["Messenger link", "Contact number", "Contact email", "Facebook page"]);
  });

  it("accepts real details", () => {
    expect(isPlaceholderUrl("https://m.me/svillapickleball")).toBe(false);
    expect(isPlaceholderUrl("https://www.facebook.com/svilla/")).toBe(false);
    expect(isPlaceholderPhone("0905 252 7340")).toBe(false);
    expect(isPlaceholderEmail("renzyanes@gmail.com")).toBe(false);
  });
});

describe("booking lookup reference", () => {
  it('accepts a reference copied with "#" and in lowercase', () => {
    const parsed = lookupSchema.parse({ reference: " #sv-2026-00016 ", contact: "0917 123 4567" });
    expect(parsed.reference).toBe("SV-2026-00016");
  });

  it("still rejects other formats", () => {
    expect(lookupSchema.safeParse({ reference: "SV-16", contact: "x@y.com" }).success).toBe(false);
  });
});

describe("customer emails with Resend's test sender", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("are skipped when sending from onboarding@resend.dev without a redirect", () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "S-Villa <onboarding@resend.dev>");
    vi.stubEnv("EMAIL_REDIRECT_TO", "");
    expect(customerEmailBlockedReason()).toMatch(/Customer emails are off/);
  });

  it("are sent when redirected to a test inbox", () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "S-Villa <onboarding@resend.dev>");
    vi.stubEnv("EMAIL_REDIRECT_TO", "owner@gmail.com");
    expect(customerEmailBlockedReason()).toBeNull();
  });

  it("are sent from a verified domain", () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "S-Villa <bookings@svilla.ph>");
    vi.stubEnv("EMAIL_REDIRECT_TO", "");
    expect(customerEmailBlockedReason()).toBeNull();
  });
});
