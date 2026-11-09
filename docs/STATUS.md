# Status

_Updated at the end of every working session and when a PR merges. Keep under 60 lines._

**Last updated:** 2026-11-08
**Milestone:** M0 — walking skeleton + guardrails (`docs/plans/M0-walking-skeleton.md`)

## In progress

- Task 6: GitHub Actions CI with all gates (this PR, stacked on #11)

## Next up

- Task 7: Claude guardrails (settings + hooks)
- Task 8: agent instructions (AGENTS.md, CLAUDE.md) and pre-commit

## Waiting on Andrew

- Merge the stacked PRs in order: #9 (Task 3), #10 (Task 4), #11 (Task 5), then this PR
- Cloudflare Pages connection (Task 9, dashboard step)
- Install the Claude GitHub app for AI review (Task 10)

## Known issues / risks

- Branch protection: the repo is public, so it will be applied in Task 10 (until then nothing blocks a merge).
- TypeScript is pinned to ~6.0 because typescript-eslint doesn't support TS 7 yet; revisit later.

## Pending concept decisions for M1 (ask Andrew)

- Undo after Reset/Skip instead of a confirmation (Nielsen H3; ux-heuristics-and-laws.pdf)
- Global Space shortcut must not double-fire when a button has focus (WCAG 2.1.4 grey zone)

## Recently done

- Tasks 1–4: repo, scaffold, lint + e2e (PR #9), test-integrity gate (PR #10), Task 5 docs + PR checks (PR #11); all await Andrew's merge, stacked
