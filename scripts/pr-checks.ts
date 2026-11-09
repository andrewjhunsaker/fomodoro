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
  const baseRef = `origin/${process.env.BASE_REF || 'main'}`;
  const labels: string[] = JSON.parse(process.env.PR_LABELS || '[]');
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

if (import.meta.main) main();
