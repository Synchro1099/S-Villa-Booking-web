import "server-only";
import { createClient } from "@/lib/supabase/server";
import { SERVICE_COLUMNS, toService } from "@/lib/data/public";
import type { Service } from "@/types";

/** Owner Portal reads (session client — RLS limits these to the owner). */

export interface BlockedDate {
  id: string;
  date: string;
  reason: string;
}

export interface BlockedTime {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
}

export async function getAllServices(): Promise<Service[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("services").select(SERVICE_COLUMNS).order("sort_order").order("name");
  return (data ?? []).map(toService);
}

export async function getBlockedDates(from: string, to?: string): Promise<BlockedDate[]> {
  const supabase = await createClient();
  let q = supabase.from("blocked_dates").select("id, date, reason").gte("date", from);
  if (to) q = q.lte("date", to);
  const { data } = await q.order("date");
  return (data ?? []) as BlockedDate[];
}

export async function getBlockedTimes(from: string, to?: string): Promise<BlockedTime[]> {
  const supabase = await createClient();
  let q = supabase.from("blocked_times").select("id, date, start_time, end_time, reason").gte("date", from);
  if (to) q = q.lte("date", to);
  const { data } = await q.order("date").order("start_time");
  return (data ?? []) as BlockedTime[];
}
