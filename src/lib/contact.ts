import type { Settings } from "@/types";

/**
 * The setup script seeds placeholder contact details (09XXXXXXXXX,
 * hello@example.com, https://m.me/, https://facebook.com/). These helpers
 * spot them so the site never shows a dead link, and the Owner Portal can
 * ask for the real ones.
 */
type ContactFields = Pick<Settings, "contact_number" | "contact_email" | "messenger_url" | "facebook_url">;

export const isPlaceholderPhone = (v: string) => !v.trim() || /x/i.test(v) || v.replace(/\D/g, "").length < 7;
export const isPlaceholderEmail = (v: string) => !v.trim() || /@example\.(com|org|net)$/i.test(v.trim());
/** A bare site root such as https://m.me/ or https://facebook.com/ (no page name). */
export const isPlaceholderUrl = (v: string) => {
  try {
    return new URL(v.trim()).pathname.replace(/\/+$/, "") === "";
  } catch {
    return true;
  }
};

/** Whether the site can show at least one real way to reach S-Villa. */
export const hasContactOptions = (s: ContactFields) =>
  !isPlaceholderUrl(s.messenger_url) || !isPlaceholderPhone(s.contact_number) || !isPlaceholderEmail(s.contact_email);

/** Labels of contact details that still hold placeholders. */
export function placeholderContactFields(s: ContactFields): string[] {
  return [
    isPlaceholderUrl(s.messenger_url) && "Messenger link",
    isPlaceholderPhone(s.contact_number) && "Contact number",
    isPlaceholderEmail(s.contact_email) && "Contact email",
    isPlaceholderUrl(s.facebook_url) && "Facebook page",
  ].filter(Boolean) as string[];
}
