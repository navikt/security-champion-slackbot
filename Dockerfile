FROM node:24-slim AS builder
WORKDIR /app
COPY . /app
RUN npm ci
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12:latest@sha256:3c90d20cfa08093504ee4795fae9e2571b605dd975b3992e1ef8ccf8b146388a
WORKDIR /app
COPY --from=builder /app /app
CMD ["build/cli.js", "sync"]
