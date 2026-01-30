FROM bun:1.3.8

COPY . .

RUN sudo apt update
RUN sudo apt install imagemagick

CMD ['bun', './server.ts']

