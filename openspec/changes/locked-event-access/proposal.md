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

## Success Criteria

1. A user who completes Stripe checkout receives an email with a working key URL within 60 seconds
2. Visiting `/content?key=<valid>` renders the event content page
3. Visiting `/content?key=<expired>` or `/content?key=<invalid>` shows an error state
4. Tara can invite a user by running a single script with email + event ID
