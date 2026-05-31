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

## Resume Status (2026-05-31)

### Completed
- Supabase project live: `mkpqkcrvtlwobbevwcrg.supabase.co`
- DB schema deployed + verified (events, access_keys, purchases, RLS, grants)
- All 4 Edge Functions deployed + verified (verify-key public/no-auth, others service-role)
- `content/index.html` built (4 render states)
- `courses/trygg-aterstart-for-mammor.html` — Köp plats button added
- `scripts/invite.js` — invite CLI tool
- Pre-commit review done (claude-opus-4.6 + gpt-5.3-codex), all findings fixed
- Branch: `feat/locked-event-access` pushed, `main` untouched

### Blocked on (needs human action)
1. **Stripe** — account not yet created. Steps:
   - Sign up: https://dashboard.stripe.com/register (country: Sweden)
   - Create product: "Trygg återstart efter graviditet", 899 SEK one-time → copy `price_id`
   - Get secret key: `sk_test_...`
   - Create webhook → `https://mkpqkcrvtlwobbevwcrg.supabase.co/functions/v1/stripe-webhook`, event: `checkout.session.completed` → copy `whsec_...`
   - Run: `supabase secrets set STRIPE_SECRET_KEY=sk_test_... STRIPE_WEBHOOK_SECRET=whsec_...`

2. **Seed event row** — needs Stripe `price_id` first, then:
   ```sql
   INSERT INTO events (title, description, content_url, starts_at, ends_at, price_sek, stripe_price_id)
   VALUES ('Trygg återstart efter graviditet', '...', 'ZOOM_LINK_HERE', '2026-05-06', '2026-06-10', 89900, 'price_...');
   ```
   Copy the returned UUID → replace `YOUR_EVENT_UUID_HERE` in `courses/trygg-aterstart-for-mammor.html`

3. **Resend + DNS** — account not yet created. Steps:
   - Sign up: https://resend.com
   - Add domain `mammamind.se` → get DKIM TXT record
   - Add DKIM + update SPF at one.com DNS panel
   - Run: `supabase secrets set RESEND_API_KEY=re_...`

### Next session: start here
1. Create Stripe account (steps above)
2. Seed event row with real price_id + get event UUID
3. Update `YOUR_EVENT_UUID_HERE` in course page
4. Set up Resend + DNS
5. E2E test (Task 8.1)
6. Go live (Task 8.3)



1. A user who completes Stripe checkout receives an email with a working key URL within 60 seconds
2. Visiting `/content?key=<valid>` renders the event content page
3. Visiting `/content?key=<expired>` or `/content?key=<invalid>` shows an error state
4. Tara can invite a user by running a single script with email + event ID
