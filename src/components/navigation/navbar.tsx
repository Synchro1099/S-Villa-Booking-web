import { getViewer } from "@/lib/auth";
import { SiteHeader } from "./site-header";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/experience", label: "Experience" },
  { href: "/facilities", label: "Facilities" },
  { href: "/pricing", label: "Pricing" },
  { href: "/availability", label: "Availability" },
  { href: "/contact", label: "Contact" },
];

/** Server wrapper: decides the account link from the signed-in role. */
export async function Navbar() {
  const viewer = await getViewer();
  const account = viewer
    ? viewer.isOwner
      ? { href: "/owner", label: "Owner Portal" }
      : { href: "/my-bookings", label: "My Bookings" }
    : { href: "/login", label: "Sign in" };

  return <SiteHeader links={NAV_LINKS} account={account} />;
}
