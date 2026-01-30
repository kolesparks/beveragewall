FROM oven/bun:latest

COPY . .

RUN sudo apt update
RUN sudo apt install imagemagick

CMD ['bun', './server.ts']

