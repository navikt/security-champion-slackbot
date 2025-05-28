FROM node:24-slim AS builder
WORKDIR /app
COPY . /app
RUN npm ci
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12:latest@sha256:d028bfd3111bb0e2a75ef5e2232fa91cb826f9121a66a2242962b1c52398a237
WORKDIR /app
COPY --from=builder /app /app
CMD ["build/cli.js", "sync"]
