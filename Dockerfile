FROM node:20-alpine AS base

ENV PNPM_VERSION=9.1.0

RUN npm install -g pnpm@$PNPM_VERSION

WORKDIR /app

ARG NODE_ENV
ENV NODE_ENV=${NODE_ENV}

# install deps first so we can cache them
COPY package*.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder

WORKDIR /app

COPY . .

RUN mkdir dist

RUN pnpm build

FROM base AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 express
RUN adduser --system --uid 1001 express

COPY --from=builder --chown=express:express /app/node_modules /app/node_modules
COPY --from=builder --chown=express:express /app/dist /app/dist
COPY --from=builder --chown=express:express /app/package.json /app/package.json

USER express

EXPOSE 4000

FROM runner AS dev

WORKDIR /app

COPY --from=builder --chown=express:express /app/.env /app/.env

CMD ["node", "./dist/server.mjs"]

FROM runner AS prod

WORKDIR /app

CMD ["node", "./dist/server.mjs"]
