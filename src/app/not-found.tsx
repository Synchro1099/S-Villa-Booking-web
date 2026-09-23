import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="container-page flex flex-1 flex-col items-center justify-center py-24 text-center">
      <p className="eyebrow">Page not found</p>
      <h1 className="mt-4 text-5xl">We couldn&apos;t find that page</h1>
      <p className="mt-4 max-w-md text-muted">
        If you were looking for a booking, use your private booking link from your email, or look it up with your reference number.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/">Go home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/bookings/lookup">Find my booking</Link>
        </Button>
      </div>
    </main>
  );
}
