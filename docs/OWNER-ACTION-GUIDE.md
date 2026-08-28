# Owner Action Guide

This guide is written for the academy owner, not a developer. It walks
through everything you need to do **outside the code** to get Next
Horizon AI Academy running for real. Nothing here requires you to write
or edit code — you'll be creating accounts, copying a few values into a
settings screen, and clicking through some setup screens.

**You will never be asked to paste a secret key into a document, a chat,
or commit it to a code repository.** Every secret key you're given below
goes into exactly one place: your hosting provider's "Environment
Variables" settings screen (Vercel, or wherever this project is
deployed). If anyone ever asks you to send a key anywhere else, don't.

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account if you don't have one.
2. Create a new project. Choose a strong database password and store it somewhere safe (a password manager) — you likely won't need it directly, but keep it.
3. Once the project is created, go to **Settings → API**. You'll see:
   - **Project URL** — this is `NEXT_PUBLIC_SUPABASE_URL`.
   - **anon / public key** — this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - **service_role key** — this is `SUPABASE_SERVICE_ROLE_KEY`. This one is more sensitive than the others — it's used in exactly one place (processing Stripe payments) and should never be shared beyond your hosting provider's environment variable settings.
4. Copy all three values somewhere temporary (a password manager, not a shared doc) — you'll paste them into your hosting provider shortly.

## 2. Set up the database

1. In your Supabase project, open the **SQL Editor** (left sidebar).
2. You'll find a set of `.sql` files in the project's `supabase/` folder, numbered in order. Open each one, copy its full contents, paste into the SQL Editor, and click **Run**. Do this **in this exact order**:
   1. `schema.sql`
   2. `seed.sql`
   3. `phase5.sql`
   4. `phase5.1.sql`
   5. `phase6.sql`
   6. `phase7.sql`
   7. `phase8.sql`
   8. `phase9.sql`
   9. `phase10.sql`
   10. `phase11.sql`
   11. `phase12.sql`
   12. `phase17.sql`
   13. `phase18.sql` — **run this immediately after `phase17.sql`, with nothing in between.** `phase17.sql` alone temporarily breaks module/lesson reordering in the admin Course Builder; `phase18.sql` is the fix. Never leave a database with `phase17.sql` applied but not `phase18.sql`.
3. Skip `optional-second-course-fixture.sql` for now — it's for testing only, not required.
4. If any step shows an error, stop and ask your developer for help before continuing to the next file — running them out of order can fail.

## 3. Promote yourself to the first administrator

There is deliberately no button anywhere in the app to make yourself an
admin — that's a safety feature. You do it once, directly in Supabase:

1. Create your own account on the live website first (sign up normally).
2. In Supabase, go to **SQL Editor** and run this, replacing the email with your own:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
3. Log out and back in on the website. You should now see an "Admin" area.

## 4. Configure Stripe (test mode first)

