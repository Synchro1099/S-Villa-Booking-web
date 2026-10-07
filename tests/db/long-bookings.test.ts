import { beforeEach, describe, expect, it } from "vitest";
import { createBooking, createTestDb, expectDbError, manilaDate, serviceIds, type Db } from "./harness";

let db: Db;
let jacuzzi: string; // ₱500 per hour in the seed data
const day = manilaDate(3);

const row = async (id: string) => (await db.query<{ start_time: string; end_time: string; total_amount: string }>(
  `select start_time, end_time, total_amount from bookings where id = $1`, [id])).rows[0];

beforeEach(async () => {
  db = await createTestDb();
  [jacuzzi] = await serviceIds(db, "jacuzzi");
  await db.query(`update operating_hours set is_open = true, open_time = '08:00', close_time = '22:00' where weekday = extract(dow from $1::date)`, [day]);
});

describe("no maximum booking length", () => {
  it("the max-hours setting is gone", async () => {
    const { rows } = await db.query(`select 1 from information_schema.columns where table_name = 'settings' and column_name = 'max_booking_hours'`);
    expect(rows).toEqual([]);
  });

  it("accepts a booking longer than 5 hours, priced per hour", async () => {
    const b = await createBooking(db, { date: day, start: "09:00", hours: 8, services: [jacuzzi] });
    const r = await row(b.booking_id);
    expect([r.start_time, r.end_time]).toEqual(["09:00:00", "17:00:00"]);
    expect(Number(r.total_amount)).toBe(8 * 500);
  });

  it("accepts a booking for the whole opening day (8 AM to 10 PM)", async () => {
    const b = await createBooking(db, { date: day, start: "08:00", hours: 14, services: [jacuzzi] });
    expect((await row(b.booking_id)).end_time).toBe("22:00:00");
  });

  it("still needs at least one hour", async () => {
    await expectDbError(createBooking(db, { date: day, start: "09:00", hours: 0, services: [jacuzzi] }), "SV_DURATION_INVALID");
  });
});

describe("long bookings still respect every other rule", () => {
  it("an overlapping booking still fails, before, inside or after a 6-hour booking", async () => {
    await createBooking(db, { date: day, start: "10:00", hours: 6, services: [jacuzzi] }); // 10:00–16:00
    await expectDbError(createBooking(db, { date: day, start: "09:00", hours: 2, services: [jacuzzi] }), "SV_SLOT_TAKEN");
    await expectDbError(createBooking(db, { date: day, start: "13:00", services: [jacuzzi] }), "SV_SLOT_TAKEN");
    await expectDbError(createBooking(db, { date: day, start: "15:30", services: [jacuzzi] }), "SV_SLOT_TAKEN");
    // A long booking can't swallow an existing one either.
    await expectDbError(createBooking(db, { date: day, start: "08:00", hours: 10, services: [jacuzzi] }), "SV_SLOT_TAKEN");
    // Right after it ends is fine.
    await createBooking(db, { date: day, start: "16:00", hours: 6, services: [jacuzzi] });
  });

  it("can't run past closing time or past midnight", async () => {
    await expectDbError(createBooking(db, { date: day, start: "08:00", hours: 15, services: [jacuzzi] }), "SV_OUTSIDE_HOURS");
    await expectDbError(createBooking(db, { date: day, start: "20:00", hours: 6, services: [jacuzzi] }), "SV_OUTSIDE_HOURS");
  });

  it("can't run through a blocked time", async () => {
    await db.query(`insert into blocked_times (date, start_time, end_time) values ($1, '15:00', '16:00')`, [day]);
    await expectDbError(createBooking(db, { date: day, start: "09:00", hours: 8, services: [jacuzzi] }), "SV_BLOCKED_TIME");
  });

  it("the 6-guest maximum is unchanged", async () => {
    await expectDbError(createBooking(db, { date: day, start: "09:00", hours: 8, guests: 7, services: [jacuzzi] }), "SV_GUESTS_INVALID");
    await createBooking(db, { date: day, start: "09:00", hours: 8, guests: 6, services: [jacuzzi] });
  });
});
