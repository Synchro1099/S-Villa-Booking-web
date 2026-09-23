import Link from "next/link";
import { ArrowRight, CalendarCheck, ShieldCheck, Users } from "lucide-react";
import type { Settings } from "@/types";
import { Button } from "@/components/ui/button";
import { CourtArt } from "./court-art";

export function Hero({ settings }: { settings: Settings }) {
  return (
    <section data-hero className="relative overflow-hidden bg-forest text-ivory">
      <div className="court-lines absolute inset-0 opacity-60" aria-hidden />
      <div className="grain absolute inset-0" aria-hidden />
      <div className="absolute -right-40 -top-40 size-[34rem] rounded-full bg-brass/20 blur-3xl" aria-hidden />

      <div className="container-page relative grid items-center gap-12 py-20 md:py-28 lg:grid-cols-[1.15fr_1fr] lg:py-32">
        <div className="animate-fade-up">
          <p className="eyebrow !text-brass">Private villa · Courtyard · Court</p>
          <h1 className="mt-6 text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
            The whole villa,
            <br />
            <em className="text-brass">just for your group.</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ivory/75">
            Play pickleball or badminton, sing in the music room, then unwind in the jacuzzi and lounge. One booking reserves
            S-Villa exclusively for up to {settings.max_guests} guests.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild variant="brass" size="lg">
              <Link href="/book">
                Book your time <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="light" size="lg">
              <Link href="/availability">Check availability</Link>
            </Button>
          </div>
          <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-sm text-ivory/70">
            <li className="flex items-center gap-2">
              <Users className="size-4 text-brass" aria-hidden /> Up to {settings.max_guests} guests
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-brass" aria-hidden /> Exclusive use — no strangers
            </li>
            <li className="flex items-center gap-2">
              <CalendarCheck className="size-4 text-brass" aria-hidden /> Live availability
            </li>
          </ul>
        </div>
        <div className="relative mx-auto w-full max-w-md animate-fade-up [animation-delay:150ms] lg:max-w-none">
          <CourtArt />
        </div>
      </div>
    </section>
  );
}
