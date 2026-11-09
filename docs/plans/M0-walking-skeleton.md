# M0 — Walking Skeleton + Guardrails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "hello" PWA deployed to Cloudflare Pages through the full pipeline — PR → blocking CI gates → human merge — with Claude guardrails, the dev log, and the process docs in place.

**Architecture:** Vite + React + TypeScript app with `vite-plugin-pwa`. Quality gates run in GitHub Actions. CI helper scripts and Claude hook scripts are small TypeScript files with pure, unit-tested logic and a thin CLI wrapper, run directly by Node 24 (built-in type stripping, no build step). Cloudflare Pages builds `main` and every PR branch.

**Tech stack:** Node 24 (via `.nvmrc`), npm, Vite, React, TypeScript, vite-plugin-pwa, Vitest + Testing Library + jsdom, Playwright (Chromium), ESLint (flat config) + Prettier, Husky + lint-staged, gitleaks, GitHub Actions, Cloudflare Pages.

**Spec:** `docs/specs/2026-11-08-iteration-1-design.md` §9. **Roadmap:** `docs/plans/iteration-1-roadmap.md`.

**Deferred on purpose:** Stryker (M1, once the engine exists), Tailwind and shadcn/ui (M1, once there is UI to style), Supabase (M2).

---

## Conventions for every task

- Run `source ~/.nvm/nvm.sh && nvm use` once per shell (picks Node 24 from `.nvmrc`).
- Tasks 1–2 bootstrap on `main`, since nothing can gate them yet. From Task 3 on, each task is one GitHub Issue → branch `m0/<n>-<slug>` → PR → Andrew merges.
- Each PR adds an entry to `docs/log/2026-11.md` (format in Task 5). Until Task 5 lands, the entries are added in Task 5 retroactively.
- Commit messages use Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `ci:`).

## File map

| Path                                                                       | Responsibility                                                                   |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `.nvmrc`, `package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html` | App and toolchain config                                                         |
| `src/main.tsx`, `src/App.tsx`, `src/App.test.tsx`, `src/test-setup.ts`     | Hello screen and its test                                                        |
| `public/logo.svg`, generated icons                                         | PWA icons                                                                        |
| `e2e/smoke.spec.ts`, `playwright.config.ts`                                | End-to-end smoke test                                                            |
| `eslint.config.js`, `.prettierrc.json`                                     | Lint and format rules (incl. no skipped/focused tests)                           |
| `scripts/test-integrity.ts` (+ `.test.ts`)                                 | CI gate: blocks weakened tests unless labeled                                    |
| `scripts/pr-checks.ts` (+ `.test.ts`)                                      | CI gate: log entry present, PDLC.md ≤ 80 lines, PR size warning                  |
| `.github/workflows/ci.yml`                                                 | All CI jobs                                                                      |
| `.github/pull_request_template.md`                                         | PR checklist                                                                     |
| `.claude/settings.json`                                                    | Permissions, hooks, plugin allowlist                                             |
| `.claude/hooks/*.ts` (+ `.test.ts`)                                        | Guard bash, guard test edits, lint on edit, verify on stop, load status on start |
| `.husky/pre-commit`, lint-staged config                                    | Local pre-commit gate                                                            |
| `AGENTS.md`, `CLAUDE.md`                                                   | Agent instructions (advisory layer)                                              |
| `docs/process/PDLC.md`                                                     | Current process (≤ 80 lines)                                                     |
| `docs/STATUS.md`                                                           | Current state snapshot for handoff                                               |
| `docs/log/2026-11.md`                                                      | Append-only dev log + retro                                                      |
| `docs/decisions/NNNN-*.md`                                                 | Architecture Decision Records                                                    |

---

### Task 1: Public GitHub repo and first push (bootstrap, on `main`)

**Files:** `.nvmrc` (already created, contains `24`), roadmap, plans, spec edits, learning PDFs.

- [ ] **Step 1: Commit the roadmap, plans, Node pin, and doc updates**

```bash
git add .nvmrc docs
git commit -m "docs: iteration 1 roadmap and M0 plan; pin Node 24"
```

- [ ] **Step 2: Create the public repo and push** (Andrew approved a public repo on 2026-11-08)

```bash
gh repo create fomodoro --public --source . --remote origin --push
```

Expected: `✓ Created repository andrewjhunsaker/fomodoro on GitHub` and `✓ Pushed commits`.

- [ ] **Step 3: Create the labels used by CI gates**

```bash
gh label create test-change-approved --color B60205 --description "Human-approved change to existing tests"
gh label create no-log --color CCCCCC --description "PR intentionally has no dev-log entry"
```

- [ ] **Step 4: Verify**

Run: `gh repo view --json visibility,defaultBranchRef -q '.visibility + " " + .defaultBranchRef.name'`
Expected: `PUBLIC main`

---

### Task 2: Scaffold the app with a tested hello screen (bootstrap, on `main`)

**Files:**

- Create: `.nvmrc`, Vite scaffold files, `src/App.tsx`, `src/App.test.tsx`, `src/test-setup.ts`, `vitest.config.ts`, `public/logo.svg`
- Modify: `package.json`, `vite.config.ts`, `index.html`

- [ ] **Step 1: Scaffold** (`.nvmrc` with `24` already exists from Task 1; also add `"engines": { "node": ">=24" }` to `package.json` after scaffolding)

```bash
source ~/.nvm/nvm.sh && nvm use
npm create vite@latest app-tmp -- --template react-ts
cp -R app-tmp/. . && rm -rf app-tmp
npm install
```

Expected: `package.json`, `src/`, `vite.config.ts`, `tsconfig.app.json`, `eslint.config.js` now exist. `.gitignore` from the template may overwrite ours — re-add our lines:

```bash
printf '.DS_Store\n.env*\n!.env.example\ntest-results/\nplaywright-report/\nreports/\n' >> .gitignore
```

- [ ] **Step 2: Install test dependencies**

```bash
npm i -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Configure Vitest**

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts', '.claude/hooks/**/*.test.ts'],
  },
});
```

`src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

Add scripts to `package.json` (keep the template's `dev`, `build`, `preview`):

```json
"typecheck": "tsc -b --noEmit",
"lint": "eslint .",
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write the failing test**

