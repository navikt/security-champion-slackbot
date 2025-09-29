FROM europe-north1-docker.pkg.dev/cgr-nav/pull-through/nav.no/node:24-dev AS builder
WORKDIR /app
COPY . /app
RUN npm ci
RUN npm run build

FROM europe-north1-docker.pkg.dev/cgr-nav/pull-through/nav.no/node:24
WORKDIR /app
COPY --from=builder /app /app
CMD ["build/cli.js", "sync"]
