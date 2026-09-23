import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { MobileMenu } from "./mobile-menu";
import { Logo } from "./logo";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/experience", label: "Experience" },
  { href: "/facilities", label: "Facilities" },
  { href: "/pricing", label: "Pricing" },
  { href: "/availability", label: "Availability" },
  { href: "/contact", label: "Contact" },
];

export async function Navbar() {
  const viewer = await getViewer();
  const account = viewer
    ? viewer.isOwner
      ? { href: "/owner", label: "Owner Portal" }
      : { href: "/my-bookings", label: "My Bookings" }
    : { href: "/login", label: "Sign in" };

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-ivory/85 backdrop-blur-md">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-ivory"
      >
        Skip to content
      </a>
      <nav className="container-page relative flex h-16 items-center justify-between gap-6 md:h-20" aria-label="Main">
        <Logo />
        <ul className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="text-sm font-medium text-ink/80 transition-colors hover:text-ink">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href={account.href}>{account.label}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/book">Book Now</Link>
          </Button>
        </div>
        <MobileMenu links={NAV_LINKS} account={account} />
      </nav>
    </header>
  );
}
