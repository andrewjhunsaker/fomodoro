# 5. Design authority: WCAG 2.2 AA, then Apple HIG

**Status:** Accepted · 2026-11-08

**Context:** Many UX sources disagree or are only heuristics (see the evidence labels in docs/learning). The app targets iPhone and Mac.

**Decision:** For UI/UX decisions, the order of authority is: 1) WCAG 2.2 Level AA (W3C Recommendation), 2) Apple Human Interface Guidelines (iOS and macOS), 3) findings with Strong evidence (e.g. Fitts's law), 4) heuristics and guidelines (Nielsen, laws of UX, Krug). Accessibility wins any conflict.

**Consequences:** Design choices name the authority they follow. The HIG is written for native apps; where a HIG pattern doesn't carry over to a web app (native-only controls, SF Symbols licensing), the decision says so and Andrew decides.
