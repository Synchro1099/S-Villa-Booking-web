import type { RuleLine } from "@/lib/house-rules";
import { cn } from "@/lib/utils";

/**
 * The owner's house rules as a list (before payment on Step 6, and on the
 * confirmed booking page). Lines come from renderHouseRules().
 */
export function HouseRules({
  lines,
  title,
  intro,
  id = "house-rules",
  className,
  children,
}: {
  lines: RuleLine[];
  title: string;
  intro?: string;
  id?: string;
  className?: string;
  /** Rendered under the list, e.g. the "I've read these" tick box. */
  children?: React.ReactNode;
}) {
  if (lines.length === 0) return null;
  return (
    <section aria-labelledby={`${id}-title`} className={cn("rounded-2xl border border-line bg-white p-5 sm:p-6", className)}>
      <h3 id={`${id}-title`} className="font-display text-2xl leading-tight sm:text-[1.7rem]">
        {title}
      </h3>
      {intro ? <p className="mt-1 text-sm text-muted">{intro}</p> : null}
      <ul className="mt-4 grid gap-3 text-[0.94rem] leading-relaxed">
        {lines.map((line, i) => (
          <li key={i} className="flex gap-3">
            <span aria-hidden className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-brass-deep" />
            <p className="min-w-0 [overflow-wrap:anywhere]">
              {line.map((s, j) =>
                s.kind === "link" ? (
                  <a key={j} href={s.href} target="_blank" rel="noopener noreferrer" className="-my-2.5 inline-block py-2.5 font-semibold underline decoration-brass underline-offset-4 hover:decoration-ink">
                    {s.text}
                  </a>
                ) : s.kind === "tel" ? (
                  <a key={j} href={`tel:${s.number}`} className="-my-2.5 inline-block whitespace-nowrap py-2.5 font-semibold underline decoration-brass underline-offset-4 hover:decoration-ink">
                    {s.text}
                  </a>
                ) : s.bold ? (
                  <strong key={j} className="font-semibold text-ink">
                    {s.text}
                  </strong>
                ) : (
                  <span key={j}>{s.text}</span>
                ),
              )}
            </p>
          </li>
        ))}
      </ul>
      {children}
    </section>
  );
}
