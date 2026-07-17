export interface Sandbox {
  id: string;

  execute(command: string, options?: { timeoutMs?: number }): Promise<string>;
}
