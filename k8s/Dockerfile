FROM node:22-alpine

RUN apk add --no-cache bash

WORKDIR /workspace

RUN printf '%s\n' '{"name":"sandbox-workspace","version":"1.0.0"}' > /workspace/package.json \
  && printf '%s\n' '# Sandbox Workspace' > /workspace/README.md

CMD ["sleep", "infinity"]
