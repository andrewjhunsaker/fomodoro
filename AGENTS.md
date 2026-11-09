# AGENTS.md — fomodoro

A personal Pomodoro PWA (React + Vite + TypeScript; Supabase from M2; Cloudflare Pages).

## Start of every session

1. Read `docs/STATUS.md` (current state) and `docs/process/PDLC.md` (how we work).
2. Work on exactly one issue. Its plan is in `docs/plans/`.
3. Use Node 24: `source ~/.nvm/nvm.sh && nvm use`. Launch Claude Code from a shell where `nvm use` already selected Node 24: the `.claude/hooks/*.ts` files are run by `node` (Node 18 can't run them).

## Commands

- `npm run dev` — dev server · `npm test` — unit/component tests · `npm run test:e2e` — Playwright
- `npm run typecheck` · `npm run lint` · `npm run format`

## Rules

- TDD: write a failing test, see it fail, then implement. Test-only commits first in each PR.
- Never weaken a test (skip, delete, loosen, or update snapshots) to make code pass. Fix the code or stop and ask Andrew.
- Keep files small and single-purpose. The timer engine (`src/engine/`, from M1) stays pure TypeScript: no React, no I/O, time passed in.
- Never push to `main`. Branch `m<milestone>/<issue>-<slug>`, open a PR, Andrew merges.
- Every PR adds an entry to `docs/log/<YYYY-MM>.md` and updates `docs/STATUS.md`.
- Significant decisions get an ADR in `docs/decisions/`.
- Claims in docs cite a source or are labeled as opinion.
- UI/UX authority: WCAG 2.2 AA, then Apple HIG (ADR 0005). Before an opinionated design or architecture decision based on a learning concept, ask Andrew; record it in `docs/learning/CONCEPTS.md`.
- Secrets never go in the repo or the conversation. Don't read `.env*` files. The repo is public.

## Where things live

- Spec: `docs/specs/` · Plans: `docs/plans/` · Decisions: `docs/decisions/` · Log: `docs/log/`
- CI gates: `.github/workflows/ci.yml`, `scripts/` · Claude hooks: `.claude/hooks/`
