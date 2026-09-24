"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { fieldErrors, loginSchema, profileSchema, registerSchema } from "@/lib/validation/schemas";
import type { ActionResult } from "@/types";

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/my-bookings";
}

export async function login(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, error: "Please check your details.", fieldErrors: fieldErrors(parsed.error) };

  if (!(await rateLimit(`login:${await clientIp()}`, 10, 600))) {
    return { ok: false, error: "Too many attempts. Please wait a few minutes." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      ok: false,
      error: /confirm/i.test(error.message)
        ? "Please confirm your email first — check your inbox for the link."
        : "Incorrect email or password.",
    };
  }
  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

export async function register(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    mobile: formData.get("mobile"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, error: "Please check the highlighted details.", fieldErrors: fieldErrors(parsed.error) };

  if (!(await rateLimit(`register:${await clientIp()}`, 5, 3600))) {
    return { ok: false, error: "Too many sign-ups from this device. Please try again later." };
  }

  const supabase = await createClient();
  // Only name and mobile go into metadata. The role is always set to CUSTOMER
  // by the database trigger, whatever the client sends.
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, mobile_number: parsed.data.mobile },
      emailRedirectTo: `${publicEnv.siteUrl()}/auth/confirm`,
    },
  });
  if (error) {
    return {
      ok: false,
      error: /registered|exists/i.test(error.message) ? "An account with this email already exists." : "We couldn't create your account. Please try again.",
    };
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect(safeNext(formData.get("next")));
  }
  // Email confirmation is on: tell the user to check their inbox.
  return { ok: true };
}

/** Signs out, then goes to the form's `next` field (same-site paths only) or home. */
export async function logout(formData?: FormData) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  const next = formData?.get("next");
  redirect(typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function updateProfile(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = profileSchema.safeParse({ fullName: formData.get("fullName"), mobile: formData.get("mobile") });
  if (!parsed.success) return { ok: false, error: "Please check the highlighted details.", fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, mobile_number: parsed.data.mobile })
    .eq("id", user.id);
  if (error) return { ok: false, error: "We couldn't save your profile. Please try again." };
  revalidatePath("/account");
  return { ok: true };
}
