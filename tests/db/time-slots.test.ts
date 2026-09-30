import { beforeEach, describe, expect, it } from "vitest";
import { createBooking, createTestDb, expectDbError, manilaDate, serviceIds, type Db } from "./harness";

let db: Db;
let jacuzzi: string;
const day = manilaDate(3);

/** Set the start-time step (settings.time_slot_minutes). */
const step = (minutes: number) => db.query(`update settings set time_slot_minutes = $1 where id = 1`, [minutes]);
/** Set this test day's opening hours. */
const hoursFor = (open: string, close: string, isOpen = true) =>
  db.query(`update operating_hours set open_time = $1, close_time = $2, is_open = $3 where weekday = extract(dow from $4::date)`, [open, close, isOpen, day]);
const endOf = async (id: string) => (await db.query<{ start_time: string; end_time: string; total_amount: string }>(
  `select start_time, end_time, total_amount from bookings where id = $1`, [id])).rows[0];

beforeEach(async () => {
  db = await createTestDb();
  [jacuzzi] = await serviceIds(db, "jacuzzi");
  await hoursFor("15:00", "23:00"); // like the client's Tue–Fri hours
});

describe("start-time step", () => {
  it("defaults to every 30 minutes", async () => {
    const { rows } = await db.query<{ time_slot_minutes: number }>(`select time_slot_minutes from settings where id = 1`);
    expect(rows[0].time_slot_minutes).toBe(30);
  });

  it("accepts a half-hour start and keeps whole-hour duration and pricing", async () => {
    const b = await createBooking(db, { date: day, start: "15:30", hours: 2, services: [jacuzzi] });
    const one = await createBooking(db, { date: day, start: "18:00", hours: 1, services: [jacuzzi] });
    const row = await endOf(b.booking_id);
    expect(row.start_time).toBe("15:30:00");
    expect(row.end_time).toBe("17:30:00");
    expect(Number(row.total_amount)).toBe(2 * Number((await endOf(one.booking_id)).total_amount));
  });

  it("refuses starts off the step", async () => {
    await expectDbError(createBooking(db, { date: day, start: "16:15", services: [jacuzzi] }), "SV_TIME_INVALID");
    await expectDbError(createBooking(db, { date: day, start: "16:00:30", services: [jacuzzi] }), "SV_TIME_INVALID");
  });

  it("follows the owner's setting: 15 allows quarter hours, 60 goes back to on the hour", async () => {
    await step(15);
    await createBooking(db, { date: day, start: "16:15", services: [jacuzzi] });
    await step(60);
    await expectDbError(createBooking(db, { date: day, start: "18:30", services: [jacuzzi] }), "SV_TIME_INVALID");
    await createBooking(db, { date: day, start: "19:00", services: [jacuzzi] });
  });

  it("only allows 15, 30 or 60", async () => {
    await expectDbError(step(45), "check");
    await expectDbError(step(20), "check");
    await expectDbError(step(0), "check");
  });
});

describe("half-hour starts and opening hours", () => {
  it("can't start before opening", async () => {
    await expectDbError(createBooking(db, { date: day, start: "14:30", services: [jacuzzi] }), "SV_OUTSIDE_HOURS");
    await createBooking(db, { date: day, start: "15:00", services: [jacuzzi] });
  });

  it("can't end after closing: 10:00 PM is the last one-hour start when closing at 11 PM", async () => {
    await createBooking(db, { date: day, start: "22:00", services: [jacuzzi] });
    await db.query(`delete from bookings`);
    await expectDbError(createBooking(db, { date: day, start: "22:30", services: [jacuzzi] }), "SV_OUTSIDE_HOURS");
    await expectDbError(createBooking(db, { date: day, start: "21:30", hours: 2, services: [jacuzzi] }), "SV_OUTSIDE_HOURS");
  });

  it("handles a midnight close: 11:00 PM is fine, 11:30 PM is refused", async () => {
    await hoursFor("15:00", "24:00");
    const b = await createBooking(db, { date: day, start: "23:00", services: [jacuzzi] });
    expect((await endOf(b.booking_id)).end_time).toBe("24:00:00");
    await db.query(`delete from bookings`);
    await expectDbError(createBooking(db, { date: day, start: "23:30", services: [jacuzzi] }), "SV_OUTSIDE_HOURS");
  });

  it("closed weekdays and closed dates stay closed for half-hour starts", async () => {
    await hoursFor("15:00", "23:00", false);
    await expectDbError(createBooking(db, { date: day, start: "16:30", services: [jacuzzi] }), "SV_CLOSED_DAY");
    await hoursFor("15:00", "23:00", true);
    await db.query(`insert into blocked_dates (date, reason) values ($1, 'Private event')`, [day]);
    await expectDbError(createBooking(db, { date: day, start: "16:30", services: [jacuzzi] }), "SV_CLOSED_DATE");
  });
});

describe("half-hour starts and other bookings or blocks", () => {
  it("3:00–4:00 and 3:30–4:30 clash; 4:00–5:00 is fine", async () => {
    await createBooking(db, { date: day, start: "15:00", services: [jacuzzi] });
    await expectDbError(createBooking(db, { date: day, start: "15:30", services: [jacuzzi] }), "SV_SLOT_TAKEN");
    await createBooking(db, { date: day, start: "16:00", services: [jacuzzi] });
  });

  it("a 2-hour booking from 3:30 blocks 4:30 and 5:00 but not 5:30", async () => {
    await createBooking(db, { date: day, start: "15:30", hours: 2, services: [jacuzzi] });
    await expectDbError(createBooking(db, { date: day, start: "16:30", services: [jacuzzi] }), "SV_SLOT_TAKEN");
    await expectDbError(createBooking(db, { date: day, start: "17:00", services: [jacuzzi] }), "SV_SLOT_TAKEN");
    await createBooking(db, { date: day, start: "17:30", services: [jacuzzi] });
  });

  it("a half-hour block (4:30–5:00) stops a 4:00 start but not a 5:00 start", async () => {
    await db.query(`insert into blocked_times (date, start_time, end_time) values ($1, '16:30', '17:00')`, [day]);
    await expectDbError(createBooking(db, { date: day, start: "16:00", services: [jacuzzi] }), "SV_BLOCKED_TIME");
    await createBooking(db, { date: day, start: "17:00", services: [jacuzzi] });
  });
});
