import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type Db } from "./harness";

const MIGRATION = readFileSync(join(__dirname, "..", "..", "supabase", "migrations", "20260927000002_pickleball_first_blurb.sql"), "utf8");
const PREVIOUS = "A private villa and courtyard for small groups — pickleball, badminton, a KTV lounge and a jacuzzi, reserved exclusively for you.";

let db: Db;
const blurb = async () => (await db.query<{ d: string }>(`select business_description d from public.settings`)).rows[0].d;

beforeEach(async () => {
  db = await createTestDb();
});

describe("pickleball-first footer blurb", () => {
  it("replaces the previous default", async () => {
    await db.query(`update public.settings set business_description = $1`, [PREVIOUS]);
    await db.exec(MIGRATION);
    expect(await blurb()).toMatch(/^A private indoor pickleball court for your group/);
  });

  it("leaves the owner's own wording alone", async () => {
    await db.query(`update public.settings set business_description = 'Our own words.'`);
    await db.exec(MIGRATION);
    expect(await blurb()).toBe("Our own words.");
  });

  it("matches what a fresh install gets from seed.sql", async () => {
    expect(await blurb()).toMatch(/^A private indoor pickleball court for your group/);
  });
});
