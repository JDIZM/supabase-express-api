FROM node:16

WORKDIR /app

COPY dist /app
COPY package.json /app
COPY package-lock.json /app

RUN npm ci

CMD ["node", "server.mjs"]