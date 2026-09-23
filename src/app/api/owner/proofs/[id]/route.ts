import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Owner-only: redirect to a 60-second signed URL for a payment proof.
 * The bucket is private; nobody else can obtain a URL.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/owner/proofs/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const viewer = await getViewer();
  if (!viewer?.isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Read through RLS as the owner (payment_proofs is owner-only).
  const supabase = await createClient();
  const { data: proof } = await supabase.from("payment_proofs").select("file_path").eq("id", id).maybeSingle();
  if (!proof) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await createAdminClient().storage.from("payment-proofs").createSignedUrl(proof.file_path, 60);
  if (error || !data) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
