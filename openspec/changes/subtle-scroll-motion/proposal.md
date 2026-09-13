## Why

The site is static and feels inert on first load. The recent review-dots pulse animation proved that small, restrained motion helps users notice interactive elements without feeling gimmicky. We want to extend that "alive but calm" feeling in two ways: (1) give the journal quote section a one-shot entrance animation so content feels intentional rather than snapping into place, and (2) fix an inconsistency introduced by the dots pulse, which gates motion off `prefers-reduced-motion: reduce` while the existing hero scroll indicator gates motion on `prefers-reduced-motion: no-preference` — an opt-out vs. opt-in mismatch that should be unified on the safer opt-in convention before more animations are added on top of it.

## What Changes

- Add a one-shot scroll-triggered reveal (fade + rise, plays once, never loops) to the journal quote section (`.journal-box` / `.journal-quote` in `index.html`), implemented with vanilla JS `IntersectionObserver` consistent with the existing `assets/js/includes.js` no-framework convention.
- Retrofit `.quotes-dots label`'s pulse animation in `styles/general.css` to use the `@media (prefers-reduced-motion: no-preference)` opt-in wrapper (matching `styles/hero.css`'s `.hero-scroll-indicator` pattern), replacing the current opt-out `@media (prefers-reduced-motion: reduce) { animation: none }` approach. No visual change for users with no stated preference or no-preference; users who reduce motion get the same "no animation" result as today.
- No new infinite/looping animations are introduced by this change — total concurrent looping animations on the page stays at 2 (hero float, dots pulse).

## Capabilities

### New Capabilities
- `scroll-reveal-motion`: One-shot, IntersectionObserver-driven entrance animations for page content sections, starting with the journal quote. Governs trigger behavior (fires once, does not re-trigger on scroll back), reduced-motion behavior, and the vanilla-JS implementation pattern reusable for future sections.

### Modified Capabilities
- (none — no existing spec covers the dots pulse; this is a pure implementation/consistency fix, not a requirements change, so it's captured as a task under the affected code rather than a spec delta)

## Impact

- `index.html`: journal section markup may need a hook class/attribute (e.g. `data-reveal`) for the observer to target.
- `assets/js/includes.js` or a new small script file: add the IntersectionObserver-based reveal logic.
- `styles/general.css`: add reveal animation keyframes/classes for the journal quote; retrofit `.quotes-dots label` reduced-motion gating.
- `styles/hero.css`: no code change, referenced only as the pattern to match.
- No new dependencies, no build step changes (site remains static HTML/CSS/JS).
