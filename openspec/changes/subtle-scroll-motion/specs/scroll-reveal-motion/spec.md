## ADDED Requirements

### Requirement: One-shot scroll-triggered reveal animation
The system SHALL animate designated content sections (starting with the journal quote section) into view with a fade-and-rise entrance effect the first time the section scrolls into the viewport, and SHALL NOT repeat the animation on subsequent scrolls past the same section within the same page load.

#### Scenario: Section enters viewport for the first time
- **WHEN** the user scrolls down and the journal quote section first becomes visible in the viewport
- **THEN** the section animates from its resting pre-reveal state (reduced opacity, slightly offset position) to its final resting state (full opacity, normal position) using a fade + rise transition

#### Scenario: Section leaves and re-enters the viewport
- **WHEN** the user scrolls the journal quote section out of the viewport and then scrolls back so it re-enters the viewport
- **THEN** the section remains in its final resting state and does not replay the entrance animation

#### Scenario: JavaScript fails to load or execute
- **WHEN** the reveal script does not run (e.g. blocked, slow network, disabled JS)
- **THEN** the journal quote section is fully visible in its final resting state by default, with no animation and no content hidden or stuck invisible

### Requirement: Reduced motion is respected
The system SHALL NOT apply the pre-reveal (reduced-opacity/offset) state or play the entrance animation for users whose system reports a preference for reduced motion; the content SHALL be visible in its final resting state immediately.

#### Scenario: User has reduced motion enabled
- **WHEN** the user's operating system or browser reports `prefers-reduced-motion: reduce`
- **THEN** the journal quote section is displayed in its final resting state without any fade, rise, or opacity transition, regardless of scroll position

### Requirement: Reveal animation does not increase the page's concurrent looping-animation count
The system SHALL implement the scroll-reveal animation as a one-shot (non-repeating, non-looping) transition, so that the total number of infinite/looping animations running concurrently on the page is unaffected by this feature.

#### Scenario: Reveal animation completes
- **WHEN** the entrance animation finishes playing
- **THEN** no animation continues to run or loop on that section afterward
