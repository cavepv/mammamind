# Tasks: Locked Event Access

> **Pre-commit rule**: Before every commit, run caveman-review with `claude-opus-4.6` AND `gpt-5.3-codex`. Do not push until both reviews are addressed or explicitly dismissed.

## Phase 1 — Supabase Setup

- [x] Create Supabase project at supabase.com, store project URL + anon key + service role key in `.env.local` (gitignored). Verify: project accessible, keys valid.
- [x] Create DB migration: `events`, `access_keys`, `purchases` tables per design.md schema. Add RLS: anon SELECT on events; anon SELECT only key/event_id/expires_at on access_keys; no anon access to purchases. Verify: tables exist, RLS blocks email read from access_keys.
- [x] Seed first event row for "Trygg återstart efter graviditet" with placeholder stripe_price_id. Verify: SELECT from events returns row. (id=ba96212d-c9d6-466b-95a2-6cac56e4b81c)

## Phase 2 — Stripe Setup

- [x] Create Stripe product "Trygg återstart efter graviditet", price 89900 öre (899 SEK) one-time. Note price_id. Update events row. Verify: product visible in Stripe dashboard. (price_1Tj3PW1mtU9Z73ip25cRut4D)
- [ ] Add Stripe webhook endpoint pointing to stripe-webhook Edge Function URL, event: checkout.session.completed. Note signing secret. Verify: test event delivered in Stripe dashboard.

## Phase 3 — Resend + DNS Setup

- [ ] Create Resend account, add domain mammamind.se. Verify: domain added, DKIM record value available.
- [ ] Add DKIM TXT record and update SPF TXT record at one.com DNS panel. Verify: Resend dashboard shows domain as verified.

## Phase 4 — Edge Functions

- [x] Create and deploy `verify-key` Supabase Edge Function: POST {key} → lookup access_keys JOIN events → return {valid, reason?, event?}. Verify: curl valid key returns event data; invalid key returns {valid:false}.
- [x] Create and deploy `create-key` Supabase Edge Function (service role only): POST {event_id, email, expires_at?} → generate UUID key → insert access_keys → call Resend to send email. Verify: invoke → row in DB + email received.
- [x] Create and deploy `stripe-webhook` Supabase Edge Function: verify Stripe signature → extract email + metadata.event_id → insert purchases → call create-key logic. Verify: Stripe test checkout → key email received.
- [x] Create and deploy `create-checkout-session` Supabase Edge Function (service role only): POST {event_id, success_url, cancel_url} → create Stripe Checkout Session with metadata.event_id. Verify: returns checkout URL.

## Phase 5 — Content Page

- [x] Create `content/index.html`: read ?key= from URL, POST to verify-key, render states (loading/valid/invalid/no-key) per design.md. Style using existing general.css + buttons.css. Verify: valid key shows content; expired/invalid key shows error.
- [x] Add connect-src for Supabase URL to CSP meta on content page. Verify: no CSP violations in browser console on content page.

## Phase 6 — Stripe Checkout on Course Pages

- [x] Add "Köp plats" button to each course page. On click: POST to create-checkout-session Edge Function → redirect to Stripe hosted Checkout. Verify: button click redirects to Stripe; test payment completes → key email received.

## Phase 7 — Invite Script

- [x] Create `scripts/invite.js`: usage `node scripts/invite.js <event_id> <email> [expires_at]`. Calls create-key Edge Function with service role key. Prints key URL on success. Verify: run script → row in DB + email received.

## Phase 8 — End-to-End + Review

- [ ] Full E2E test in Stripe test mode: purchase → email → content page; expired key → error; invalid key → error; invite script → email → content page.
- [ ] Pre-commit dual-model review: run caveman-review with claude-opus-4.6 AND gpt-5.3-codex, address or dismiss all findings.
- [ ] Go live: switch Stripe to live mode, verify webhook, deploy, smoke test with real purchase.
