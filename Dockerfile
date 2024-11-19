FROM node:23-slim AS builder
WORKDIR /app
COPY . /app
RUN npm ci
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12:latest@sha256:c218f62198d07fc67e36fff5639985f29b1bdcf04a601c1d23c0ab1121f55f0b
WORKDIR /app
COPY --from=builder /app /app
CMD ["build/cli.js", "sync"]
