import { FakeSandbox } from "./FakeSandbox";
import { Sandbox } from "./Sandbox";

export class SandboxManager {
  private sandboxes: Sandbox[] = [];

  constructor(count = 8) {
    for (let i = 0; i < count; i++) {
      this.sandboxes.push(new FakeSandbox(`sandbox-runner-${i}`));
    }
  }

  getSandboxes(): Sandbox[] {
    return [...this.sandboxes];
  }

  getById(id: string): Sandbox | undefined {
    return this.sandboxes.find((sandbox) => sandbox.id === id);
  }
}
