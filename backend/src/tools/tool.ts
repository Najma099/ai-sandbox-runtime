export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  executes: (args: Record<string, unknown>) => Promise<string>;
}
