import { getAllServices } from "@/lib/data/owner";
import { PageHeader } from "@/components/owner/page-header";
import { ServiceList } from "@/components/owner/service-editor";

export const metadata = { title: "Services & Pricing" };

export default async function OwnerServicesPage() {
  const services = await getAllServices();
  return (
    <>
      <PageHeader
        title="Services & Pricing"
        intro="Prices you save here appear on the website and booking page immediately and are used for all new bookings. Existing bookings keep the price they were booked at."
      />
      <ServiceList services={services} />
    </>
  );
}
