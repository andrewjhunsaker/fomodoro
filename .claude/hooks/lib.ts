export async function readInput<T>(): Promise<T> {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  return JSON.parse(raw || '{}') as T;
}
