import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AvailabilityEntry, OperatingHours, Service, Settings } from "@/types";

/**
 * Public reads. Every page that shows prices, hours or contact details goes
 * through these — the database is the only source of those values.
 */

const SETTINGS_COLUMNS =
  "business_name, business_description, address, contact_number, contact_email, facebook_url, messenger_url, gcash_name, gcash_number, bank_name, bank_account_name, bank_account_number, booking_expiration_minutes, max_guests, max_booking_hours, booking_window_days, min_lead_minutes, timezone";

const FALLBACK_SETTINGS: Settings = {
  business_name: "S-Villa Private Pickleball & Courtyard",
  business_description: "",
  address: "",
  contact_number: "",
  contact_email: "",
  facebook_url: "",
  messenger_url: "",
  gcash_name: "",
  gcash_number: "",
  bank_name: "",
  bank_account_name: "",
  bank_account_number: "",
  booking_expiration_minutes: 30,
  max_guests: 6,
  max_booking_hours: 4,
  booking_window_days: 60,
  min_lead_minutes: 60,
  timezone: "Asia/Manila",
};

export const getSettings = cache(async (): Promise<Settings> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("settings").select(SETTINGS_COLUMNS).eq("id", 1).maybeSingle();
  if (error) console.error("[s-villa] settings:", error.message);
  return (data as Settings | null) ?? FALLBACK_SETTINGS;
});

export function toService(row: Record<string, unknown>): Service {
  return { ...(row as unknown as Service), price: Number(row.price) };
}

export const SERVICE_COLUMNS = "id, slug, name, description, price, pricing_unit, icon, image_url, is_active, sort_order";

/** Active services with their current live price. */
export const getActiveServices = cache(async (): Promise<Service[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select(SERVICE_COLUMNS)
    .eq("is_active", true)
    .order("sort_order")
    .order("name");
  if (error) console.error("[s-villa] services:", error.message);
  return (data ?? []).map(toService);
});

export const getOperatingHours = cache(async (): Promise<OperatingHours[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("operating_hours").select("*").order("weekday");
  if (error) console.error("[s-villa] operating hours:", error.message);
  return (data ?? []) as OperatingHours[];
});

export async function getAvailabilityEntries(from: string, to: string): Promise<AvailabilityEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_availability", { p_from: from, p_to: to });
  if (error) {
    console.error("[s-villa] availability:", error.message);
    throw new Error("Availability is temporarily unavailable.");
  }
  return (data ?? []) as AvailabilityEntry[];
}
