export interface LeaseManager {
  tryAcquire(leaseName: string, holder: string): Promise<boolean>;
  release(leaseName: string, holder: string): Promise<void>;
}
