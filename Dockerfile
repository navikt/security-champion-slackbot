FROM node:23-slim AS builder
WORKDIR /app
COPY . /app
RUN npm ci
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12:latest@sha256:d00edbf864c5b989f1b69951a13c5c902bf369cca572de59b5ec972552848e33
WORKDIR /app
COPY --from=builder /app /app
CMD ["build/cli.js", "sync"]
