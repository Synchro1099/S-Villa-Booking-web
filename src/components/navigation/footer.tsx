import Link from "next/link";
import { getOperatingHours, getSettings } from "@/lib/data/public";
import { ContactActions } from "@/components/contact/contact-actions";
import { HoursList } from "@/components/sections/hours-list";
import { Logo } from "./logo";

export async function Footer() {
  const [settings, hours] = await Promise.all([getSettings(), getOperatingHours()]);
  return (
    <footer className="mt-auto bg-ink text-ivory">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex flex-col gap-6">
          <Logo tone="light" />
          <p className="max-w-sm text-sm leading-relaxed text-ivory/70">{settings.business_description}</p>
          <ContactActions settings={settings} tone="dark" />
        </div>
        <div>
          <h2 className="eyebrow !text-brass">Opening hours</h2>
          <HoursList hours={hours} className="mt-4 text-ivory/80" />
        </div>
        <div>
          <h2 className="eyebrow !text-brass">Explore</h2>
          <ul className="mt-4 flex flex-col gap-2.5 text-sm text-ivory/80">
            {[
              ["/book", "Book a reservation"],
              ["/availability", "Check availability"],
              ["/pricing", "Pricing"],
              ["/bookings/lookup", "Find my booking"],
              ["/contact", "Contact"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="hover:text-brass">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-ivory/10">
        <p className="container-page py-6 text-xs text-ivory/50">
          © {new Date().getFullYear()} {settings.business_name}. {settings.address}
        </p>
      </div>
    </footer>
  );
}
