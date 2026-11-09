# Status

_Updated at the end of every working session and when a PR merges. Keep under 60 lines._

**Last updated:** 2026-11-08
**Milestone:** M0 — walking skeleton + guardrails (`docs/plans/M0-walking-skeleton.md`)

## In progress

- Nothing: Tasks 1–8 are in PRs awaiting merge (see Recently done)

## Next up

- Task 9: Cloudflare Pages (human steps), then Task 10

## Waiting on Andrew

- Merge the stacked PRs in order: #9 (Task 3) → #10 (Task 4) → #11 (Task 5) → #12 (Task 6) → #14 (Task 7) → #15 (Task 8)
- Cloudflare Pages connection (Task 9, dashboard step)
- Install the Claude GitHub app for AI review (Task 10)

## Known issues / risks

- Claude Code hooks need Node 24 installed via nvm (`.claude/hooks/run.sh` finds it); without it, guard hooks block every Bash/Edit call.
- Branch protection: the repo is public, so it will be applied in Task 10 (until then nothing blocks a merge).
- TypeScript is pinned to ~6.0 because typescript-eslint doesn't support TS 7 yet; revisit later.

## Pending concept decisions for M1 (ask Andrew)

- Undo after Reset/Skip instead of a confirmation (Nielsen H3; ux-heuristics-and-laws.pdf)
- Global Space shortcut must not double-fire when a button has focus (WCAG 2.1.4 grey zone)

## Recently done

- Tasks 1–2: repo + scaffold (bootstrap on main)
- Task 3: lint rules, Prettier, Playwright smoke (PR #9)
- Task 4: test-integrity gate (PR #10)
- Task 5: dev log, STATUS, ADRs, PDLC, PR checks (PR #11)
- Task 6: GitHub Actions CI (PR #12)
- Task 7: Claude guardrails (PR #14)
- Task 8: AGENTS.md, CLAUDE.md, Husky pre-commit, plus guardrail review fixes (PR #15)
- PRs #9–#15 await Andrew's merge, stacked: #9 → #10 → #11 → #12 → #14 → #15