`src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('shows the app name as the main heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'fomodoro' })).toBeInTheDocument();
  });

  it('tells the user the timer is coming', () => {
    render(<App />);
    expect(screen.getByText('Timer coming soon.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run it to verify it fails**

Run: `npm test -- src/App.test.tsx`
Expected: FAIL — the template's App renders "Vite + React", not "fomodoro".

- [ ] **Step 6: Replace the template App with the minimal implementation**

`src/App.tsx`:

```tsx
export default function App() {
  return (
    <main>
      <h1>fomodoro</h1>
      <p>Timer coming soon.</p>
    </main>
  );
}
```

Delete template leftovers: `rm -f src/App.css src/assets/react.svg public/vite.svg` and remove the `import './index.css'` line from `src/main.tsx` along with `src/index.css`.

- [ ] **Step 7: Run tests, typecheck, build**

Run: `npm test && npm run typecheck && npm run build`
Expected: 2 tests pass; no type errors; `dist/` produced.

- [ ] **Step 8: Add the PWA plugin and icons**

```bash
npm i -D vite-plugin-pwa @vite-pwa/assets-generator
```

`public/logo.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#FAECE7"/><circle cx="256" cy="256" r="160" fill="none" stroke="#993C1D" stroke-width="40" stroke-linecap="round" stroke-dasharray="754 1005" transform="rotate(-90 256 256)"/></svg>
```

```bash
npx pwa-assets-generator --preset minimal-2023 public/logo.svg
```

Expected: `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico` in `public/`.

`vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'fomodoro',
        short_name: 'fomodoro',
        description: 'A calm Pomodoro timer',
        theme_color: '#FAECE7',
        background_color: '#FAECE7',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
});
```

In `index.html` `<head>`, set `<title>fomodoro</title>` and add:

```html
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
<meta name="theme-color" content="#FAECE7" />
```

- [ ] **Step 9: Verify the build emits a manifest and service worker**

Run: `npm run build && ls dist | grep -E 'manifest.webmanifest|sw.js'`
Expected: both files listed.

- [ ] **Step 10: Commit and push**

```bash
git add -A
git commit -m "feat: scaffold Vite React PWA with tested hello screen"
git push
```

---

### Task 3: Lint, format, and end-to-end smoke test

Issue: "M0: lint rules, Prettier, Playwright smoke test". Branch: `m0/3-lint-e2e`.

**Files:**

- Modify: `eslint.config.js`, `package.json`
- Create: `.prettierrc.json`, `.prettierignore`, `playwright.config.ts`, `e2e/smoke.spec.ts`

- [ ] **Step 1: Branch and install**

```bash
git switch -c m0/3-lint-e2e
npm i -D prettier eslint-config-prettier @vitest/eslint-plugin eslint-plugin-playwright @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Prettier config**

`.prettierrc.json`:

```json
{ "singleQuote": true, "printWidth": 100 }
```

`.prettierignore`:

```
dist
coverage
reports
playwright-report
test-results
package-lock.json
docs/**/*.pdf
```

- [ ] **Step 3: Extend the ESLint config**

