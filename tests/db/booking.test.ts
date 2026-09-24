import { beforeEach, describe, expect, it } from "vitest";
import { asRole, createBooking, createTestDb, createUser, expectDbError, manilaDate, serviceIds, type Db } from "./harness";

let db: Db;
const day = manilaDate(3);

beforeEach(async () => {
  db = await createTestDb();
});

describe("booking creation", () => {
  it("books an available slot and snapshots prices", async () => {
    const [jacuzzi, bar] = await serviceIds(db, "jacuzzi", "bar-lounge");
    const b = await createBooking(db, { date: day, start: "14:00", services: [jacuzzi, bar] });

    expect(b.booking_reference).toMatch(/^SV-\d{4}-\d{5}$/);
    const booking = (await db.query<{ status: string; total_amount: string; end_time: string }>(
      `select status, total_amount, end_time from bookings where id = $1`, [b.booking_id])).rows[0];
    expect(booking.status).toBe("PENDING");
    expect(Number(booking.total_amount)).toBe(1000);
    expect(booking.end_time).toBe("15:00:00");

    const payment = (await db.query<{ status: string; amount: string }>(
      `select status, amount from payments where booking_id = $1`, [b.booking_id])).rows[0];
    expect(payment.status).toBe("UNPAID");
    expect(Number(payment.amount)).toBe(1000);
  });

  it("generates unique sequential references", async () => {
    const [jacuzzi] = await serviceIds(db, "jacuzzi");
    const a = await createBooking(db, { date: day, start: "09:00", services: [jacuzzi] });
    const b = await createBooking(db, { date: day, start: "10:00", services: [jacuzzi] });
    expect(a.booking_reference).not.toBe(b.booking_reference);
    expect(Number(b.booking_reference.slice(-5))).toBe(Number(a.booking_reference.slice(-5)) + 1);
  });

  it("rejects a slot that is already booked (confirmed)", async () => {
    const [jacuzzi] = await serviceIds(db, "jacuzzi");
    const first = await createBooking(db, { date: day, start: "14:00", services: [jacuzzi] });
    await db.query(`update bookings set status = 'CONFIRMED' where id = $1`, [first.booking_id]);
    await expectDbError(createBooking(db, { date: day, start: "14:00", services: [jacuzzi] }), "SV_SLOT_TAKEN");
  });

  it("rejects double-booking a pending slot, including partial overlaps", async () => {
    const [jacuzzi] = await serviceIds(db, "jacuzzi");
    await createBooking(db, { date: day, start: "14:00", hours: 2, services: [jacuzzi] });
    await expectDbError(createBooking(db, { date: day, start: "14:00", services: [jacuzzi] }), "SV_SLOT_TAKEN");
    await expectDbError(createBooking(db, { date: day, start: "15:00", services: [jacuzzi] }), "SV_SLOT_TAKEN");
    await expectDbError(createBooking(db, { date: day, start: "13:00", hours: 2, services: [jacuzzi] }), "SV_SLOT_TAKEN");
    // Adjacent slots are fine.
    await createBooking(db, { date: day, start: "16:00", services: [jacuzzi] });
    await createBooking(db, { date: day, start: "13:00", services: [jacuzzi] });
  });

  it("only one of many simultaneous requests for the same slot succeeds", async () => {
    const [jacuzzi] = await serviceIds(db, "jacuzzi");
    const attempts = await Promise.allSettled(
      Array.from({ length: 5 }, () => createBooking(db, { date: day, start: "18:00", services: [jacuzzi] })),
    );
    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(1);
    const count = (await db.query<{ n: number }>(
      `select count(*)::int as n from bookings where booking_date = $1 and status = 'PENDING'`, [day])).rows[0].n;
    expect(count).toBe(1);
  });

  it("frees the slot when a pending booking expires", async () => {
    const [jacuzzi] = await serviceIds(db, "jacuzzi");
    const first = await createBooking(db, { date: day, start: "14:00", services: [jacuzzi] });
    await db.query(`update bookings set expires_at = now() - interval '1 minute' where id = $1`, [first.booking_id]);

    const second = await createBooking(db, { date: day, start: "14:00", services: [jacuzzi] });
    expect(second.booking_id).toBeTruthy();
    const status = (await db.query<{ status: string }>(`select status from bookings where id = $1`, [first.booking_id])).rows[0].status;
    expect(status).toBe("EXPIRED");
  });

  it("keeps the hold once payment proof is submitted", async () => {
    const [jacuzzi] = await serviceIds(db, "jacuzzi");
    const b = await createBooking(db, { date: day, start: "14:00", services: [jacuzzi] });
    await db.query(`select submit_payment_proof($1, 'x/1.png', 'r.png', 'image/png', 1000, 'REF123')`, [b.booking_id]);
    const row = (await db.query<{ expires_at: string | null }>(`select expires_at from bookings where id = $1`, [b.booking_id])).rows[0];
    expect(row.expires_at).toBeNull();
    const pay = (await db.query<{ status: string; reference_number: string }>(`select status, reference_number from payments where booking_id = $1`, [b.booking_id])).rows[0];
    expect(pay).toEqual({ status: "PROOF_SUBMITTED", reference_number: "REF123" });
    await expectDbError(createBooking(db, { date: day, start: "14:00", services: [jacuzzi] }), "SV_SLOT_TAKEN");
  });

  it("refuses proof for an expired booking", async () => {
    const [jacuzzi] = await serviceIds(db, "jacuzzi");
    const b = await createBooking(db, { date: day, start: "14:00", services: [jacuzzi] });
    await db.query(`update bookings set expires_at = now() - interval '1 minute' where id = $1`, [b.booking_id]);
    await expectDbError(
      db.query(`select submit_payment_proof($1, 'x/2.png', 'r.png', 'image/png', 1000, null)`, [b.booking_id]),
      "SV_BOOKING_EXPIRED",
    );
  });

  it("rejects a whole-day closure", async () => {
    const [jacuzzi] = await serviceIds(db, "jacuzzi");
    await db.query(`insert into blocked_dates (date, reason) values ($1, 'Private Event')`, [day]);
    await expectDbError(createBooking(db, { date: day, start: "14:00", services: [jacuzzi] }), "SV_CLOSED_DATE");
  });

  it("rejects a blocked time but allows other times that day", async () => {
    const [jacuzzi] = await serviceIds(db, "jacuzzi");
    await db.query(`insert into blocked_times (date, start_time, end_time, reason) values ($1, '17:00', '21:00', 'Private Event')`, [day]);
    await expectDbError(createBooking(db, { date: day, start: "18:00", services: [jacuzzi] }), "SV_BLOCKED_TIME");
    await expectDbError(createBooking(db, { date: day, start: "16:00", hours: 2, services: [jacuzzi] }), "SV_BLOCKED_TIME");
    await createBooking(db, { date: day, start: "16:00", services: [jacuzzi] });
  });

  it("rejects recurring closed weekdays", async () => {
    const [jacuzzi] = await serviceIds(db, "jacuzzi");
    const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
    await db.query(`update operating_hours set is_open = false where weekday = $1`, [dow]);
    await expectDbError(createBooking(db, { date: day, start: "14:00", services: [jacuzzi] }), "SV_CLOSED_DAY");
  });

  it("rejects times outside operating hours", async () => {
    const [jacuzzi] = await serviceIds(db, "jacuzzi");
    const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
    await db.query(`update operating_hours set open_time = '10:00', close_time = '20:00' where weekday = $1`, [dow]);
    await expectDbError(createBooking(db, { date: day, start: "09:00", services: [jacuzzi] }), "SV_OUTSIDE_HOURS");
    await expectDbError(createBooking(db, { date: day, start: "19:00", hours: 2, services: [jacuzzi] }), "SV_OUTSIDE_HOURS");
    await createBooking(db, { date: day, start: "19:00", services: [jacuzzi] });
  });

  it("rejects past times", async () => {
    const [jacuzzi] = await serviceIds(db, "jacuzzi");
    await expectDbError(createBooking(db, { date: manilaDate(-1), start: "14:00", services: [jacuzzi] }), "SV_TOO_SOON");
  });

  it("rejects more than the maximum guests (6)", async () => {
    const [jacuzzi] = await serviceIds(db, "jacuzzi");
    await expectDbError(createBooking(db, { date: day, start: "14:00", guests: 7, services: [jacuzzi] }), "SV_GUESTS_INVALID");
    await createBooking(db, { date: day, start: "14:00", guests: 6, services: [jacuzzi] });
  });

  it("enforces max guests at the table level too", async () => {
    const [jacuzzi] = await serviceIds(db, "jacuzzi");
    const b = await createBooking(db, { date: day, start: "14:00", services: [jacuzzi] });
    await expectDbError(db.query(`update bookings set guest_count = 9 where id = $1`, [b.booking_id]), "SV_GUESTS_INVALID");
  });

  it("rejects inactive and unknown services", async () => {
    const [jacuzzi] = await serviceIds(db, "jacuzzi");
    await db.query(`update services set is_active = false where id = $1`, [jacuzzi]);
    await expectDbError(createBooking(db, { date: day, start: "14:00", services: [jacuzzi] }), "SV_SERVICE_INVALID");
    await expectDbError(
      createBooking(db, { date: day, start: "14:00", services: ["00000000-0000-0000-0000-000000000000"] }),
      "SV_SERVICE_INVALID",
    );
    await expectDbError(createBooking(db, { date: day, start: "14:00", services: [] }), "SV_SERVICE_REQUIRED");
  });

  it("only accepts GCash and bank transfer", async () => {
    const [jacuzzi] = await serviceIds(db, "jacuzzi");
    await expectDbError(
      createBooking(db, { date: day, start: "14:00", services: [jacuzzi], method: "CREDIT_CARD" }),
      "SV_PAYMENT_METHOD_INVALID",
    );
    await createBooking(db, { date: day, start: "14:00", services: [jacuzzi], method: "BANK_TRANSFER" });
  });
});

