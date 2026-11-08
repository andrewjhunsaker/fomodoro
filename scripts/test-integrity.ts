import { execFileSync } from 'node:child_process';

export type FileChange = { path: string; base: string | null; head: string | null };
export type Violation = { path: string; reason: string };

const TEST_FILE = /(\.(test|spec)\.[cm]?[jt]sx?$)|(^e2e\/.*\.[jt]s$)|(\.snap$)/;
const CASE = /\b(?:it|test)(?:\.each\([^)]*\))?\s*\(/g;
const ASSERTION = /\bexpect(?:\.soft)?\s*\(/g;
const MARKER = /\b(?:it|test|describe)\.(?:skip|only|todo|fixme)\b|\b(?:xit|xtest|xdescribe|fit|fdescribe)\s*\(/g;

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
        violations.push({ path, reason: `${label} ${bad === 'decrease' ? 'decreased' : 'increased'} from ${before} to ${after}` });
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
  const changes = paths.map((path) => ({ path, base: show(mergeBase, path), head: show('HEAD', path) }));
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
  console.error('test-integrity: existing tests were weakened. Fix the code instead, or ask Andrew to review and add the test-change-approved label.');
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
