FROM node:23-slim AS builder
WORKDIR /app
COPY . /app
RUN npm ci
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12:latest@sha256:b2811d7945a1f3ef91cf8a2ead779171b438eb0011f3bdee0c8cc60cb90b2c0c
WORKDIR /app
COPY --from=builder /app /app
CMD ["build/cli.js", "sync"]
