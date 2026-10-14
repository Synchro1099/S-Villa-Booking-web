"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import type { ActionResult, Service } from "@/types";
import { createService, updateService } from "@/actions/owner";
import { formatPeso, unitLabel } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/status-badge";
import { ServiceIcon } from "@/components/services/service-icon";

export function ServiceList({ services }: { services: Service[] }) {
  return (
    <>
      <ul className="grid gap-3">
        {services.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line/70 bg-cream p-5">
            {s.image_url ? (
              <Image src={s.image_url} alt="" width={44} height={44} unoptimized className="size-11 rounded-full object-cover" />
            ) : (
              <span className="grid size-11 place-items-center rounded-full bg-forest text-brass">
                <ServiceIcon name={s.icon} className="size-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                {s.name}
                {!s.is_active ? <Badge tone="off">Hidden</Badge> : null}
              </p>
              <p className="text-sm text-muted">
                Current price:{" "}
                <strong className="text-ink">
                  {formatPeso(s.price)} / {unitLabel(s.pricing_unit)}
                </strong>
              </p>
            </div>
            <ServiceDialog service={s} />
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <ServiceDialog />
      </div>
    </>
  );
}

function ServiceDialog({ service }: { service?: Service }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (prev: ActionResult | null, fd: FormData) => {
    const result = await (service ? updateService : createService)(prev, fd);
    if (result.ok) {
      toast.success(service ? `${service.name} saved. The website now shows the new price.` : "Service added.");
      setOpen(false);
    }
    return result;
  }, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  const idp = service?.id ?? "new";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {service ? (
          <Button variant="outline" size="sm" className="h-11" aria-label={`Edit ${service.name}`}>
            <Pencil /> Edit
          </Button>
        ) : (
          <Button variant="outline">
            <Plus /> Add a service
          </Button>
        )}
      </DialogTrigger>
      <DialogContent title={service ? `Edit ${service.name}` : "Add a service"} description="New prices apply to new bookings only.">
        <form action={action} className="grid gap-5">
          {service ? <input type="hidden" name="id" value={service.id} /> : null}
          <Field label="Service" htmlFor={`name-${idp}`} error={errors?.name}>
            <Input id={`name-${idp}`} name="name" defaultValue={service?.name} required maxLength={80} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Price (₱)" htmlFor={`price-${idp}`} error={errors?.price}>
              <Input id={`price-${idp}`} name="price" type="number" inputMode="decimal" min={0} step="1" defaultValue={service?.price} required />
            </Field>
            <Field label="Unit" htmlFor={`unit-${idp}`} error={errors?.pricingUnit}>
              <Select id={`unit-${idp}`} name="pricingUnit" defaultValue={service?.pricing_unit ?? "HOUR"}>
                <option value="HOUR">Per hour</option>
                <option value="ITEM">Per item (guest picks how many)</option>
                <option value="BOOKING">Per booking (flat)</option>
              </Select>
            </Field>
          </div>
          <Field label="Description" htmlFor={`desc-${idp}`} error={errors?.description}>
            <Textarea id={`desc-${idp}`} name="description" defaultValue={service?.description} maxLength={500} />
          </Field>
          <Field
            label="Photo"
            htmlFor={`photo-${idp}`}
            error={errors?.photo}
            hint={service?.image_url ? "Choose a new photo to replace the current one." : "JPG, PNG or WEBP, up to 5 MB. Without a photo the card shows an icon."}
          >
            <Input id={`photo-${idp}`} name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="h-auto py-2" />
          </Field>
          {service?.image_url ? (
            <div className="flex items-center gap-4">
              <Image src={service.image_url} alt={`Current photo of ${service.name}`} width={96} height={60} unoptimized className="h-15 w-24 rounded-lg object-cover" />
              <label className="flex items-center gap-3 text-sm font-semibold">
                <input type="checkbox" name="removePhoto" className="size-5 accent-forest" />
                Remove photo
              </label>
            </div>
          ) : null}
          {service ? (
            <label className="flex items-center gap-3 text-sm font-semibold">
              <input type="checkbox" name="isActive" defaultChecked={service.is_active} className="size-5 accent-forest" />
              Show on website and allow bookings
            </label>
          ) : null}
          <FormError result={state} />
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
