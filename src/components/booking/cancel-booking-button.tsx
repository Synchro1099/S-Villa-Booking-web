"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cancelMyBooking } from "@/actions/bookings";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";

export function CancelBookingButton({ reference, token }: { reference: string; token: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Cancel reservation</Button>
      </DialogTrigger>
      <DialogContent title="Cancel this reservation?" description="Your time slot will be released for other guests. This can't be undone.">
        <div className="flex flex-wrap justify-end gap-3">
          <DialogClose asChild>
            <Button variant="ghost">Keep it</Button>
          </DialogClose>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await cancelMyBooking(reference, token);
                if (res.ok) {
                  toast.success("Your reservation was cancelled.");
                  setOpen(false);
                  router.refresh();
                } else toast.error(res.error);
              })
            }
          >
            {pending ? "Cancelling…" : "Yes, cancel"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
