FROM oven/bun:latest

COPY . .

RUN apt-get update && apt-get install -y \
    imagemagick --no-install-recommends

CMD ['bun', './server.ts']

