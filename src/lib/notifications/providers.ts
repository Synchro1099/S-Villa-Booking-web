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

/**
 * Reads an env var, forgiving what hosting dashboards often keep from a pasted
 * .env line: surrounding whitespace/newlines and wrapping quotes.
 */
export function envValue(name: string): string | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;
  const unquoted = /^(["'])([\s\S]*)\1$/.exec(raw)?.[2].trim() ?? raw;
  return unquoted || undefined;
}

/** "name@domain" or "Display Name <name@domain>", as Resend requires. */
const FROM_FORMAT = /^(?:[^<>@\r\n]*<[^<>@\s]+@[^<>@\s]+>|[^<>@\s]+@[^<>@\s]+)$/;
let warnedFrom = false;

export function getEmailProvider(): EmailProvider {
  const key = envValue("RESEND_API_KEY");
  const from = envValue("EMAIL_FROM") || "S-Villa <onboarding@resend.dev>";
  if (!warnedFrom && !FROM_FORMAT.test(from)) {
    warnedFrom = true;
    console.error(
      `[s-villa] EMAIL_FROM looks malformed ("${from.slice(0, 60)}"). Use e.g. S-Villa <onboarding@resend.dev> — ` +
        "only the value, without EMAIL_FROM= in front.",
    );
  }
  const provider = key ? new ResendEmailProvider(key, from) : new ConsoleEmailProvider();
  const redirectTo = envValue("EMAIL_REDIRECT_TO");
  return redirectTo ? new RedirectEmailProvider(provider, redirectTo) : provider;
}

export function getSmsProvider(): SmsProvider {
  const key = process.env.SEMAPHORE_API_KEY;
  return key ? new SemaphoreSmsProvider(key, process.env.SEMAPHORE_SENDER_NAME) : new DisabledSmsProvider();
}
