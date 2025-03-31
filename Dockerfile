FROM node:23-slim AS builder
WORKDIR /app
COPY . /app
RUN npm ci
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12:latest@sha256:b0df7917d86c254e76d0855775679d9ee4ec7c307503259d92f431b618393a4d
WORKDIR /app
COPY --from=builder /app /app
CMD ["build/cli.js", "sync"]
