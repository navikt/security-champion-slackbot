FROM node:22-slim AS builder
WORKDIR /app
COPY . /app
RUN npm ci
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12:latest@sha256:7014cf59f23b79ae45e99a9e1c6556a8f0017ef24c5e44a482ff3e1f9c2de5ca
WORKDIR /app
COPY --from=builder /app /app
CMD ["build/cli.js", "sync"]
