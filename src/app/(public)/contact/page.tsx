import type { Metadata } from "next";
import { getOperatingHours, getSettings } from "@/lib/data/public";
import { Contact } from "@/components/sections/contact";

export const metadata: Metadata = {
  title: "Contact",
  description: "Message S-Villa on Messenger, call or send an SMS.",
};

export default async function ContactPage() {
  const [settings, hours] = await Promise.all([getSettings(), getOperatingHours()]);
  return <Contact settings={settings} hours={hours} headingAs="h1" />;
}
