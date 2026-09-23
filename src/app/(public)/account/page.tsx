import type { Metadata } from "next";
import { requireCustomer } from "@/lib/auth";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };

export default async function AccountPage() {
  const viewer = await requireCustomer("/account");
  return (
    <section className="container-page max-w-xl py-12 md:py-16">
      <p className="eyebrow">Account</p>
      <h1 className="mt-3 text-4xl sm:text-5xl">Your profile</h1>
      <p className="mt-3 text-muted">Signed in as {viewer.email}. These details pre-fill your next booking.</p>
      <ProfileForm fullName={viewer.profile?.full_name ?? ""} mobile={viewer.profile?.mobile_number ?? ""} />
    </section>
  );
}
