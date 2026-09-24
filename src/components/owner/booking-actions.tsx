"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Ban, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { BookingStatus, PaymentStatus } from "@/types";
import { cancelBooking, confirmBooking, rejectBooking } from "@/actions/owner";
import { REJECTION_REASONS } from "@/lib/booking/labels";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/form";

export function BookingActions({ bookingId, status, paymentStatus }: { bookingId: string; status: BookingStatus; paymentStatus: PaymentStatus }) {
  if (status !== "PENDING" && status !== "CONFIRMED") return null;

  return (
    <section className="rounded-[var(--radius-card)] border border-line/70 bg-cream p-6">
      <h2 className="text-2xl">Decision</h2>
      {status === "PENDING" ? (
        <>
          <p className="mt-1 text-sm text-muted">
            {paymentStatus === "PROOF_SUBMITTED"
              ? "Check the payment proof against your GCash / bank records, then confirm."
              : "No payment proof yet. You can still confirm if you've received payment another way."}
          </p>
          <div className="mt-5 grid gap-3">
            <ConfirmDialog bookingId={bookingId} />
            <ReasonDialog mode="reject" bookingId={bookingId} />
          </div>
        </>
      ) : (
        <div className="mt-5">
          <ReasonDialog mode="cancel" bookingId={bookingId} />
        </div>
      )}
    </section>
  );
}

function ConfirmDialog({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full">
          <CheckCircle2 /> Confirm booking
        </Button>
      </DialogTrigger>
      <DialogContent title="Confirm this booking?" description="The payment will be marked as verified, and the customer's booking page will show it's confirmed.">
        <div className="flex justify-end gap-3">
          <DialogClose asChild>
            <Button variant="ghost">Back</Button>
          </DialogClose>
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await confirmBooking(bookingId);
                if (res.ok) {
                  toast.success("Booking confirmed. The customer's booking page now shows it.");
                  setOpen(false);
                  router.refresh();
                } else toast.error(res.error);
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" /> : null} Yes, confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReasonDialog({ mode, bookingId }: { mode: "reject" | "cancel"; bookingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<string>(mode === "reject" ? REJECTION_REASONS[0] : "other");
  const [custom, setCustom] = useState("");
  const [pending, start] = useTransition();
  const reason = choice === "other" ? custom.trim() : choice;
  const isReject = mode === "reject";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline" className="w-full">
          {isReject ? <XCircle /> : <Ban />} {isReject ? "Reject booking" : "Cancel booking"}
        </Button>
      </DialogTrigger>
      <DialogContent
        title={isReject ? "Reject this booking" : "Cancel this booking"}
        description="The customer will see this reason on their booking page, and the time slot becomes available again."
      >
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-semibold">Reason</legend>
          {(isReject ? REJECTION_REASONS : []).map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm has-[:checked]:border-forest">
              <input type="radio" name="reason" checked={choice === r} onChange={() => setChoice(r)} className="accent-forest" />
              {r}
            </label>
          ))}
          {isReject ? (
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm has-[:checked]:border-forest">
              <input type="radio" name="reason" checked={choice === "other"} onChange={() => setChoice("other")} className="accent-forest" />
              Other (write your own)
            </label>
          ) : null}
        </fieldset>
        {choice === "other" ? (
          <Field label="Your message to the customer" htmlFor="custom-reason" className="mt-4">
            <Textarea id="custom-reason" value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={500} />
          </Field>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <DialogClose asChild>
            <Button variant="ghost">Back</Button>
          </DialogClose>
          <Button
            variant="danger"
            disabled={pending || reason.length < 3}
            onClick={() =>
              start(async () => {
                const res = isReject ? await rejectBooking(bookingId, reason) : await cancelBooking(bookingId, reason);
                if (res.ok) {
                  toast.success(isReject ? "Booking rejected. The customer will see the reason on their booking page." : "Booking cancelled. The customer will see the reason on their booking page.");
                  setOpen(false);
                  router.refresh();
                } else toast.error(res.error);
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" /> : null} {isReject ? "Reject booking" : "Cancel booking"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
