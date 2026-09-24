import { afterEach, describe, expect, it, vi } from "vitest";
import type { Transporter } from "nodemailer";

vi.mock("server-only", () => ({}));

const { GmailEmailProvider, customerEmailBlockedReason, customersReceiveEmails } = await import("@/lib/notifications/providers");

const message = { to: "guest@example.com", subject: "Reservation received — SV-2026-00017", text: "Hello", html: "<p>Hello</p>" };
const fakeTransport = (sendMail: ReturnType<typeof vi.fn>) => ({ sendMail }) as unknown as Transporter;

describe("GmailEmailProvider", () => {
  it("sends from the Gmail address with the S-Villa name", async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: "x" });
    const result = await new GmailEmailProvider("svilla@gmail.com", "pw", "S-Villa", fakeTransport(sendMail)).send(message);
    expect(result).toEqual({ status: "SENT" });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: { name: "S-Villa", address: "svilla@gmail.com" }, to: "guest@example.com", html: "<p>Hello</p>" }),
    );
  });

  it("explains a rejected sign-in and doesn't retry it", async () => {
    const sendMail = vi.fn().mockRejectedValue(Object.assign(new Error("Invalid login: 535 5.7.8"), { code: "EAUTH", responseCode: 535 }));
    const result = await new GmailEmailProvider("svilla@gmail.com", "pw", "S-Villa", fakeTransport(sendMail)).send(message);
    expect(result.status).toBe("FAILED");
    expect(result.retryable).toBeFalsy();
    expect(result.error).toMatch(/GMAIL_APP_PASSWORD/);
  });

  it("treats dropped connections and 4xx replies as temporary, 5xx as permanent", async () => {
    const send = async (err: object) =>
      new GmailEmailProvider("a@gmail.com", "pw", "S-Villa", fakeTransport(vi.fn().mockRejectedValue(Object.assign(new Error("x"), err)))).send(message);
    expect((await send({ code: "ECONNECTION" })).retryable).toBe(true);
    expect((await send({ responseCode: 421 })).retryable).toBe(true);
    expect((await send({ responseCode: 550 })).retryable).toBe(false);
  });
});

describe("which emails reach customers", () => {
  afterEach(() => vi.unstubAllEnvs());
  const env = (vars: Record<string, string>) => {
    for (const k of ["GMAIL_USER", "GMAIL_APP_PASSWORD", "RESEND_API_KEY", "EMAIL_FROM", "EMAIL_REDIRECT_TO"]) vi.stubEnv(k, vars[k] ?? "");
  };

  it("Gmail: customers get emails, even with the Resend test sender still configured", () => {
    env({ GMAIL_USER: "society22ph@gmail.com", GMAIL_APP_PASSWORD: "abcd efgh ijkl mnop", RESEND_API_KEY: "re_x", EMAIL_FROM: "S-Villa <onboarding@resend.dev>" });
    expect(customerEmailBlockedReason()).toBeNull();
    expect(customersReceiveEmails()).toBe(true);
  });

  it("Resend test sender: customer emails are off", () => {
    env({ RESEND_API_KEY: "re_x", EMAIL_FROM: "S-Villa <onboarding@resend.dev>" });
    expect(customersReceiveEmails()).toBe(false);
  });

  it("a test redirect means customers don't get them", () => {
    env({ GMAIL_USER: "society22ph@gmail.com", GMAIL_APP_PASSWORD: "pw", EMAIL_REDIRECT_TO: "dev@gmail.com" });
    expect(customersReceiveEmails()).toBe(false);
  });

  it("nothing configured: no customer emails", () => {
    env({});
    expect(customersReceiveEmails()).toBe(false);
  });
});
