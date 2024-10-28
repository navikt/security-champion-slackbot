FROM node:23-slim AS builder
WORKDIR /app
COPY . /app
RUN npm ci
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12:latest@sha256:293fe0645ff801daf7a0f7c33477010a4342eb92a4b0289027f96014e68da4f7
WORKDIR /app
COPY --from=builder /app /app
CMD ["build/cli.js", "sync"]
