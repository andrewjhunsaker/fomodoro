import { execFileSync } from 'node:child_process';
import { projectDir, readInput } from './lib.ts';

// `git`, then any global options (-C dir, -c k=v, --no-pager, --git-dir=x), then the subcommand.
const GIT = String.raw`\bgit(?:\s+(?:-[cC]\s+\S+|-[pP]\b|--(?:git-dir|work-tree|namespace)\s+\S+|--[\w-]+(?:=\S+)?))*\s+`;
// The rest of one command: stops at ; & | or a newline so `a && b` is checked per command.
const SEG = String.raw`[^;&|\n]*`;
// A short-flag cluster containing a letter (-f, -fu, -xf) or the long flag, as its own word.
const flag = (short: string, long: string) =>
  String.raw`(?:\s-[a-zA-Z]*${short}[a-zA-Z]*\b|\s--${long}(?![\w-]))`;
// main/master as a whole ref (also HEAD:main, :main, refs/heads/main), not inside m0/main-cleanup.
const MAIN = String.raw`(?<![\w/.-])(?:refs\/heads\/)?(?:main|master)(?![\w/.-])`;
const re = (...parts: string[]) => new RegExp(parts.join(''));

const RULES: [RegExp, string][] = [
  [re(GIT, 'push\\b', SEG, MAIN), 'pushing to main is blocked; open a PR'],
  [
    re(GIT, 'push\\b', SEG, '(?:', flag('f', 'force'), String.raw`|\s\+\S|\s--mirror\b)`),
    'force push is blocked; use --force-with-lease on your own branch',
  ],
  [re(GIT, 'reset\\b', SEG, String.raw`\s--hard\b`), 'git reset --hard discards work; ask Andrew'],
  [
    re(GIT, 'clean\\b', SEG, flag('f', 'force')),
    'git clean -f deletes untracked files; ask Andrew',
  ],
  [
    re(
      GIT,
      String.raw`branch\b(?:`,
      SEG,
      String.raw`\s-[a-zA-Z]*D|(?=`,
      SEG,
      flag('d', 'delete'),
      ')(?=',
      SEG,
      flag('f', 'force'),
      '))',
    ),
    'git branch -D force-deletes a branch; ask Andrew',
  ],
  [
    re(String.raw`\brm\b(?=`, SEG, flag('[rR]', 'recursive'), ')(?=', SEG, flag('f', 'force'), ')'),
    'rm -rf is blocked; delete specific files instead',
  ],
  [
    re(
      GIT,
      String.raw`(?:switch|checkout)\b`,
      SEG,
      '(?:',
      flag('f', 'force'),
      String.raw`|\s--discard-changes\b)`,
    ),
    'git switch/checkout --force discards local changes; ask Andrew',
  ],
  [/\bgh\s+pr\s+merge\b/, 'only Andrew merges PRs'],
  [
    // A .env path starts a word or path segment, so `process.env.HOME` in a script is not a match.
    /(^|[\s/'"=<>])\.env(?!\.example)(\.\w+)?\b/,
    'reading .env files is blocked; secrets stay out of the conversation',
  ],
];
const PUSH = re(GIT, 'push\\b');

export function evaluateCommand(
  command: string,
  branch: string,
): { block: boolean; reason?: string } {
  for (const [rule, reason] of RULES) if (rule.test(command)) return { block: true, reason };
  if (branch === 'main' && PUSH.test(command)) {
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
