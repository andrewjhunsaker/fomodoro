import { execFileSync } from 'node:child_process';
import { projectDir, readInput } from './lib.ts';

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
    // A .env path starts a word or path segment, so `process.env.HOME` in a script is not a match.
    /(^|[\s/'"=<>])\.env(?!\.example)(\.\w+)?\b/,
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

if (import.meta.main) {
  const input = await readInput<{ tool_input?: { command?: string } }>();
  let branch = '';
  try {
    branch = execFileSync('git', ['branch', '--show-current'], {
      cwd: projectDir(),
      encoding: 'utf8',
    }).trim();
  } catch {
    // Not a git checkout: only the command rules apply.
  }
  const result = evaluateCommand(input.tool_input?.command ?? '', branch);
  if (result.block) {
    console.error(`Blocked by guard-bash: ${result.reason}`);
    process.exit(2);
  }
}
