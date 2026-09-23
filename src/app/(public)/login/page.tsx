import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage(props: PageProps<"/login">) {
  const { next, error } = await props.searchParams;
  const nextPath = typeof next === "string" ? next : "";
  const viewer = await getViewer();
  if (viewer) redirect(viewer.isOwner && !nextPath ? "/owner" : nextPath || "/my-bookings");

  return (
    <section className="container-page max-w-md py-16 md:py-24">
      <p className="eyebrow">Welcome back</p>
      <h1 className="mt-3 text-4xl sm:text-5xl">Sign in</h1>
      {error === "confirm" ? (
        <p role="alert" className="mt-6 rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad">
          That confirmation link is invalid or has expired. Please sign in or register again.
        </p>
      ) : null}
      <LoginForm next={nextPath} />
      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link href={`/register${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`} className="font-semibold text-forest underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-muted">
        Booked as a guest?{" "}
        <Link href="/bookings/lookup" className="font-semibold text-forest underline-offset-4 hover:underline">
          Find your booking
        </Link>
      </p>
    </section>
  );
}
