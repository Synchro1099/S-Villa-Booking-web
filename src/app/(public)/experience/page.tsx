import type { Metadata } from "next";
import Link from "next/link";
import { Experience } from "@/components/sections/experience";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "The Experience",
  description: "A private villa, court and courtyard reserved for just your group — play, sing, soak and relax.",
};

const MOMENTS = [
  ["Afternoon", "Warm up on the pickleball court or rally a few badminton games with your group."],
  ["Golden hour", "Move to the KTV lounge for karaoke, or take a breather in the open-air courtyard."],
  ["Evening", "Slip into the jacuzzi, then settle into the KTV lounge as the lights come on."],
];

export default function ExperiencePage() {
  return (
    <>
      <Experience headingAs="h1" />
      <section className="container-page pb-24">
        <ol className="grid gap-6 border-t border-line pt-12 lg:grid-cols-3">
          {MOMENTS.map(([time, text]) => (
            <li key={time}>
              <p className="eyebrow">{time}</p>
              <p className="mt-3 font-display text-2xl leading-snug">{text}</p>
            </li>
          ))}
        </ol>
        <Button asChild size="lg" className="mt-14">
          <Link href="/book">Plan your visit</Link>
        </Button>
      </section>
    </>
  );
}
