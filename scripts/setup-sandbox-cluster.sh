#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLUSTER_NAME="${KIND_CLUSTER_NAME:-ai-sandbox}"
IMAGE_NAME="${SANDBOX_IMAGE:-sandbox-runner:latest}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_command kind
require_command docker
require_command kubectl

if ! kind get clusters | grep -qx "$CLUSTER_NAME"; then
  echo "Creating kind cluster: $CLUSTER_NAME"
  kind create cluster --config "$ROOT_DIR/kind/cluster.yaml"
else
  echo "Kind cluster already exists: $CLUSTER_NAME"
fi

echo "Building sandbox runner image: $IMAGE_NAME"
docker build -t "$IMAGE_NAME" "$ROOT_DIR/k8s"

echo "Loading image into kind"
kind load docker-image "$IMAGE_NAME" --name "$CLUSTER_NAME"

echo "Applying Kubernetes manifests"
kubectl apply -f "$ROOT_DIR/k8s/namespace.yaml"
kubectl apply -f "$ROOT_DIR/k8s/service.yaml"
kubectl apply -f "$ROOT_DIR/k8s/statefulset.yaml"

echo "Waiting for sandbox pods"
kubectl rollout status statefulset/sandbox-runner -n sandbox --timeout=180s
kubectl wait pod -l app=sandbox-runner -n sandbox --for=condition=Ready --timeout=180s

echo
echo "Sandbox pods ready:"
kubectl get pods -n sandbox -l app=sandbox-runner

echo
echo "Try:"
echo "  K8S_NAMESPACE=sandbox SANDBOX_PROVIDER=kubernetes npx tsx src/testKubernetesSandbox.ts"
