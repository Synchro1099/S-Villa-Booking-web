import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

/**
 * Service-role client. Bypasses RLS — only use on the server AFTER the caller
 * has been authorised in code (guest token checked, owner verified, etc.).
 * Never import this from a client component.
 */
let warnedMalformedKey = false;

export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY. See .env.example.");
  // Supabase answers a malformed key with a bare 401, so name the likely cause
  // (e.g. the whole "NAME=value" line pasted into the hosting dashboard).
  if (!warnedMalformedKey && !/^(sb_secret_|eyJ)/.test(key)) {
    warnedMalformedKey = true;
    console.error(
      `[s-villa] SUPABASE_SERVICE_ROLE_KEY looks malformed (starts with "${key.slice(0, 6)}…"; expected "sb_secret_" or "eyJ"). ` +
        "Paste only the key value, not NAME=value, in your hosting environment settings.",
    );
  }
  return createClient(publicEnv.supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
