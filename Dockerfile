FROM node:24-slim AS builder
WORKDIR /app
COPY . /app
RUN npm ci
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12:latest@sha256:b765815eafacee5222bfa50179028f41dd8c642b68ad68ec4e6922d3b1ff2710
WORKDIR /app
COPY --from=builder /app /app
CMD ["build/cli.js", "sync"]
