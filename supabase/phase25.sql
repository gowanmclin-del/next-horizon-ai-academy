-- Phase 25 — AI-101 launch price
-- Clearing an older Stripe price ID makes checkout use the database amount.

update public.courses
set
  price_cents = 9900,
  sale_price_cents = null,
  currency = 'usd',
  is_paid = true,
  enrollment_open = true,
  stripe_price_id = null,
  updated_at = now()
where slug = 'ai-101';
