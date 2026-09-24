"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, animate, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Landmark, Loader2, Minus, Plus, Smartphone } from "lucide-react";
import type { PaymentMethod, Service } from "@/types";
import { createBooking } from "@/actions/bookings";
import { isSelectableDay, maxHoursFrom } from "@/lib/availability/engine";
import { estimateBooking, formatPeso, unitLabel } from "@/lib/pricing";
import { formatDate, formatTimeRange, fromMinutes } from "@/lib/time";
import { emailSchema, mobileSchema, nameSchema } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { ServiceIcon } from "@/components/services/service-icon";
import { CalendarLegend, MonthCalendar } from "@/components/calendar/month-calendar";
import { TimeSlots } from "@/components/calendar/time-slots";
import { useAvailability, type AvailabilityConfig, type AvailabilitySnapshot } from "@/components/calendar/use-availability";
import { cn } from "@/lib/utils";
import { DURATION, EASE } from "@/lib/motion";

/** Steps slide in the direction of travel: forward from the right, back from the left. */
const STEP_MOTION = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 28 }),
  center: { opacity: 1, x: 0, transition: { duration: DURATION.base, ease: EASE } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -28, transition: { duration: DURATION.fast, ease: EASE } }),
};

const STEPS = ["Date", "Time", "Services", "Guests", "Review", "Payment"] as const;

/** Why Continue/Submit is disabled on each step (shown next to the button). */
const BLOCKED_HINT: Partial<Record<number, string>> = {
  0: "Choose a date to continue.",
  1: "Choose a start time to continue.",
  2: "Choose at least one facility to continue.",
  5: "Choose GCash or Bank Transfer to submit.",
};

export interface WizardProps {
  config: AvailabilityConfig;
  initial: AvailabilitySnapshot;
  initialDate: string | null;
  /** Pre-selected from ?service=<slug> (e.g. a facility card). */
  initialServiceSlug?: string | null;
  services: Service[];
  rules: { maxGuests: number; maxBookingHours: number; expirationMinutes: number };
  prefill: { fullName: string; email: string; mobile: string };
}

type Errors = Partial<Record<"fullName" | "email" | "mobile" | "guests", string>>;

