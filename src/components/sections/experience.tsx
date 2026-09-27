import { KeyRound, Sparkles, Trophy } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { SectionHeading } from "./section-heading";

// Court first; the other facilities are paid add-ons on the same booking.
const PILLARS = [
  {
    icon: Trophy,
    title: "A court that's yours",
    body: "Paddles and balls ready, bright indoor lights, and nobody waiting for the next game.",
  },
  {
    icon: Sparkles,
    title: "Add what you like",
    body: "Badminton, the KTV lounge for karaoke, or the jacuzzi to cool down — add them to the same booking.",
  },
  {
    icon: KeyRound,
    title: "Completely private",
    body: "One group at a time. While you're here, the court, courtyard and every room are yours alone.",
  },
];

export function Experience({ headingAs = "h2" }: { headingAs?: "h1" | "h2" }) {
  return (
    <section className="container-page py-20 md:py-28" id="experience">
      <SectionHeading
        as={headingAs}
        eyebrow="The experience"
        title={
          <>
            Your game, <em>then your evening.</em>
          </>
        }
        intro="Start on your own indoor court, then make a night of it with the add-ons — no one else books while you're here."
      />
      <Stagger enabled={headingAs === "h2"} className="mt-14 grid gap-6 lg:grid-cols-3">
        {PILLARS.map((p) => (
          <StaggerItem key={p.title}>
            <article className="group h-full rounded-[var(--radius-card)] border border-line/70 bg-cream p-8 transition-[transform,box-shadow,border-color] duration-300 ease-soft hover:-translate-y-1 hover:border-brass/40 hover:shadow-lift">
              <span className="grid size-12 place-items-center rounded-full bg-forest text-brass transition-transform duration-500 ease-soft group-hover:-rotate-6 group-hover:scale-110">
                <p.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-6 text-3xl">{p.title}</h3>
              <p className="mt-3 leading-relaxed text-muted">{p.body}</p>
            </article>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
