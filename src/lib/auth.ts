import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

export interface Viewer {
  userId: string;
  email: string;
  profile: Profile | null;
  isOwner: boolean;
}

/** The signed-in user (verified with Supabase Auth), or null. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email, mobile_number")
    .eq("id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? "",
    profile: profile as Profile | null,
    isOwner: profile?.role === "OWNER",
  };
});

/** For owner pages/actions. The role comes from the database, never the client. */
export async function requireOwner(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/owner");
  if (!viewer.isOwner) redirect("/?denied=owner");
  return viewer;
}

export async function requireCustomer(next: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(next)}`);
  return viewer;
}