describe("pricing", () => {
  it("new bookings use the current price; old bookings keep their snapshot", async () => {
    const [jacuzzi] = await serviceIds(db, "jacuzzi");
    const oldBooking = await createBooking(db, { date: day, start: "10:00", services: [jacuzzi] });

    await db.query(`update services set price = 700 where id = $1`, [jacuzzi]);
    const newBooking = await createBooking(db, { date: day, start: "12:00", services: [jacuzzi] });

    const items = await db.query<{ booking_id: string; unit_price: string }>(
      `select booking_id, unit_price from booking_items where booking_id = any($1)`,
      [[oldBooking.booking_id, newBooking.booking_id]],
    );
    const price = (id: string) => Number(items.rows.find((r) => r.booking_id === id)!.unit_price);
    expect(price(oldBooking.booking_id)).toBe(500);
    expect(price(newBooking.booking_id)).toBe(700);

    const totals = await db.query<{ id: string; total_amount: string }>(
      `select id, total_amount from bookings where id = any($1)`, [[oldBooking.booking_id, newBooking.booking_id]]);
    expect(Number(totals.rows.find((r) => r.id === oldBooking.booking_id)!.total_amount)).toBe(500);
    expect(Number(totals.rows.find((r) => r.id === newBooking.booking_id)!.total_amount)).toBe(700);
  });

  it("calculates hourly totals server-side from the duration", async () => {
    const [pickleball, jacuzzi] = await serviceIds(db, "pickleball", "jacuzzi");
    await db.query(`update services set pricing_unit = 'BOOKING', price = 300 where id = $1`, [pickleball]);
    const b = await createBooking(db, { date: day, start: "10:00", hours: 3, services: [pickleball, jacuzzi] });
    const total = (await db.query<{ total_amount: string }>(`select total_amount from bookings where id = $1`, [b.booking_id])).rows[0];
    expect(Number(total.total_amount)).toBe(300 + 500 * 3);
    const items = await db.query<{ quantity: string; subtotal: string; service_name_snapshot: string }>(
      `select quantity, subtotal, service_name_snapshot from booking_items where booking_id = $1 order by service_name_snapshot`, [b.booking_id]);
    expect(items.rows.map((r) => [r.service_name_snapshot, Number(r.quantity), Number(r.subtotal)])).toEqual([
      ["Jacuzzi", 3, 1500],
      ["Pickleball", 1, 300],
    ]);
  });

  it("booking item snapshots and totals are immutable", async () => {
    const [jacuzzi] = await serviceIds(db, "jacuzzi");
    const b = await createBooking(db, { date: day, start: "10:00", services: [jacuzzi] });
    await expectDbError(db.query(`update booking_items set unit_price = 1 where booking_id = $1`, [b.booking_id]), "SV_IMMUTABLE_FIELD");
    await expectDbError(db.query(`update bookings set total_amount = 1 where id = $1`, [b.booking_id]), "SV_IMMUTABLE_FIELD");
  });

  it("the create function has no price or total parameter to manipulate", async () => {
    const args = (await db.query<{ args: string }>(
      `select pg_get_function_identity_arguments('public.create_booking'::regproc) as args`)).rows[0].args;
    expect(args).not.toMatch(/price|total|amount|status/i);
  });
});

