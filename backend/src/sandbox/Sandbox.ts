export interface Sandbox {
  id: string;

  execute(command: string): Promise<string>;
}
