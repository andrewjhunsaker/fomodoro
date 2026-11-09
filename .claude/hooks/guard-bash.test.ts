import { describe, expect, it } from 'vitest';
import { evaluateCommand } from './guard-bash.ts';

describe('evaluateCommand', () => {
  const blocked = [
    'git push origin main',
    'git push -f origin m0/1-x',
    'git push --force',
    'git reset --hard HEAD~1',
    'git clean -fd',
    'git branch -D m0/1-x',
    'rm -rf node_modules',
    'rm -fr dist',
    'cat .env',
    'grep KEY .env.local',
    'npm test && git push origin main',
  ];
  for (const cmd of blocked) {
    it(`blocks: ${cmd}`, () => {
      expect(evaluateCommand(cmd, 'm0/1-x').block).toBe(true);
    });
  }

  it('blocks a bare git push while on main', () => {
    expect(evaluateCommand('git push', 'main').block).toBe(true);
  });

  const allowed = [
    'git push -u origin m0/1-x',
    'git push --force-with-lease',
    'npm test',
    'cat .env.example',
    'git status',
    'node -e "console.log(process.env.HOME)"',
  ];
  for (const cmd of allowed) {
    it(`allows: ${cmd}`, () => {
      expect(evaluateCommand(cmd, 'm0/1-x').block).toBe(false);
    });
  }

  it('explains why it blocked', () => {
    expect(evaluateCommand('git reset --hard', 'x').reason).toMatch(/reset --hard/);
  });
});
