# Copilot Instructions — mammamind

Static marketing/course site for MammaMind (Swedish, prenatal/postnatal fitness). No build step, no bundler, no package.json, no test runner. Content is plain HTML/CSS/vanilla JS served as-is (e.g. via GitHub Pages, per `CNAME`).

## Working locally
There is no build/lint/test command. Serve the repo root with any static file server and open pages directly, e.g.:
```
python3 -m http.server 8000
```
Verify changes by opening the affected page(s) in a browser — partials only render correctly when fetched over HTTP(S), not via `file://`.

## Architecture: partial includes
`assets/js/includes.js` implements a tiny client-side templating/include system used on every page:
- Any element with `data-include="<name>"` fetches `assets/partials/<name>.html` and replaces the element with it.
- Other `data-*` attributes on the include element are used as template variables: `data-endpoint="X"` fills `{{ENDPOINT}}` in the partial, `data-note="Y"` fills `{{NOTE}}`, etc. (uppercased key → `{{KEY}}` placeholder).
- Current partials: `assets/partials/footer.html` (site footer, included via `<div data-include="footer"></div>` at the bottom of every page) and `assets/partials/form.html` (lead-capture form, requires `data-endpoint` and `data-note`).
- MailerLite popup forms are the current standard for new/migrated pages' lead-capture CTAs: the page `<head>` carries the MailerLite Universal script (`ml('account', '2565702')`), and the CTA is an `<a class="button primary ml-onclick-form" href="javascript:void(0)" aria-haspopup="dialog" onclick="ml('show', '<FORM_ID>', true)">`. Each such page's CSP meta must allow `https://*.mailerlite.com` in `script-src`/`connect-src`/`frame-src`/`form-action` and `https://assets.mlcdn.com https://assets.mailerlite.com` in `style-src`. Form IDs and the reference snippets live in `ui_v2_reference/mailerlite_ref.txt`. Used on: `subpages/community.html`, `subpages/after-hours.html`, `courses/mammamind-flow.html`.
- Formspree (`assets/partials/form.html`, posted with `data-endpoint`/`data-note`, a `_next` redirect to `subpages/thanks.html`, and a honeypot `_gotcha` field) is legacy and only remains on `courses/workshop-smartfri-vardag.html` and `courses/trygg-aterstart-for-mammor.html` — migrate these to MailerLite popups (need dedicated form IDs from MailerLite) when those pages get their v2 UI pass, then remove the Formspree partial/CSP entries entirely.

## Directory layout
- `index.html`, `courses/*.html`, `subpages/*.html` — live pages (Swedish copy, direct children of a page's shipped section).
- `ui_v2_reference/` — reference/mockup versions of pages (different content), not the live site; don't assume it's in sync with `courses/`/root pages.
- `styles/` — one CSS file per concern (`buttons.css`, `hero.css`, `forms.css`, `footer.css`, `icons.css`, `logo.css`, `general.css`), no preprocessor.
- `assets/` — `js/` (includes.js only), `partials/`, `images/`, `svg/`.
- `supabase/` — Supabase CLI project link (config/migrations if added later); `.env.local` holds Supabase/Stripe/Resend keys — never print or commit real values from it.

## Conventions
- Page copy is Swedish; keep new copy/labels consistent with that locale.
- New pages should follow the existing pattern: link `styles/*.css`, include `assets/js/includes.js` with `defer`, and end with `<div data-include="footer"></div>` (add a form via `data-include="form"` if a lead-capture CTA is needed).
- Links to legal/support pages use root-relative paths (`/subpages/privacy.html`, `/subpages/termnsnconditions.html`).

## UI v2 migration (merged into `main`)
`main` now contains the v2 redesign, merged from the (now stale) `v2` branch on 2026-08-18 via fast-forward — `v2` is no longer ahead of `main` and can be deleted once new work confirms stability. The redesign brought live pages in line with the mockups in `ui_v2_reference/*.html` (header/hero, activities, reviews, FAQ, journal section, footer), added `subpages/after-hours.html`, `subpages/community.html`, `subpages/om-tara.html`, `subpages/walks.html`, and `courses/mammamind-flow.html`, and a shared `styles/content-pages.css`. Notes:
- `ui_v2_reference/` files are the visual source of truth for this migration but have different/placeholder copy and images (e.g. `mammamind-tara-baby.jpeg` referenced there doesn't exist in the repo) — port structure, spacing, fonts, and colors from them, not their exact text/images; keep the real Swedish copy and existing `assets/images/`/`assets/svg/` assets from the current live pages unless a real replacement asset is provided.
- Remaining course pages under `courses/` (e.g. `trygg-aterstart-for-mammor.html`, `workshop-smartfri-vardag.html`) are not yet migrated to the v2 look — treat them as the next candidates when resuming this work.
- Shared styles live in `styles/general.css`, `styles/hero.css`, `styles/buttons.css`, `styles/footer.css`, `styles/content-pages.css` — check these first for existing tokens/variables before adding new CSS.
- When migrating a page, verify it still uses the `data-include` partials, and replace any Formspree form with a MailerLite popup CTA per the convention above.

## Branch state (as of 2026-08-18)
- `main` — live/deployed branch, now includes the full v2 UI redesign (fast-forwarded from `v2` at commit `eae33ce`). This is the current source of truth going forward.
- `pre-v2-backup` — rollback point, pinned at the pre-merge `main` tip (`28b0d6b`, pre-v2 UI). Rollback if needed: `git push origin pre-v2-backup:main --force`. Delete once v2 is confirmed stable in production.
- `v2` — superseded by the merge into `main`; safe to delete once confirmed no longer needed.
- `feat/locked-event-access` — in-progress backend feature (Stripe checkout → Supabase-issued access key → Resend email delivery for a "locked event"), branched from pre-v2 `main`. Adds `supabase/functions/{create-checkout-session,create-key,verify-key,stripe-webhook}` and `supabase/migrations/*`. Paused mid-branch (purchase E2E verified) pending resumption. **Planned integration:** rebase this branch onto the new `main` (or merge `main` into it) before opening its PR, since it currently diverges from the pre-v2 UI and will conflict with the v2 styles/pages (`styles/general.css`, `styles/hero.css`, `subpages/{privacy,thanks,termnsnconditions}.html`, etc.) — the Supabase functions/migrations themselves are additive and should merge cleanly, but the touched HTML/CSS files need careful re-resolution against v2's versions.

## OpenSpec workflow
This repo uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) spec-driven change management (`openspec/` dir, `.github/prompts/opsx-*.prompt.md`, `.github/skills/openspec-*`). For any non-trivial change, prefer the flow: propose (`openspec new change`) → apply → archive. See `openspec/config.yaml` and `openspec/changes/` for active/archived changes before starting significant work.
