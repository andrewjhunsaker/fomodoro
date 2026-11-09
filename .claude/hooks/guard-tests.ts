import { existsSync } from 'node:fs';
import { relative } from 'node:path';
import { isTestFile } from '../../scripts/test-integrity.ts';
import { projectDir, readInput } from './lib.ts';

export function decide(filePath: string, exists: boolean) {
  if (!exists || !isTestFile(filePath)) return null;
  return {
    hookEventName: 'PreToolUse',
    permissionDecision: 'ask',
    permissionDecisionReason: `Editing an existing test (${filePath}) needs Andrew's approval under the no-test-weakening policy. Explain why the test should change.`,
  };
}

if (import.meta.main) {
  const input = await readInput<{ tool_input?: { file_path?: string } }>();
  const filePath = input.tool_input?.file_path ?? '';
  const output = decide(relative(projectDir(), filePath), existsSync(filePath));
  if (output) console.log(JSON.stringify({ hookSpecificOutput: output }));
}