describe("status state machine", () => {
  it("blocks invalid transitions", async () => {
    const [jacuzzi] = await serviceIds(db, "jacuzzi");
    const b = await createBooking(db, { date: day, start: "10:00", services: [jacuzzi] });
    await db.query(`update bookings set status = 'REJECTED' where id = $1`, [b.booking_id]);
    await expectDbError(db.query(`update bookings set status = 'CONFIRMED' where id = $1`, [b.booking_id]), "SV_INVALID_TRANSITION");
  });

  it("owner confirm marks payment verified; reject requires a reason", async () => {
    const owner = await createUser(db, "owner@example.com", "OWNER");
    const [jacuzzi] = await serviceIds(db, "jacuzzi");
    const a = await createBooking(db, { date: day, start: "10:00", services: [jacuzzi] });
    const b = await createBooking(db, { date: day, start: "12:00", services: [jacuzzi] });

    await asRole(db, "authenticated", owner, (tx) => tx.query(`select owner_confirm_booking($1)`, [a.booking_id]));
    const row = (await db.query<{ status: string; pstatus: string; verified_by: string }>(
      `select b.status, p.status as pstatus, p.verified_by from bookings b join payments p on p.booking_id = b.id where b.id = $1`,
      [a.booking_id])).rows[0];
    expect(row).toEqual({ status: "CONFIRMED", pstatus: "VERIFIED", verified_by: owner });

    await expectDbError(
      asRole(db, "authenticated", owner, (tx) => tx.query(`select owner_reject_booking($1, '  ')`, [b.booking_id])),
      "SV_REASON_REQUIRED",
    );
    await asRole(db, "authenticated", owner, (tx) => tx.query(`select owner_reject_booking($1, 'Payment not received')`, [b.booking_id]));
    const rejected = (await db.query<{ status: string; status_reason: string }>(
      `select status, status_reason from bookings where id = $1`, [b.booking_id])).rows[0];
    expect(rejected).toEqual({ status: "REJECTED", status_reason: "Payment not received" });

    // Rejected slot is free again.
    await createBooking(db, { date: day, start: "12:00", services: [jacuzzi] });
  });
});

