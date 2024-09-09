FROM node:22-slim AS builder
WORKDIR /app
COPY . /app
RUN npm ci
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12:latest@sha256:653391e7669b603b0306b785b1ce886f85602e3fb7311bfb0cfadc583bcc2fff
WORKDIR /app
COPY --from=builder /app /app
CMD ["build/cli.js", "sync"]
