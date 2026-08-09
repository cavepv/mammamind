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

## Resume Status (2026-08-09)

### Completed — full purchase flow working E2E
- Supabase project live: `mkpqkcrvtlwobbevwcrg.supabase.co`
- DB schema deployed + verified (events, access_keys, purchases, RLS, grants — incl. service_role grants fix)
- All 4 Edge Functions deployed + verified (verify-key/create-checkout-session public no-verify-jwt, create-key/stripe-webhook service-role)
- `content/index.html` built (4 render states)
- `courses/trygg-aterstart-for-mammor.html` — Köp plats button added, real event UUID wired in (`ba96212d-c9d6-466b-95a2-6cac56e4b81c`)
- `scripts/invite.js` — invite CLI tool (not yet run/tested)
- Event row seeded: "Trygg återstart efter graviditet", 899 SEK, content_url = Google Drive folder, `stripe_price_id=price_1Tj3PW1mtU9Z73ip25cRut4D`
- Stripe account, product/price, and webhook all configured. `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` set in Supabase secrets.
- Resend account created, domain `mammamind.se` verified (DKIM/SPF at one.com), `RESEND_API_KEY` set in Supabase secrets.
- Fixed real bug: CSP `script-src` missing on `content/index.html` + course page → inline buy-button/verify-key scripts were silently blocked. Added `script-src 'self' 'unsafe-inline'`. Reviewed (claude-opus-4.6 + gpt-5.3-codex), no issues.
- **Full E2E test passed on localhost:8000**: clicked Köp plats → Stripe test checkout (card 4242...) → redirected to thanks.html → webhook fired → `purchases` + `access_keys` rows created → Resend email received with content link → clicked link → `content/index.html?key=...` verified key → rendered correct event title/description → "Gå till kursen" link → opened real Google Drive folder correctly.
- Pre-commit dual-model review done on all commits this session, no blocking issues.
- Branch: `feat/locked-event-access` (head `837b742`), pushed. `main` untouched.

### Known temp state (was localhost-only during testing, already reverted)
- `verify-key` and `create-checkout-session` CORS/origin allowlists were temporarily pointed at `http://localhost:8000` for local testing, then reverted back to `https://www.mammamind.se` and redeployed. Confirmed clean via `git diff` before last push — no localhost values left in committed code.

### Not yet done
1. **Error-state E2E tests** — expired key → error page; invalid/garbage key → error page. Logic exists in `content/index.html` (4 render states) but not manually re-verified since last full rebuild.
2. **Invite script test** — `node scripts/invite.js <event_id> <email>` never run. Should create access_keys row + send email without a Stripe purchase.
3. **Go live** — switch Stripe from test mode to live mode: new live product/price, new live webhook + signing secret, new live secret key, re-test with a real (or minimal real) purchase before public launch.
4. **Merge decision** — user explicitly wants to hold off on merging `feat/locked-event-access` into `main` and going live. Main will receive separate UI-only updates in the meantime (unrelated to this feature). **Do not merge until user explicitly asks.**

### Pause note (2026-08-09)
User is pausing this branch for ~1 week to do UI updates directly on `main`. Feature branch is stable, all secrets set, full purchase flow verified working. Nothing time-sensitive is blocking — safe to leave as-is. When resuming: rebase/merge `main`'s UI changes into this branch if needed before continuing (check for conflicts in shared files like `courses/trygg-aterstart-for-mammor.html`, CSS, partials).

### Next session: start here
1. Confirm branch untouched, diff clean (`git status`, `git log`)
2. Run error-state tests (expired/invalid key) — no new setup needed, just visit content page with bad key values
3. Run `scripts/invite.js` once end-to-end
4. When user gives go-ahead: switch Stripe to live mode, final smoke test, then merge to `main`


