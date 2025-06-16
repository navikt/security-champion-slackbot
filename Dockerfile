FROM node:24-slim AS builder
WORKDIR /app
COPY . /app
RUN npm ci
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12:latest@sha256:3bbb76acb752a4ed1275fd337d005e37cd35706a4f97f916ee1d65a30b486915
WORKDIR /app
COPY --from=builder /app /app
CMD ["build/cli.js", "sync"]
