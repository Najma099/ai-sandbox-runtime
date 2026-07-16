import {
  ApiException,
  CoordinationV1Api,
  KubeConfig,
  V1Lease,
  V1MicroTime,
} from "@kubernetes/client-node";
import { LeaseManager } from "./LeaseManager";

export interface KubernetesLeaseManagerOptions {
  namespace: string;
  leaseDurationSeconds?: number;
}

function isApiException(error: unknown): error is ApiException<unknown> {
  return error instanceof ApiException;
}

function isLeaseExpired(lease: V1Lease, now = Date.now()): boolean {
  const renewTimeValue = lease.spec?.renewTime;

  if (!renewTimeValue) {
    return true;
  }

  const renewTime = new Date(renewTimeValue).getTime();
  const durationMs = (lease.spec?.leaseDurationSeconds ?? 40) * 1000;
  return now >= renewTime + durationMs;
}

function buildLease(
  leaseName: string,
  holder: string,
  leaseDurationSeconds: number,
  resourceVersion?: string,
): V1Lease {
  const now = new V1MicroTime();

  return {
    apiVersion: "coordination.k8s.io/v1",
    kind: "Lease",
    metadata: {
      name: leaseName,
      ...(resourceVersion ? { resourceVersion } : {}),
    },
    spec: {
      holderIdentity: holder,
      leaseDurationSeconds,
      acquireTime: now,
      renewTime: now,
    },
  };
}

export class KubernetesLeaseManager implements LeaseManager {
  private api: CoordinationV1Api;
  private leaseDurationSeconds: number;

  constructor(private readonly options: KubernetesLeaseManagerOptions) {
    const kubeConfig = new KubeConfig();
    kubeConfig.loadFromDefault();
    this.api = kubeConfig.makeApiClient(CoordinationV1Api);
    this.leaseDurationSeconds = options.leaseDurationSeconds ?? 60;
  }

  async tryAcquire(leaseName: string, holder: string): Promise<boolean> {
    try {
      const existing = await this.api.readNamespacedLease({
        name: leaseName,
        namespace: this.options.namespace,
      });

      const currentHolder = existing.spec?.holderIdentity;

      if (currentHolder === holder) {
        await this.renewLease(existing);
        return true;
      }

      if (!isLeaseExpired(existing)) {
        return false;
      }

      return this.claimLease(
        leaseName,
        holder,
        existing.metadata?.resourceVersion,
      );
    } catch (error) {
      if (isApiException(error) && error.code === 404) {
        return this.createLease(leaseName, holder);
      }

      throw error;
    }
  }

  async release(leaseName: string, holder: string): Promise<void> {
    try {
      const lease = await this.api.readNamespacedLease({
        name: leaseName,
        namespace: this.options.namespace,
      });

      if (lease.spec?.holderIdentity !== holder) {
        return;
      }

      await this.api.deleteNamespacedLease({
        name: leaseName,
        namespace: this.options.namespace,
      });
    } catch (error) {
      if (isApiException(error) && error.code === 404) {
        return;
      }

      throw error;
    }
  }

  private async createLease(
    leaseName: string,
    holder: string,
  ): Promise<boolean> {
    try {
      await this.api.createNamespacedLease({
        namespace: this.options.namespace,
        body: buildLease(leaseName, holder, this.leaseDurationSeconds),
      });
      return true;
    } catch (error) {
      if (isApiException(error) && error.code === 409) {
        return false;
      }

      throw error;
    }
  }

  private async claimLease(
    leaseName: string,
    holder: string,
    resourceVersion?: string,
  ): Promise<boolean> {
    if (!resourceVersion) {
      return false;
    }

    try {
      await this.api.replaceNamespacedLease({
        name: leaseName,
        namespace: this.options.namespace,
        body: buildLease(
          leaseName,
          holder,
          this.leaseDurationSeconds,
          resourceVersion,
        ),
      });
      return true;
    } catch (error) {
      if (isApiException(error) && (error.code === 409 || error.code === 422)) {
        return false;
      }

      throw error;
    }
  }

  private async renewLease(lease: V1Lease): Promise<void> {
    const name = lease.metadata?.name;

    if (!name || !lease.metadata?.resourceVersion) {
      throw new Error("Lease metadata is missing");
    }

    await this.api.replaceNamespacedLease({
      name,
      namespace: this.options.namespace,
      body: {
        ...lease,
        spec: {
          ...lease.spec,
          renewTime: new V1MicroTime(),
        },
      },
    });
  }
}
