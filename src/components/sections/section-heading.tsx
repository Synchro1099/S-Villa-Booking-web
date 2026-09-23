import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/reveal";

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "left",
  as: Tag = "h2",
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2";
  className?: string;
}) {
  // Page titles (h1) are above the fold and must not wait for JS; section titles reveal on scroll.
  return (
    <Reveal enabled={Tag === "h2"} className={cn("flex flex-col gap-4", align === "center" && "items-center text-center", className)}>
      <p className="eyebrow">{eyebrow}</p>
      <Tag className="max-w-3xl text-4xl sm:text-5xl">{title}</Tag>
      {intro ? <p className="max-w-2xl text-base leading-relaxed text-muted sm:text-lg">{intro}</p> : null}
    </Reveal>
  );
}
