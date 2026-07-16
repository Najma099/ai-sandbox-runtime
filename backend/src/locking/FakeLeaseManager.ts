import { LeaseManager } from "./LeaseManager";

export class FakeLeaseManager implements LeaseManager {
  private holders = new Map<string, string>();

  async tryAcquire(leaseName: string, holder: string): Promise<boolean> {
    const current = this.holders.get(leaseName);

    if (current && current !== holder) {
      return false;
    }

    this.holders.set(leaseName, holder);
    return true;
  }

  async release(leaseName: string, holder: string): Promise<void> {
    if (this.holders.get(leaseName) === holder) {
      this.holders.delete(leaseName);
    }
  }
}
