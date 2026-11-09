import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { projectDir } from './lib.ts';

const cwd = projectDir();
let branch = 'unknown';
try {
  branch = execFileSync('git', ['branch', '--show-current'], { cwd, encoding: 'utf8' }).trim();
} catch {
  // Not a git checkout: report the branch as unknown.
}
let status = '(docs/STATUS.md not found)';
try {
  status = readFileSync(join(cwd, 'docs/STATUS.md'), 'utf8');
} catch {
  // Keep the placeholder.
}
console.log(`Current branch: ${branch}\n\n${status}\n\nProcess rules: docs/process/PDLC.md`);
