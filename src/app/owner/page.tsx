import Link from "next/link";
import { AlertCircle, ArrowRight, CalendarDays, FileCheck2, Clock, CheckCircle2 } from "lucide-react";
import { countBookingsByStatus, listBookings } from "@/lib/data/bookings";
import { getBlockedDates } from "@/lib/data/owner";
import { getActiveServices, getSettings } from "@/lib/data/public";
import { formatPeso, unitLabel } from "@/lib/pricing";
import { addDays, formatDate, nowIn } from "@/lib/time";
import { PageHeader } from "@/components/owner/page-header";
import { BookingRow } from "@/components/owner/booking-row";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Dashboard" };

export default async function OwnerDashboard() {
  const settings = await getSettings();
  const today = nowIn(settings.timezone).date;
  const [counts, pending, todays, upcoming, services, closedToday] = await Promise.all([
    countBookingsByStatus(),
    listBookings({ status: "PENDING", limit: 50 }),
    listBookings({ status: "CONFIRMED", from: today, to: today }),
    listBookings({ status: "CONFIRMED", from: addDays(today, 1), to: addDays(today, 14), limit: 8 }),
    getActiveServices(),
    getBlockedDates(today, today),
  ]);
  const toReview = pending.filter((b) => b.payment?.status === "PROOF_SUBMITTED");
  const awaitingPayment = pending.filter((b) => b.payment?.status === "UNPAID");

  return (
    <>
      <PageHeader title="Dashboard" intro={formatDate(today, "full")} />

      {closedToday.length > 0 ? (
        <p className="mb-6 flex items-center gap-2 rounded-xl bg-off-bg px-4 py-3 text-sm text-off">
          <AlertCircle className="size-4" aria-hidden /> The villa is closed today{closedToday[0].reason ? ` — ${closedToday[0].reason}` : ""}.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={FileCheck2} label="Payments to review" value={toReview.length} href="/owner/payments" tone="info" />
        <Stat icon={Clock} label="Awaiting payment" value={awaitingPayment.length} href="/owner/bookings?status=PENDING" tone="warn" />
        <Stat icon={CalendarDays} label="Today's bookings" value={todays.length} href="/owner/calendar" tone="neutral" />
        <Stat icon={CheckCircle2} label="Confirmed (all time)" value={counts.CONFIRMED} href="/owner/bookings?status=CONFIRMED" tone="ok" />
      </div>

      <div className="mt-10 grid gap-10 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-10">
          <Section title="Needs your review" empty="No payment proofs waiting. 🎉" href="/owner/payments">
            {toReview.map((b) => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </Section>
          <Section title="Today" empty="No confirmed bookings today." href="/owner/calendar">
            {todays.map((b) => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </Section>
          <Section title="Coming up (next 14 days)" empty="No confirmed bookings coming up." href="/owner/bookings?status=CONFIRMED">
            {upcoming.map((b) => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </Section>
        </div>

        <aside className="h-fit rounded-[var(--radius-card)] border border-line/70 bg-cream p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl">Current prices</h2>
            <Link href="/owner/services" className="text-sm font-semibold text-brass-deep hover:underline">
              Edit
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-line">
            {services.map((s) => (
              <li key={s.id} className="flex justify-between py-3 text-sm">
                <span>{s.name}</span>
                <span className="font-semibold tabular-nums">
                  {formatPeso(s.price)} <span className="font-normal text-muted">/ {unitLabel(s.pricing_unit)}</span>
                </span>
              </li>
            ))}
          </ul>
          <Button asChild variant="outline" className="mt-6 w-full">
            <Link href="/owner/availability">Close a date or time</Link>
          </Button>
        </aside>
      </div>
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  href,
  tone,
}: {
  icon: typeof Clock;
  label: string;
  value: number;
  href: string;
  tone: "info" | "warn" | "ok" | "neutral";
}) {
  const tones = { info: "text-info bg-info-bg", warn: "text-warn bg-warn-bg", ok: "text-ok bg-ok-bg", neutral: "text-forest bg-sand" };
  return (
    <Link href={href} className="flex items-center gap-4 rounded-2xl border border-line/70 bg-cream p-5 transition-shadow hover:shadow-soft">
      <span className={`grid size-11 place-items-center rounded-full ${tones[tone]}`}>
        <Icon className="size-5" aria-hidden />
      </span>
      <span>
        <span className="block font-display text-4xl leading-none tabular-nums">{value}</span>
        <span className="text-sm text-muted">{label}</span>
      </span>
    </Link>
  );
}

function Section({ title, empty, href, children }: { title: string; empty: string; href: string; children: React.ReactNode[] }) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl">{title}</h2>
        <Link href={href} className="flex items-center gap-1 text-sm font-semibold text-brass-deep hover:underline">
          View all <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      {children.length === 0 ? <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-muted">{empty}</p> : <div className="grid gap-3">{children}</div>}
    </section>
  );
}
