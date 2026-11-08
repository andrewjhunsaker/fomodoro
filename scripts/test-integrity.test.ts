import { describe, expect, it } from 'vitest';
import { findViolations, isTestFile, type FileChange } from './test-integrity.ts';

const change = (path: string, base: string | null, head: string | null): FileChange => ({
  path,
  base,
  head,
});

describe('isTestFile', () => {
  it('matches unit, spec, e2e and snapshot files', () => {
    expect(isTestFile('src/a.test.ts')).toBe(true);
    expect(isTestFile('src/a.spec.tsx')).toBe(true);
    expect(isTestFile('e2e/smoke.spec.ts')).toBe(true);
    expect(isTestFile('src/__snapshots__/a.test.ts.snap')).toBe(true);
  });
  it('ignores source files', () => {
    expect(isTestFile('src/App.tsx')).toBe(false);
  });
});

describe('findViolations', () => {
  it('allows new test files', () => {
    expect(
      findViolations([change('src/a.test.ts', null, "it('a', () => { expect(1).toBe(1) })")]),
    ).toEqual([]);
  });

  it('allows adding tests and assertions', () => {
    const base = "it('a', () => { expect(1).toBe(1) })";
    const head = base + "\nit('b', () => { expect(2).toBe(2) })";
    expect(findViolations([change('src/a.test.ts', base, head)])).toEqual([]);
  });

  it('flags a deleted test file', () => {
    expect(findViolations([change('src/a.test.ts', "it('a', () => {})", null)])).toEqual([
      { path: 'src/a.test.ts', reason: 'test file deleted' },
    ]);
  });

  it('flags fewer test cases', () => {
    const base = "it('a', () => { expect(1).toBe(1) })\nit('b', () => { expect(1).toBe(1) })";
    const head = "it('a', () => { expect(1).toBe(1); expect(2).toBe(2) })";
    expect(findViolations([change('src/a.test.ts', base, head)])).toContainEqual({
      path: 'src/a.test.ts',
      reason: 'test cases decreased from 2 to 1',
    });
  });

  it('flags fewer assertions', () => {
    const base = "it('a', () => { expect(1).toBe(1); expect(2).toBe(2) })";
    const head = "it('a', () => { expect(1).toBe(1) })";
    expect(findViolations([change('src/a.test.ts', base, head)])).toEqual([
      { path: 'src/a.test.ts', reason: 'assertions decreased from 2 to 1' },
    ]);
  });

  it('flags newly added skip, only, todo, and x-prefixed tests', () => {
    const base = "it('a', () => { expect(1).toBe(1) })";
    for (const added of [
      "it.skip('b', () => {})",
      "test.only('b', () => {})",
      "it.todo('b')",
      "xit('b', () => {})",
    ]) {
      const result = findViolations([change('src/a.test.ts', base, base + '\n' + added)]);
      expect(result.map((v) => v.reason)).toContain('skip/only/todo markers increased from 0 to 1');
    }
  });

  it('flags any change to a snapshot file', () => {
    expect(findViolations([change('src/__snapshots__/a.test.ts.snap', 'old', 'new')])).toEqual([
      { path: 'src/__snapshots__/a.test.ts.snap', reason: 'snapshot changed' },
    ]);
  });

  it('ignores non-test files', () => {
    expect(findViolations([change('src/App.tsx', 'a', null)])).toEqual([]);
  });
});
