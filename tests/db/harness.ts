/**
 * Runs the real Supabase migrations against an in-process PostgreSQL (PGlite)
 * so the booking engine, constraints and RLS can be tested without Docker.
 * The Supabase `auth` schema is stubbed with the pieces our SQL relies on.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";

const ROOT = join(__dirname, "..", "..");

const AUTH_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  grant usage on schema auth to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
  $$;
  create function auth.role() returns text language sql stable as $$
    select current_setting('request.jwt.claims', true)::jsonb ->> 'role'
  $$;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated, service_role;
`;

export async function createTestDb() {
  const db = await PGlite.create({ extensions: { btree_gist } });
  await db.exec(AUTH_STUB);

  const dir = join(ROOT, "supabase", "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql") && !f.includes("storage"))
    .sort();
  for (const file of files) {
    await db.exec(readFileSync(join(dir, file), "utf8"));
  }
  await db.exec(readFileSync(join(ROOT, "supabase", "seed.sql"), "utf8"));
  // Tests should not depend on lead time.
  await db.exec(`update public.settings set min_lead_minutes = 0 where id = 1;`);
  return db;
}

export type Db = PGlite;

/** Run `fn` as a Supabase API role (anon / authenticated / service_role). */
export async function asRole<T>(
  db: Db,
  role: "anon" | "authenticated" | "service_role",
  userId: string | null,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    const claims = JSON.stringify({ sub: userId ?? "", role });
    await tx.query(`select set_config('request.jwt.claims', $1, true)`, [claims]);
    await tx.exec(`set local role ${role}`);
    return fn(tx);
  });
}

export async function createUser(db: Db, email: string, role: "CUSTOMER" | "OWNER" = "CUSTOMER") {
  const res = await db.query<{ id: string }>(
    `insert into auth.users (email, raw_user_meta_data) values ($1, '{"full_name":"Test User"}') returning id`,
    [email],
  );
  const id = res.rows[0].id;
  if (role === "OWNER") {
    await db.query(`update public.profiles set role = 'OWNER' where id = $1`, [id]);
  }
  return id;
}

/** A date `daysAhead` from today in Manila time (UTC+8), as YYYY-MM-DD. */
export function manilaDate(daysAhead: number): string {
  const now = new Date(Date.now() + 8 * 3600_000 + daysAhead * 86400_000);
  return now.toISOString().slice(0, 10);
}

export async function serviceIds(db: Db, ...slugs: string[]) {
  const res = await db.query<{ id: string; slug: string }>(
    `select id, slug from public.services where slug = any($1)`,
    [slugs],
  );
  return slugs.map((s) => res.rows.find((r) => r.slug === s)!.id);
}

export interface BookingInput {
  customerId?: string | null;
  date: string;
  start: string;
  hours?: number;
  guests?: number;
  services: string[];
  method?: string;
}

export async function createBooking(db: Db | Transaction, input: BookingInput) {
  const res = await db.query<{ booking_id: string; booking_reference: string; access_token: string }>(
    `select * from public.create_booking($1, $2, $3, $4, $5::date, $6::time, $7, $8, $9::uuid[], $10, $11)`,
    [
      input.customerId ?? null,
      "Juan Dela Cruz",
      "juan@example.com",
      "09171234567",
      input.date,
      input.start,
      input.hours ?? 1,
      input.guests ?? 3,
      input.services,
      input.method ?? "GCASH",
      null,
    ],
  );
  return res.rows[0];
}

export async function expectDbError(promise: Promise<unknown>, code: string) {
  try {
    await promise;
  } catch (e) {
    const message = (e as Error).message;
    if (!message.includes(code)) {
      throw new Error(`Expected ${code} but got: ${message}`);
    }
    return;
  }
  throw new Error(`Expected ${code} but the call succeeded`);
}
