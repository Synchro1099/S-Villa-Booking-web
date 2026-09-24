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
3. **Emails:** see [Email settings](#email-settings) below. Without a Resend key, emails are only written to the server log. Every delivery attempt and error is recorded in the `notifications` table.
4. **Expiry emails:** `vercel.json` runs `/api/cron/expire` once a day (the Hobby plan limit). For faster "expired" emails, also call it every 5–10 minutes from a free service like cron-job.org, with the header `Authorization: Bearer <CRON_SECRET>`. Availability is always correct even without the cron. Lapsed holds are ignored and cleared automatically.
5. **SMS (optional):** set `SEMAPHORE_API_KEY` to send SMS updates through Semaphore.

### Email settings

S-Villa runs on the free `svilla.vercel.app` address with no email domain. Emails are sent through the business's **Gmail account, society22ph@gmail.com**, so both customers and the owner get them, from that address.

**One-time Google setup (signed in as society22ph@gmail.com):**
1. Turn on **2-Step Verification**: Google Account → *Security*.
2. Open <https://myaccount.google.com/apppasswords>, create an app password named e.g. "S-Villa website", and copy the 16-letter code. App passwords stop working if the Google password is changed; then make a new one and update `GMAIL_APP_PASSWORD`.

**In Vercel → *Settings → Environment Variables*,** set these, then **redeploy** (*Deployments → ⋯ → Redeploy*). Paste only the value, with no quotes and no `NAME=` in front.

| Variable | Value |
| --- | --- |
| `GMAIL_USER` | `society22ph@gmail.com` |
| `GMAIL_APP_PASSWORD` | The 16-letter app password (spaces are fine). |
| `OWNER_NOTIFICATION_EMAIL` | `society22ph@gmail.com` (where owner alerts go). |
| `EMAIL_REDIRECT_TO` | **Delete it.** If it's set, every customer email goes to that address as a test copy instead. |

With `GMAIL_USER` and `GMAIL_APP_PASSWORD` set, Gmail is used and the Resend settings (`RESEND_API_KEY`, `EMAIL_FROM`) are ignored, so you can leave or delete them. Gmail allows about 500 emails a day, far more than the site needs.

**To check it works:** make a test booking using a *different* email address. The customer should get "Reservation received" and society22ph@gmail.com should get "New booking — SV-…". The booking page should say "We'll email updates to …". In Supabase, the `notifications` table shows each email as `SENT`. A `FAILED` row has the reason in the `error` column; a rejected sign-in means the app password is wrong or was revoked.

**Using Resend instead** (Gmail settings empty): set `RESEND_API_KEY`, keep `EMAIL_FROM` as `S-Villa <onboarding@resend.dev>`, and set `OWNER_NOTIFICATION_EMAIL` to the exact address the Resend account was created with. Without a verified domain, Resend's test sender can only email that address, so customer emails are skipped (logged `SKIPPED`) and the booking page tells customers to keep their reference instead. With a verified domain, set `EMAIL_FROM` to e.g. `S-Villa <bookings@your-domain.com>` and customer emails turn on.

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
