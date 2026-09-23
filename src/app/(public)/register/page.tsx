import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function RegisterPage(props: PageProps<"/register">) {
  const { next } = await props.searchParams;
  if (await getViewer()) redirect("/my-bookings");
  const nextPath = typeof next === "string" ? next : "";

  return (
    <section className="container-page max-w-md py-16 md:py-24">
      <p className="eyebrow">Join S-Villa</p>
      <h1 className="mt-3 text-4xl sm:text-5xl">Create an account</h1>
      <p className="mt-3 text-muted">Keep all your bookings in one place. You can also book as a guest without an account.</p>
      <RegisterForm next={nextPath} />
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-forest underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </section>
  );
}
