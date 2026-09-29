import { isPlaceholderUrl } from "@/lib/contact";

/**
 * The owner-editable house rules (Owner Portal → Settings → House rules).
 *
 * One rule per line. `**Bold lead-in.**` marks the start of a rule, and these
 * tags are filled in from Settings:
 *   {directions}  → "Open in Google Maps" (the directions link)
 *   {messenger}   → "Messenger" (the Messenger link)
 *   {caretaker}   → the caretaker's name and numbers, on confirmed bookings only
 *   {max_guests}  → the "Maximum guests" booking rule
 * A line whose tag has nothing to show (no directions link yet, no caretaker
 * details yet) is left out rather than shown half-empty.
 */

export const HOUSE_RULE_TAGS = [
  { tag: "{directions}", help: "“Open in Google Maps” link" },
  { tag: "{messenger}", help: "your Messenger link" },
  { tag: "{caretaker}", help: "caretaker’s name and numbers (confirmed bookings only)" },
  { tag: "{max_guests}", help: "maximum guests per booking" },
] as const;

export interface Caretaker {
  name: string;
  mobile: string;
  /** Empty means the same number as `mobile`. */
  viber: string;
}

export interface HouseRulesContext {
  directionsUrl: string;
  messengerUrl: string;
  maxGuests: number;
  /**
   * The caretaker's details, shown only once a booking is confirmed. `null`
   * (before confirmation) shows a note that they arrive with the confirmation.
   */
  caretaker: Caretaker | null;
}

export type RuleSegment =
  | { kind: "text"; text: string; bold?: boolean }
  | { kind: "link"; text: string; href: string }
  | { kind: "tel"; text: string; number: string };

export type RuleLine = RuleSegment[];

/** Shown in place of {caretaker} before the booking is confirmed. */
export const CARETAKER_LATER = "You’ll get their name and number once your booking is confirmed.";

const telNumber = (v: string) => v.replace(/[^\d+]/g, "");

function caretakerSegments(c: Caretaker | null): RuleSegment[] | null {
  if (!c) return [{ kind: "text", text: CARETAKER_LATER }];
  const name = c.name.trim();
  const mobile = c.mobile.trim();
  const viber = c.viber.trim();
  const sameNumber = !viber || telNumber(viber) === telNumber(mobile);
  const numbers: RuleSegment[] = [];
  if (mobile) {
    numbers.push({ kind: "tel", text: mobile, number: telNumber(mobile) }, { kind: "text", text: sameNumber ? " (mobile and Viber)" : " (mobile)" });
  }
  if (viber && !sameNumber) {
    if (numbers.length) numbers.push({ kind: "text", text: ", " });
    numbers.push({ kind: "tel", text: viber, number: telNumber(viber) }, { kind: "text", text: " (Viber)" });
  }
  if (!numbers.length) return null;
  return [...(name ? [{ kind: "text", text: `${name}: ` } as RuleSegment] : []), ...numbers, { kind: "text", text: "." }];
}

const TAG = /(\{(?:directions|messenger|caretaker|max_guests)\})/i;

/** Parse the house-rules text into lines ready to render on the web or in email. */
export function renderHouseRules(source: string, ctx: HouseRulesContext): RuleLine[] {
  const lines: RuleLine[] = [];
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    // Bold runs first, so a tag inside **…** (e.g. "**Up to {max_guests} guests.**") comes out bold too.
    // An unmatched ** is kept as typed.
    const runs = line.split("**");
    const balanced = runs.length % 2 === 1;
    const out: RuleSegment[] = [];
    let skip = false;
    runs.forEach((run, i) => {
      const bold = balanced && i % 2 === 1;
      const text = (t: string): RuleSegment => (bold ? { kind: "text", text: t, bold } : { kind: "text", text: t });
      if (!balanced && i > 0) out.push(text("**"));
      // Tags are matched case-insensitively; anything else in braces stays as typed.
      for (const piece of run.split(TAG)) {
        if (!piece) continue;
        const tag = piece.toLowerCase();
        if (tag === "{directions}") {
          if (isPlaceholderUrl(ctx.directionsUrl)) skip = true;
          else out.push({ kind: "link", text: "Open in Google Maps", href: ctx.directionsUrl.trim() });
        } else if (tag === "{messenger}") {
          out.push(isPlaceholderUrl(ctx.messengerUrl) ? text("Messenger") : { kind: "link", text: "Messenger", href: ctx.messengerUrl.trim() });
        } else if (tag === "{caretaker}") {
          const segs = caretakerSegments(ctx.caretaker);
          if (segs) out.push(...segs);
          else skip = true;
        } else if (tag === "{max_guests}") {
          out.push(text(String(ctx.maxGuests)));
        } else {
          out.push(text(piece));
        }
      }
    });
    if (!skip && out.length) lines.push(out);
  }
  return lines;
}

/** Plain-text version, one rule per line starting with "• ". */
export function houseRulesText(lines: RuleLine[]): string {
  return lines
    .map(
      (line) =>
        "• " +
        line
          .map((s) => (s.kind === "link" ? `${s.text}: ${s.href}` : s.text))
          .join(""),
    )
    .join("\n");
}
