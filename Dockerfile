FROM node:24-slim AS builder
WORKDIR /app
COPY . /app
RUN npm ci
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12:latest@sha256:8d54996fc549a9f6d8af41e0540ecf7ee75f31189e788a738cfcbf2f58903404
WORKDIR /app
COPY --from=builder /app /app
CMD ["build/cli.js", "sync"]
