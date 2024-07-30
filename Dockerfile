FROM node:22-slim as builder
WORKDIR /app
COPY . /app
RUN npm ci
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12:latest@sha256:2378e6cc601c8e19364316527a7a39d3cb7bf1f45902bcad3a1fa0f7d05cb682
WORKDIR /app
COPY --from=builder /app /app
CMD ["build/cli.js", "sync"]
