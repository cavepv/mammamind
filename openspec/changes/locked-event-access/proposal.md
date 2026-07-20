# Locked Event Access

## What

Add a private key-based access system for MammaMind courses and workshops. Users purchase or receive an invite to a locked event and get a unique access key delivered by email. That key unlocks a protected content page showing event-specific materials (Zoom links, course resources, etc.).

## Why

The current site only supports interest registration via Formspree. There is no way to:
- Gate content behind payment
- Deliver digital access automatically after purchase
- Distinguish paying participants from non-paying visitors

This feature closes the gap between interest → payment → access, enabling Tara to sell course spots and deliver content without manual follow-up for every participant.

## Goals

- User purchases an event via Stripe → receives a key by email automatically
- Admin invites a user → receives a key by email (manual script, no UI)
- Key unlocks a single generic content page (`/content/index.html`)
- Keys can be permanent or time-bound (per event config)
- Keys work across devices (no account required)

## Non-Goals

- User accounts / login
- Admin UI for key management
- Subscription / recurring billing
- Per-device session locking
- Server-side route protection (client-side validation sufficient for v1)

## Approach

- **Backend**: Supabase (Postgres DB + Edge Functions)
- **Payments**: Stripe (one-time, Klarna + card)
- **Email**: Resend, sending from `info@mammamind.se` via DNS config at one.com
- **Hosting**: GitHub Pages (unchanged)
- **Content delivery**: Single `/content/index.html` page, JS validates key against Supabase Edge Function, renders event data dynamically

## Resume Status (2026-06-16)

### Completed
- Supabase project live: `mkpqkcrvtlwobbevwcrg.supabase.co`
- DB schema deployed + verified (events, access_keys, purchases, RLS, grants — incl. service_role grants fix)
- All 4 Edge Functions deployed + verified (verify-key/create-checkout-session public no-verify-jwt, create-key/stripe-webhook service-role)
- `content/index.html` built (4 render states)
- `courses/trygg-aterstart-for-mammor.html` — Köp plats button added, real event UUID wired in (`ba96212d-c9d6-466b-95a2-6cac56e4b81c`)
- `scripts/invite.js` — invite CLI tool
- Event row seeded: "Trygg återstart efter graviditet", 899 SEK, content_url = Google Drive folder, `stripe_price_id=price_1Tj3PW1mtU9Z73ip25cRut4D`
- Stripe account created, product + price created
- `create-checkout-session` 500 bug root-caused + fixed: STRIPE_SECRET_KEY set in Supabase secrets was invalid; user re-set it with a verified copy from Stripe dashboard. Verified via curl → returns real Stripe Checkout URL (HTTP 200).
- Defensive `.trim()` added on STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET reads (create-checkout-session, stripe-webhook) to guard against whitespace issues
- Pre-commit review done (claude-opus-4.6 + gpt-5.3-codex) on checkout fix, no issues found
- Branch: `feat/locked-event-access`, `main` untouched

### Blocked on (needs human action)
1. **Stripe webhook** — not yet configured. Steps:
   - Stripe Dashboard → Developers → Webhooks → Add endpoint
   - URL: `https://mkpqkcrvtlwobbevwcrg.supabase.co/functions/v1/stripe-webhook`
   - Event: `checkout.session.completed`
   - Copy signing secret → `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`

2. **Resend + DNS** — account not yet created. Steps:
   - Sign up: https://resend.com
   - Add domain `mammamind.se` → get DKIM TXT record
   - Add DKIM + update SPF at one.com DNS panel
   - Run: `supabase secrets set RESEND_API_KEY=re_...`

### Next session: start here
1. Set up Stripe webhook + signing secret (steps above)
2. Set up Resend + DNS, get real API key
3. E2E test in Stripe test mode: purchase → email received → content page shows correct event (Task 8.1)
4. Go live: switch Stripe to live mode, final smoke test (Task 8.3)



1. A user who completes Stripe checkout receives an email with a working key URL within 60 seconds
2. Visiting `/content?key=<valid>` renders the event content page
3. Visiting `/content?key=<expired>` or `/content?key=<invalid>` shows an error state
4. Tara can invite a user by running a single script with email + event ID
