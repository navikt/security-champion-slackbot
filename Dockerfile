FROM node:23-slim AS builder
WORKDIR /app
COPY . /app
RUN npm ci
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12:latest@sha256:f71f4b7976f952df9c72b4d2ce82e09f0f57d398a25c0c3ebd63557e973f1ee7
WORKDIR /app
COPY --from=builder /app /app
CMD ["build/cli.js", "sync"]
