import { getBlockedDates, getBlockedTimes } from "@/lib/data/owner";
import { getOperatingHours, getSettings } from "@/lib/data/public";
import { nowIn } from "@/lib/time";
import { PageHeader } from "@/components/owner/page-header";
import { OperatingHoursForm } from "@/components/owner/operating-hours-form";
import { BlockDateForm, BlockTimeForm, BlockedDateList, BlockedTimeList } from "@/components/owner/closures";

export const metadata = { title: "Availability" };

export default async function OwnerAvailabilityPage() {
  const settings = await getSettings();
  const today = nowIn(settings.timezone).date;
  const [hours, dates, times] = await Promise.all([getOperatingHours(), getBlockedDates(today), getBlockedTimes(today)]);

  return (
    <>
      <PageHeader
        title="Availability"
        intro="Set your regular hours and close the villa for specific days or times. Customers can't book anything you close here."
      />

      <div className="grid gap-8 2xl:grid-cols-2">
        <section className="rounded-[var(--radius-card)] border border-line/70 bg-cream p-6 sm:p-8">
          <h2 className="text-2xl">Regular opening hours</h2>
          <p className="mt-1 text-sm text-muted">Turn a day off to close it every week (recurring closed day).</p>
          <OperatingHoursForm hours={hours} />
        </section>

        <div className="space-y-8">
          <section className="rounded-[var(--radius-card)] border border-line/70 bg-cream p-6 sm:p-8">
            <h2 className="text-2xl">Close a whole day</h2>
            <p className="mt-1 text-sm text-muted">For private events, maintenance or holidays.</p>
            <BlockDateForm min={today} />
            <BlockedDateList items={dates} />
          </section>

          <section className="rounded-[var(--radius-card)] border border-line/70 bg-cream p-6 sm:p-8">
            <h2 className="text-2xl">Block specific hours</h2>
            <p className="mt-1 text-sm text-muted">Customers can still book the other hours that day.</p>
            <BlockTimeForm min={today} />
            <BlockedTimeList items={times} />
          </section>
        </div>
      </div>
    </>
  );
}
