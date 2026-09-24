import { z } from "zod";
import { PAYMENT_METHODS } from "@/types";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.");
const hourTime = z.string().regex(/^([01]\d|2[0-3]):00$/, "Choose a valid time.");
const time = z.string().regex(/^([01]\d|2[0-4]):00$/, "Use whole hours, e.g. 17:00.");

/** Accepts 09171234567, 0917 123 4567, +639171234567 → normalised 09171234567. */
export const mobileSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => /^(\+?63|0)9\d{9}$/.test(v), "Enter a valid PH mobile number, e.g. 0917 123 4567.")
  .transform((v) => v.replace(/^\+?63/, "0"));

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")).pipe(z.string().max(254));
export const nameSchema = z.string().trim().min(2, "Enter your full name.").max(120);

export const createBookingSchema = z.object({
  date,
  startTime: hourTime,
  durationHours: z.coerce.number().int().min(1).max(24),
  guestCount: z.coerce.number().int().min(1, "At least 1 guest.").max(100),
  serviceIds: z.array(z.uuid()).min(1, "Choose at least one service.").max(20),
  paymentMethod: z.enum(PAYMENT_METHODS, "Choose GCash or Bank Transfer."),
  fullName: nameSchema,
  email: emailSchema,
  mobile: mobileSchema,
  notes: z.string().trim().max(500).optional().default(""),
});
export type CreateBookingInput = z.input<typeof createBookingSchema>;

export const PROOF_MAX_BYTES = 5 * 1024 * 1024;
export const PROOF_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

export const lookupSchema = z.object({
  reference: z
    .string()
    .trim()
    .toUpperCase()
    // Pages show "Booking #SV-…", so a copied reference may start with "#".
    .transform((v) => v.replace(/^#\s*/, ""))
    .pipe(z.string().regex(/^SV-\d{4}-\d{5}$/, "Booking references look like SV-2026-00125.")),
  contact: z.string().trim().min(3, "Enter the email or mobile number used for the booking.").max(254),
});

export const registerSchema = z.object({
  fullName: nameSchema,
  email: emailSchema,
  mobile: mobileSchema,
  password: z.string().min(8, "Use at least 8 characters.").max(72),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const profileSchema = z.object({
  fullName: nameSchema,
  mobile: mobileSchema,
});

// --- Owner ---------------------------------------------------------------------

export const reasonSchema = z.string().trim().min(3, "Please give a reason.").max(500);

export const servicePriceSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).default(""),
  price: z.coerce.number().min(0, "Price cannot be negative.").max(1_000_000),
  pricingUnit: z.enum(["HOUR", "BOOKING"]),
  isActive: z.coerce.boolean(),
});

export const newServiceSchema = servicePriceSchema.omit({ id: true });

export const operatingHoursSchema = z
  .array(
    z
      .object({
        weekday: z.number().int().min(0).max(6),
        isOpen: z.boolean(),
        openTime: time,
        closeTime: time,
      })
      .refine((d) => !d.isOpen || d.closeTime > d.openTime, "Closing time must be after opening time."),
  )
  .length(7);

export const blockDateSchema = z.object({ date, reason: z.string().trim().max(200).default("") });

export const blockTimeSchema = z
  .object({ date, startTime: time, endTime: time, reason: z.string().trim().max(200).default("") })
  .refine((d) => d.endTime > d.startTime, { message: "End time must be after start time.", path: ["endTime"] });

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https:\/\/[^\s]+$/.test(v), "Use a full https:// link.");

export const contactSettingsSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  businessDescription: z.string().trim().max(600),
  address: z.string().trim().max(200),
  contactNumber: z.string().trim().max(20),
  contactEmail: z.union([z.literal(""), emailSchema]),
  facebookUrl: optionalUrl,
  messengerUrl: optionalUrl,
});

export const bookingRulesSchema = z.object({
  bookingExpirationMinutes: z.coerce.number().int().min(5).max(1440),
  maxGuests: z.coerce.number().int().min(1).max(100),
  maxBookingHours: z.coerce.number().int().min(1).max(24),
  bookingWindowDays: z.coerce.number().int().min(1).max(365),
  minLeadMinutes: z.coerce.number().int().min(0).max(10080),
});

export const paymentSettingsSchema = z.object({
  gcashName: z.string().trim().max(80),
  gcashNumber: z.string().trim().max(20),
  bankName: z.string().trim().max(80),
  bankAccountName: z.string().trim().max(80),
  bankAccountNumber: z.string().trim().max(40),
});

export function fieldErrors(error: z.ZodError) {
  return z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
}
