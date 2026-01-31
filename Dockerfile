FROM oven/bun:latest
WORKDIR /app

COPY . .

RUN apt-get update && apt-get install -y \
    imagemagick --no-install-recommends

RUN bun install

CMD ["bun", "server.ts"]

