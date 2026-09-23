import { CheckCircle2, Clock, Hourglass, Ban, XCircle, FileCheck2, Wallet, ShieldCheck } from "lucide-react";
import type { BookingStatus, PaymentStatus } from "@/types";
import { BOOKING_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/booking/labels";
import { cn } from "@/lib/utils";

const TONE = {
  ok: "bg-ok-bg text-ok border-ok/20",
  warn: "bg-warn-bg text-warn border-warn/20",
  bad: "bg-bad-bg text-bad border-bad/20",
  info: "bg-info-bg text-info border-info/20",
  off: "bg-off-bg text-off border-off/20",
} as const;

export function Badge({
  tone,
  icon: Icon,
  children,
  className,
}: {
  tone: keyof typeof TONE;
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide",
        TONE[tone],
        className,
      )}
    >
      {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
      {children}
    </span>
  );
}

const BOOKING: Record<BookingStatus, { tone: keyof typeof TONE; icon: typeof Clock }> = {
  PENDING: { tone: "warn", icon: Clock },
  CONFIRMED: { tone: "ok", icon: CheckCircle2 },
  REJECTED: { tone: "bad", icon: XCircle },
  CANCELLED: { tone: "off", icon: Ban },
  EXPIRED: { tone: "off", icon: Hourglass },
};

const PAYMENT: Record<PaymentStatus, { tone: keyof typeof TONE; icon: typeof Clock }> = {
  UNPAID: { tone: "warn", icon: Wallet },
  PROOF_SUBMITTED: { tone: "info", icon: FileCheck2 },
  VERIFIED: { tone: "ok", icon: ShieldCheck },
  REJECTED: { tone: "bad", icon: XCircle },
};

export function BookingStatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  const s = BOOKING[status];
  return (
    <Badge tone={s.tone} icon={s.icon} className={className}>
      {BOOKING_STATUS_LABEL[status]}
    </Badge>
  );
}

export function PaymentStatusBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  const s = PAYMENT[status];
  return (
    <Badge tone={s.tone} icon={s.icon} className={className}>
      {PAYMENT_STATUS_LABEL[status]}
    </Badge>
  );
}
