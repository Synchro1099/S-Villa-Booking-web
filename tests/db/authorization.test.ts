import { beforeEach, describe, expect, it } from "vitest";
import { asRole, createBooking, createTestDb, createUser, expectDbError, manilaDate, serviceIds, type Db } from "./harness";

let db: Db;
let alice: string;
let bob: string;
let owner: string;
let aliceBooking: { booking_id: string };
const day = manilaDate(4);

beforeEach(async () => {
  db = await createTestDb();
  alice = await createUser(db, "alice@example.com");
  bob = await createUser(db, "bob@example.com");
  owner = await createUser(db, "owner@example.com", "OWNER");
  const [jacuzzi] = await serviceIds(db, "jacuzzi");
  aliceBooking = await createBooking(db, { customerId: alice, date: day, start: "10:00", services: [jacuzzi] });
  await db.query(`select submit_payment_proof($1, 'p/alice.png', 'a.png', 'image/png', 100, null)`, [aliceBooking.booking_id]);
});

describe("roles", () => {
  it("public sign-ups are always CUSTOMER, even if metadata says OWNER", async () => {
    const res = await db.query<{ id: string }>(
      `insert into auth.users (email, raw_user_meta_data) values ('sneaky@example.com', '{"role":"OWNER"}') returning id`);
    const role = (await db.query<{ role: string }>(`select role from profiles where id = $1`, [res.rows[0].id])).rows[0].role;
    expect(role).toBe("CUSTOMER");
  });

  it("a customer cannot promote themselves to OWNER", async () => {
    await expectDbError(
      asRole(db, "authenticated", alice, (tx) => tx.query(`update profiles set role = 'OWNER' where id = $1`, [alice])),
      "permission denied",
    );
  });

  it("a customer can update their own name and mobile", async () => {
    await asRole(db, "authenticated", alice, (tx) =>
      tx.query(`update profiles set full_name = 'Alice A', mobile_number = '09170000000' where id = $1`, [alice]));
    const p = (await db.query<{ full_name: string }>(`select full_name from profiles where id = $1`, [alice])).rows[0];
    expect(p.full_name).toBe("Alice A");
  });
});

describe("customer restrictions", () => {
  it("cannot confirm bookings", async () => {
    await expectDbError(
      asRole(db, "authenticated", alice, (tx) => tx.query(`select owner_confirm_booking($1)`, [aliceBooking.booking_id])),
      "SV_FORBIDDEN",
    );
  });

  it("cannot change booking status directly", async () => {
    await expectDbError(
      asRole(db, "authenticated", alice, (tx) =>
        tx.query(`update bookings set status = 'CONFIRMED' where id = $1`, [aliceBooking.booking_id])),
      "permission denied",
    );
  });

  it("cannot modify service prices", async () => {
    const res = await asRole(db, "authenticated", alice, (tx) =>
      tx.query(`update services set price = 1 where slug = 'jacuzzi'`));
    expect(res.affectedRows).toBe(0);
    const price = (await db.query<{ price: string }>(`select price from services where slug = 'jacuzzi'`)).rows[0].price;
    expect(Number(price)).toBe(500);
  });

  it("cannot call create_booking directly (server-only, so totals can't be forged)", async () => {
    const [jacuzzi] = await serviceIds(db, "jacuzzi");
    await expectDbError(
      asRole(db, "authenticated", alice, (tx) => createBooking(tx, { date: day, start: "15:00", services: [jacuzzi] })),
      "permission denied",
    );
  });

  it("cannot view payment proofs, even their own row metadata", async () => {
    const own = await asRole(db, "authenticated", alice, (tx) => tx.query(`select * from payment_proofs`));
    expect(own.rows).toHaveLength(0);
    const other = await asRole(db, "authenticated", bob, (tx) => tx.query(`select * from payment_proofs`));
    expect(other.rows).toHaveLength(0);
  });

  it("only sees their own bookings", async () => {
    const mine = await asRole(db, "authenticated", alice, (tx) => tx.query(`select id from bookings`));
    expect(mine.rows).toHaveLength(1);
    const bobs = await asRole(db, "authenticated", bob, (tx) => tx.query(`select id from bookings`));
    expect(bobs.rows).toHaveLength(0);
    const anon = await asRole(db, "anon", null, (tx) => tx.query(`select id from bookings`).catch(() => ({ rows: [] })));
    expect(anon.rows).toHaveLength(0);
  });

  it("cannot read the guest access token", async () => {
    await expectDbError(
      asRole(db, "authenticated", alice, (tx) => tx.query(`select access_token from bookings`)),
      "permission denied",
    );
  });

  it("cannot read private closure reasons", async () => {
    await db.query(`insert into blocked_dates (date, reason) values ($1, 'Family visit')`, [manilaDate(9)]);
    const rows = await asRole(db, "anon", null, (tx) => tx.query(`select * from blocked_dates`));
    expect(rows.rows).toHaveLength(0);
  });
});

describe("owner access", () => {
  it("sees all bookings and payment proofs", async () => {
    const b = await asRole(db, "authenticated", owner, (tx) => tx.query(`select id from bookings`));
    expect(b.rows).toHaveLength(1);
    const p = await asRole(db, "authenticated", owner, (tx) => tx.query(`select file_path from payment_proofs`));
    expect(p.rows).toHaveLength(1);
  });

  it("can change prices, and the public reads the new price", async () => {
    await asRole(db, "authenticated", owner, (tx) => tx.query(`update services set price = 700 where slug = 'jacuzzi'`));
    const pub = await asRole(db, "anon", null, (tx) =>
      tx.query<{ price: string }>(`select price from services where slug = 'jacuzzi'`));
    expect(Number(pub.rows[0].price)).toBe(700);
  });

  it("can block dates, which then show on the public availability feed without the reason", async () => {
    await asRole(db, "authenticated", owner, (tx) =>
      tx.query(`insert into blocked_dates (date, reason) values ($1, 'Private Event')`, [manilaDate(5)]));
    const feed = await asRole(db, "anon", null, (tx) =>
      tx.query<{ kind: string }>(`select * from get_public_availability($1, $2)`, [manilaDate(0), manilaDate(10)]));
    const kinds = feed.rows.map((r) => r.kind).sort();
    expect(kinds).toEqual(["CLOSED_DATE", "PENDING"]);
    expect(JSON.stringify(feed.rows)).not.toContain("Private Event");
  });
});
