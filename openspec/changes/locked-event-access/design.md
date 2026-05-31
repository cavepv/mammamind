# Design: Locked Event Access

## Architecture Overview

```
GitHub Pages (static)          Supabase (backend)         External Services
──────────────────────         ──────────────────         ─────────────────
/content/index.html  ──JS──▶  Edge Function: verify-key   Stripe (payments)
/courses/*.html      ──JS──▶  Edge Function: create-key   Resend  (email)
                              Postgres DB
```

## Data Model

### `events`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| title | text | e.g. "Trygg återstart efter graviditet" |
| description | text | shown on content page |
| content_url | text | Zoom link or resource URL |
| starts_at | timestamptz | |
| ends_at | timestamptz | |
| price_sek | integer | in öre (e.g. 89900 = 899 kr) |
| stripe_price_id | text | Stripe Price object ID |

### `access_keys`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| key | uuid UNIQUE | the token sent to user |
| event_id | uuid FK → events | |
| email | text | recipient |
| created_at | timestamptz | |
| expires_at | timestamptz nullable | NULL = permanent |
| purchase_id | uuid FK → purchases nullable | NULL for invites |

### `purchases`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| stripe_payment_intent_id | text UNIQUE | |
| event_id | uuid FK → events | |
| email | text | |
| amount | integer | in öre |
| status | text | pending / completed / refunded |
| created_at | timestamptz | |

## Supabase Edge Functions

### `verify-key`
- **Input**: `{ key: string }`
- **Logic**:
  1. Look up `access_keys` where `key = input`
  2. If not found → `{ valid: false, reason: "not_found" }`
  3. If `expires_at` is set and `expires_at < now()` → `{ valid: false, reason: "expired" }`
  4. Join `events` row → return `{ valid: true, event: { title, description, content_url } }`
- **Auth**: public (anon key), no user auth needed

### `create-key` (invite script + webhook handler)
- **Input**: `{ event_id, email, expires_at? }`
- **Logic**:
  1. Generate `crypto.randomUUID()` as key
  2. Insert into `access_keys`
  3. Call Resend API: send email with key URL
- **Auth**: service role key only (never exposed to client)

### `stripe-webhook`
- **Trigger**: Stripe `checkout.session.completed` event
- **Logic**:
  1. Verify Stripe webhook signature
  2. Extract `email`, `metadata.event_id` from session
  3. Insert into `purchases`
  4. Call `create-key` logic internally
- **Auth**: validated by Stripe signature header

## Purchase Flow

```
Course page
  └─▶ "Köp plats" button
        └─▶ Stripe Checkout (hosted)
              └─▶ stripe-webhook (Edge Function)
                    └─▶ create-key
                          └─▶ Resend: email to user
                                └─▶ User clicks link
                                      └─▶ /content?key=abc123
                                            └─▶ verify-key
                                                  └─▶ render content
```

## Invite Flow (manual script)

```bash
# scripts/invite.js
# Usage: node scripts/invite.js <event_id> <email> [expires_at]
```
Calls Supabase service role directly. No UI.

## Content Page (`/content/index.html`)

```
On load:
  1. Read key from URL (?key=...)
  2. If no key → show "Ingen nyckel angiven"
  3. POST /functions/v1/verify-key { key }
  4. If invalid/expired → show error state with message
  5. If valid → render:
     - Event title + description
     - CTA button linking to content_url
     - Contact info (info@mammamind.se)
```

States:
- **loading** — spinner
- **valid** — event content
- **invalid** — "Länken är ogiltig eller har upphört"
- **no-key** — "Ingen åtkomstnyckel hittades i länken"

## Email Template (Resend)

```
Subject: Din plats på [event title] – här är din länk 🌸

Hej [name],

Välkommen till [event title]!

Klicka på länken nedan för att komma åt ditt innehåll:
[mammamind.se/content?key=<key>]

Spara länken – du behöver den varje gång du vill komma åt kursmaterialet.

Varma hälsningar,
Tara – MammaMind
```

## Stripe Integration

- Stripe Checkout in **hosted mode** (no card fields on MammaMind site)
- `metadata.event_id` passed at checkout creation
- `customer_email` collected by Stripe
- Webhook: `checkout.session.completed`

## DNS Changes (one.com)

Add to mammamind.se DNS:
- `TXT` DKIM record (value provided by Resend)
- Update `TXT` SPF to include `include:amazonses.com` (Resend's sender)

## Security Considerations

- `verify-key` uses anon Supabase key (safe — returns only public event data)
- `create-key` + `stripe-webhook` use service role key (never in client JS)
- Stripe webhook validated by signature (`stripe-signature` header)
- Keys are UUIDs (128-bit entropy, not guessable)
- RLS on `access_keys`: anon role can SELECT only `key`, `event_id`, `expires_at` (no email exposed)
