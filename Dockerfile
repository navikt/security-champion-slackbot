FROM europe-north1-docker.pkg.dev/cgr-nav/pull-through/nav.no/node:24-dev AS builder
WORKDIR /app
RUN npm install -g pnpm@10.18.1
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM europe-north1-docker.pkg.dev/cgr-nav/pull-through/nav.no/node:24
WORKDIR /app
COPY --from=builder /app /app
CMD ["build/cli.js", "sync"]