Replace `eslint.config.js` with (keeps the template's React rules, adds test-weakening rules):

```js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import vitest from '@vitest/eslint-plugin';
import playwright from 'eslint-plugin-playwright';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'reports', 'playwright-report', 'test-results', 'dev-dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}'],
    plugins: { vitest },
    rules: {
      'vitest/no-disabled-tests': 'error',
      'vitest/no-focused-tests': 'error',
      'vitest/expect-expect': 'error',
      'vitest/valid-expect': 'error',
    },
  },
  {
    files: ['e2e/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-skipped-test': 'error',
      'playwright/no-focused-test': 'error',
    },
  },
  prettier,
);
```

Add to `package.json` scripts:

```json
"format": "prettier --write .",
"format:check": "prettier --check .",
"test:e2e": "playwright test"
```

- [ ] **Step 4: Prove the lint rule catches a skipped test**

```bash
printf "import { it, expect } from 'vitest';\nit.skip('x', () => { expect(1).toBe(1); });\n" > src/tmp.test.ts
npm run lint
```

Expected: FAIL with `vitest/no-disabled-tests`. Then `rm src/tmp.test.ts`.

- [ ] **Step 5: Playwright config**

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4173', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 6: Write the e2e test**

`e2e/smoke.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('home page shows the app name', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'fomodoro' })).toBeVisible();
});

test('page links a web app manifest', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    /manifest\.webmanifest$/,
  );
});
```

- [ ] **Step 7: Run everything**

Run: `npm run format && npm run lint && npm test && npm run test:e2e`
Expected: lint clean; 2 unit tests pass; 2 e2e tests pass.

- [ ] **Step 8: Commit, push, open PR**

```bash
git add -A
git commit -m "chore: lint rules against weakened tests, Prettier, Playwright smoke test"
git push -u origin m0/3-lint-e2e
gh pr create --fill --body "Closes #<issue>. Adds lint rules that fail on skipped/focused/assertion-less tests, Prettier, and a Chromium e2e smoke test."
```

Andrew reviews and merges.

---

### Task 4: Test-integrity gate script

Issue: "M0: CI gate that blocks weakened tests". Branch: `m0/4-test-integrity`.

**Files:**

- Create: `scripts/test-integrity.ts`, `scripts/test-integrity.test.ts`

The pure function `findViolations` compares each test file's base and head contents. The CLI gathers contents from git and decides pass/fail using the PR labels. Regex counting is a heuristic: it catches the common ways tests get weakened (deleting cases, deleting assertions, adding skips, editing snapshots), not every possible one. Stryker (M1) and human review cover the rest.

- [ ] **Step 1: Write the failing tests**

`scripts/test-integrity.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { findViolations, isTestFile, type FileChange } from './test-integrity.ts';

const change = (path: string, base: string | null, head: string | null): FileChange => ({
  path,
  base,
  head,
});

describe('isTestFile', () => {
  it('matches unit, spec, e2e and snapshot files', () => {
    expect(isTestFile('src/a.test.ts')).toBe(true);
    expect(isTestFile('src/a.spec.tsx')).toBe(true);
    expect(isTestFile('e2e/smoke.spec.ts')).toBe(true);
    expect(isTestFile('src/__snapshots__/a.test.ts.snap')).toBe(true);
  });
  it('ignores source files', () => {
    expect(isTestFile('src/App.tsx')).toBe(false);
  });
});

describe('findViolations', () => {
  it('allows new test files', () => {
    expect(
      findViolations([change('src/a.test.ts', null, "it('a', () => { expect(1).toBe(1) })")]),
    ).toEqual([]);
  });

  it('allows adding tests and assertions', () => {
    const base = "it('a', () => { expect(1).toBe(1) })";
    const head = base + "\nit('b', () => { expect(2).toBe(2) })";
    expect(findViolations([change('src/a.test.ts', base, head)])).toEqual([]);
  });

  it('flags a deleted test file', () => {
    expect(findViolations([change('src/a.test.ts', "it('a', () => {})", null)])).toEqual([
      { path: 'src/a.test.ts', reason: 'test file deleted' },
    ]);
  });

  it('flags fewer test cases', () => {
    const base = "it('a', () => { expect(1).toBe(1) })\nit('b', () => { expect(1).toBe(1) })";
    const head = "it('a', () => { expect(1).toBe(1); expect(2).toBe(2) })";
    expect(findViolations([change('src/a.test.ts', base, head)])).toContainEqual({
      path: 'src/a.test.ts',
      reason: 'test cases decreased from 2 to 1',
    });
  });

  it('flags fewer assertions', () => {
    const base = "it('a', () => { expect(1).toBe(1); expect(2).toBe(2) })";
    const head = "it('a', () => { expect(1).toBe(1) })";
    expect(findViolations([change('src/a.test.ts', base, head)])).toEqual([
      { path: 'src/a.test.ts', reason: 'assertions decreased from 2 to 1' },
    ]);
  });

  it('flags newly added skip, only, todo, and x-prefixed tests', () => {
    const base = "it('a', () => { expect(1).toBe(1) })";
    for (const added of [
      "it.skip('b', () => {})",
      "test.only('b', () => {})",
      "it.todo('b')",
      "xit('b', () => {})",
    ]) {
      const result = findViolations([change('src/a.test.ts', base, base + '\n' + added)]);
      expect(result.map((v) => v.reason)).toContain('skip/only/todo markers increased from 0 to 1');
    }
  });

  it('flags any change to a snapshot file', () => {
    expect(findViolations([change('src/__snapshots__/a.test.ts.snap', 'old', 'new')])).toEqual([
      { path: 'src/__snapshots__/a.test.ts.snap', reason: 'snapshot changed' },
    ]);
  });

  it('ignores non-test files', () => {
    expect(findViolations([change('src/App.tsx', 'a', null)])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- scripts/test-integrity.test.ts`
Expected: FAIL — `Cannot find module './test-integrity.ts'`.

Commit the failing tests on their own (the PDLC's test-first rule): `git add scripts/test-integrity.test.ts && git commit -m "test: test-integrity gate (failing)" --no-verify`. `--no-verify` is allowed only for this red commit, because the pre-commit hook (Task 8) would otherwise refuse failing code.

- [ ] **Step 3: Implement**

`scripts/test-integrity.ts`:

```ts
import { execFileSync } from 'node:child_process';

export type FileChange = { path: string; base: string | null; head: string | null };
export type Violation = { path: string; reason: string };

const TEST_FILE = /(\.(test|spec)\.[cm]?[jt]sx?$)|(^e2e\/.*\.[jt]s$)|(\.snap$)/;
const CASE = /\b(?:it|test)(?:\.each\([^)]*\))?\s*\(/g;
const ASSERTION = /\bexpect(?:\.soft)?\s*\(/g;
const MARKER =
  /\b(?:it|test|describe)\.(?:skip|only|todo|fixme)\b|\b(?:xit|xtest|xdescribe|fit|fdescribe)\s*\(/g;

export const isTestFile = (path: string) => TEST_FILE.test(path);
const count = (text: string, re: RegExp) => text.match(re)?.length ?? 0;

export function findViolations(changes: FileChange[]): Violation[] {
  const violations: Violation[] = [];
  for (const { path, base, head } of changes) {
    if (!isTestFile(path) || base === null) continue;
    if (head === null) {
      violations.push({ path, reason: 'test file deleted' });
      continue;
    }
    if (path.endsWith('.snap')) {
      if (base !== head) violations.push({ path, reason: 'snapshot changed' });
      continue;
    }
    const checks: [string, RegExp, 'decrease' | 'increase'][] = [
      ['test cases', CASE, 'decrease'],
      ['assertions', ASSERTION, 'decrease'],
      ['skip/only/todo markers', MARKER, 'increase'],
    ];
    for (const [label, re, bad] of checks) {
      const before = count(base, re);
      const after = count(head, re);
      if (bad === 'decrease' ? after < before : after > before) {
        violations.push({
          path,
          reason: `${label} ${bad === 'decrease' ? 'decreased' : 'increased'} from ${before} to ${after}`,
        });
      }
    }
  }
  return violations;
}

function git(args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' });
}

function show(ref: string, path: string): string | null {
  try {
    return git(['show', `${ref}:${path}`]);
  } catch {
    return null;
  }
}

function main() {
  const baseRef = `origin/${process.env.BASE_REF ?? 'main'}`;
  const labels: string[] = JSON.parse(process.env.PR_LABELS ?? '[]');
  const mergeBase = git(['merge-base', baseRef, 'HEAD']).trim();
  const paths = git(['diff', '--name-only', mergeBase, 'HEAD']).split('\n').filter(Boolean);
  const changes = paths.map((path) => ({
    path,
    base: show(mergeBase, path),
    head: show('HEAD', path),
  }));
  const violations = findViolations(changes);

  if (violations.length === 0) {
    console.log('test-integrity: no weakened tests');
    return;
  }
  for (const v of violations) console.log(`::warning file=${v.path}::${v.reason}`);
  if (labels.includes('test-change-approved')) {
    console.log('test-integrity: changes approved by label test-change-approved');
    return;
  }
  console.error(
    'test-integrity: existing tests were weakened. Fix the code instead, or ask Andrew to review and add the test-change-approved label.',
  );
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
```

- [ ] **Step 4: Run tests**

Run: `npm test -- scripts/test-integrity.test.ts`
Expected: all pass.

- [ ] **Step 5: Smoke-run the CLI locally**

Run: `git fetch origin && node scripts/test-integrity.ts`
Expected: `test-integrity: no weakened tests` (only new test files on this branch).

- [ ] **Step 6: Commit, push, PR**

```bash
git add scripts
git commit -m "ci: add test-integrity gate script"
git push -u origin m0/4-test-integrity
gh pr create --fill
```

---

### Task 5: Dev log, status, decisions, and process docs

Issue: "M0: dev log, STATUS.md, ADRs, PDLC.md, PR checks". Branch: `m0/5-docs-pr-checks`.

**Files:**

- Create: `docs/STATUS.md`, `docs/log/2026-11.md`, `docs/process/PDLC.md`, `docs/decisions/0001-record-architecture-decisions.md`, `docs/decisions/0002-push-scheduler.md`, `docs/decisions/0003-single-active-device.md`, `docs/decisions/0004-signed-out-defaults-only.md`, `docs/decisions/0005-design-authority.md`, `docs/learning/README.md`, `docs/learning/CONCEPTS.md`, `.github/pull_request_template.md`, `scripts/pr-checks.ts`, `scripts/pr-checks.test.ts`

- [ ] **Step 1: Write the failing tests for PR checks**

`scripts/pr-checks.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { checkLog, checkPdlc, sizeWarning } from './pr-checks.ts';

describe('checkLog', () => {
  it('passes when a dev-log file changed', () => {
    expect(checkLog(['src/a.ts', 'docs/log/2026-11.md'], [])).toBeNull();
  });
  it('passes with the no-log label', () => {
    expect(checkLog(['src/a.ts'], ['no-log'])).toBeNull();
  });
  it('fails otherwise', () => {
    expect(checkLog(['src/a.ts'], [])).toMatch(/docs\/log/);
  });
});

describe('checkPdlc', () => {
  it('passes at 80 lines', () => {
    expect(checkPdlc(80)).toBeNull();
  });
  it('fails above 80 lines', () => {
    expect(checkPdlc(81)).toMatch(/81/);
  });
});

describe('sizeWarning', () => {
  it('ignores lockfiles and PDFs', () => {
    expect(
      sizeWarning([
        { path: 'package-lock.json', changed: 5000 },
        { path: 'docs/learning/a.pdf', changed: 900 },
      ]),
    ).toBeNull();
  });
  it('warns above 400 changed lines', () => {
    expect(
      sizeWarning([
        { path: 'src/a.ts', changed: 300 },
        { path: 'src/b.ts', changed: 101 },
      ]),
    ).toMatch(/401/);
  });
  it('stays quiet at 400', () => {
    expect(sizeWarning([{ path: 'src/a.ts', changed: 400 }])).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- scripts/pr-checks.test.ts`
Expected: FAIL — module not found.

Commit the failing tests on their own: `git add scripts/pr-checks.test.ts && git commit -m "test: pr-checks (failing)" --no-verify`.

- [ ] **Step 3: Implement**

`scripts/pr-checks.ts`:

```ts
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const PDLC_LINE_CAP = 80;
export const PR_SIZE_WARNING = 400;
const SIZE_IGNORED = /(package-lock\.json|\.pdf|\.png|\.ico)$/;

export function checkLog(changedPaths: string[], labels: string[]): string | null {
  if (labels.includes('no-log') || changedPaths.some((p) => p.startsWith('docs/log/'))) return null;
  return 'Add an entry to docs/log/<YYYY-MM>.md for this PR (or apply the no-log label for trivial changes).';
}

export function checkPdlc(lineCount: number): string | null {
  return lineCount <= PDLC_LINE_CAP
    ? null
    : `docs/process/PDLC.md has ${lineCount} lines; the cap is ${PDLC_LINE_CAP}. Merge or remove a rule before adding one.`;
}

export function sizeWarning(files: { path: string; changed: number }[]): string | null {
  const total = files
    .filter((f) => !SIZE_IGNORED.test(f.path))
    .reduce((sum, f) => sum + f.changed, 0);
  return total > PR_SIZE_WARNING
    ? `This PR changes ${total} lines (excluding lockfiles and binaries). Reviews are most effective under ~${PR_SIZE_WARNING}; consider splitting.`
    : null;
}

function main() {
  const baseRef = `origin/${process.env.BASE_REF ?? 'main'}`;
  const labels: string[] = JSON.parse(process.env.PR_LABELS ?? '[]');
  const git = (args: string[]) => execFileSync('git', args, { encoding: 'utf8' });
  const mergeBase = git(['merge-base', baseRef, 'HEAD']).trim();
  const numstat = git(['diff', '--numstat', mergeBase, 'HEAD'])
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [added, removed, path] = line.split('\t');
      return { path, changed: (Number(added) || 0) + (Number(removed) || 0) };
    });

  const pdlcLines = readFileSync('docs/process/PDLC.md', 'utf8').trimEnd().split('\n').length;
  const errors = [
    checkLog(
      numstat.map((f) => f.path),
      labels,
    ),
    checkPdlc(pdlcLines),
  ].filter((e) => e !== null);
  const warning = sizeWarning(numstat);

  if (warning) console.log(`::warning::${warning}`);
  for (const e of errors) console.log(`::error::${e}`);
  if (errors.length > 0) process.exit(1);
  console.log('pr-checks: passed');
}

if (import.meta.url === `file://${process.argv[1]}`) main();
```

- [ ] **Step 4: Run tests**

Run: `npm test -- scripts/pr-checks.test.ts`
Expected: all pass.

- [ ] **Step 5: Write the process doc**

`docs/process/PDLC.md`:

```markdown
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
```

- [ ] **Step 6: Write the status snapshot**

`docs/STATUS.md`:

```markdown
# Status

_Updated at the end of every working session and when a PR merges. Keep under 60 lines._

**Last updated:** 2026-11-08
**Milestone:** M0 — walking skeleton + guardrails (`docs/plans/M0-walking-skeleton.md`)

## In progress

- Task 5: dev log, status, ADRs, PDLC, PR checks

## Next up

- Task 6: CI workflow
- Task 7: Claude guardrails (settings + hooks)

## Waiting on Andrew

- Branch-protection decision (GitHub Free doesn't enforce it on private repos)
- Cloudflare Pages connection (dashboard step)

## Known issues / risks

- None yet

## Recently done

- Tasks 1–4: repo, scaffold, lint + e2e, test-integrity gate
```

- [ ] **Step 7: Write the dev log**

`docs/log/2026-11.md`:

```markdown
# Dev log — 2026-11

Append one entry per merged PR, newest at the bottom. Milestone summaries use the same format with "Milestone" in the title.
Retro lines are consolidated into PDLC.md every 5 PRs; mark consolidated entries with `[consolidated]`.

<!-- Template
## YYYY-MM-DD — <title> (#PR)
**Changed:** what shipped, in a sentence or two.
**Notes:** decisions, gotchas, anything the next session needs to know.
**Retro:** worked: … / slowed us: … / change: …
-->

## 2026-11-08 — Design phase complete (no PR)

**Changed:** Topic-by-topic decisions, iteration 1 spec, roadmap, M0 plan, learning PDFs.
**Notes:** Spec at docs/specs/2026-11-08-iteration-1-design.md. Signed-out mode is defaults only; one active device with handoff.
**Retro:** worked: one decision per message, with visuals / slowed us: no sources in the first PDFs / change: cite sources and label evidence strength.

## 2026-11-08 — Repo + scaffold (Tasks 1–2, bootstrap on main)

**Changed:** Private GitHub repo; Vite React PWA with a tested hello screen.
**Notes:** Node 24 pinned in .nvmrc (nvm default on this machine is 18).
**Retro:** _fill in_

## 2026-11-08 — Lint + e2e smoke (Task 3, #PR)

**Changed:** Lint rules that fail on skipped/focused/assertion-less tests; Prettier; Playwright smoke test.
**Notes:**
**Retro:**

## 2026-11-08 — Test-integrity gate (Task 4, #PR)

**Changed:** scripts/test-integrity.ts blocks weakened tests unless labeled.
**Notes:** Regex-based heuristic; Stryker (M1) and review cover what it misses.
**Retro:**
```

The engineer fills in the `#PR` numbers and empty Notes/Retro lines with Andrew during review.

- [ ] **Step 8: Write the ADRs** (format: Nygard 2011 — context, decision, consequences)

`docs/decisions/0001-record-architecture-decisions.md`:

```markdown
# 1. Record architecture decisions

**Status:** Accepted · 2026-11-08

**Context:** Decisions so far live in a long chat and in the spec. A future session (human or AI) needs to know why a choice was made without rereading everything.

**Decision:** Record significant or hard-to-reverse decisions as short ADRs in `docs/decisions/`, numbered, using context / decision / consequences (Nygard, "Documenting Architecture Decisions", 2011). Superseded ADRs stay, marked "Superseded by N".

**Consequences:** A small writing cost per decision; reversals stay traceable.
```

`docs/decisions/0002-push-scheduler.md`:

```markdown
# 2. Push scheduler: pg_cron every second, behind an interface

**Status:** Accepted · 2026-11-08

**Context:** iOS suspends PWA JavaScript in the background, so block-end alerts must come from server-sent Web Push at the right time (target: p95 within ±2 s). We're on Supabase's free tier.

**Decision:** A `pg_cron` job runs every second, finds due rows in `scheduled_pushes`, and calls the push-sender Edge Function only when some are due. The app only knows `schedulePush` / `cancelPush`.

**Consequences:** Cheap and simple, but less standard than a delayed-delivery queue. Latency is measured from day one; if p95 misses ±2 s, replace the scheduler with Cloudflare Durable Object alarms behind the same interface.
```

`docs/decisions/0003-single-active-device.md`:

```markdown
# 3. One active device with handoff

**Status:** Accepted · 2026-11-08

**Context:** Notifying every signed-in device at once is noisy; controlling the timer from several devices invites conflicts.

**Decision:** Exactly one active device controls the running cycle and receives pushes. Other devices show a read-only countdown and "Take over here?". Offline, the device in hand keeps control; on reconnect, a takeover that happened meanwhile wins.

**Consequences:** Needs `active_cycle.active_device_id`, versioned writes, and Realtime. Simpler mental model; fewer duplicate alerts.
```

`docs/decisions/0004-signed-out-defaults-only.md`:

```markdown
# 4. Signed-out mode uses defaults only

**Status:** Accepted · 2026-11-08

**Context:** Supporting custom settings while signed out means storing them locally and merging them into the account on first sign-in.

**Decision:** Signed out, the timer uses fixed defaults (25/5/15, long break every 4) with local notifications only. All settings belong to the account.

**Consequences:** No local-to-account merge logic or conflicts. Signed-out users can't customize; acceptable for a personal app.
```

`docs/decisions/0005-design-authority.md`:

```markdown
# 5. Design authority: WCAG 2.2 AA, then Apple HIG

**Status:** Accepted · 2026-11-08

**Context:** Many UX sources disagree or are only heuristics (see the evidence labels in docs/learning). The app targets iPhone and Mac.

**Decision:** For UI/UX decisions, the order of authority is: 1) WCAG 2.2 Level AA (W3C Recommendation), 2) Apple Human Interface Guidelines (iOS and macOS), 3) findings with Strong evidence (e.g. Fitts's law), 4) heuristics and guidelines (Nielsen, laws of UX, Krug). Accessibility wins any conflict.

**Consequences:** Design choices name the authority they follow. The HIG is written for native apps; where a HIG pattern doesn't carry over to a web app (native-only controls, SF Symbols licensing), the decision says so and Andrew decides.
```

- [ ] **Step 8b: Learning concept tracker and reading order**

`docs/learning/README.md`:

```markdown
# Learning docs — reading order

Each document builds on the earlier ones and doesn't repeat them. Read top to bottom; tick off as you go.

| #   | Document                     | Depth                                                  | Time    | Status          |
| --- | ---------------------------- | ------------------------------------------------------ | ------- | --------------- |
| 1   | `ux-primer.pdf`              | Overview of UX principles and authorities              | 30 min  | Read 2026-11-08 |
| 2   | `ux-heuristics-and-laws.pdf` | Deep dive: Nielsen's heuristics and the laws of UX     | ~45 min |                 |
| 3   | `usability-fundamentals.pdf` | How people use interfaces; writing, forms, testing     | ~60 min |                 |
| 4   | `dev-process-primer.pdf`     | Process, testing, and AI-assisted development evidence | ~25 min |                 |

Concepts we actually apply are tracked in `CONCEPTS.md`.
```

`docs/learning/CONCEPTS.md`:

```markdown
# Concepts in use

Every concept from the learning docs that shapes a real decision. Opinionated applications are agreed with Andrew first.
Status: applied · considered · rejected.

| Concept                                           | Source doc         | Evidence                       | Where applied     | Status     |
| ------------------------------------------------- | ------------------ | ------------------------------ | ----------------- | ---------- |
| WCAG 2.2 AA as top UI authority                   | ux-primer          | Strong (standard)              | ADR 0005; spec §4 | applied    |
| Apple HIG as platform authority                   | ux-primer          | Heuristic (platform guideline) | ADR 0005; spec §4 | applied    |
| Progressive disclosure (settings behind one icon) | ux-primer          | Heuristic                      | spec §4           | applied    |
| One primary action (Hick-Hyman, Fitts)            | ux-primer          | Moderate / Strong              | spec §4           | applied    |
| Use of color is not the only signal (WCAG 1.4.1)  | ux-primer          | Strong (standard)              | spec §4           | applied    |
| Walking skeleton                                  | dev-process-primer | Heuristic                      | M0                | applied    |
| Small batches, PR size warning                    | dev-process-primer | Strong / Moderate              | M0 pr-checks      | applied    |
| Mutation testing over coverage %                  | dev-process-primer | Strong                         | M1 Stryker gate   | considered |
| ADRs                                              | dev-process-primer | Heuristic                      | docs/decisions    | applied    |
| Context engineering (short always-loaded context) | dev-process-primer | Heuristic                      | AGENTS.md, hooks  | applied    |
```

- [ ] **Step 9: PR template**

`.github/pull_request_template.md`:

```markdown
Closes #

## What changed

## How it was tested

- [ ] Test-only commits come first and failed before the implementation
- [ ] No existing test was weakened (or `test-change-approved` was requested with a reason below)
- [ ] Checked on the preview deploy (UI changes)

## Log

- [ ] Entry added to `docs/log/<YYYY-MM>.md` (or `no-log` label for trivial changes)
- [ ] `docs/STATUS.md` updated
```

- [ ] **Step 10: Run checks and the CLI**

Run: `npm test && npm run format && git add -A && git commit -m "docs: dev log, status, ADRs, PDLC, PR template; ci: pr-checks script" && node scripts/pr-checks.ts`
Expected: tests pass; `pr-checks: passed`.

- [ ] **Step 11: Push and PR**

```bash
git push -u origin m0/5-docs-pr-checks
gh pr create --fill
```

---

### Task 6: CI workflow

Issue: "M0: GitHub Actions CI with all gates". Branch: `m0/6-ci`.

**Files:**

- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write the workflow**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize, reopened, labeled, unlabeled]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run format:check
      - run: npm test
      - run: npm run build
      - run: npm audit --audit-level=high

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report
          retention-days: 7

  pr-gates:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    env:
      BASE_REF: ${{ github.base_ref }}
      PR_LABELS: ${{ toJSON(github.event.pull_request.labels.*.name) }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
      - run: node scripts/test-integrity.ts
      - run: node scripts/pr-checks.ts

  secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- [ ] **Step 2: Push and watch it run**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add CI workflow with all gates"
git push -u origin m0/6-ci
gh pr create --fill
gh pr checks --watch
```

Expected: `verify`, `e2e`, `pr-gates`, `secrets` all pass. If `pr-gates` fails on the missing log entry, add the entry — that's the gate working.

- [ ] **Step 3: Prove the test-integrity gate blocks** (throwaway branch, never merged)

```bash
git switch -c m0/6-gate-demo
sed -i '' "s/^  it('tells the user the timer is coming'/  it.skip('tells the user the timer is coming'/" src/App.test.tsx
git commit -am "demo: weaken a test" --no-verify
git push -u origin m0/6-gate-demo
gh pr create --draft --title "Demo: gate should block" --body "Throwaway. Do not merge."
gh pr checks --watch
```

Expected: `verify` fails (lint `vitest/no-disabled-tests`) and `pr-gates` fails (`skip/only/todo markers increased from 0 to 1`). Then close it:

```bash
gh pr close --delete-branch
git switch m0/6-ci
```

---

### Task 7: Claude guardrails — settings and hooks

Issue: "M0: Claude Code permissions, hooks, plugin allowlist". Branch: `m0/7-claude-guardrails`.

**Files:**

- Create: `.claude/hooks/lib.ts`, `.claude/hooks/guard-bash.ts`, `.claude/hooks/guard-bash.test.ts`, `.claude/hooks/guard-tests.ts`, `.claude/hooks/guard-tests.test.ts`, `.claude/hooks/post-edit-lint.ts`, `.claude/hooks/stop-verify.ts`, `.claude/hooks/session-start.ts`, `.claude/settings.json`

Hook contract (Claude Code docs, "Hooks reference"): the hook receives JSON on stdin (`tool_name`, `tool_input`, …). Exit code 2 blocks the action and shows stderr to Claude. For PreToolUse, printing `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"…"}}` asks Andrew instead. SessionStart stdout is added to Claude's context. Stop hooks get `stop_hook_active` and must not block when it's true, to avoid loops.

- [ ] **Step 1: Shared stdin helper**

`.claude/hooks/lib.ts`:

```ts
export async function readInput<T>(): Promise<T> {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  return JSON.parse(raw || '{}') as T;
}

export const isMain = (url: string) => url === `file://${process.argv[1]}`;
```

- [ ] **Step 2: Write failing tests for the bash guard**

`.claude/hooks/guard-bash.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { evaluateCommand } from './guard-bash.ts';

describe('evaluateCommand', () => {
  const blocked = [
    'git push origin main',
    'git push -f origin m0/1-x',
    'git push --force',
    'git reset --hard HEAD~1',
    'git clean -fd',
    'git branch -D m0/1-x',
    'rm -rf node_modules',
    'rm -fr dist',
    'cat .env',
    'grep KEY .env.local',
    'npm test && git push origin main',
  ];
  for (const cmd of blocked) {
    it(`blocks: ${cmd}`, () => {
      expect(evaluateCommand(cmd, 'm0/1-x').block).toBe(true);
    });
  }

  it('blocks a bare git push while on main', () => {
    expect(evaluateCommand('git push', 'main').block).toBe(true);
  });

  const allowed = [
    'git push -u origin m0/1-x',
    'git push --force-with-lease',
    'npm test',
    'cat .env.example',
    'git status',
  ];
  for (const cmd of allowed) {
    it(`allows: ${cmd}`, () => {
      expect(evaluateCommand(cmd, 'm0/1-x').block).toBe(false);
    });
  }

  it('explains why it blocked', () => {
    expect(evaluateCommand('git reset --hard', 'x').reason).toMatch(/reset --hard/);
  });
});
```

Note: `--force-with-lease` is allowed on feature branches because it refuses to overwrite commits you haven't seen; plain `--force` is blocked.

- [ ] **Step 3: Run to verify failure**

Run: `npm test -- .claude/hooks/guard-bash.test.ts`
Expected: FAIL — module not found.

After writing both test files (Steps 2 and 6), commit them together before implementing either guard: `git add .claude/hooks/*.test.ts .claude/hooks/lib.ts && git commit -m "test: Claude guard hooks (failing)" --no-verify`.

- [ ] **Step 4: Implement the bash guard**

`.claude/hooks/guard-bash.ts`:

```ts
import { execFileSync } from 'node:child_process';
import { isMain, readInput } from './lib.ts';

const RULES: [RegExp, string][] = [
  [/\bgit\s+push\b[^;&|]*\b(main|master)\b/, 'pushing to main is blocked; open a PR'],
  [
    /\bgit\s+push\b[^;&|]*(--force(?!-with-lease)|\s-f\b)/,
    'force push is blocked; use --force-with-lease on your own branch',
  ],
  [/\bgit\s+reset\s+--hard\b/, 'git reset --hard discards work; ask Andrew'],
  [/\bgit\s+clean\s+-\w*f/, 'git clean -f deletes untracked files; ask Andrew'],
  [/\bgit\s+branch\s+-D\b/, 'git branch -D force-deletes a branch; ask Andrew'],
  [/\brm\s+-\w*(rf|fr)\w*\b/, 'rm -rf is blocked; delete specific files instead'],
  [
    /\.env(?!\.example)(\.\w+)?\b/,
    'reading .env files is blocked; secrets stay out of the conversation',
  ],
];

export function evaluateCommand(
  command: string,
  branch: string,
): { block: boolean; reason?: string } {
  for (const [re, reason] of RULES) if (re.test(command)) return { block: true, reason };
  if (branch === 'main' && /\bgit\s+push\s*($|[;&|])/.test(command)) {
    return { block: true, reason: 'pushing while on main is blocked; switch to a feature branch' };
  }
  return { block: false };
}

if (isMain(import.meta.url)) {
  const input = await readInput<{ tool_input?: { command?: string } }>();
  let branch = '';
  try {
    branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
  } catch {}
  const result = evaluateCommand(input.tool_input?.command ?? '', branch);
  if (result.block) {
    console.error(`Blocked by guard-bash: ${result.reason}`);
    process.exit(2);
  }
}
```

- [ ] **Step 5: Run tests**

Run: `npm test -- .claude/hooks/guard-bash.test.ts`
Expected: all pass.

- [ ] **Step 6: Write failing tests for the test-file guard**

`.claude/hooks/guard-tests.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { decide } from './guard-tests.ts';

describe('decide', () => {
  it('asks before editing an existing test file', () => {
    expect(decide('src/App.test.tsx', true)).toMatchObject({ permissionDecision: 'ask' });
  });
  it('allows creating a new test file', () => {
    expect(decide('src/new.test.ts', false)).toBeNull();
  });
  it('ignores non-test files', () => {
    expect(decide('src/App.tsx', true)).toBeNull();
  });
});
```

- [ ] **Step 7: Implement the test-file guard**

`.claude/hooks/guard-tests.ts`:

```ts
import { existsSync } from 'node:fs';
import { isTestFile } from '../../scripts/test-integrity.ts';
import { isMain, readInput } from './lib.ts';

export function decide(filePath: string, exists: boolean) {
  if (!exists || !isTestFile(filePath)) return null;
  return {
    hookEventName: 'PreToolUse',
    permissionDecision: 'ask',
    permissionDecisionReason: `Editing an existing test (${filePath}) needs Andrew's approval under the no-test-weakening policy. Explain why the test should change.`,
  };
}

if (isMain(import.meta.url)) {
  const input = await readInput<{ tool_input?: { file_path?: string } }>();
  const filePath = input.tool_input?.file_path ?? '';
  const relative = filePath.replace(`${process.env.CLAUDE_PROJECT_DIR ?? process.cwd()}/`, '');
  const output = decide(relative, existsSync(filePath));
  if (output) console.log(JSON.stringify({ hookSpecificOutput: output }));
}
```

- [ ] **Step 8: Run tests**

Run: `npm test -- .claude/hooks`
Expected: all pass.

- [ ] **Step 9: Lint-on-edit, verify-on-stop, and session-start hooks**

These three are thin wrappers around existing commands (ESLint, tsc, Vitest), so they're verified by running them in Step 12 instead of unit tests.

`.claude/hooks/post-edit-lint.ts`:

```ts
import { spawnSync } from 'node:child_process';
import { isMain, readInput } from './lib.ts';

if (isMain(import.meta.url)) {
  const input = await readInput<{ tool_input?: { file_path?: string } }>();
  const file = input.tool_input?.file_path ?? '';
  if (/\.(ts|tsx|js)$/.test(file)) {
    spawnSync('npx', ['prettier', '--write', file], { encoding: 'utf8' });
    const lint = spawnSync('npx', ['eslint', '--fix', file], { encoding: 'utf8' });
    if (lint.status !== 0) {
      console.error(`ESLint found problems in ${file}:\n${lint.stdout.slice(0, 3000)}`);
      process.exit(2);
    }
  }
}
```

`.claude/hooks/stop-verify.ts`:

```ts
import { execFileSync, spawnSync } from 'node:child_process';
import { isMain, readInput } from './lib.ts';

if (isMain(import.meta.url)) {
  const input = await readInput<{ stop_hook_active?: boolean }>();
  if (input.stop_hook_active) process.exit(0);

  const git = (args: string[]) => execFileSync('git', args, { encoding: 'utf8' });
  const changed = [
    ...git(['diff', '--name-only', 'HEAD']).split('\n'),
    ...git(['ls-files', '--others', '--exclude-standard']).split('\n'),
  ].filter((f) => /\.(ts|tsx)$/.test(f));
  if (changed.length === 0) process.exit(0);

  const typecheck = spawnSync('npm', ['run', 'typecheck', '--silent'], { encoding: 'utf8' });
  const tests = spawnSync('npx', ['vitest', 'related', '--run', ...changed], { encoding: 'utf8' });
  const failures = [
    typecheck.status !== 0 ? `Typecheck failed:\n${typecheck.stdout.slice(-2000)}` : '',
    tests.status !== 0 ? `Related tests failed:\n${tests.stdout.slice(-2000)}` : '',
  ].filter(Boolean);
  if (failures.length > 0) {
    console.error(`${failures.join('\n\n')}\n\nFix these before finishing. Do not weaken tests.`);
    process.exit(2);
  }
}
```

`.claude/hooks/session-start.ts`:

```ts
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

let branch = 'unknown';
try {
  branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
} catch {}
let status = '(docs/STATUS.md not found)';
try {
  status = readFileSync('docs/STATUS.md', 'utf8');
} catch {}
console.log(`Current branch: ${branch}\n\n${status}\n\nProcess rules: docs/process/PDLC.md`);
```

- [ ] **Step 10: Build the plugin allowlist**

List currently enabled plugins:

```bash
node -e "const s=require(process.env.HOME+'/.claude/settings.json'); console.log(JSON.stringify(Object.keys(s.enabledPlugins||{}),null,1))"
```

In `.claude/settings.json` (next step), `enabledPlugins` lists every one of those keys with `false`, except the superpowers and engineering entries, which are `true`.

- [ ] **Step 11: Write `.claude/settings.json`**

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Bash(npm run:*)",
      "Bash(npm test:*)",
      "Bash(npx vitest:*)",
      "Bash(npx playwright test:*)",
      "Bash(npx eslint:*)",
      "Bash(npx prettier:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git switch:*)",
      "Bash(gh pr view:*)",
      "Bash(gh pr list:*)",
      "Bash(gh pr checks:*)",
      "Bash(gh issue view:*)",
      "Bash(gh issue list:*)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Bash(git push --force:*)",
      "Bash(git push origin main:*)",
      "Bash(git reset --hard:*)",
      "Bash(rm -rf:*)"
    ]
  },
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/session-start.ts\""
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/guard-bash.ts\""
          }
        ]
      },
      {
        "matcher": "Edit|MultiEdit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/guard-tests.ts\""
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|MultiEdit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/post-edit-lint.ts\""
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/stop-verify.ts\""
          }
        ]
      }
    ]
  },
  "enabledPlugins": {}
}
```

Fill `enabledPlugins` from Step 10. The `deny` rules duplicate the bash guard on purpose: two independent layers.

Note: the hooks run with whatever `node` is on PATH. Claude Code must be started from a shell where `nvm use` selected Node 24 (Node 18 can't run `.ts` files). Add this to AGENTS.md (Task 8).

- [ ] **Step 12: Verify the hooks end to end**

```bash
echo '{"tool_input":{"command":"git push origin main"}}' | node .claude/hooks/guard-bash.ts; echo "exit=$?"
echo '{"tool_input":{"file_path":"'"$PWD"'/src/App.test.tsx"}}' | node .claude/hooks/guard-tests.ts
echo '{"tool_input":{"file_path":"src/App.tsx"}}' | node .claude/hooks/post-edit-lint.ts; echo "exit=$?"
echo '{"stop_hook_active":true}' | node .claude/hooks/stop-verify.ts; echo "exit=$?"
node .claude/hooks/session-start.ts | head -3
```

Expected: `Blocked by guard-bash: pushing to main is blocked; open a PR` and `exit=2`; JSON with `"permissionDecision":"ask"`; `exit=0`; `exit=0`; `Current branch: m0/7-claude-guardrails`.

Then start a fresh Claude Code session in the repo and confirm: no settings validation errors on startup, the STATUS summary appears in context, and asking Claude to run `git push origin main` is blocked.

- [ ] **Step 13: Commit, push, PR**

```bash
npm test && npm run lint
git add .claude
git commit -m "chore: Claude Code permissions, guard hooks, plugin allowlist"
git push -u origin m0/7-claude-guardrails
gh pr create --fill
```

---

### Task 8: Agent instructions and pre-commit gate

Issue: "M0: AGENTS.md, CLAUDE.md, Husky pre-commit". Branch: `m0/8-agents-precommit`.

**Files:**

- Create: `AGENTS.md`, `CLAUDE.md`, `.husky/pre-commit`
- Modify: `package.json` (lint-staged, prepare)

- [ ] **Step 1: Write `AGENTS.md`** (advisory layer; keep under 100 lines)

```markdown
# AGENTS.md — fomodoro

A personal Pomodoro PWA (React + Vite + TypeScript; Supabase from M2; Cloudflare Pages).

## Start of every session

1. Read `docs/STATUS.md` (current state) and `docs/process/PDLC.md` (how we work).
2. Work on exactly one issue. Its plan is in `docs/plans/`.
3. Use Node 24: `source ~/.nvm/nvm.sh && nvm use`.

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
```

- [ ] **Step 2: Write `CLAUDE.md`**

```markdown
@AGENTS.md
```

- [ ] **Step 3: Set up Husky + lint-staged**

```bash
npm i -D husky lint-staged
npx husky init
```

Add to `package.json`:

```json
"lint-staged": {
  "*.{ts,tsx,js}": ["prettier --write", "eslint --fix"],
  "*.{json,md,yml,css,html}": ["prettier --write"]
}
```

`.husky/pre-commit`:

```sh
npx lint-staged
if command -v gitleaks >/dev/null 2>&1; then
  gitleaks protect --staged --no-banner
else
  echo "gitleaks not installed locally (brew install gitleaks); CI will still scan."
fi
```

- [ ] **Step 4: Verify the hook runs**

```bash
brew install gitleaks
echo "// formatting test" >> src/App.tsx
git add src/App.tsx && git commit -m "test: pre-commit hook"
```

Expected: lint-staged runs Prettier/ESLint; gitleaks reports `no leaks found`; commit succeeds. Then undo the throwaway commit's content: `git revert --no-edit HEAD` (keeps history honest rather than resetting).

- [ ] **Step 5: Commit, push, PR**

```bash
git add AGENTS.md CLAUDE.md .husky package.json package-lock.json
git commit -m "chore: AGENTS.md, CLAUDE.md, Husky pre-commit with lint-staged and gitleaks"
git push -u origin m0/8-agents-precommit
gh pr create --fill
```

---

### Task 9: Cloudflare Pages with PR previews (human steps)

Issue: "M0: deploy to Cloudflare Pages". No code changes except a STATUS/log update.

These steps happen in Andrew's Cloudflare account; Claude can't do them. Use the `wizard` skill to generate a guided script if helpful.

- [ ] **Step 1: Connect the repo** — Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → authorize GitHub for the `fomodoro` repo only.
- [ ] **Step 2: Build settings** — Framework preset: None. Build command: `npm run build`. Output directory: `dist`. Environment variable: `NODE_VERSION` = `24`.
- [ ] **Step 3: Preview deployments** — Settings → Builds → Preview branch control: all non-production branches. Production branch: `main`.
- [ ] **Step 4: Verify** — open the production URL (`https://fomodoro.pages.dev` or similar): heading "fomodoro" shows; Chrome shows the install icon in the address bar. Open any PR: a Cloudflare comment with a preview link appears.
- [ ] **Step 5: Verify on iPhone** — open the URL in Safari → Share → Add to Home Screen → launch from the icon: it opens full-screen with the fomodoro icon.
- [ ] **Step 6: Log it** — log entry + STATUS update in a small PR.

---

### Task 10: Merge protection and AI review (decision + human steps)

Issue: "M0: branch protection and AI review".

**Decided 2026-11-08: option B (repo is public), so apply Step 1 with `gh api`.** Background: GitHub Free does not enforce branch protection or rulesets on private repositories (GitHub docs, "About protected branches"). Options:

| Option                  | Cost     | Effect                                                                                                                                  |
| ----------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| A. GitHub Pro           | $4/month | Real enforcement: required checks, no direct pushes to `main`                                                                           |
| B. Make the repo public | Free     | Real enforcement, but the code is visible                                                                                               |
| C. Stay on Free         | Free     | No server-side enforcement; rely on Claude's guard hook + deny rules, plus a local `pre-push` hook. Andrew can still bypass by accident |

- [ ] **Step 1: Apply protection** (options A or B)

```bash
gh api -X PUT repos/andrewjhunsaker/fomodoro/branches/main/protection --input - <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": ["verify", "e2e", "pr-gates", "secrets"] },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```

`enforce_admins: false` lets Andrew merge his own PRs; required checks still have to pass. Verify: `gh api repos/andrewjhunsaker/fomodoro/branches/main/protection -q '.required_status_checks.contexts'` lists the four checks.

- [ ] **Step 1 (alternative, option C): local pre-push hook**

`.husky/pre-push`:

```sh
branch=$(git branch --show-current)
if [ "$branch" = "main" ]; then
  echo "Pushing to main is blocked locally. Open a PR from a feature branch."
  exit 1
fi
```

- [ ] **Step 2: Install AI review** — in an interactive `claude` terminal in the repo, run `/install-github-app`. It installs the Claude GitHub app on the repo and adds the workflow and secret (uses Andrew's API key or Claude subscription; review costs count against it). Set the review to comment only — it's advisory, so it must not be a required check.
- [ ] **Step 3: Verify** — open a trivial PR (e.g. STATUS update): the four checks run and are required; Claude posts a review comment; merge is blocked until checks pass.
- [ ] **Step 4: Log it and close M0** — log entry; milestone summary entry with a retro; STATUS points to M1.

---

## M0 done when

- [ ] A PR can't merge until `verify`, `e2e`, `pr-gates`, `secrets` pass (or, under option C, the local guards are in place and documented).
- [ ] The gate demo showed a weakened test being blocked.
- [ ] `main` deploys to Cloudflare Pages; PRs get preview links; the app installs on iPhone and Mac.
- [ ] Claude sessions start with STATUS in context, can't push to `main`, and ask before editing existing tests.
- [ ] `docs/log/2026-11.md` has an entry per PR and an M0 summary; `docs/STATUS.md` points to M1.
