import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage(props: PageProps<"/login">) {
  const { next, error } = await props.searchParams;
  const nextPath = typeof next === "string" ? next : "";
  const viewer = await getViewer();
  // Sessions are shared by every tab in a browser, so a customer who is still
  // signed in must sign out before the owner can sign in. Say so, rather than
  // bouncing them away from the form.
  const wantsOwner = nextPath === "/owner" || nextPath.startsWith("/owner/");
  if (viewer && !(wantsOwner && !viewer.isOwner)) {
    redirect(viewer.isOwner && !nextPath ? "/owner" : nextPath || "/my-bookings");
  }

  if (viewer) {
    return (
      <section className="container-page max-w-md py-16 md:py-24">
        <p className="eyebrow">Owner Portal</p>
        <h1 className="mt-3 text-4xl sm:text-5xl">Switch account</h1>
        <div className="mt-8 grid gap-5 rounded-[var(--radius-card)] border border-line/70 bg-cream p-6 shadow-soft sm:p-8">
          <p className="text-sm leading-relaxed">
            You&apos;re signed in as <strong className="break-all">{viewer.email}</strong>, which is a customer account.
            Sign out to sign in with the owner account.
          </p>
          <form action={logout}>
            <input type="hidden" name="next" value={`/login?next=${encodeURIComponent(nextPath)}`} />
            <Button type="submit" size="lg" className="w-full">
              Sign out and switch account
            </Button>
          </form>
          <Link href="/my-bookings" className="text-center text-sm font-semibold text-forest underline-offset-4 hover:underline">
            Stay signed in and go to my bookings
          </Link>
        </div>
      </section>
    );
  }

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
