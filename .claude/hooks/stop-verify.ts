import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { projectDir, readInput } from './lib.ts';

if (import.meta.main) {
  const input = await readInput<{ stop_hook_active?: boolean }>();
  // Already continuing because of a Stop hook: don't block again, or we could loop forever.
  if (input.stop_hook_active) process.exit(0);

  const cwd = projectDir();
  const git = (args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8' });
  const changed = [
    ...git(['diff', '--name-only', 'HEAD']).split('\n'),
    ...git(['ls-files', '--others', '--exclude-standard']).split('\n'),
  ].filter((f) => /\.(ts|tsx)$/.test(f) && existsSync(join(cwd, f)));
  if (changed.length === 0) process.exit(0);

  const opts = { cwd, encoding: 'utf8' } as const;
  const typecheck = spawnSync('npm', ['run', 'typecheck', '--silent'], opts);
  const tests = spawnSync(
    'npx',
    ['vitest', 'related', '--run', '--passWithNoTests', ...changed],
    opts,
  );
  const failures = [
    typecheck.status !== 0 ? `Typecheck failed:\n${typecheck.stdout.slice(-2000)}` : '',
    tests.status !== 0 ? `Related tests failed:\n${tests.stdout.slice(-2000)}` : '',
  ].filter(Boolean);
  if (failures.length > 0) {
    console.error(`${failures.join('\n\n')}\n\nFix these before finishing. Do not weaken tests.`);
    process.exit(2);
  }
}
