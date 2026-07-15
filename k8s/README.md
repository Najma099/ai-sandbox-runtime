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
| `KIND_CLUSTER_NAME` | `ai-sandbox` | kind cluster name |
| `SANDBOX_IMAGE` | `sandbox-runner:latest` | Local runner image tag |
