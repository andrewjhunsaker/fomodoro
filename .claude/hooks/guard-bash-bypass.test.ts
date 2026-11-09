import { describe, expect, it } from 'vitest';
import { evaluateCommand } from './guard-bash.ts';

// Bypasses found in review of PR #15. Kept apart from guard-bash.test.ts so the original cases
// stay untouched.
describe('evaluateCommand bypasses', () => {
  it.each([
    'git push origin HEAD',
    'git push -u origin HEAD',
    'git push -u',
    'git push origin',
    'git push',
    'git -C . push',
  ])('blocks any push while on main: %s', (cmd) => {
    expect(evaluateCommand(cmd, 'main').block).toBe(true);
  });

  it.each([
    // git global options before the subcommand
    'git -C . push origin main',
    'git -c k=v push origin main',
    'git --no-pager push origin main',
    'git -C . reset --hard',
    // other spellings of main as a push target
    'git push origin HEAD:main',
    'git push origin :main',
    'git push origin +HEAD:main',
    'git push origin refs/heads/main',
    'git push origin master',
    // force push spellings
    'git push origin +m0/1-x',
    'git push -fu origin m0/1-x',
    'git push --mirror',
    // destructive clean/branch/rm/switch spellings
    'git clean --force',
    'git clean -x -f',
    'git branch --delete --force m0/1-x',
    'git branch -d -f m0/1-x',
    'rm -r -f dist',
    'rm -R -f dist',
    'rm --recursive --force dist',
    'git switch -f m0/2-y',
    'git switch --discard-changes m0/2-y',
    'git checkout -f m0/2-y',
    'git checkout --force m0/2-y',
    // agents never merge
    'gh pr merge 15',
    'gh pr merge --squash 15',
  ])('blocks: %s', (cmd) => {
    expect(evaluateCommand(cmd, 'm0/1-x').block).toBe(true);
  });

  it.each([
    'git push origin m0/main-cleanup',
    'git push -u origin m0/1-x',
    'git push --force-with-lease',
    'git push origin HEAD',
    'git branch -d m0/1-x',
    'git clean -n',
    'git switch -c m0/2-fix-foo',
    'git checkout -b m0/2-y',
    'rm -r tmp-dir',
    'rm -f file.txt',
    'gh pr view 15',
    'git commit --no-verify -m "test: red"',
  ])('allows: %s', (cmd) => {
    expect(evaluateCommand(cmd, 'm0/1-x').block).toBe(false);
  });
});
