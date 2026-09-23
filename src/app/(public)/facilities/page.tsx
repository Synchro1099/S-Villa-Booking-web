import type { Metadata } from "next";
import { getActiveServices } from "@/lib/data/public";
import { Facilities } from "@/components/sections/facilities";

export const metadata: Metadata = {
  title: "Facilities",
  description: "Pickleball, badminton, music room, jacuzzi, bar & lounge and the villa courtyard — current rates included.",
};

export default async function FacilitiesPage() {
  const services = await getActiveServices();
  return <Facilities services={services} headingAs="h1" />;
}
