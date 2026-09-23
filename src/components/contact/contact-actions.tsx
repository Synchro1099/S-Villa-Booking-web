import { MessageCircle, Phone, MessageSquareText, Mail } from "lucide-react";
import type { Settings } from "@/types";
import { cn } from "@/lib/utils";

/** Messenger / Call / SMS / Email buttons from the owner's contact settings. */
export function ContactActions({ settings, className, tone = "light" }: { settings: Settings; className?: string; tone?: "light" | "dark" }) {
  const tel = settings.contact_number.replace(/[^\d+]/g, "");
  const actions = [
    settings.messenger_url && { href: settings.messenger_url, label: "Message us on Messenger", short: "Messenger", icon: MessageCircle, external: true },
    tel && { href: `tel:${tel}`, label: `Call ${settings.contact_number}`, short: "Call", icon: Phone },
    tel && { href: `sms:${tel}`, label: `Send an SMS to ${settings.contact_number}`, short: "SMS", icon: MessageSquareText },
    settings.contact_email && { href: `mailto:${settings.contact_email}`, label: `Email ${settings.contact_email}`, short: "Email", icon: Mail },
  ].filter(Boolean) as { href: string; label: string; short: string; icon: typeof Phone; external?: boolean }[];

  if (actions.length === 0) return null;

  return (
    <ul className={cn("flex flex-wrap gap-3", className)}>
      {actions.map((a) => (
        <li key={a.short}>
          <a
            href={a.href}
            aria-label={a.label}
            {...(a.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-colors",
              tone === "light" ? "border-line bg-cream hover:border-ink" : "border-ivory/25 text-ivory hover:bg-ivory/10",
            )}
          >
            <a.icon className="size-4" aria-hidden />
            {a.short}
          </a>
        </li>
      ))}
    </ul>
  );
}
