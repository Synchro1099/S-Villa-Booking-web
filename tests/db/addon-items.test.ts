import { beforeEach, describe, expect, it } from "vitest";
import { createBooking, createTestDb, expectDbError, manilaDate, serviceIds, type Db } from "./harness";

let db: Db;
let jacuzzi: string; // ₱500 per hour in the seed data
let coffee: string;
const day = manilaDate(3);

const items = async (bookingId: string) =>
  (
    await db.query<{ service_name_snapshot: string; pricing_unit_snapshot: string; quantity: string; subtotal: string }>(
      `select service_name_snapshot, pricing_unit_snapshot, quantity, subtotal from booking_items where booking_id = $1 order by service_name_snapshot`,
      [bookingId],
    )
  ).rows.map((r) => [r.service_name_snapshot, r.pricing_unit_snapshot, Number(r.quantity), Number(r.subtotal)]);

const total = async (bookingId: string) =>
  Number((await db.query<{ total_amount: string }>(`select total_amount from bookings where id = $1`, [bookingId])).rows[0].total_amount);

beforeEach(async () => {
  db = await createTestDb();
  [jacuzzi] = await serviceIds(db, "jacuzzi");
  coffee = (
    await db.query<{ id: string }>(
      `insert into services (slug, name, description, price, pricing_unit, icon, sort_order) values ('coffee', 'Coffee', '', 100, 'ITEM', 'sparkles', 9) returning id`,
    )
  ).rows[0].id;
  await db.query(`update operating_hours set is_open = true, open_time = '08:00', close_time = '22:00' where weekday = extract(dow from $1::date)`, [day]);
});

describe("per-item extras", () => {
  it("charges price × the quantity the guest picked, not × hours", async () => {
    const b = await createBooking(db, { date: day, start: "10:00", hours: 3, services: [jacuzzi, coffee], quantities: { [coffee]: 2 } });
    expect(await items(b.booking_id)).toEqual([
      ["Coffee", "ITEM", 2, 200],
      ["Jacuzzi", "HOUR", 3, 1500],
    ]);
    expect(await total(b.booking_id)).toBe(1700);
  });

  it("defaults to one when no quantity is sent", async () => {
    const b = await createBooking(db, { date: day, start: "10:00", hours: 2, services: [coffee] });
    expect(await total(b.booking_id)).toBe(100);
  });

  it("ignores quantities sent for hourly services", async () => {
    const b = await createBooking(db, { date: day, start: "10:00", hours: 2, services: [jacuzzi], quantities: { [jacuzzi]: 9 } });
    expect(await total(b.booking_id)).toBe(1000);
  });

  it("accepts the 1 and 50 limits", async () => {
    const b = await createBooking(db, { date: day, start: "10:00", services: [coffee], quantities: { [coffee]: 50 } });
    expect(await items(b.booking_id)).toEqual([["Coffee", "ITEM", 50, 5000]]);
    const c = await createBooking(db, { date: day, start: "14:00", services: [coffee], quantities: { [coffee]: 1 } });
    expect(await total(c.booking_id)).toBe(100);
  });

  it("rejects quantities outside 1 to 50 or not whole numbers", async () => {
    for (const q of [0, -1, 51, 1.5, "3", "abc", null, [2], { n: 2 }]) {
      await expectDbError(
        createBooking(db, { date: day, start: "10:00", services: [coffee], quantities: { [coffee]: q } }),
        "SV_QUANTITY_INVALID",
      );
    }
  });

  it("leaves no booking behind when a quantity is refused", async () => {
    await expectDbError(
      createBooking(db, { date: day, start: "10:00", services: [coffee], quantities: { [coffee]: 99 } }),
      "SV_QUANTITY_INVALID",
    );
    const count = (await db.query<{ n: number }>(`select count(*)::int as n from bookings`)).rows[0].n;
    expect(count).toBe(0);
  });

  it("allows the per-item unit on services; other units are still refused", async () => {
    await db.query(`update services set pricing_unit = 'ITEM' where id = $1`, [jacuzzi]);
    await expect(db.query(`update services set pricing_unit = 'DOZEN' where id = $1`, [coffee])).rejects.toThrow();
    await expect(
      db.query(
        `insert into services (slug, name, description, price, pricing_unit, icon, sort_order) values ('x', 'X', '', 1, 'PIECE', 'sparkles', 1)`,
      ),
    ).rejects.toThrow();
  });

  it("keeps a single create_booking (the old signature is dropped)", async () => {
    const res = await db.query<{ args: string }>(
      `select pg_get_function_identity_arguments(p.oid) as args from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'create_booking'`,
    );
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].args).toContain("p_quantities jsonb");
  });
});
