import "server-only";

/**
 * Delivery providers. Each channel has a small interface so another provider
 * can be swapped in by changing only this file.
 *
 *   EMAIL  → Resend (RESEND_API_KEY) — otherwise logged to the server console.
 *            EMAIL_REDIRECT_TO sends everything to one test inbox.
 *   SMS    → Semaphore, a Philippine SMS gateway (SEMAPHORE_API_KEY) — otherwise disabled.
 *   IN_APP → the booking status page and dashboards read status straight from
 *            the database, so no extra delivery is needed.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface DeliveryResult {
  status: "SENT" | "SKIPPED" | "FAILED";
  error?: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<DeliveryResult>;
}

export interface SmsProvider {
  readonly enabled: boolean;
  send(to: string, text: string): Promise<DeliveryResult>;
}

class ResendEmailProvider implements EmailProvider {
  constructor(
    private apiKey: string,
    private from: string,
  ) {}

  async send(message: EmailMessage): Promise<DeliveryResult> {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: this.from, to: [message.to], subject: message.subject, html: message.html, text: message.text }),
      });
      if (!res.ok) return { status: "FAILED", error: `Resend ${res.status}: ${(await res.text()).slice(0, 300)}` };
      return { status: "SENT" };
    } catch (e) {
      return { status: "FAILED", error: (e as Error).message };
    }
  }
}

class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<DeliveryResult> {
    console.info(`[s-villa] (email not configured) → ${message.to}: ${message.subject}\n${message.text}`);
    return { status: "SKIPPED", error: "RESEND_API_KEY not set" };
  }
}

/**
 * Sends every email to one test inbox instead of the real recipient. Needed
 * while using Resend's sandbox sender (onboarding@resend.dev), which only
 * delivers to the Resend account's own address.
 */
export class RedirectEmailProvider implements EmailProvider {
  constructor(
    private inner: EmailProvider,
    private redirectTo: string,
  ) {}

  send(message: EmailMessage): Promise<DeliveryResult> {
    const note = `Test mode: this email was meant for ${message.to}.`;
    return this.inner.send({
      to: this.redirectTo,
      subject: `[Test → ${message.to}] ${message.subject}`,
      text: `${note}\n\n${message.text}`,
      html: `<p style="margin:0 0 16px;padding:8px 12px;background:#fff4d6;border-radius:6px;font:13px sans-serif;color:#6b4e00">${escapeHtml(note)}</p>${message.html}`,
    });
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

class SemaphoreSmsProvider implements SmsProvider {
  readonly enabled = true;
  constructor(
    private apiKey: string,
    private senderName?: string,
  ) {}

  async send(to: string, text: string): Promise<DeliveryResult> {
    try {
      const body = new URLSearchParams({ apikey: this.apiKey, number: to, message: text.slice(0, 450) });
      if (this.senderName) body.set("sendername", this.senderName);
      const res = await fetch("https://api.semaphore.co/api/v4/messages", { method: "POST", body });
      if (!res.ok) return { status: "FAILED", error: `Semaphore ${res.status}: ${(await res.text()).slice(0, 300)}` };
      return { status: "SENT" };
    } catch (e) {
      return { status: "FAILED", error: (e as Error).message };
    }
  }
}

class DisabledSmsProvider implements SmsProvider {
  readonly enabled = false;
  async send(): Promise<DeliveryResult> {
    return { status: "SKIPPED", error: "SMS provider not configured" };
  }
}

export function getEmailProvider(): EmailProvider {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "S-Villa <onboarding@resend.dev>";
  const provider = key ? new ResendEmailProvider(key, from) : new ConsoleEmailProvider();
  const redirectTo = process.env.EMAIL_REDIRECT_TO?.trim();
  return redirectTo ? new RedirectEmailProvider(provider, redirectTo) : provider;
}

export function getSmsProvider(): SmsProvider {
  const key = process.env.SEMAPHORE_API_KEY;
  return key ? new SemaphoreSmsProvider(key, process.env.SEMAPHORE_SENDER_NAME) : new DisabledSmsProvider();
}
