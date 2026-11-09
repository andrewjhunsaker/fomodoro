import { spawnSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { projectDir, readInput } from './lib.ts';

/** The absolute path to lint, or null for non-code files, missing files and files outside root. */
export function lintTarget(file: string, root: string): string | null {
  if (!/\.(ts|tsx|js)$/.test(file)) return null;
  const abs = resolve(root, file);
  if (!existsSync(abs)) return null;
  const real = realpathSync(abs);
  const rel = relative(realpathSync(root), real);
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return null;
  return real;
}

if (import.meta.main) {
  const input = await readInput<{ tool_input?: { file_path?: string } }>();
  const cwd = projectDir();
  const file = lintTarget(input.tool_input?.file_path ?? '', cwd);
  if (file) {
    const opts = { cwd, encoding: 'utf8' } as const;
    spawnSync('npx', ['--no-install', 'prettier', '--write', file], opts);
    const lint = spawnSync('npx', ['--no-install', 'eslint', '--fix', file], opts);
    if (lint.status !== 0) {
      const output = `${lint.stdout ?? ''}${lint.stderr ?? ''}`.slice(0, 3000);
      console.error(`ESLint found problems in ${file}:\n${output}`);
      process.exit(2);
    }
  }
}
