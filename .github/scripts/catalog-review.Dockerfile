FROM node:22-bookworm-slim@sha256:25330af3531fb5e23318554a0aa911125b6e91b1b777edf7655501d207c067a2
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates git && rm -rf /var/lib/apt/lists/*
RUN npm install --global @github/copilot@1.0.88 && npm cache clean --force
ENV HOME=/tmp/home COPILOT_HOME=/tmp/home/.copilot NO_COLOR=1
WORKDIR /input
USER node
ENTRYPOINT ["copilot"]