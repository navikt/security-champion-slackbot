FROM node:23-slim AS builder
WORKDIR /app
COPY . /app
RUN npm ci
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12:latest@sha256:d7ccebdf7617f225aa511c4a0e9c3bff2a8a65b22f8032ca982193d5a52c8ee9
WORKDIR /app
COPY --from=builder /app /app
CMD ["build/cli.js", "sync"]
