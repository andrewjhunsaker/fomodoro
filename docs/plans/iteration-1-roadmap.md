# Iteration 1 Roadmap

Source spec: `docs/specs/2026-11-08-iteration-1-design.md`

Iteration 1 is split into milestones. Each one ends in working, tested, deployed software and gets its own detailed plan (`docs/plans/M<n>-<name>.md`) written just before it starts, so later plans can use what earlier ones taught us. Each plan's tasks become GitHub Issues; each issue is one short-lived branch and PR.

| #   | Milestone                         | Ships                                                                                                                              | Spec sections                                                   |
| --- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| M0  | **Walking skeleton + guardrails** | A "hello" PWA deployed to Cloudflare Pages through the full PR pipeline: CI gates, branch protection, Claude guardrails, PDLC docs | §9                                                              |
| M1  | **Signed-out timer**              | A usable Pomodoro app with defaults: engine, ring UI, ambient color, local notifications, offline, install button                  | §3.1, 3.2, 3.8, 4, 7 (local cases), 8 (engine, components, e2e) |
| M2  | **Accounts + settings**           | Sign in (email code, Google if the spike passes, optional TOTP), settings synced to the account                                    | §3.3, 3.4, 6 (`settings`)                                       |
| M3  | **Push notifications**            | Server-scheduled pushes to the device, latency telemetry, p95 measured                                                             | §3.5, 5 (server), 6 (`devices`, `scheduled_pushes`)             |
| M4  | **Handoff + offline sync**        | One active device, read-only countdown elsewhere, "Take over", offline control and reconciliation                                  | §3.6, 3.7, 6 (`active_cycle`), 7 (sync cases)                   |
| M5  | **Mini timer + polish**           | Document PiP on Chromium, real-device checklist, performance pass                                                                  | §3.9, 2                                                         |

**Spikes** (throwaway, time-boxed, run alongside M0/M1): Google sign-in in the installed iOS PWA (decides M2 scope); Document PiP in Brave (decides M5 scope).

**Why this order**

- M0 first is a _walking skeleton_ (Alistair Cockburn): the thinnest end-to-end slice, from commit to deployed app, before any features. Every later PR then runs through real gates from day one.
- M1 delivers something you can use daily before any backend exists, and it builds the engine that everything else depends on.
- M2–M4 add the backend in order of dependency: accounts before pushes (pushes need a user), pushes before handoff (handoff moves pushes).
- After each milestone: a retro entry in `docs/process/log/`, and a PDLC consolidation every 5 merged PRs.