describe("archive", () => {
  it("archives settled bookings before a date, keeps pending ones, and can restore", async () => {
    const owner = await createUser(db, "owner@example.com", "OWNER");
    const [jacuzzi] = await serviceIds(db, "jacuzzi");
    const pending = await createBooking(db, { date: day, start: "10:00", services: [jacuzzi] });
    const cancelled = await createBooking(db, { date: day, start: "12:00", services: [jacuzzi] });
    await db.query(`update bookings set status = 'CANCELLED' where id = $1`, [cancelled.booking_id]);
    // Move both into the past (create_booking only accepts future dates).
    await db.query(`update bookings set booking_date = $1 where id = any($2)`, [manilaDate(-10), [pending.booking_id, cancelled.booking_id]]);

    const archive = (before: string) =>
      asRole(db, "authenticated", owner, (tx) => tx.query<{ n: number }>(`select owner_archive_bookings($1::date) as n`, [before]));

    await expectDbError(archive(manilaDate(1)), "SV_ARCHIVE_DATE_INVALID");
    expect((await archive(manilaDate(0))).rows[0].n).toBe(1);

    const rows = (await db.query<{ id: string; archived: boolean; total: string }>(
      `select id, archived_at is not null as archived, total_amount::text as total from bookings`)).rows;
    expect(rows.find((r) => r.id === cancelled.booking_id)?.archived).toBe(true);
    expect(rows.find((r) => r.id === pending.booking_id)?.archived).toBe(false);
    // Nothing is deleted: the price snapshot is still there.
    expect((await db.query(`select 1 from booking_items where booking_id = $1`, [cancelled.booking_id])).rows).toHaveLength(1);

    await asRole(db, "authenticated", owner, (tx) => tx.query(`select owner_unarchive_booking($1)`, [cancelled.booking_id]));
    expect((await db.query<{ a: string | null }>(`select archived_at as a from bookings where id = $1`, [cancelled.booking_id])).rows[0].a).toBeNull();
  });

  it("only the owner can archive", async () => {
    const customer = await createUser(db, "c@example.com");
    await expectDbError(
      asRole(db, "authenticated", customer, (tx) => tx.query(`select owner_archive_bookings($1::date)`, [manilaDate(0)])),
      "SV_FORBIDDEN",
    );
  });
});
