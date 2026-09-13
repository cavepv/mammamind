## 1. Dots-pulse retrofit (reduced-motion convention fix)

- [x] 1.1 In `styles/general.css`, move `.quotes-dots label`'s `animation: dot-pulse ...` declaration out of the unconditional rule and into a new `@media (prefers-reduced-motion: no-preference) { .quotes-dots label { animation: dot-pulse ...; } }` block, matching the `.hero-scroll-indicator` pattern in `styles/hero.css`.
- [x] 1.2 Remove the now-redundant `@media (prefers-reduced-motion: reduce) { .quotes-dots label { animation: none; } }` block (opt-in wrapper makes it unnecessary).
- [x] 1.3 Verify the `:checked` (selected dot) and `:hover` `animation: none` overrides still take effect correctly after the move (no specificity/ordering regression).
- [x] 1.4 Manually verify in-browser: default/no-preference (dots pulse as before), reduced-motion enabled (no pulse, same as before).

## 2. Journal quote reveal — CSS

- [x] 2.1 In `styles/general.css`, add a resting/pre-reveal state (e.g. `.reveal-on-scroll { opacity: 0; transform: translateY(...); }`) and a revealed state (e.g. `.reveal-on-scroll.is-visible { opacity: 1; transform: none; }` with a transition), scoped entirely inside `@media (prefers-reduced-motion: no-preference)`.
- [x] 2.2 Ensure the base/default rule for the same class (outside any media query) leaves the element fully visible, so reduced-motion users and no-JS users see final state immediately.
- [x] 2.3 Add the reveal class (e.g. `reveal-on-scroll`) to the journal quote section markup in `index.html` (`.journal-box` or `.journal-quote`, per implementation judgment).

## 3. Journal quote reveal — JS

- [x] 3.1 Add a small vanilla JS script (new `assets/js/reveal.js` or appended to `assets/js/includes.js`, per design's open question — default to a new small file unless it clearly fits better alongside includes.js) implementing an `IntersectionObserver` that adds `is-visible` to observed `.reveal-on-scroll` elements.
- [x] 3.2 Call `unobserve`/`disconnect` on the observed element immediately after adding `is-visible`, so the animation never re-triggers.
- [x] 3.3 Include the new script in `index.html` with `defer` (consistent with how `includes.js` is loaded).

## 4. Verification

- [x] 4.1 Manually test in-browser: scroll journal quote into view — fades/rises in once; scroll away and back — no replay.
- [x] 4.2 Manually test with OS/browser reduced-motion enabled — journal quote visible immediately, no animation.
- [x] 4.3 Manually test with JS disabled (or script blocked) — journal quote visible immediately, no animation, no layout issue.
- [x] 4.4 Confirm no other page animation regressed (hero float, dots pulse, hover/active states on buttons and dots).
