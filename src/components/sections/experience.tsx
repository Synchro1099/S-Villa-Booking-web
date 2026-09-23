import { KeyRound, Trophy, Moon } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { SectionHeading } from "./section-heading";

const PILLARS = [
  {
    icon: KeyRound,
    title: "Completely private",
    body: "One group at a time. When you book a time slot, the villa, courtyard and every facility are yours alone.",
  },
  {
    icon: Trophy,
    title: "Play together",
    body: "A dedicated pickleball court, badminton setup and a music room for karaoke or jamming — equipment included.",
  },
  {
    icon: Moon,
    title: "Unwind in style",
    body: "Finish in the warm jacuzzi or settle into the bar & lounge. Perfect for barkada nights, birthdays and team outings.",
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
            A resort afternoon, <em>without the crowd.</em>
          </>
        }
        intro="S-Villa is built for small groups who want space to play and relax without sharing it with anyone else."
      />
      <Stagger enabled={headingAs === "h2"} className="mt-14 grid gap-6 md:grid-cols-3">
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
