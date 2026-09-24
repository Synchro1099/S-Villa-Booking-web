"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { archiveBookings, unarchiveBooking } from "@/actions/owner";
import { formatDate } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/form";

/** Owner tool: hide settled bookings dated before a chosen day. Nothing is deleted. */
export function ArchiveOldBookings({ today, defaultBefore }: { today: string; defaultBefore: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [before, setBefore] = useState(defaultBefore);
  const [pending, start] = useTransition();
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(before) && before <= today;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Archive /> Archive old bookings
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Archive old bookings"
        description="Archived bookings are hidden from the lists above but kept in full, including prices and payment records. You can view them under Archived and restore any of them."
      >
        <Field label="Archive bookings dated before" htmlFor="archive-before" hint="Pending bookings are never archived.">
          <Input id="archive-before" type="date" max={today} value={before} onChange={(e) => setBefore(e.target.value)} required />
        </Field>
        <div className="mt-6 flex justify-end gap-3">
          <DialogClose asChild>
            <Button variant="ghost">Back</Button>
          </DialogClose>
          <Button
            disabled={pending || !valid}
            onClick={() =>
              start(async () => {
                const res = await archiveBookings(before);
                if (res.ok) {
                  const n = res.data.count;
                  toast.success(
                    n === 0
                      ? `No bookings before ${formatDate(before, "short")} needed archiving.`
                      : `Archived ${n} booking${n === 1 ? "" : "s"} dated before ${formatDate(before, "short")}.`,
                  );
                  setOpen(false);
                  router.refresh();
                } else toast.error(res.error);
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" /> : null} Archive
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RestoreBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await unarchiveBooking(bookingId);
          if (res.ok) {
            toast.success("Booking restored to the main list.");
            router.refresh();
          } else toast.error(res.error);
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <ArchiveRestore />} Restore
    </Button>
  );
}
