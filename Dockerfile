FROM node:24-slim AS builder
WORKDIR /app
COPY . /app
RUN npm ci
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12:latest@sha256:5bbfaef4976723a9574efdeea941ca4f2a30b271a8b9ad6a1036dbaae68f855d
WORKDIR /app
COPY --from=builder /app /app
CMD ["build/cli.js", "sync"]
