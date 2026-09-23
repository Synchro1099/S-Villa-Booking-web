import type { Metadata } from "next";
import { getActiveServices, getSettings } from "@/lib/data/public";
import { Pricing } from "@/components/sections/pricing";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Current S-Villa rates per facility. Pay by GCash or bank transfer.",
};

export default async function PricingPage() {
  const [services, settings] = await Promise.all([getActiveServices(), getSettings()]);
  return <Pricing services={services} settings={settings} headingAs="h1" />;
}
