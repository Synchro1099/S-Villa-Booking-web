import type { PricingUnit, Service } from "@/types";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatPeso(amount: number | string): string {
  return peso.format(Number(amount));
}

export function unitLabel(unit: PricingUnit): string {
  return unit === "HOUR" ? "hour" : "booking";
}

export interface EstimateLine {
  serviceId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  unit: PricingUnit;
}

/**
 * Live estimate for the booking summary, using the current prices loaded from
 * the database. Display only — the server recalculates the real total in
 * create_booking() and ignores anything the browser says about price.
 */
export function estimateBooking(services: Service[], selectedIds: string[], hours: number) {
  const lines: EstimateLine[] = services
    .filter((s) => selectedIds.includes(s.id))
    .map((s) => {
      const quantity = s.pricing_unit === "HOUR" ? hours : 1;
      return {
        serviceId: s.id,
        name: s.name,
        unitPrice: s.price,
        quantity,
        subtotal: Math.round(s.price * quantity * 100) / 100,
        unit: s.pricing_unit,
      };
    });
  const total = lines.reduce((sum, l) => sum + l.subtotal, 0);
  return { lines, total };
}
