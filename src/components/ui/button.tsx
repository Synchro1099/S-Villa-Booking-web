import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
 * Micro-interactions: on hover a button lifts 1px and its shadow deepens; a
 * trailing icon (e.g. →) nudges forward; on press it settles back and scales
 * to 0.97. All transform/shadow — no layout shift.
 */
export const buttonVariants = cva(
  "group/btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-soft select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg:last-child:not(:first-child)]:transition-transform [&_svg:last-child:not(:first-child)]:duration-200 hover:[&_svg:last-child:not(:first-child)]:translate-x-0.5 active:scale-[0.97] active:duration-100",
  {
    variants: {
      variant: {
        primary: "bg-forest text-ivory shadow-soft hover:-translate-y-px hover:bg-ink hover:shadow-lift active:translate-y-0",
        brass: "bg-brass text-ink shadow-soft hover:-translate-y-px hover:bg-[#d2b27f] hover:shadow-lift active:translate-y-0",
        outline: "border border-line bg-cream/60 text-ink hover:-translate-y-px hover:border-ink hover:bg-cream active:translate-y-0",
        ghost: "text-ink hover:bg-sand/70",
        light: "border border-ivory/30 text-ivory hover:-translate-y-px hover:border-ivory/60 hover:bg-ivory/10 active:translate-y-0",
        danger: "bg-bad text-white shadow-soft hover:-translate-y-px hover:bg-[#832f24] active:translate-y-0",
        link: "rounded-none px-0 text-forest underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-6 text-sm",
        lg: "h-13 px-8 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