export function BookingWizard({ config, initial, initialDate, initialServiceSlug, services, rules, prefill }: WizardProps) {
  const router = useRouter();
  const av = useAvailability(config, initial);
  // Arriving with ?date= skips straight to time selection if that day is open.
  const startsOnTime = !!initialDate && isSelectableDay(av.dayAvailability(initialDate).status);
  const [step, setStep] = useState(startsOnTime ? 1 : 0);
  const [date, setDate] = useState<string | null>(startsOnTime ? initialDate : null);
  const [start, setStart] = useState<number | null>(null);
  const [hours, setHours] = useState(1);
  const [serviceIds, setServiceIds] = useState<string[]>(() => services.filter((s) => s.slug === initialServiceSlug).map((s) => s.id));
  const [dir, setDir] = useState(1);
  const [guests, setGuests] = useState(Math.min(2, rules.maxGuests));
  const [fullName, setFullName] = useState(prefill.fullName);
  const [email, setEmail] = useState(prefill.email);
  const [mobile, setMobile] = useState(prefill.mobile);
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const day = date ? av.dayAvailability(date) : null;
  const maxHours = day && start != null ? maxHoursFrom(day.slots, start, rules.maxBookingHours) : 0;
  const estimate = estimateBooking(services, serviceIds, hours);

  function go(to: number) {
    setBanner(null);
    setDir(to > step ? 1 : -1);
    setStep(to);
    requestAnimationFrame(() => document.getElementById("wizard-top")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function validateGuestStep(): boolean {
    const next: Errors = {};
    const n = nameSchema.safeParse(fullName);
    const e = emailSchema.safeParse(email);
    const m = mobileSchema.safeParse(mobile);
    if (!n.success) next.fullName = n.error.issues[0].message;
    if (!e.success) next.email = e.error.issues[0].message;
    if (!m.success) next.mobile = m.error.issues[0].message;
    if (guests < 1 || guests > rules.maxGuests) next.guests = `Between 1 and ${rules.maxGuests} guests.`;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  const canContinue = [
    !!date && !!day && isSelectableDay(day.status),
    start != null && hours >= 1 && hours <= maxHours,
    serviceIds.length > 0,
    true,
    true,
    !!method,
  ][step];

  function next() {
    if (step === 3 && !validateGuestStep()) return;
    if (canContinue) go(step + 1);
  }

  function submit() {
    if (!date || start == null || !method) return;
    setBanner(null);
    startTransition(async () => {
      const result = await createBooking({
        date,
        startTime: fromMinutes(start),
        durationHours: hours,
        guestCount: guests,
        serviceIds,
        paymentMethod: method,
        fullName,
        email,
        mobile,
        notes,
      });
      if (result.ok) {
        router.push(`/bookings/${result.data.reference}?t=${result.data.token}`);
        return;
      }
      setBanner(result.error);
      // The slot may have just been taken — reload and send them back to pick a time.
      // Not awaited, so the button leaves "Submitting…" as soon as the error arrives.
      void av.refresh();
      if (/schedule|time|date|closed|opening/i.test(result.error)) {
        setStart(null);
        setDir(-1);
        setStep(1);
      }
    });
  }

  return (
    <div id="wizard-top" className="scroll-mt-24">
      <StepIndicator step={step} onJump={(i) => i < step && go(i)} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <section className="rounded-[var(--radius-card)] border border-line/70 bg-cream p-5 shadow-soft sm:p-8" aria-labelledby="step-title">
          {banner ? (
            <p role="alert" className="mb-6 rounded-xl border border-bad/25 bg-bad-bg px-4 py-3 text-sm text-bad">
              {banner}
            </p>
          ) : null}

          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div key={step} custom={dir} variants={STEP_MOTION} initial="enter" animate="center" exit="exit">
              {step === 0 && (
                <>
                  <StepTitle n={1} title="Select a date" sub="Days marked closed or fully booked can't be selected." />
                  <MonthCalendar
                    month={av.month}
                    statusOf={(d) => av.dayAvailability(d).status}
                    selected={date}
                    onSelect={(d) => {
                      setDate(d);
                      setStart(null);
                      setHours(1);
                    }}
                    onMonthChange={av.setMonth}
                    canGoBack={av.canGoBack}
                    canGoForward={av.canGoForward}
                    loading={av.loading}
                    isSelectable={isSelectableDay}
                  />
                  <CalendarLegend className="mt-6" />
                  {av.error ? <p className="mt-4 text-sm text-bad">{av.error}</p> : null}
                </>
              )}

              {step === 1 && day && (
                <>
                  <StepTitle n={2} title="Select a start time" sub={formatDate(day.date, "full")} />
                  <TimeSlots
                    slots={day.slots}
                    selectedStart={start}
                    selectedHours={hours}
                    onSelect={(s) => {
                      setStart(s);
                      setHours((h) => Math.max(1, Math.min(h, maxHoursFrom(day.slots, s, rules.maxBookingHours))));
                    }}
                  />
                  {start != null && (
                    <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-sand/60 p-5">
                      <div>
                        <p className="text-sm font-semibold" id="duration-label">
                          How long?
                        </p>
                        <p className="text-sm text-muted">{formatTimeRange(start, start + hours * 60)}</p>
                      </div>
                      <Stepper
                        labelledBy="duration-label"
                        value={hours}
                        min={1}
                        max={maxHours}
                        onChange={setHours}
                        format={(v) => `${v} hour${v === 1 ? "" : "s"}`}
                      />
                    </div>
                  )}
                </>
              )}

              {step === 2 && (
                <>
                  <StepTitle n={3} title="Choose your facilities" sub="The whole venue is private to your group. Pick what you'd like to use." />
                  <fieldset>
                    <legend className="sr-only">Facilities</legend>
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {services.map((s) => {
                        const checked = serviceIds.includes(s.id);
                        return (
                          <li key={s.id}>
                            <label
                              className={cn(
                                "flex h-full cursor-pointer gap-4 rounded-2xl border bg-white p-4 transition-[transform,border-color,box-shadow] duration-200 ease-soft active:scale-[0.98] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brass",
                                checked ? "border-forest shadow-soft" : "border-line hover:border-ink/40",
                              )}
                            >
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={checked}
                                onChange={() => setServiceIds((ids) => (checked ? ids.filter((i) => i !== s.id) : [...ids, s.id]))}
                              />
                              <span className={cn("grid size-11 shrink-0 place-items-center rounded-full", checked ? "bg-forest text-brass" : "bg-sand text-forest")}>
                                {checked ? <Check className="size-5" aria-hidden /> : <ServiceIcon name={s.icon} className="size-5" />}
                              </span>
                              <span className="flex-1">
                                <span className="flex items-baseline justify-between gap-2">
                                  <span className="font-semibold">{s.name}</span>
                                  <span className="text-sm font-semibold">
                                    {formatPeso(s.price)}
                                    <span className="font-normal text-muted">/{unitLabel(s.pricing_unit)}</span>
                                  </span>
                                </span>
                                <span className="mt-1 block text-sm text-muted">{s.description}</span>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </fieldset>
                  {services.length === 0 && <p className="text-muted">No facilities are available for booking right now.</p>}
                </>
              )}

              {step === 3 && (
                <>
                  <StepTitle n={4} title="Guests & your details" sub="We'll send your confirmation to this email and mobile number." />
                  <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-sand/60 p-5">
                    <div>
                      <p className="text-sm font-semibold" id="guests-label">
                        Number of guests
                      </p>
                      <p className="text-sm text-muted">Maximum {rules.maxGuests} people per booking.</p>
                    </div>
                    <Stepper labelledBy="guests-label" value={guests} min={1} max={rules.maxGuests} onChange={setGuests} format={(v) => `${v} guest${v === 1 ? "" : "s"}`} />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Full name" htmlFor="fullName" error={errors.fullName} className="sm:col-span-2">
                      <Input id="fullName" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    </Field>
                    <Field label="Mobile number" htmlFor="mobile" error={errors.mobile} hint="e.g. 0917 123 4567">
                      <Input id="mobile" type="tel" inputMode="tel" autoComplete="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} />
                    </Field>
                    <Field label="Email address" htmlFor="email" error={errors.email}>
                      <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </Field>
                    <Field label="Notes (optional)" htmlFor="notes" hint="Occasion, special requests…" className="sm:col-span-2">
                      <Textarea id="notes" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </Field>
                  </div>
                </>
              )}

              {step === 4 && date && start != null && (
                <>
                  <StepTitle n={5} title="Review your reservation" sub="Check everything before choosing how to pay." />
                  <dl className="divide-y divide-line rounded-2xl border border-line bg-white">
                    {[
                      ["Date", formatDate(date, "full"), 0],
                      ["Time", formatTimeRange(start, start + hours * 60), 1],
                      ["Facilities", estimate.lines.map((l) => l.name).join(", "), 2],
                      ["Guests", `${guests}`, 3],
                      ["Name", fullName, 3],
                      ["Mobile", mobile, 3],
                      ["Email", email, 3],
                      ...(notes ? [["Notes", notes, 3] as const] : []),
                    ].map(([k, v, target]) => (
                      <div key={k as string} className="flex items-start justify-between gap-4 px-5 py-4">
                        <dt className="text-sm text-muted">{k}</dt>
                        <dd className="flex items-start gap-3 text-right text-sm font-semibold">
                          <span>{v}</span>
                          <button type="button" className="text-xs font-bold text-brass-deep underline-offset-2 hover:underline" onClick={() => go(target as number)} aria-label={`Edit ${k}`}>
                            Edit
                          </button>
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {/* Prices here too: on phones the summary panel sits below the buttons. */}
                  <div className="mt-6 rounded-2xl border border-line bg-white px-5 py-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Price</h3>
                    <ul className="mt-3 space-y-2 text-sm">
                      {estimate.lines.map((l) => (
                        <li key={l.serviceId} className="flex justify-between gap-4">
                          <span>
                            {l.name}
                            {l.unit === "HOUR" ? <span className="text-muted"> · {formatPeso(l.unitPrice)} × {l.quantity}h</span> : null}
                          </span>
                          <span className="font-semibold tabular-nums">{formatPeso(l.subtotal)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
                      <span className="text-sm font-bold uppercase tracking-wider">Total</span>
                      <span className="font-display text-2xl tabular-nums">{formatPeso(estimate.total)}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted">Current rates. Your final total is confirmed when you submit.</p>
                  </div>
                </>
              )}

              {step === 5 && (
                <>
                  <StepTitle n={6} title="Choose how to pay" sub="After you submit, we'll show the payment details and the exact amount to send." />
                  <fieldset className="grid gap-3 sm:grid-cols-2">
                    <legend className="sr-only">Payment method</legend>
                    {(
                      [
                        ["GCASH", "GCash", "Send via the GCash app", Smartphone],
                        ["BANK_TRANSFER", "Bank Transfer", "Online banking or over the counter", Landmark],
                      ] as const
                    ).map(([value, label, sub, Icon]) => (
                      <label
                        key={value}
                        className={cn(
                          "flex cursor-pointer items-center gap-4 rounded-2xl border bg-white p-5 transition-[transform,border-color,box-shadow] duration-200 ease-soft active:scale-[0.98] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brass",
                          method === value ? "border-forest shadow-soft" : "border-line hover:border-ink/40",
                        )}
                      >
                        <input type="radio" name="method" value={value} className="sr-only" checked={method === value} onChange={() => setMethod(value)} />
                        <span className={cn("grid size-11 place-items-center rounded-full", method === value ? "bg-forest text-brass" : "bg-sand text-forest")}>
                          {method === value ? <Check className="size-5" aria-hidden /> : <Icon className="size-5" aria-hidden />}
                        </span>
                        <span>
                          <span className="block font-semibold">{label}</span>
                          <span className="text-sm text-muted">{sub}</span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  <p className="mt-6 rounded-xl bg-warn-bg/70 px-4 py-3 text-sm text-warn">
                    Your slot is held for {rules.expirationMinutes} minutes after you submit. Upload your payment proof within that time to keep it.
                  </p>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => go(step - 1)} disabled={pending}>
                <ArrowLeft /> Back
              </Button>
            ) : (
              <span />
            )}
            {!canContinue && BLOCKED_HINT[step] ? (
              <p className="order-last w-full text-center text-sm text-muted sm:order-none sm:ml-auto sm:w-auto sm:text-right" aria-live="polite">
                {BLOCKED_HINT[step]}
              </p>
            ) : null}
            {step < 5 ? (
              <Button size="lg" className="max-sm:grow" onClick={next} disabled={!canContinue}>
                Continue <ArrowRight />
              </Button>
            ) : (
              <Button size="lg" variant="brass" className="max-sm:grow" onClick={submit} disabled={!canContinue || pending}>
                {pending ? <Loader2 className="animate-spin" /> : null}
                {pending ? "Submitting…" : "Submit reservation"}
              </Button>
            )}
          </div>
        </section>

        <Summary date={date} start={start} hours={hours} guests={guests} lines={estimate.lines} total={estimate.total} />
      </div>
    </div>
  );
}

function StepIndicator({ step, onJump }: { step: number; onJump: (i: number) => void }) {
  return (
    <nav aria-label="Booking progress">
      <ol className="flex gap-1.5 overflow-x-auto pb-1 sm:gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onJump(i)}
              disabled={i >= step}
              aria-current={i === step ? "step" : undefined}
              className="flex w-full flex-col gap-2 text-left disabled:cursor-default"
            >
              <span className={cn("h-1 rounded-full transition-colors", i <= step ? "bg-forest" : "bg-line")} />
              <span className={cn("truncate text-[11px] font-bold uppercase tracking-wider", i === step ? "text-ink" : "text-muted")}>
                <span className="sr-only">Step </span>
                {i + 1}
                <span className="hidden sm:inline">. {label}</span>
                {i < step ? <span className="sr-only"> (completed)</span> : null}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function StepTitle({ n, title, sub }: { n: number; title: string; sub?: string }) {
  return (
    <header className="mb-6">
      <p className="eyebrow">Step {n} of 6</p>
      <h2 id="step-title" className="mt-2 text-3xl sm:text-4xl">
        {title}
      </h2>
      {sub ? <p className="mt-2 text-muted">{sub}</p> : null}
    </header>
  );
}

function Stepper({
  value,
  min,
  max,
  onChange,
  format,
  labelledBy,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
  labelledBy: string;
}) {
  return (
    <div className="flex items-center gap-3" role="group" aria-labelledby={labelledBy}>
      <Button variant="outline" size="icon" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Decrease">
        <Minus />
      </Button>
      <output className="min-w-24 text-center font-semibold tabular-nums" aria-live="polite">
        {format(value)}
      </output>
      <Button variant="outline" size="icon" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Increase">
        <Plus />
      </Button>
    </div>
  );
}

function Summary({
  date,
  start,
  hours,
  guests,
  lines,
  total,
}: {
  date: string | null;
  start: number | null;
  hours: number;
  guests: number;
  lines: ReturnType<typeof estimateBooking>["lines"];
  total: number;
}) {
  return (
    <aside className="h-fit rounded-[var(--radius-card)] bg-forest p-2 text-ivory shadow-lift lg:sticky lg:top-28" aria-label="Your reservation">
      <div className="rounded-[calc(var(--radius-card)-6px)] border border-brass/25 p-6">
        <p className="eyebrow !text-brass">Your reservation</p>
        <p className="mt-4 font-display text-2xl">{date ? formatDate(date, "long") : "Choose a date"}</p>
        <p className="text-ivory/70">{start != null ? formatTimeRange(start, start + hours * 60) : "Time not selected"}</p>
        <p className="mt-1 text-ivory/70">
          {guests} guest{guests === 1 ? "" : "s"}
        </p>

        <div className="mt-6 border-t border-ivory/10 pt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-ivory/50">Services</p>
          {lines.length === 0 ? (
            <p className="mt-2 text-sm text-ivory/60">None selected yet</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {lines.map((l) => (
                <li key={l.serviceId} className="flex justify-between gap-3">
                  <span>
                    {l.name}
                    {l.unit === "HOUR" && l.quantity > 1 ? <span className="text-ivory/50"> × {l.quantity}h</span> : null}
                  </span>
                  <span className="tabular-nums">{formatPeso(l.subtotal)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-4 flex items-baseline justify-between border-t border-ivory/10 pt-4">
          <span className="text-sm font-bold uppercase tracking-wider">Total</span>
          <AnimatedPeso value={total} className="font-display text-3xl tabular-nums" />
        </div>
        <p className="mt-3 text-xs text-ivory/50">Current rates. Your final total is confirmed when you submit.</p>
      </div>
    </aside>
  );
}

/** Total that glides to its new value instead of snapping (display only). */
function AnimatedPeso({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown.current === value) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const controls = animate(shown.current, value, {
      duration: reduce ? 0 : 0.4,
      ease: EASE,
      onUpdate: (v) => {
        shown.current = v;
        el.textContent = formatPeso(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [value]);

  return (
    <span ref={ref} className={className} aria-live="polite">
      {formatPeso(value)}
    </span>
  );
}
