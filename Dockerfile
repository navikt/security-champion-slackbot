FROM node:24-slim AS builder
WORKDIR /app
COPY . /app
RUN npm ci
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12:latest@sha256:ee4a35606ca4f0d4d9d376cb18a3e330dd84ebebf30215cd29e867b2bcd12132
WORKDIR /app
COPY --from=builder /app /app
CMD ["build/cli.js", "sync"]
