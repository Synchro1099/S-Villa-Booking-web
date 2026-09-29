import { beforeEach, describe, expect, it } from "vitest";
import { asRole, createTestDb, createUser, expectDbError, type Db } from "./harness";

let db: Db;
let alice: string;
let owner: string;

beforeEach(async () => {
  db = await createTestDb();
  alice = await createUser(db, "alice@example.com");
  owner = await createUser(db, "owner@example.com", "OWNER");
  await db.query(`update caretaker_contact set name = 'Nena', mobile = '09171234567' where id = 1`);
});

describe("house rules and directions (public settings)", () => {
  it("start with the client's house rules, including the caretaker and max-guests tags", async () => {
    const { rows } = await asRole(db, "anon", null, (tx) => tx.query<{ house_rules: string; directions_url: string }>(`select house_rules, directions_url from settings where id = 1`));
    const rules = rows[0].house_rules.split("\n");
    expect(rules).toHaveLength(9);
    expect(rules[0]).toMatch(/^\*\*Payment is non-refundable once your booking is confirmed\.\*\*/);
    expect(rules).toContain("**When you arrive, call our caretaker.** {caretaker}");
    expect(rules).toContain("**Guests may use the court, the courtyard and any add-ons you booked.** Please don't enter the villa's indoor rooms.");
    expect(rules.at(-1)).toBe("**Up to {max_guests} guests per booking.** Extra guests can be arranged with the caretaker at ₱100 per person per hour.");
    expect(rows[0].directions_url).toBe("");
  });

  it("only the owner can change them", async () => {
    await asRole(db, "authenticated", alice, (tx) => tx.query(`update settings set house_rules = 'hacked' where id = 1`));
    await asRole(db, "authenticated", owner, (tx) => tx.query(`update settings set house_rules = 'New rule.' where id = 1`));
    const { rows } = await db.query<{ house_rules: string }>(`select house_rules from settings where id = 1`);
    expect(rows[0].house_rules).toBe("New rule.");
  });

  it("reject overly long text", async () => {
    await expectDbError(db.query(`update settings set house_rules = repeat('x', 4001) where id = 1`), "check");
  });
});

describe("caretaker contact (owner-only)", () => {
  it("anonymous visitors can't read it at all", async () => {
    await expectDbError(asRole(db, "anon", null, (tx) => tx.query(`select * from caretaker_contact`)), "permission denied");
  });

  it("signed-in customers get no rows", async () => {
    const { rows } = await asRole(db, "authenticated", alice, (tx) => tx.query(`select * from caretaker_contact`));
    expect(rows).toEqual([]);
  });

  it("customers can't change it", async () => {
    await asRole(db, "authenticated", alice, (tx) => tx.query(`update caretaker_contact set mobile = '09990000000' where id = 1`));
    const { rows } = await db.query<{ mobile: string }>(`select mobile from caretaker_contact where id = 1`);
    expect(rows[0].mobile).toBe("09171234567");
  });

  it("the owner can read and update it", async () => {
    await asRole(db, "authenticated", owner, (tx) => tx.query(`update caretaker_contact set viber = '09187654321' where id = 1`));
    const { rows } = await asRole(db, "authenticated", owner, (tx) => tx.query<{ name: string; viber: string }>(`select name, viber from caretaker_contact`));
    expect(rows).toEqual([{ name: "Nena", viber: "09187654321" }]);
  });

  it("stays a single row: nobody can add or delete rows through the API", async () => {
    await expectDbError(asRole(db, "authenticated", owner, (tx) => tx.query(`insert into caretaker_contact (id) values (2)`)), "permission denied");
    await expectDbError(asRole(db, "authenticated", owner, (tx) => tx.query(`delete from caretaker_contact`)), "permission denied");
    await expectDbError(db.query(`insert into caretaker_contact (id) values (2)`), "check");
  });
});
