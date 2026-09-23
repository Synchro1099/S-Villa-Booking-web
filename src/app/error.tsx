"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="container-page flex flex-1 flex-col items-center justify-center py-24 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-4 text-5xl">Sorry, that didn&apos;t load</h1>
      <p className="mt-4 max-w-md text-muted">Please try again. If it keeps happening, message us and we&apos;ll help you directly.</p>
      <Button className="mt-8" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
