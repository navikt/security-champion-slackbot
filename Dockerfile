FROM node:23-slim AS builder
WORKDIR /app
COPY . /app
RUN npm ci
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12:latest@sha256:e36aabe0394465699ebdb68544f6f3b618a654af85f6fa1b55e8fc4e567b3250
WORKDIR /app
COPY --from=builder /app /app
CMD ["build/cli.js", "sync"]
