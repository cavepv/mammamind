## Context

The site is static HTML/CSS/JS with no build step and no JS framework — the only existing JS is `assets/js/includes.js`, a small vanilla partial/templating loader. Two motion patterns already exist in the codebase:

- `styles/hero.css` `.hero-scroll-indicator`: an infinite `float` animation gated **on** via `@media (prefers-reduced-motion: no-preference)` (opt-in: animation only runs if the user has explicitly not requested reduced motion).
- `styles/general.css` `.quotes-dots label`: an infinite `dot-pulse` animation that runs unconditionally, then gated **off** via `@media (prefers-reduced-motion: reduce) { animation: none }` (opt-out: animation runs unless the user explicitly requested reduced motion).

These two patterns produce the same practical result for the two "yes/no" reduced-motion values but diverge for browsers/OSes that report neither preference — opt-in yields no motion, opt-out yields motion. As more motion is added to the page, this inconsistency should not be allowed to spread.

## Goals / Non-Goals

**Goals:**
- Give the journal quote section (`.journal-box` / `.journal-quote`) a one-shot fade + rise entrance animation triggered on scroll into view, using vanilla JS (`IntersectionObserver`) with no new dependency.
- Ensure the reveal animation fires at most once per page load per element (no re-triggering on scroll back up/down).
- Retrofit `.quotes-dots label` to use the same opt-in `@media (prefers-reduced-motion: no-preference)` wrapper as `.hero-scroll-indicator`, so all current and future motion in the codebase follows one convention.
- Keep the total count of concurrently-running infinite/looping animations on the page at 2 (hero float, dots pulse) — the journal reveal is one-shot and does not add to this count.

**Non-Goals:**
- No animation library or framework dependency (e.g. AOS, GSAP, Framer Motion) — vanilla JS only, consistent with `includes.js`.
- No infinite/looping ambient animation is introduced in this change (e.g. no idle-breathing icons). That remains a separate, future exploration if desired.
- No changes to activity-card hover states or FAQ accordion animation — explicitly out of scope for this change, tracked as future work.
- No change to the *visual* behavior of dots-pulse for users with a stated preference (reduce or no-preference) — the retrofit is a mechanism/consistency fix, not a behavior change.

## Decisions

**1. Use `IntersectionObserver` + a CSS class toggle, not scroll-event polling.**
`IntersectionObserver` is a native browser API (broad support, no polyfill needed for this site's audience), avoids manual scroll-position math and throttling/debouncing code, and is the standard "reveal on scroll, once" pattern. Alternative considered: `scroll` event listener with `getBoundingClientRect()` — rejected as more code, needs manual throttling, and reinvents what `IntersectionObserver` already does natively.

**2. Observer disconnects/unobserves after first trigger (one-shot via `{ once: true }`-style logic).**
`IntersectionObserver` has no native `once` option, so the callback must call `observer.unobserve(target)` (or `disconnect()`, since there's only one target initially) immediately after adding the reveal class. This guarantees the animation never re-fires on repeated scroll in/out, satisfying the "plays once" requirement without extra state tracking.

**3. Animation implemented as a CSS class toggle (`.is-visible` or similar), not inline styles from JS.**
JS only adds a class; all animation timing/easing/keyframes live in CSS (`styles/general.css`), consistent with how `dot-pulse` and `float` are already defined. Keeps the separation of concerns already established: JS decides *when*, CSS decides *how*.

**4. Reduced-motion handling: element is visible by default; JS/CSS only add motion, never rely on JS to make content visible.**
The journal quote must not depend on JS running successfully to be visible (progressive enhancement — if JS fails to load, content still shows, just without animation). The CSS pre-animation state (e.g. `opacity: 0.001` or a very low value, not `opacity: 0` with `visibility: hidden`) is scoped inside `@media (prefers-reduced-motion: no-preference)` so that users who reduce motion, or whose JS fails, see the content in its final resting state immediately, never hidden. Alternative considered: hide by default in plain CSS regardless of motion preference — rejected because it risks content being invisible if JS never runs (e.g. blocked script, slow network), which is worse than "no animation."

**5. Retrofit dots-pulse to opt-in wrapper is a mechanical CSS move, not a new spec/requirement.**
This is captured as an implementation task rather than a `MODIFIED` spec delta, because no observable requirement changes — the feature's behavior (pulses when motion is not reduced, static when reduced) is identical before and after; only the CSS mechanism used to express reduced-motion gating changes.

## Risks / Trade-offs

- **[Risk] Forgetting to unobserve/disconnect leaks an observer per revealed element.** → Mitigation: call `unobserve` in the callback immediately upon triggering the reveal class; with only one target element in this change's scope, impact is negligible either way, but the pattern should be written to scale safely if more sections adopt it later.
- **[Risk] If the CSS pre-animation state is not properly scoped to `no-preference`, users with reduced motion or disabled JS could see content stuck invisible.** → Mitigation: default state in plain CSS (outside any media query) is the fully-visible resting state; the "start invisible, then animate in" state only exists inside `@media (prefers-reduced-motion: no-preference)`, and JS only adds a class that this scoped rule reacts to.
- **[Risk] Retrofitting dots-pulse changes wrapper structure and could accidentally alter specificity or ordering relative to the existing `:checked`/`:hover` overrides.** → Mitigation: keep the retrofit a pure mechanical move of the existing declarations into the new media query wrapper; re-verify the `:checked` (selected dot, `animation: none`) and `:hover` (`animation: none`) overrides still apply correctly after the move, since these must win regardless of motion preference.

## Migration Plan

1. Retrofit `.quotes-dots label` reduced-motion gating in `styles/general.css` (isolated, low-risk, no HTML/JS change).
2. Add reveal CSS (resting state, animated-in state, keyframes) scoped under `@media (prefers-reduced-motion: no-preference)` for the journal quote target.
3. Add the small vanilla JS `IntersectionObserver` script (new small file or appended to `includes.js`) and wire it to the journal quote element in `index.html` via a `data-` hook or class.
4. Manually verify in-browser: normal load (reveal plays once on scroll into view, does not replay on scroll away and back), reduced-motion enabled (content visible immediately, no animation), JS disabled (content visible immediately).
5. No rollback complexity — this is additive CSS/JS with no data migration; reverting is a plain git revert of the touched files.

## Open Questions

- Exact vanilla JS file location: extend `assets/js/includes.js` or add a new small `assets/js/reveal.js`? Leaning toward a separate small file to keep `includes.js` focused on its single templating responsibility — final call left to implementation.
- Whether to reuse the reveal mechanism's class/attribute naming (e.g. `data-reveal`) in a way that anticipates future sections adopting it, without over-building for capabilities not yet requested (activity-cards, reviews, etc. are explicitly out of scope for now).
