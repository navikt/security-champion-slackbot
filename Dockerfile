FROM node:22-slim as builder
WORKDIR /app
COPY . /app
RUN npm ci
RUN npm run build

FROM gcr.io/distroless/nodejs20:nonroot
WORKDIR /app
COPY --from=builder /app /app
CMD ["build/cli.js", "sync"]