1. Go to [stripe.com](https://stripe.com) and create an account.
2. Stay in **Test mode** (toggle in the top-right of the Stripe Dashboard) until you've completed a full test purchase successfully — do not switch to Live mode yet.
3. Go to **Developers → API keys**. Copy the **Secret key** (starts with `sk_test_...`) — this is `STRIPE_SECRET_KEY`.
4. You do **not** need the "Publishable key" for this project — it uses Stripe's hosted checkout page, not an embedded payment form.

## 5. Set up the Stripe webhook

This is the step that actually grants a student access after they pay —
without it, payments will succeed in Stripe but students won't get
enrolled.

1. In the Stripe Dashboard, go to **Developers → Webhooks → Add endpoint**.
2. Endpoint URL: `https://yourdomain.com/api/webhooks/stripe` (replace with your real domain once deployed).
3. Select these events to send:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.expired`
   - `charge.refunded`
4. After creating it, click into the new endpoint and copy its **Signing secret** (starts with `whsec_...`) — this is `STRIPE_WEBHOOK_SECRET`.

## 6. Set up Resend (for account emails)

This step is optional — the academy works without it, it just won't send
welcome/enrollment/certificate emails until this is done.

1. Go to [resend.com](https://resend.com) and create an account.
2. Add and verify a sending domain (Resend will give you DNS records to add — see the next step).
3. Create an API key. This is `RESEND_API_KEY`.
4. Decide on a "from" address, e.g. `Next Horizon AI Academy <hello@yourdomain.com>` — this is `EMAIL_FROM`.

## 7. Point your domain at the deployment

1. Deploy the project to your hosting provider (e.g. Vercel) if it isn't already.
2. In your hosting provider's project settings, add your real domain (e.g. `nexthorizonaiacademy.com`).
3. Follow your hosting provider's instructions to add the DNS records they give you at your domain registrar. This step varies by provider — ask your developer if you're unsure.
4. If you set up Resend in step 6, also add Resend's DNS records at the same place.

## 8. Set your environment variables

In your hosting provider's project settings, find **Environment
Variables** and add each of these (values from the steps above):

| Variable | From step |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 1 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 1 |
| `SUPABASE_SERVICE_ROLE_KEY` | 1 |
| `STRIPE_SECRET_KEY` | 4 |
| `STRIPE_WEBHOOK_SECRET` | 5 |
| `RESEND_API_KEY` | 6 (optional) |
| `EMAIL_FROM` | 6 (optional) |
| `NEXT_PUBLIC_SITE_URL` | your real domain, e.g. `https://www.nexthorizonaiacademy.com` — **required**, see note below |
| `NEXT_PUBLIC_CONTACT_EMAIL` | optional — a real email address to show on the Contact page, e.g. `hello@nexthorizonaiacademy.com` |

**Important about `NEXT_PUBLIC_SITE_URL`:** this must be your real,
final domain with `https://` in front of it — not `localhost`, not a
placeholder, not a temporary preview URL. If it's missing or wrong,
students will not be able to check out at all — the checkout button will
show a clear error instead of silently breaking, but it will not work
until this is set correctly.

After saving, redeploy the project so the new values take effect (most
hosting providers do this automatically when you save environment
variables, but check).

## 9. Do a real test purchase

1. Visit your live site and sign up for a new test account (use an email you can check).
2. Go to a paid course and click enroll/purchase.
3. On the Stripe checkout page, use Stripe's official test card:
   **Card number:** `4242 4242 4242 4242`, any future expiry date, any 3-digit CVC, any ZIP.
4. Complete the purchase.
5. Confirm you land on a "payment confirmed" page.
6. Log into your test account's dashboard and confirm the course now appears there.
7. Check your test account's inbox for the enrollment confirmation email (if you set up Resend).

## 10. Confirm enrollment and certificates work

1. As your test student, complete every lesson in the course.
2. Take the final assessment and pass it.
3. Confirm a certificate becomes available on the Certificates page.
4. Copy its verification code and visit `/verify` on your site — confirm it shows as valid.

## 11. Check the admin side

1. Log in as your admin account.
2. Visit `/admin` and confirm you see the test student and their order.
3. Visit `/admin/launch-readiness` and confirm the configuration checks look right.
4. Work through `/admin/acceptance-test` as a full checklist before telling real students the academy is open.

## 12. When you're ready to go live with real payments

1. In Stripe, switch from Test mode to **Live mode**.
2. Repeat step 4 to get your **live** secret key (starts with `sk_live_...`) and replace `STRIPE_SECRET_KEY` in your hosting provider's settings.
3. Repeat step 5 to create a **live-mode** webhook endpoint (test-mode and live-mode webhooks are separate) and replace `STRIPE_WEBHOOK_SECRET`.
4. Do one more real test purchase with a real card for a small/refundable amount to confirm everything works in live mode, then refund it from `/admin/orders` if you'd like.

---

If you get stuck on any step, the exact error message (a screenshot is
fine) is the most helpful thing you can share with your developer.
