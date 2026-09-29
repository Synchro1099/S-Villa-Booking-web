import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Caretaker } from "@/lib/house-rules";

const EMPTY: Caretaker = { name: "", mobile: "", viber: "" };

/**
 * The on-site caretaker's contact details. Not part of the public settings:
 * the table is owner-only in the database, and the server reads it here for
 * the owner's Settings page, confirmed booking pages and the "Confirmed" email.
 * Callers are responsible for only showing it in those places.
 */
export const getCaretaker = cache(async (): Promise<Caretaker> => {
  const { data, error } = await createAdminClient().from("caretaker_contact").select("name, mobile, viber").eq("id", 1).maybeSingle();
  if (error) console.error("[s-villa] caretaker contact:", error.message);
  return (data as Caretaker | null) ?? EMPTY;
});
