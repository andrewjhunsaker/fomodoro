import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const RUN = join(import.meta.dirname, 'run.sh');
const sandbox = mkdtempSync(join(tmpdir(), 'fomodoro-run-'));
afterAll(() => rmSync(sandbox, { recursive: true, force: true }));

/** A PATH dir whose only `node` reports v18 and fails anything else, like nvm's default here. */
function oldNodeDir() {
  const dir = join(sandbox, 'old-bin');
  mkdirSync(dir, { recursive: true });
  const node = join(dir, 'node');
  writeFileSync(node, '#!/bin/sh\n[ "$1" = --version ] && echo v18.20.7 && exit 0\nexit 1\n');
  chmodSync(node, 0o755);
  return dir;
}

/** A fake $HOME whose nvm has a Node 24 install (a symlink to the node running this test). */
function homeWithNode24() {
  const home = join(sandbox, 'home24');
  const bin = join(home, '.nvm/versions/node/v24.0.0/bin');
  mkdirSync(bin, { recursive: true });
  symlinkSync(process.execPath, join(bin, 'node'));
  return home;
}

function run(args: string[], input: string, env: Record<string, string> = {}) {
  return spawnSync('/bin/bash', [RUN, ...args], {
    input,
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', ...env },
  });
}

const PUSH_MAIN = JSON.stringify({ tool_input: { command: 'git push origin main' } });
const SAFE = JSON.stringify({ tool_input: { command: 'npm test' } });

describe('run.sh', () => {
  it('blocks a dangerous command (exit 2)', () => {
    expect(run(['guard-bash', 'guard'], PUSH_MAIN).status).toBe(2);
  });

  it('allows a safe command (exit 0)', () => {
    expect(run(['guard-bash', 'guard'], SAFE).status).toBe(0);
  });

  it('fails closed when a guard crashes (malformed stdin)', () => {
    const result = run(['guard-bash', 'guard'], '{not json');
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/guard-bash/);
  });

  it('passes a soft hook crash through without blocking as a guard would', () => {
    expect(run(['guard-bash', 'soft'], '{not json').status).toBe(1);
  });

  it('skips an old node on PATH and uses Node 24 from nvm', () => {
    const env = { PATH: oldNodeDir(), HOME: homeWithNode24() };
    expect(run(['guard-bash', 'guard'], PUSH_MAIN, env).status).toBe(2);
    expect(run(['guard-bash', 'guard'], SAFE, env).status).toBe(0);
  });

  it('blocks guards when no Node 24 exists', () => {
    const env = { PATH: oldNodeDir(), HOME: join(sandbox, 'empty-home') };
    const result = run(['guard-bash', 'guard'], SAFE, env);
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/fomodoro hooks need Node 24 \(nvm install 24\)/);
  });

  it('does not block soft hooks when no Node 24 exists', () => {
    const env = { PATH: oldNodeDir(), HOME: join(sandbox, 'empty-home') };
    const result = run(['stop-verify', 'soft'], '{}', env);
    expect(result.status).toBe(0);
    expect(result.stderr).toMatch(/fomodoro hooks need Node 24/);
  });
});
