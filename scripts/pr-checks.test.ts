import { describe, expect, it } from 'vitest';
import { checkLog, checkPdlc, sizeWarning } from './pr-checks.ts';

describe('checkLog', () => {
  it('passes when a dev-log file changed', () => {
    expect(checkLog(['src/a.ts', 'docs/log/2026-11.md'], [])).toBeNull();
  });
  it('passes with the no-log label', () => {
    expect(checkLog(['src/a.ts'], ['no-log'])).toBeNull();
  });
  it('fails otherwise', () => {
    expect(checkLog(['src/a.ts'], [])).toMatch(/docs\/log/);
  });
});

describe('checkPdlc', () => {
  it('passes at 80 lines', () => {
    expect(checkPdlc(80)).toBeNull();
  });
  it('fails above 80 lines', () => {
    expect(checkPdlc(81)).toMatch(/81/);
  });
});

describe('sizeWarning', () => {
  it('ignores lockfiles and PDFs', () => {
    expect(
      sizeWarning([
        { path: 'package-lock.json', changed: 5000 },
        { path: 'docs/learning/a.pdf', changed: 900 },
      ]),
    ).toBeNull();
  });
  it('warns above 400 changed lines', () => {
    expect(
      sizeWarning([
        { path: 'src/a.ts', changed: 300 },
        { path: 'src/b.ts', changed: 101 },
      ]),
    ).toMatch(/401/);
  });
  it('stays quiet at 400', () => {
    expect(sizeWarning([{ path: 'src/a.ts', changed: 400 }])).toBeNull();
  });
});
