import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createBooking, createTestDb, expectDbError, manilaDate, serviceIds, type Db } from "./harness";

const MIGRATION = readFileSync(join(__dirname, "..", "..", "supabase", "migrations", "20260927000001_ktv_lounge.sql"), "utf8");
const OLD_BLURB =
  "A private villa and courtyard for small groups — pickleball, badminton, music, a jacuzzi and a bar & lounge, reserved exclusively for you.";

let db: Db;

/** Rewind a fresh database to the live site's state before the merge. */
async function beforeMerge(db: Db, barPrice = 650) {
  await db.exec(`
    delete from public.services where slug = 'ktv-lounge';
    insert into public.services (slug, name, description, price, pricing_unit, icon, sort_order) values
      ('music-room', 'Music Room', 'Karaoke and instruments.', 500, 'HOUR', 'music', 3),
      ('bar-lounge', 'Bar & Lounge', 'A relaxed lounge.', ${barPrice}, 'HOUR', 'wine', 5);
  `);
  await db.query(`update public.settings set business_description = $1 where id = 1`, [OLD_BLURB]);
}

beforeEach(async () => {
  db = await createTestDb();
  await beforeMerge(db);
});

describe("KTV Lounge merge", () => {
  it("hides Music Room and Bar & Lounge and adds KTV Lounge at Bar & Lounge's price", async () => {
    await db.exec(MIGRATION);
    const rows = (
      await db.query<{ slug: string; name: string; price: string; pricing_unit: string; is_active: boolean }>(
        `select slug, name, price, pricing_unit, is_active from public.services where slug in ('music-room', 'bar-lounge', 'ktv-lounge') order by slug`,
      )
    ).rows;
    expect(rows.map((r) => [r.slug, r.is_active])).toEqual([
      ["bar-lounge", false],
      ["ktv-lounge", true],
      ["music-room", false],
    ]);
    const ktv = rows.find((r) => r.slug === "ktv-lounge")!;
    expect(ktv.name).toBe("KTV Lounge");
    expect(Number(ktv.price)).toBe(650);
    expect(ktv.pricing_unit).toBe("HOUR");
  });

  it("keeps past bookings of the old services intact", async () => {
    const [bar, music] = await serviceIds(db, "bar-lounge", "music-room");
    const b = await createBooking(db, { date: manilaDate(3), start: "14:00", services: [bar, music] });
    await db.exec(MIGRATION);

    const items = (
      await db.query<{ service_name_snapshot: string; unit_price: string }>(
        `select service_name_snapshot, unit_price from public.booking_items where booking_id = $1 order by service_name_snapshot`,
        [b.booking_id],
      )
    ).rows;
    expect(items.map((i) => i.service_name_snapshot)).toEqual(["Bar & Lounge", "Music Room"]);
    expect(Number(items[0].unit_price)).toBe(650);
  });

  it("stops new bookings of the old services and accepts the KTV Lounge", async () => {
    await db.exec(MIGRATION);
    const [bar, ktv] = await serviceIds(db, "bar-lounge", "ktv-lounge");
    await expectDbError(createBooking(db, { date: manilaDate(3), start: "10:00", services: [bar] }), "SV_SERVICE_INVALID");
    const b = await createBooking(db, { date: manilaDate(3), start: "12:00", services: [ktv] });
    expect(b.booking_reference).toMatch(/^SV-/);
  });

  it("updates the footer blurb only if the owner hasn't rewritten it", async () => {
    await db.exec(MIGRATION);
    const blurb = async () => (await db.query<{ d: string }>(`select business_description d from public.settings`)).rows[0].d;
    expect(await blurb()).toContain("KTV lounge");

    await db.query(`update public.settings set business_description = 'Our own words.'`);
    await db.exec(MIGRATION);
    expect(await blurb()).toBe("Our own words.");
  });

  it("is safe to run twice", async () => {
    await db.exec(MIGRATION);
    await db.query(`update public.services set price = 700 where slug = 'ktv-lounge'`);
    await db.exec(MIGRATION);
    const n = (await db.query<{ n: number; price: string }>(`select count(*)::int n, max(price) price from public.services where slug = 'ktv-lounge'`)).rows[0];
    expect(n.n).toBe(1);
    expect(Number(n.price)).toBe(700);
  });
});
