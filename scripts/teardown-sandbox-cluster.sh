#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="${KIND_CLUSTER_NAME:-ai-sandbox}"

if kind get clusters | grep -qx "$CLUSTER_NAME"; then
  echo "Deleting kind cluster: $CLUSTER_NAME"
  kind delete cluster --name "$CLUSTER_NAME"
else
  echo "Kind cluster not found: $CLUSTER_NAME"
fi
