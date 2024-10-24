FROM node:23-slim AS builder
WORKDIR /app
COPY . /app
RUN npm ci
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12:latest@sha256:6de83aa27d8cad62d2c429ab546512616f34c9a3da629e4af8d6ba12174e45ac
WORKDIR /app
COPY --from=builder /app /app
CMD ["build/cli.js", "sync"]
