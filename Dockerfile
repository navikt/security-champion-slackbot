FROM node:23-slim AS builder
WORKDIR /app
COPY . /app
RUN npm ci
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12:latest@sha256:176a1a417bd00cf01952c2854a3ff0b11bfb118ff91a7ab0b7307899df239d4e
WORKDIR /app
COPY --from=builder /app /app
CMD ["build/cli.js", "sync"]
