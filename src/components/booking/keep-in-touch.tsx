import Link from "next/link";
import type { BookingStatus, Settings } from "@/types";
import { ContactActions } from "@/components/contact/contact-actions";
import { hasContactOptions } from "@/lib/contact";
import { CopyLinkButton } from "./copy-link-button";

/**
 * Near the top of the customer's booking page. Unless customer emails are set
 * up (Gmail), this page and the reference are how customers follow their
 * booking — say which applies, make saving it easy, and put the contact
 * buttons right here rather than only at the bottom of the page.
 */
export function KeepInTouch({
  reference,
  privatePath,
  status,
  awaitingReview,
  settings,
  emailedTo,
}: {
  reference: string;
  privatePath: string;
  status: BookingStatus;
  awaitingReview: boolean;
  settings: Settings;
  /** The customer's address when booking emails reach customers; otherwise null. */
  emailedTo: string | null;
}) {
  const active = status === "PENDING" || status === "CONFIRMED";
  // No real contact details saved yet: skip the "message us" prompt rather than show it with no buttons.
  const canContact = hasContactOptions(settings);

  if (!active) {
    if (!canContact) return null;
    return (
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
        <p className="text-sm text-muted">Questions about this booking? Mention {reference}.</p>
        <ContactActions settings={settings} />
      </div>
    );
  }

  return (
    <section aria-labelledby="keep-title" className="mt-6 rounded-[var(--radius-card)] border border-line/70 bg-cream p-5 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="keep-title" className="text-xs font-bold uppercase tracking-wider text-muted">
            Your booking reference
          </h2>
          <p className="mt-1 select-all font-display text-3xl tabular-nums sm:text-4xl">{reference}</p>
        </div>
        <CopyLinkButton path={privatePath} />
      </div>
      <p className="mt-4 text-sm leading-relaxed">
        {emailedTo ? (
          <>
            We&apos;ll email updates to <strong className="break-all">{emailedTo}</strong>. Please also keep this reference or save this page, in case an
            email goes to spam. You can check your status anytime at{" "}
          </>
        ) : (
          <>
            <strong>We don&apos;t send confirmation emails</strong>, so please keep this reference or save this page (bookmark it, or copy the link to
            your notes). You can check your status anytime at{" "}
          </>
        )}
        <Link href="/bookings/lookup" className="font-semibold underline underline-offset-2">
          Find my booking
        </Link>{" "}
        with your reference and the email or mobile number you booked with.
      </p>
      {canContact ? (
        <div className="mt-5 border-t border-line/70 pt-4">
          <p className="text-sm text-muted">
            {status === "CONFIRMED"
              ? "Questions before your visit? Message us and mention your reference."
              : awaitingReview
                ? "If you haven't heard from us within a few hours, message us and mention your reference."
                : "Questions about paying? Message us and mention your reference."}
          </p>
          <ContactActions settings={settings} className="mt-3" />
        </div>
      ) : null}
    </section>
  );
}
