# PDLC — how we work (cap: 80 lines, enforced in CI)

Rules cite the log entry or PR that justified them: (→ log/YYYY-MM #PRn).

## Flow

Idea → Spec (Andrew approves) → Plan → Issue → Branch → TDD build → PR → CI + AI review → Andrew merges → Log entry → STATUS update

## Specs, plans, issues

- Specs: `docs/specs/`. Milestone plans: `docs/plans/`. One task = one issue = one branch = one PR.
- Significant or hard-to-reverse decisions get an ADR in `docs/decisions/`.

## Branches and PRs

- Branch `m<milestone>/<issue>-<slug>`, short-lived (merge within ~1 day of work).
- PRs aim for < 400 changed lines; CI warns above that.
- Each PR opens with test-only commits that fail, then implementation commits.
- Only Andrew merges.

## Gates (blocking unless noted)

- Typecheck, lint, unit/component tests, build, Playwright e2e (Chromium), gitleaks, npm audit (high).
- test-integrity: no weakened tests without the `test-change-approved` label (Andrew only).
- pr-checks: dev-log entry present (or `no-log`), this file ≤ 80 lines; PR size warning (advisory).
- AI review: advisory.
- From M1: Stryker mutation score on `src/engine` must not drop below main.

## Testing

- Never weaken a test to make code pass. Fix the code, or stop and ask.
- Test behavior users see, not implementation details.

## Logging and handoff

- Every PR adds an entry to `docs/log/<YYYY-MM>.md` (template at the top of that file).
- `docs/STATUS.md` is the current snapshot. Update it at the end of every working session and when a PR merges.
- Milestone end: a milestone summary entry in the log + a short retro.
- Every 5 merged PRs: consolidate retro notes into this file (Andrew approves the edits), mark those entries consolidated.

## Working with Claude

- One issue per session; `/clear` between tasks.
- Long task: save progress to the plan/STATUS, then start a fresh session instead of compacting.
- Exploration and review run in subagents.
- Claims in docs cite a source or are labeled as opinion.
