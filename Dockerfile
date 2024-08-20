FROM node:22-slim AS builder
WORKDIR /app
COPY . /app
RUN npm ci
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12:latest@sha256:0e04a0b2aba2cf0d007e260f82edb146cff6cd34bd13b213a203f8092a7218ae
WORKDIR /app
COPY --from=builder /app /app
CMD ["build/cli.js", "sync"]
