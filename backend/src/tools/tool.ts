export interface Tool {
    name: string;
    description: string;

    executes: (args: Record<string, any>) => Promise<string>;
}