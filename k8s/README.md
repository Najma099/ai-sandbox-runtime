# Phase 5: Local Sandbox Cluster

Run 8 stable sandbox pods locally with kind:

```bash
chmod +x scripts/setup-sandbox-cluster.sh scripts/teardown-sandbox-cluster.sh
./scripts/setup-sandbox-cluster.sh
```

This creates:

- kind cluster: `ai-sandbox`
- namespace: `sandbox`
- StatefulSet pods: `sandbox-runner-0` ... `sandbox-runner-7`

## Verify

```bash
kubectl get pods -n sandbox
kubectl exec -n sandbox sandbox-runner-0 -- node --version
```

From the backend:

```bash
cd backend
SANDBOX_PROVIDER=kubernetes npx tsx src/testKubernetesSandbox.ts
```

## Teardown

```bash
./scripts/teardown-sandbox-cluster.sh
```

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `SANDBOX_PROVIDER` | `fake` | Use `kubernetes` for real pods |
| `K8S_NAMESPACE` | `sandbox` | Kubernetes namespace |
| `API_INSTANCE_ID` | hostname | Prefix for lease holder identity |
| `KIND_CLUSTER_NAME` | `ai-sandbox` | kind cluster name |
| `SANDBOX_IMAGE` | `sandbox-runner:latest` | Local runner image tag |

## Phase 6: Distributed locking

Sandbox assignment uses Kubernetes `Lease` objects so multiple API servers cannot assign the same pod.

Each lease is named after its pod (for example `sandbox-runner-0`) and the holder looks like `API-1-<uuid>`.

Test lease behavior:

```bash
cd backend
npx tsx src/testLeaseManager.ts
```
