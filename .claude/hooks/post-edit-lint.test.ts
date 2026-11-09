import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { lintTarget } from './post-edit-lint.ts';

const sandbox = mkdtempSync(join(tmpdir(), 'fomodoro-lint-'));
const root = join(sandbox, 'repo');
mkdirSync(join(root, 'src'), { recursive: true });
writeFileSync(join(root, 'src/a.ts'), '');
writeFileSync(join(root, 'src/a.md'), '');
writeFileSync(join(sandbox, 'outside.ts'), '');
afterAll(() => rmSync(sandbox, { recursive: true, force: true }));

describe('lintTarget', () => {
  it('lints an existing source file inside the project', () => {
    expect(lintTarget(join(root, 'src/a.ts'), root)).toMatch(/src\/a\.ts$/);
  });
  it('resolves a relative path against the project', () => {
    expect(lintTarget('src/a.ts', root)).toMatch(/src\/a\.ts$/);
  });
  it('skips a file that does not exist', () => {
    expect(lintTarget(join(root, 'src/missing.ts'), root)).toBeNull();
  });
  it('skips a file outside the project', () => {
    expect(lintTarget(join(sandbox, 'outside.ts'), root)).toBeNull();
    expect(lintTarget('../outside.ts', root)).toBeNull();
  });
  it('skips non-code files', () => {
    expect(lintTarget(join(root, 'src/a.md'), root)).toBeNull();
  });
});
