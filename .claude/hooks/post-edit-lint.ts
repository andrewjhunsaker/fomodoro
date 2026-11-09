import { spawnSync } from 'node:child_process';
import { projectDir, readInput } from './lib.ts';

if (import.meta.main) {
  const input = await readInput<{ tool_input?: { file_path?: string } }>();
  const file = input.tool_input?.file_path ?? '';
  if (/\.(ts|tsx|js)$/.test(file)) {
    const opts = { cwd: projectDir(), encoding: 'utf8' } as const;
    spawnSync('npx', ['prettier', '--write', file], opts);
    const lint = spawnSync('npx', ['eslint', '--fix', file], opts);
    if (lint.status !== 0) {
      console.error(`ESLint found problems in ${file}:\n${lint.stdout.slice(0, 3000)}`);
      process.exit(2);
    }
  }
}
