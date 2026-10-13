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
  return unit === "HOUR" ? "hour" : unit === "ITEM" ? "item" : "booking";
}

/** Most of one per-item extra a guest can add to a booking (matches create_booking). */
export const MAX_ITEM_QUANTITY = 50;

/** " × 3h" / " × 2" after a price, or "" for a flat price. */
export function quantitySuffix(unit: PricingUnit, quantity: number): string {
  if (unit === "HOUR") return ` × ${quantity}h`;
  if (unit === "ITEM") return ` × ${quantity}`;
  return "";
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
export function estimateBooking(services: Service[], selectedIds: string[], hours: number, quantities: Record<string, number> = {}) {
  const lines: EstimateLine[] = services
    .filter((s) => selectedIds.includes(s.id))
    .map((s) => {
      const quantity = s.pricing_unit === "HOUR" ? hours : s.pricing_unit === "ITEM" ? (quantities[s.id] ?? 1) : 1;
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
