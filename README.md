# S-Villa — Private Pickleball & Courtyard

Booking and reservation platform: a public website with live pricing and availability, a step-by-step booking flow with GCash / bank transfer payment proof, and a simple Owner Portal.

**Stack:** Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) · Zod · Vitest

---

## 1. Set up Supabase (free tier is enough)

1. Create a project at [supabase.com](https://supabase.com). Choose the **Southeast Asia (Singapore)** region.
2. Open **SQL Editor** and run these files **in order**, pasting each one:
   1. `supabase/migrations/20260923000001_schema.sql`
   2. `supabase/migrations/20260923000002_booking_functions.sql`
   3. `supabase/migrations/20260923000003_security.sql`
   4. `supabase/migrations/20260923000004_storage.sql`
   5. `supabase/seed.sql` (default services, prices and hours; change them later in the Owner Portal)

   If you use the Supabase CLI, `supabase db push` followed by running `seed.sql` does the same.
3. **Authentication → URL Configuration:** set *Site URL* to your website address (e.g. `https://s-villa.vercel.app`) and add `https://<your-site>/auth/confirm` to *Redirect URLs*.
4. **Project Settings → API:** copy the URL, `anon` key and `service_role` key for the next step.

## 2. Run locally

```bash
cp .env.example .env.local   # then fill in the Supabase values
npm install
npm run dev                  # http://localhost:3000
```

## 3. Create the owner account

1. Register on the website at `/register` with the owner's email and confirm it.
2. In the Supabase SQL Editor, run:
   ```sql
   update public.profiles set role = 'OWNER' where email = 'owner@example.com';
   ```
3. Sign in. You'll see **Owner Portal** at `/owner`.

Nobody can make themselves an owner from the website. New accounts are always `CUSTOMER`, and the database blocks changes to the role column.

## 4. Deploy (Vercel)

1. Push the repo to GitHub and import it in Vercel.
2. Add the variables from `.env.example` under *Settings → Environment Variables*, and set `NEXT_PUBLIC_SITE_URL` to your production URL.
3. **Emails:** create a free [Resend](https://resend.com) account, verify your domain and set `RESEND_API_KEY` and `EMAIL_FROM`. Without a key, emails are only written to the server log. Before the domain is verified, use `EMAIL_FROM="S-Villa <onboarding@resend.dev>"` and set `EMAIL_REDIRECT_TO` to your Resend signup address; every email then goes there, marked with who it was meant for. Delivery attempts and errors are recorded in the `notifications` table.
4. **Expiry emails:** `vercel.json` runs `/api/cron/expire` once a day (the Hobby plan limit). For faster "expired" emails, also call it every 5–10 minutes from a free service like cron-job.org, with the header `Authorization: Bearer <CRON_SECRET>`. Availability is always correct even without the cron. Lapsed holds are ignored and cleared automatically.
5. **SMS (optional):** set `SEMAPHORE_API_KEY` to send SMS updates through Semaphore.

---

## How it works

| Concern | Approach |
| --- | --- |
| **Double booking** | A Postgres `EXCLUDE USING gist` constraint on `(resource_key, time_range)` for PENDING/CONFIRMED bookings. Two simultaneous requests for overlapping times cannot both commit. |
| **Booking creation** | A single transactional function, `create_booking()`, checks guests, hours, closures, blocked times, services, lead time and booking window, calculates the total from **current** `services.price`, and writes immutable `booking_items` snapshots, the payment record and the `SV-YYYY-NNNNN` reference. It runs only on the server (service role). |
| **Venue model** | Exclusive: one booking = one private group (max 6, configurable) = the whole villa. `resource_key` makes per-facility bookings possible later. |
| **Pricing** | `services.price` is the only live price. Every price shown on the site comes from it. Past bookings always show their stored snapshot prices. |
| **Pending holds** | A new booking holds the slot for `booking_expiration_minutes` (default 30). Uploading a proof keeps the hold until the owner decides. Unpaid holds expire and free the slot. |
| **Payment proofs** | Private Storage bucket with no public policies. The file type is checked from its content (magic bytes), limited to 5 MB, and stored under server-generated paths. Only the owner can view proofs, through 60-second signed URLs. |
| **Guest access** | Customers can book without an account. Each booking has a secret link (emailed), or can be found with reference + email/mobile. |
| **Security** | RLS on every table, owner checks in server code **and** in the database, rate limiting on booking, login, lookup and uploads, and no client-supplied price, total, status or role is ever trusted. |
| **Notifications** | `src/lib/notifications`: EMAIL (Resend), SMS (Semaphore) and IN_APP (status pages), with every attempt logged in `notifications`. |

### Project layout

```
supabase/          migrations (schema, booking engine, RLS, storage) + seed
src/app/(public)   website, booking flow, status page, customer account
src/app/owner      Owner Portal
src/actions        server actions (bookings, auth, owner)
src/lib            availability engine, pricing, validation, data access, notifications
src/components     UI (design system, calendar, booking wizard, owner widgets)
tests/db           booking rules, pricing & authorization against real Postgres (PGlite)
tests/unit         availability engine, pricing, validation, uploads
```

## Tests

```bash
npm test          # 59 tests; DB tests run the real migrations in in-memory Postgres
npm run typecheck
npm run lint
```

## Photos & videos

Put images and videos in `public/media/`. Facility photos can also be set per service through `services.image_url`.
