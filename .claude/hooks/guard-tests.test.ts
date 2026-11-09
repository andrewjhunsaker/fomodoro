import { describe, expect, it } from 'vitest';
import { decide } from './guard-tests.ts';

describe('decide', () => {
  it('asks before editing an existing test file', () => {
    expect(decide('src/App.test.tsx', true)).toMatchObject({ permissionDecision: 'ask' });
  });
  it('allows creating a new test file', () => {
    expect(decide('src/new.test.ts', false)).toBeNull();
  });
  it('ignores non-test files', () => {
    expect(decide('src/App.tsx', true)).toBeNull();
  });
});
