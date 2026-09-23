import type { Metadata } from "next";
import { LookupForm } from "./lookup-form";

export const metadata: Metadata = {
  title: "Find my booking",
  description: "Look up your S-Villa booking with your reference number and email or mobile.",
};

export default function LookupPage() {
  return (
    <section className="container-page max-w-xl py-16 md:py-24">
      <p className="eyebrow">Your booking</p>
      <h1 className="mt-3 text-4xl sm:text-5xl">Find my booking</h1>
      <p className="mt-3 text-muted">Enter your booking reference and the email or mobile number you used when booking.</p>
      <LookupForm />
    </section>
  );
}
