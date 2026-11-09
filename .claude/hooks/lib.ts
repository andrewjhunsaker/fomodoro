export async function readInput<T>(): Promise<T> {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  return JSON.parse(raw || '{}') as T;
}

/** Repo root: Claude Code sets CLAUDE_PROJECT_DIR for hooks; fall back to cwd for manual runs. */
export const projectDir = () => process.env.CLAUDE_PROJECT_DIR || process.cwd();
