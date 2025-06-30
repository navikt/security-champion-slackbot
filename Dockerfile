FROM node:24-slim AS builder
WORKDIR /app
COPY . /app
RUN npm ci
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12:latest@sha256:fd90468f47e91d0d3c9bc055c8c09edbf0c225c3c795d0c266e2ca94b3ba17e3
WORKDIR /app
COPY --from=builder /app /app
CMD ["build/cli.js", "sync"]
