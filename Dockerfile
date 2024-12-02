FROM node:23-slim AS builder
WORKDIR /app
COPY . /app
RUN npm ci
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12:latest@sha256:d2bf966afe785153974fdd2663c7181dbfdf407d229b5df4adef185ca134da04
WORKDIR /app
COPY --from=builder /app /app
CMD ["build/cli.js", "sync"]
