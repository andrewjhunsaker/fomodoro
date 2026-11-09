import { execFileSync } from 'node:child_process';

export type FileChange = { path: string; base: string | null; head: string | null };
export type Violation = { path?: string; reason: string };

// Regex counting is a heuristic. It deliberately does not handle nested parens in it.each(...)
// or inline snapshots; Stryker (M1) and human review cover what regexes cannot.
const TEST_FILE = /(\.(test|spec)\.[cm]?[jt]sx?$)|(^e2e\/.*\.[jt]s$)|(\.snap$)/;
const CASE = /\b(?:it|test)(?:\.each\([^)]*\))?\s*\(/g;
const ASSERTION = /\bexpect(?:\.soft)?\s*\(/g;
const MARKER =
  /\b(?:it|test|describe)(?:\.concurrent|\.sequential)?\.(?:skip|only|todo|fixme|skipIf|runIf)\b|\b(?:test\.describe)\.(?:skip|only|fixme)\b|\b(?:xit|xtest|xdescribe|fit|fdescribe)\s*\(/g;
// Drops comments (so commented-out tests count as removed) and blanks string literals (so
// fixture text like "it.skip(...)" inside a string is not counted).
const COMMENT =
  /("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|\/\/[^\n]*|\/\*[\s\S]*?\*\//g;

export const isTestFile = (path: string) => TEST_FILE.test(path);
const stripComments = (text: string) =>
  text.replace(COMMENT, (_m, str?: string) => (str ? '""' : ''));
const count = (text: string | null, re: RegExp) =>
  text === null ? 0 : (stripComments(text).match(re)?.length ?? 0);

export function findViolations(changes: FileChange[]): Violation[] {
  const violations: Violation[] = [];
  const testChanges = changes.filter((c) => isTestFile(c.path));
  for (const { path, base, head } of testChanges) {
    if (path.endsWith('.snap') && base !== null && base !== head) {
      violations.push({ path, reason: 'snapshot changed' });
    }
  }
  const code = testChanges.filter((c) => !c.path.endsWith('.snap'));
  const checks: [string, RegExp, 'decrease' | 'increase'][] = [
    ['test cases', CASE, 'decrease'],
    ['assertions', ASSERTION, 'decrease'],
    ['skip/only/todo markers', MARKER, 'increase'],
  ];
  for (const [label, re, bad] of checks) {
    const before = code.reduce((n, c) => n + count(c.base, re), 0);
    const after = code.reduce((n, c) => n + count(c.head, re), 0);
    if (bad === 'decrease' ? after < before : after > before) {
      violations.push({
        reason: `${label} ${bad === 'decrease' ? 'decreased' : 'increased'} from ${before} to ${after} across changed test files`,
      });
    }
  }
  return violations;
}

function git(args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' });
}

function show(ref: string, path: string): string | null {
  try {
    execFileSync('git', ['cat-file', '-e', `${ref}:${path}`], { stdio: 'ignore' });
  } catch {
    return null; // path does not exist at this ref
  }
  return execFileSync('git', ['show', `${ref}:${path}`], {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  });
}

function main() {
  const baseRef = `origin/${process.env.BASE_REF || 'main'}`;
  const labels: string[] = JSON.parse(process.env.PR_LABELS || '[]');
  const mergeBase = git(['merge-base', baseRef, 'HEAD']).trim();
  const paths = git(['diff', '--name-only', '--no-renames', mergeBase, 'HEAD'])
    .split('\n')
    .filter(Boolean);
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
  for (const v of violations)
    console.log(v.path ? `::warning file=${v.path}::${v.reason}` : `::warning::${v.reason}`);
  if (labels.includes('test-change-approved')) {
    console.log('test-integrity: changes approved by label test-change-approved');
    return;
  }
  console.error(
    'test-integrity: existing tests were weakened. Fix the code instead, or ask Andrew to review and add the test-change-approved label.',
  );
  process.exit(1);
}

if (import.meta.main) main();
